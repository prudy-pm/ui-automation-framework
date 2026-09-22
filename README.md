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
│   │   ├── cart/            # add/remove, price (JSON-driven) & quantity (JSON-driven) verification
│   │   ├── checkout/         # full add-to-cart -> pay -> confirm flow (shared session via storageState, chromium-only)
│   │   └── newsletter/       # subscription from home & cart pages (Faker-driven)
│   └── api/                  # products, account CRUD lifecycle, layered validation
├── pages/                     # Page Object Model classes, all extending BasePage
│   └── FooterComponent.ts       # shared, cross-page component (not tied to one page)
├── api/                        # API client classes, all extending BaseApiClient
├── fixtures/                    # pageFixtures.ts and apiFixtures.ts
├── data/                         # JSON, nested JSON, and one deliberate Excel example + TS types
├── config/                        # env.ts (URL/credentials), authFile.ts (shared storageState path), globalSetup.ts (pre-flight catalog check + test-user login)
├── utils/                          # generateUniqueEmail, faker wrappers, readExcelSheet, accountFactory, allureTags.ts (report tagging), step.ts (@step decorator)
├── scripts/                         # release-summary.js, coverage-gaps.js, archive-reports.js, run-demo.js -- report helpers (see Reporting)
├── docs/reporting/                   # allure.md, monocart.md -- each report's own configuration and rationale
├── .env.example
├── tsconfig.json                    # @pages/@fixtures/@config/@data/@utils/@api aliases
└── playwright.config.ts               # chromium/firefox/webkit projects; checkout runs on chromium only
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

