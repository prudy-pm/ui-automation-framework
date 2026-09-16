# UI Automation Framework

End-to-end UI and API test automation for [AutomationExercise](https://automationexercise.com), built with Playwright and TypeScript using the Page Object Model. Designed as a reusable foundation, not a one-off demo — see [Future Considerations](#future-considerations) for what changes when this points at a live product.

## Tech Stack

- **Playwright Test** (`@playwright/test`) — test runner, browser automation, and API testing (`request` fixture)
- **TypeScript** — type-safe tests, page objects, API clients, and fixtures
- **@faker-js/faker** — generates test data at runtime instead of committing static/predictable values
- **xlsx** (installed via SheetJS's official CDN, not the unmaintained npm registry copy) — reads Excel-based test data
- **dotenv** — environment-based config for URLs and credentials
- **Playwright HTML Reporter** + **Allure Report** — two complementary reporting layers (see [Reporting](#reporting))
- **@estruyf/github-actions-reporter** — writes a pass/fail summary directly to the GitHub Actions run page

## Project Structure

```
ui-automation-framework/
├── tests/
│   ├── ui/
│   │   ├── auth/          # login: valid, data-driven invalid, browser-validation edge case
│   │   ├── products/       # search (Excel-driven), add to cart
│   │   ├── cart/            # add/remove, price & quantity verification (Excel-driven)
│   │   ├── checkout/         # full add-to-cart -> pay -> confirm flow (per-worker seeded account + cached storageState)
│   │   └── newsletter/       # subscription from home & cart pages (Faker-driven)
│   └── api/                  # products, account CRUD lifecycle, layered validation
├── pages/                     # Page Object Model classes, all extending BasePage
│   └── FooterComponent.ts       # shared, cross-page component (not tied to one page)
├── api/                        # API client classes, all extending BaseApiClient
├── fixtures/                    # pageFixtures.ts, apiFixtures.ts, and accountFixtures.ts
├── data/                         # JSON, nested JSON, and Excel test data + TS types
├── config/                        # env.ts -- URL/credentials
├── utils/                          # generateUniqueEmail, faker wrappers, readExcelSheet, accountFactory
├── scripts/                         # generate-allure-report.js -- local report generation with history retained
├── .env.example
├── tsconfig.json                    # @pages/@fixtures/@config/@data/@utils/@api aliases
└── playwright.config.ts               # chromium/firefox/webkit projects, fully parallel -- no auth-setup project
```

Tests are grouped by **feature**, not by type. Tests are tagged (`@smoke`, `@regression`) so subsets can be run independently.

## Getting Started

```bash
npm install
npx playwright install
```

Copy `.env.example` to `.env`:
```
BASE_URL=https://automationexercise.com
API_BASE_URL=https://automationexercise.com/api/
TEST_USER_EMAIL=
TEST_USER_PASSWORD=
```
`.env` is gitignored. Note the trailing slash on `API_BASE_URL` — required for correct URL resolution against the API clients' relative paths.

**Allure reports require a local JDK (Java 8+)** — run `java -version` to confirm. This only affects local report generation; CI is unaffected.

## Running Tests

```bash
npm test                    # everything
npm run test:ui              # UI suite only
npm run test:api             # API suite only
npm run test:smoke           # @smoke-tagged tests only
npm run test:regression      # @regression-tagged tests only
npm run report               # open the last Playwright HTML report
npm run report:allure        # generate (history-preserving) + open the Allure report
```

## What's Covered

**UI:**
- Login — valid credentials, data-driven invalid credentials (Faker-generated, not committed), browser-validation edge case
- Empty-field validation — login (email, password) and signup (name, email) each reject an empty required field client-side before any request is sent; a distinct concern from the credential-value tests above, kept in its own spec
- Products — Excel-driven search, add to cart
- Cart — add/verify price, remove/verify gone, quantity carries through correctly from product detail page (Excel-driven)
- Checkout — full add-to-cart → address review → order comment → card payment → confirmation flow, starting from a cached `storageState` for a throwaway account seeded via the API once per worker (see [Authenticated Tests](#authenticated-tests))
- Newsletter subscription — home page and cart page, both using a shared `FooterComponent` (Faker-generated emails)

**API:**
- Products — list, search
- Account — login verification (valid/invalid), duplicate-email rejection (a real documented AutomationExercise test case), wrong-HTTP-method rejection (discovered via exploratory testing, not assumed), and a full **Create → Read → Update → Read → Delete** lifecycle that verifies each write actually persisted by reading it back, not just trusting the response code

## Authenticated Tests

Most UI specs (login, products, cart, newsletter) run as a guest and get a fresh, empty browser context every test — no login needed, nothing to reset. Checkout is different: automationexercise.com requires a logged-in account before it will show the checkout page at all.

`fixtures/accountFixtures.ts` seeds one throwaway account **per Playwright worker** via `AccountApiClient.createAccount` (the same create/delete lifecycle proven out in `tests/api/auth.spec.ts`, built from the same `data/accountProfiles.json` fixture via `utils/accountFactory.ts`), logs in as it once, and caches that session as that worker's `storageState` — this is Playwright's documented [isolate-test-data-per-worker](https://playwright.dev/docs/test-parallel#worker-index) pattern. A spec opts in the same way as the old shared-account design, just pointed at a different fixtures module:

```ts
import { test } from '@fixtures/accountFixtures';

test('...', async ({ page }) => {
  // already logged in as this worker's account
});
```

The account is deleted (in a `finally`, so a failed assertion doesn't leak it) when Playwright tears the worker down.

`login.spec.ts` deliberately never does this -- exercising the login form with `env.testUser` is the entire point of those tests, and doesn't need a disposable account or a cached session.

**Why per-worker, not one shared account.** Checkout used to log in once via a `tests/setup/auth.setup.ts` project and reuse that *one* session's `storageState` across every checkout test/browser. That meant every worker shared the same real account and its same server-side cart -- confirmed by a genuine failure where three parallel workers each cleared/added to that one cart at once and every one saw a corrupted total. The workaround at the time was to chain the three checkout browser projects so they never ran concurrently, trading cross-browser speed for correctness. Giving each *worker* its own account keeps the storageState caching technique (no test re-drives the login form) while removing the thing workers were actually racing on: two workers now never touch the same account, so checkout runs fully parallel across `chromium`/`firefox`/`webkit` again, with no special-cased projects in `playwright.config.ts`.

**One gotcha carried over from the old design, now scoped to a worker instead of the whole suite:** every test that lands on the same worker reuses that worker's account and cart across runs. `checkout.spec.ts` calls `cartPage.clearCart()` as its first step to keep quantities/totals deterministic regardless of what an earlier test in that worker left behind; any future authenticated spec sharing this fixture should do the same rather than assume a clean starting cart.

## Timeouts & Wait Strategy

Three of Playwright's defaults are overridden in this repo, and **all three exist because of this specific target site, not as a general-purpose upgrade** -- automationexercise.com is a free public demo site with no SLA. Confirmed with a plain `curl -w`, not assumed:

```bash
curl -sS -o /dev/null -w "connect: %{time_connect}s | ttfb: %{time_starttransfer}s | total: %{time_total}s\n" https://automationexercise.com/products
# connect: 0.35s | ttfb: 11.2s | total: 11.7s   -- vs ~1s total for a healthy site
```

The connection itself is fast; the origin server takes 10+ seconds just to start responding, before Playwright, this repo, or the local network are involved at all. That evidence is what justified each change below:

| Override | Default | Here | Why |
|---|---|---|---|
| `playwright.config.ts` → `timeout` | 30s | 45s | A single test previously included the ~11s+ TTFB inside its overall budget, plus everything after. Genuinely too tight for this target, not padding for its own sake. |
| `playwright.config.ts` → `expect.timeout` | 5s | 10s | An AJAX-driven "Add to cart" modal missed the 5s default while the origin was slow -- the assertion was correct, the server just hadn't responded. |
| `BasePage.goto()` → `waitUntil` | `'load'` (waits for every image/font/ad iframe) | `'domcontentloaded'` | `'load'` stacks the full resource wait on top of the slow TTFB. Cut a real navigation from timing out at 45s to completing in 14-21s in testing. Locator actions (`click`/`fill`) still auto-wait for their own target regardless, so no real safety is lost. |

**If you point this framework at a different target, re-check these rather than carrying them over.** A well-provisioned production app may need none of this -- the defaults exist for a reason and are usually right. `'domcontentloaded'` specifically carries a real caveat worth re-testing for: it doesn't wait for a page's own scripts to finish attaching their event handlers, so a front-end that genuinely depends on the `'load'` event before wiring up interactive behaviour could see a click land before its handler exists -- this target's `Add to cart` button turned out not to have that dependency, but that was confirmed by testing here, not assumed, and a different target could easily differ. The `curl -w` command above is a fast first check before deciding whether to retune anything: profile the actual target, the same way these three values were derived from evidence here, not guessed.

**None of this fixes a genuine connection reset** (`ERR_CONNECTION_RESET`, distinct from a timeout) -- only a retry does, which is why `retries: process.env.CI ? 2 : 1` exists independently of the values above.

## Reporting

| Layer | What it's for | Where to find it |
|---|---|---|
| **Playwright HTML report** | Fast, built-in, single-run diagnostics: screenshots, traces, timelines on failure. Not meant to retain history across runs -- it's a snapshot of the last run, and Playwright overwrites `playwright-report/` every time by design. | `npm run report`; downloadable CI artifact |
| **Allure report** | Richer breakdown (suites, categories, behaviors) **and trend graphs across runs** (pass/fail, duration, retries over time). | `npm run report:allure`; downloadable CI artifact |
| **GitHub Actions job summary** | Fast visibility, no download. | Actions tab → the run itself |
| **Teams failure alert** | Push notification, only fires on failure. | Posted to the connected Teams chat |

**Never open a downloaded Allure report by double-clicking `index.html`** — it needs `npx allure open <folder>` (browsers block the background requests it needs when opened from disk). On Azure DevOps specifically, the official `PublishAllureReport@2` task solves this natively by embedding the report as a pipeline tab — see the comment above "Generate Allure Report" in `.github/workflows/playwright.yml`.

**Local Allure trend graphs survive across runs on the same machine.** `npm run report:allure` runs `scripts/generate-allure-report.js`, not a bare `allure generate` -- `allure generate --clean` wipes its output folder every time, which would silently discard the previous report's `history/` folder (exactly what draws the trend graphs) along with it. The script copies that folder forward into `allure-results/history` before generating, so each local run adds a point to the trend instead of resetting it. (This previously ran `allure serve`, which builds into a temp directory and never persisted a report at all -- no history could accumulate.) CI generates fresh each run with no prior history to carry forward; giving CI its own persisted trend would need downloading the previous run's artifact first, which is a larger change than a local dev convenience and is intentionally out of scope here — see [Future Considerations](#future-considerations).

## Design Decisions

- **Page Object Model + API client pattern**, both extending shared base classes. Shared, cross-page UI elements (e.g. the footer) become their own **component**, not duplicated per page.
- **Fixtures over manual instantiation** — one valid pattern among several (Java-style base-class inheritance is another), chosen for being Playwright/TypeScript's idiomatic approach. Fixtures give tests dependency injection (declare what you need, not how it's built), automatic per-test setup/teardown (`apiFixtures.ts` disposes its `APIRequestContext` after every test without any spec having to remember to), composability (fixtures can depend on other fixtures), and type safety via `test.extend<Fixtures>`. The `page` fixture override in `pageFixtures.ts` is a concrete example: every test automatically gets ad-domains blocked, with zero tests aware it's happening.
- **Test data is split by what's safe to commit.** Structural/scenario data is committed; anything credential-shaped or uniqueness-sensitive is generated at runtime — committing plausible fake credentials to a public repo would let anyone register those exact accounts and silently break the tests later.
- **Validation is tested per layer, not per field** — browser, server, and business-rule rejections are separate tests, so one layer's failure can never mask another's.
- **Explore before asserting.** Where a response shape or API contract wasn't already confirmed (e.g. `updateAccount`'s required HTTP method, `getUserDetailByEmail`'s field-naming inconsistency with the create endpoint), a temporary exploratory test logged the real response first — assertions were written from evidence, not assumptions.
- **Data source is chosen deliberately per case**: Excel where a non-technical stakeholder might realistically edit the data (search terms, quantities); JSON for anything nested or structural (account profiles, scenario metadata); Faker for anything that must never be predictable (credentials, subscription emails).

## Future Considerations

**Already built:**
- Page Object Model + API client pattern, shared base classes
- `config/env.ts` — env-driven config for URLs and the shared `env.testUser` credentials
- Fixtures, path aliases, tsconfig
- Feature-organized folder structure
- GitHub Actions CI: secrets, job summary, Teams alert, dual report artifacts
- Excel + JSON + Faker data strategies, chosen deliberately per case
- Layered field-validation testing
- Full API resource lifecycle (CRUD) testing
- Place Order / checkout flow (TC14-16), authenticated via a cached `storageState` for a throwaway account seeded via the API once per worker — see [Authenticated Tests](#authenticated-tests)
- Local Allure trend/history graphs, preserved across runs via `scripts/generate-allure-report.js`
- Empty-field validation tests (login + signup), kept separate from the credential-value tests in `login.spec.ts` as a distinct concern

**Parked / deliberately deferred:**
- CI-side Allure trend history — local history persists on one machine already; giving CI the same trend would mean downloading the previous run's artifact before generating, a larger change than today's local fix
- Currents (hosted dashboard) or a GitHub Pages dated-archive, as alternatives to Allure
- A real secrets vault, once there's a team and multiple environments

**Explicitly out of scope for this repo:** k6 load testing — deliberately excluded as it runs under a different tool/runtime and belongs in its own separate project, not bolted onto this one.

## Status

- [x] Login, Products, Cart, Checkout, Newsletter (UI)
- [x] Products, Account CRUD lifecycle, layered validation (API)
- [x] CI pipeline — secrets, cross-browser matrix, job summary, Teams alert, dual reporting
- [x] Excel, JSON, and Faker data strategies, each used deliberately
- [x] Place Order / checkout flow
- [x] Per-worker seeded accounts + cached `storageState` for checkout (no shared auth state)
- [x] Allure trend/history retained across local runs
- [x] Empty-field validation tests (login + signup)
- [ ] CI-side Allure trend history