**Getting a `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`.** `env.testUser` must be a real, already-registered account on automationexercise.com — the suite only logs in with it (UI login, API `verifyLogin`), it never signs one up automatically. To get one:
1. Go to automationexercise.com and use **Signup / Login** to register a new account. This is a public practice site with no real payment or personal data involved, so a dedicated test-only account is expected and normal — don't reuse a real personal password here. This is a one-time setup step: the same account is reused indefinitely (see below), including for the checkout flow's shared session (see [Authenticated Tests](#authenticated-tests)).
2. Put that account's email/password into your local `.env` only. `.env` is gitignored — it never gets committed, and the values never belong in code, docs, commit messages, or chat.
3. For CI, the same two values are configured as repository secrets (`TEST_USER_EMAIL`, `TEST_USER_PASSWORD` — see `.github/workflows/playwright.yml`), not read from any file in the repo. If you're standing up CI on a fork or new remote, set those (plus `BASE_URL`, `API_BASE_URL`, `TEAMS_WEBHOOK_URL`) under Settings → Secrets and variables → Actions.

No test ever deletes or mutates this account (confirmed: the one spec that reuses its email for `updateAccount` deliberately sends the wrong HTTP method to test a 405 rejection, not a real update) — the same account works indefinitely.

`config/globalSetup.ts` logs in with this account once before the suite runs and **aborts the whole run if that login fails** — so a wrong/missing password fails every test, not just the login ones. If you see every test failing at setup, check `.env` first.

**Allure reports require a local JDK (Java 8+)** — run `java -version` to confirm. This only affects local report generation; CI is unaffected.

## Running Tests

```bash
npm test                    # everything
npm run test:ui              # UI suite only
npm run test:api             # API suite only
npm run test:smoke           # @smoke-tagged tests only
npm run test:regression      # @regression-tagged tests only
npm run report               # open the last Playwright HTML report
npm run report:allure:single # one-file Allure report (open the generated index.html)
npm run report:monocart      # open the Monocart report
npm run report:summary       # one-page release-readiness summary of the last run
npm run report:gaps          # what is / is not automated, vs the site's documented cases
npm run report:archive       # copy the current reports to reports-archive/<date>/
npm run test:demo            # the intentional-failure demo tests (excluded from normal runs)
```

## What's Covered

**UI:**
- Login — valid credentials, data-driven invalid credentials (Faker-generated, not committed), browser-validation edge case
- Empty-field validation — login (email, password) and signup (name, email) each reject an empty required field client-side before any request is sent; a distinct concern from the credential-value tests above, kept in its own spec
- Products — Excel-driven search, add to cart
- Cart — add/verify price, remove/verify gone, quantity carries through correctly from product detail page (JSON-driven)
- Checkout — full add-to-cart → address review → order comment → card payment → confirmation flow, starting from a cached `storageState` for the shared test user (see [Authenticated Tests](#authenticated-tests))
- Newsletter subscription — home page and cart page, both using a shared `FooterComponent` (Faker-generated emails)

**API:**
- Products — list, search
- Account — login verification (valid/invalid), duplicate-email rejection (a real documented AutomationExercise test case), wrong-HTTP-method rejection (discovered via exploratory testing, not assumed), and a full **Create → Read → Update → Read → Delete** lifecycle that verifies each write actually persisted by reading it back, not just trusting the response code

## Authenticated Tests

Most UI specs (login, products, cart, newsletter) run as a guest and get a fresh, empty browser context every test — no login needed, nothing to reset. Checkout is different: automationexercise.com requires a logged-in account before it will show the checkout page at all.

`config/globalSetup.ts` logs in once before the suite, via the UI, as the same `env.testUser` the API and login tests already use, and saves the session with `context.storageState({ path: AUTH_FILE })`. It runs as global setup, not as a test, so it does not appear in reports as a scenario; a login failure aborts the run with a clear error (retried once first). `checkout.spec.ts` then just declares which session it wants, in plain sight at the top of the file:

```ts
import { AUTH_FILE } from '@config/authFile';

test.use({ storageState: AUTH_FILE });
```

No account is created or deleted for this — `env.testUser` is a real, pre-existing account, not throwaway data, so there's nothing to clean up.

**Why checkout runs on chromium only.** Reusing one account's session means reusing that account's server-side cart. Running the *same* checkout test concurrently across multiple browser projects against that one cart is exactly how this repo found a real corrupted-total bug before (three concurrent runs racing one cart). Rather than build isolation machinery to make concurrent reuse safe, checkout is restricted to a single project — `firefox`/`webkit` both set `testIgnore` on `tests/ui/checkout/`. A full paid checkout journey doesn't need to prove itself cross-browser the same way a cheap smoke check does, and with only one project ever running it, there is only ever one instance of that test touching that account's cart at a time — nothing left to race, regardless of how many Playwright workers are running.

**A design this repo tried and moved away from:** an earlier version gave every Playwright *worker* its own throwaway account (created/deleted via the API per worker) specifically so checkout could run fully parallel across all three browsers at once. That worked, but it was real infrastructure — per-worker account lifecycle, cached per-worker `storageState` — built to support exactly one test, and it obscured the actual point of `storageState` (skip re-running the login UI) behind machinery solving a concurrency problem checkout doesn't need to have. The current design is deliberately simpler: one account, one session, one project.

`checkout.spec.ts` still calls `cartPage.clearCart()` as its first step — the shared account's cart carries over between runs regardless of which design backs the session, so this stays necessary either way.

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
| **Allure single-file report** | Suites, behaviors (epic → feature → story), severity, categories, retries and per-test steps in one self-contained `index.html` (attachments embedded), so it opens by double-click with no server. No trend graphs (an Allure limitation for single-file output). Configuration and rationale: [`docs/reporting/allure.md`](docs/reporting/allure.md). | `npm run report:allure:single` → `allure-report-single/`; downloadable CI artifact |
| **Monocart report** | Grid of every test with Feature / Story / Severity columns, tags, flaky marks and steps. `zip: true` bundles HTML, JSON and every attachment (screenshots, traces) into one `.zip`. Configuration and rationale: [`docs/reporting/monocart.md`](docs/reporting/monocart.md). | `monocart-report/index.zip` after any run; `npm run report:monocart` to view; downloadable CI artifact |
| **Release summary** | One page answering "is this build safe to release?": critical-path (`@smoke`) verdict, real failures, flaky tests, scenarios vs browser runs, coverage by feature, what is not automated, trend against earlier runs of the same size, and what was tested. Built from Monocart's data by `scripts/release-summary.js`. | `npm run report:summary` → `release-summary/index.html`; downloadable CI artifact |
| **GitHub Actions job summary** | Fast visibility, no download. | Actions tab → the run itself |
| **Teams failure alert** | Push notification, only fires on failure. | Posted to the connected Teams chat |

**How the reports are used.** Playwright's HTML report is for developers debugging a failure locally. Allure single-file and Monocart are both kept, deliberately, as the shareable reports (emailable, no server, not tied to a git host) -- each has strengths the other doesn't (Allure: Behaviors tree, descriptions, bug links; Monocart: sortable/searchable columns, a single-file trend, no server needed even for extra features), and picking one over the other hasn't been necessary yet. Any change to what the reports show (tags, steps, build info) is made so it reaches both -- see each report's own file below for exactly how. The release summary is for a reader who needs a decision, not a test list.

**Where the information comes from.** Specs stay plain. Everything both reports show is supplied by shared code: `utils/allureTags.ts` (`tagAllure` per `describe` sets epic/feature/story, with severity taken from the `@smoke` title tag, and pushes the same values as Playwright annotations for Monocart; `describeTest` and `linkIssue` add a description and a bug link, Allure-only) and `utils/step.ts` (the `@step` decorator on page-object methods turns each call into a named step such as "Cart: proceed to checkout", read by both reports). Per-report configuration specifics live in their own files, not here: [`docs/reporting/allure.md`](docs/reporting/allure.md) and [`docs/reporting/monocart.md`](docs/reporting/monocart.md).

**Why the folder-based Allure report was removed.** It needed `npx allure open` (browsers block its background requests from disk), and its one advantage, trend graphs, depended on a script that carried `history/` forward on one machine -- kept as a documented, working reference in the separate `allure-reporting-reference` project rather than in this repo. The release summary now provides the trend, comparing only against earlier runs with the same number of browser runs, so partial runs don't distort it. Trend is local to one machine; CI has no earlier runs to compare with, and persisting them (download the previous artifact first) is out of scope for now — see [Future Considerations](#future-considerations).

**Intentional failures.** `@demo` tests fail on purpose (to show how failures look). They are excluded from normal runs (`grepInvert` in `playwright.config.ts`), so they can't fake a red build; run them with `npm run test:demo`.

## Design Decisions

- **Page Object Model + API client pattern**, both extending shared base classes. Shared, cross-page UI elements (e.g. the footer) become their own **component**, not duplicated per page.
- **Fixtures over manual instantiation** — one valid pattern among several (Java-style base-class inheritance is another), chosen for being Playwright/TypeScript's idiomatic approach. Fixtures give tests dependency injection (declare what you need, not how it's built), automatic per-test setup/teardown (`apiFixtures.ts` disposes its `APIRequestContext` after every test without any spec having to remember to), composability (fixtures can depend on other fixtures), and type safety via `test.extend<Fixtures>`. The `page` fixture override in `pageFixtures.ts` is a concrete example: every test automatically gets ad-domains blocked, with zero tests aware it's happening.
- **Test data is split by what's safe to commit.** Structural/scenario data is committed; anything credential-shaped or uniqueness-sensitive is generated at runtime — committing plausible fake credentials to a public repo would let anyone register those exact accounts and silently break the tests later.
- **Validation is tested per layer, not per field** — browser, server, and business-rule rejections are separate tests, so one layer's failure can never mask another's.
- **Explore before asserting.** Where a response shape or API contract wasn't already confirmed (e.g. `updateAccount`'s required HTTP method, `getUserDetailByEmail`'s field-naming inconsistency with the create endpoint), a temporary exploratory test logged the real response first — assertions were written from evidence, not assumptions.
- **Data source is chosen deliberately per case**: Excel for exactly one case where a non-technical stakeholder might realistically edit the data (`productSearchTerms.xlsx`) — product quantities used to be a second Excel file too, but it proved the same mechanism a second time without teaching anything new, so it moved to JSON instead; JSON for anything nested/structural (account profiles, scenario metadata) or simple enough not to need a spreadsheet; Faker for anything that must never be predictable (credentials, subscription emails).

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
- Place Order / checkout flow (TC14-16), authenticated via a cached `storageState` for the shared test user, produced in global setup — see [Authenticated Tests](#authenticated-tests)
- Release summary with local trend, and coverage-gap tracking against the site's documented test cases (`npm run report:summary`, `npm run report:gaps`)
- Empty-field validation tests (login + signup), kept separate from the credential-value tests in `login.spec.ts` as a distinct concern

**Report clean-up plan (in order):** the reports must answer "is this build safe to release?" -- smoke pass/fail, real failures by severity, coverage vs gaps, trend -- before we pick one.
1. Stale Allure results cleared each run -- done (`playwright.config.ts`)
2. `@demo` tests excluded from normal runs -- done (`npm run test:demo` to opt in)
3. Login setup no longer counts as a test -- done (moved to `config/globalSetup.ts`); scenarios vs browser runs are counted separately on the release summary
4. Tag every spec with epic / feature / severity -- done (`utils/allureTags.ts`; feeds Allure Behaviors and Monocart columns)
5. Flaky (passed-on-retry) tests are already flagged by both reports; base URL, configured browsers, framework commit and run type added to both -- done
6. Failure explanation -- done for now: `describeTest()` on every @smoke test, `linkIssue(id)` to a placeholder tracker URL (`ISSUE_URL` in `utils/allureTags.ts`; demo failures show it), both from the Allure runtime API in `allure-js-commons`. Keep Playwright `test.step` (works in every report) rather than `allure.step`. Steps now come from the `@step` decorator (`utils/step.ts`) on page-object methods, so specs stay plain and new specs get steps for free; `allure.owner` skipped (single maintainer)
7. Gaps -- draft done: `data/featureInventory.json` holds the site's 26 UI test cases and 14 APIs, each tagged `layer: ui|api`, with hand-kept coverage (full/partial/none) and risk; `npm run report:gaps` lists gaps per layer by risk and fails if a cited spec no longer exists. Risk levels are a first draft to be reviewed. Gap counts and the high-risk gaps appear on the release summary
8. Trend over time -- done, local only (release summary compares with earlier runs of the same size)
9. Hide fixture/hook noise -- done for Allure (`detail: false` in playwright.config.ts; Monocart/HTML unaffected). Allure shows only `test.step` steps, which the `@step` page-object decorator now supplies for every spec
10. Folder-based Allure report removed -- done (script, npm command, CI steps; the technique itself is preserved as a working reference in the separate `allure-reporting-reference` project). Decided: both Allure single-file and Monocart are kept long-term, not narrowed to one -- each documented on its own in [`docs/reporting/allure.md`](docs/reporting/allure.md) / [`docs/reporting/monocart.md`](docs/reporting/monocart.md)

**Parked / deliberately deferred:**
- CI-side Allure trend history — local history persists on one machine already; giving CI the same trend would mean downloading the previous run's artifact before generating, a larger change than today's local fix
- Currents (hosted dashboard) — ruled out for this repo specifically: no free tier as of its 2026 pricing revamp (cheapest plan $49/mo), not justifiable without a paying project behind it
- GitHub Pages / Bitbucket static hosting / Bitbucket's native Tests tab, as report-delivery alternatives — all rejected: GitHub Pages doesn't survive the planned move off GitHub, Bitbucket's static hosting is always public regardless of repo privacy and capped at one site per workspace, and Bitbucket's Tests tab is Standard/Premium-plan-only and shows failures only
- A real secrets vault, once there's a team and multiple environments

**Explicitly out of scope for this repo:** k6 load testing — deliberately excluded as it runs under a different tool/runtime and belongs in its own separate project, not bolted onto this one.

## Status

- [x] Login, Products, Cart, Checkout, Newsletter (UI)
- [x] Products, Account CRUD lifecycle, layered validation (API)
- [x] CI pipeline — secrets, cross-browser matrix, job summary, Teams alert, dual reporting
- [x] Excel, JSON, and Faker data strategies, each used deliberately
- [x] Place Order / checkout flow
- [x] Shared test-user session via global setup + cached `storageState` for checkout (chromium-only)
- [x] Allure trend/history retained across local runs
- [x] Empty-field validation tests (login + signup)
- [ ] CI-side Allure trend history