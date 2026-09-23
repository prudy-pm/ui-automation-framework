# UI Automation Framework

End-to-end UI and API test automation for [AutomationExercise](https://automationexercise.com), built with Playwright and TypeScript using the Page Object Model. Designed as a reusable foundation, not a one-off demo — see [Future Considerations](#future-considerations) for what changes when this points at a live product.

## Getting Started

**Prerequisite:** Node.js LTS.

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
`.env` is gitignored.

Note the trailing slash on `API_BASE_URL` — required for correct URL resolution against the API clients' relative paths.

**Getting a `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`.** `env.testUser` must be a real, already-registered account on automationexercise.com — the suite only logs in with it (UI login, API `verifyLogin`), it never signs one up automatically. To get one:
1. Go to automationexercise.com and use **Signup / Login** to register a new account. This is a public practice site with no real payment or personal data involved, so a dedicated test-only account is expected and normal — don't reuse a real personal password here. This is a one-time setup step: the same account is reused indefinitely, including for the checkout flow's shared session (see [Authenticated Tests](#authenticated-tests)).
2. Put that account's email/password into your local `.env` only. `.env` is gitignored — it never gets committed, and the values never belong in code, docs, commit messages, or chat.
3. For CI, the same two values are configured as repository secrets (`TEST_USER_EMAIL`, `TEST_USER_PASSWORD` — see `.github/workflows/playwright.yml`), not read from any file in the repo. If you're standing up CI on a fork or new remote, set those (plus `BASE_URL`, `API_BASE_URL`, `TEAMS_WEBHOOK_URL`) under your CI provider's secrets/variables settings.

No test ever deletes or mutates this account (the one spec that reuses its email for `updateAccount` deliberately sends the wrong HTTP method to test a 405 rejection, not a real update).

`config/globalSetup.ts` logs in with this account once before the suite runs and **aborts the whole run if that login fails** — so a wrong/missing password fails every test, not just the login ones. See [Troubleshooting](#troubleshooting) if that happens.

**Allure reports require a local JDK (Java 8+).** Run `java -version` to confirm. If missing, install one (e.g. [Eclipse Temurin](https://adoptium.net)) — this only affects local report generation; CI is unaffected.

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
```

## Troubleshooting

- **Every test fails immediately, at setup.** Almost always a missing/wrong test account — see [Getting Started](#getting-started). `globalSetup.ts` aborts the whole run if it can't log in.
- **`report:allure:single` fails locally.** Needs a local JDK (Java 8+) — `java -version` to confirm. CI is unaffected.
- **Tests time out or fail intermittently, but pass on retry.** automationexercise.com is a free public demo site with no SLA — a plain `curl -sS -o /dev/null -w "ttfb: %{time_starttransfer}s\n" https://automationexercise.com/products` regularly shows 10+ second time-to-first-byte. This repo already accounts for that: longer test/expect timeouts, `domcontentloaded` instead of `load` for navigation, and `retries: process.env.CI ? 2 : 1`. A genuine connection reset (`ERR_CONNECTION_RESET`, not a timeout) is only fixed by the retry, not a longer timeout. If pointing this framework at a different, better-provisioned target, re-check these rather than carrying them over — they exist because of this specific site, not as general-purpose padding.
- **Run a subset instead of the full suite:**
  ```bash
  npx playwright test tests/ui/auth/login.spec.ts   # one file
  npx playwright test --project=chromium              # one browser
  npx playwright test --grep "@smoke"                   # one tag (or combine with the above)
  ```

## Tech Stack

- **Playwright Test** (`@playwright/test`) — test runner, browser automation, and API testing (`request` fixture)
- **TypeScript** — type-safe tests, page objects, API clients, and fixtures
- **@faker-js/faker** — generates test data at runtime instead of committing static/predictable values
- **xlsx** (installed via SheetJS's official CDN, not the unmaintained npm registry copy) — reads Excel-based test data
- **dotenv** — environment-based config for URLs and credentials
- **Playwright HTML Reporter** + **Allure Report** + **Monocart** — reporting layers (see [Reporting](#reporting))
- **@estruyf/github-actions-reporter** — writes a pass/fail summary directly to the GitHub Actions run page

## Project Structure

```
ui-automation-framework/
├── tests/
│   ├── ui/
│   │   ├── auth/                    # login, empty-field validation
│   │   ├── products/                 # search (Excel-driven), add to cart
│   │   ├── cart/                      # add/remove/price, quantity (JSON-driven)
│   │   ├── checkout/                   # full flow, chromium-only, shared session
│   │   └── newsletter/                  # home + cart pages (Faker-driven)
│   └── api/                              # products, account CRUD lifecycle, layered validation
├── pages/                                  # Page Object Model classes, all extending BasePage
│   └── FooterComponent.ts                   # shared, cross-page component
├── api/                                      # API client classes, all extending BaseApiClient
├── fixtures/                                  # pageFixtures.ts, apiFixtures.ts
├── data/                                       # JSON, one Excel example, TS types
├── config/                                      # env.ts, authFile.ts, globalSetup.ts
├── utils/                                        # faker wrappers, excelData, accountFactory,
│                                                    allureTags.ts (report tagging), step.ts (@step decorator)
├── reporting/                                      # everything specific to Allure/Monocart reporting
│   ├── docs/                                         # allure.md, monocart.md -- config & rationale
│   ├── scripts/                                       # release-summary.js, coverage-gaps.js, archive-reports.js
│   └── data/featureInventory.json                      # hand-kept coverage list, vs the site's documented cases
├── .env.example
├── tsconfig.json                                        # @pages/@fixtures/@config/@data/@utils/@api aliases
└── playwright.config.ts                                   # chromium/firefox/webkit; checkout is chromium-only
```

Tests are grouped by **feature**, not by type. Tests are tagged (`@smoke`, `@regression`) so subsets can be run independently.

## What's Covered

**UI:**
- Login — valid credentials, data-driven invalid credentials (Faker-generated, not committed), browser-validation edge case
- Empty-field validation — login (email, password) and signup (name, email) each reject an empty required field client-side before any request is sent; kept separate from the credential-value tests
- Products — Excel-driven search, add to cart
- Cart — add/verify price, remove/verify gone, quantity carries through correctly from product detail page (JSON-driven)
- Checkout — full add-to-cart → address review → order comment → card payment → confirmation flow, starting from a cached `storageState` for the shared test user (see [Authenticated Tests](#authenticated-tests))
- Newsletter subscription — home page and cart page, both using a shared `FooterComponent` (Faker-generated emails)

**API:**
- Products — list, search
- Account — login verification (valid/invalid), duplicate-email rejection (a real documented AutomationExercise test case), wrong-HTTP-method rejection (discovered via exploratory testing, not assumed), and a full **Create → Read → Update → Read → Delete** lifecycle that verifies each write actually persisted by reading it back, not just trusting the response code

## How It's Built

- **pages/ and api/ mirror each other** — every page object extends `BasePage`, every API client extends `BaseApiClient`, so the same pattern applies whether a spec is driving the browser or calling the API directly.
- **fixtures/ wires it all into tests** — `pageFixtures.ts` and `apiFixtures.ts` inject page objects/API clients via Playwright's fixture system (declare what a test needs, not how it's built), instead of each spec constructing them by hand.
- **`data/` vs `reporting/data/`** — `data/` holds test input (JSON, one Excel file, Faker-generated at runtime for anything that must stay unpredictable); `reporting/data/featureInventory.json` is a separate, hand-kept coverage record, not test input.
- **`utils/` vs reporting-specific code** — shared helpers (faker wrappers, `excelData`, `accountFactory`) sit alongside the two reporting-tagging files (`allureTags.ts`, `step.ts`), which are used across every spec and page object despite `reporting/` existing as its own folder.

### Authenticated Tests

Most UI specs (login, products, cart, newsletter) run as a guest with a fresh, empty browser context every test. Checkout is different: automationexercise.com requires a logged-in account before it will show the checkout page at all.

`config/globalSetup.ts` logs in once before the suite, via the UI, as `env.testUser`, and saves the session with `context.storageState({ path: AUTH_FILE })`. It runs as global setup, not as a test, so it never appears in reports as a scenario. `checkout.spec.ts` then just declares which session it wants:

```ts
import { AUTH_FILE } from '@config/authFile';

test.use({ storageState: AUTH_FILE });
```

**Why checkout runs on chromium only.** Reusing one account's session means reusing that account's server-side cart — running the *same* checkout test concurrently across multiple browser projects against one cart is a real, previously-found source of race-condition bugs. `firefox`/`webkit` both set `testIgnore` on `tests/ui/checkout/`, so only one instance of that test ever touches the cart at a time, regardless of worker count. `checkout.spec.ts` still calls `cartPage.clearCart()` as its first step, since the shared cart carries over between runs.

## Reporting

| Layer | What it's for | Where to find it |
|---|---|---|
| **Playwright HTML report** | Fast, built-in, single-run diagnostics: screenshots, traces, timelines on failure. A snapshot of the last run only — Playwright overwrites `playwright-report/` every time. | `npm run report`; downloadable CI artifact |
| **Allure single-file report** | Suites, behaviors (epic → feature → story), severity, categories, retries and per-test steps in one self-contained `index.html` (attachments embedded), opens by double-click with no server. Configuration and rationale: [`reporting/docs/allure.md`](reporting/docs/allure.md). | `npm run report:allure:single` → `allure-report-single/`; downloadable CI artifact |
| **Monocart report** | Grid of every test with Layer / Epic / Feature / Story / Severity columns, tags, flaky marks and steps, all searchable/sortable. `zip: true` bundles HTML, JSON and every attachment into one `.zip`. Configuration and rationale: [`reporting/docs/monocart.md`](reporting/docs/monocart.md). | `monocart-report/index.zip` after any run; `npm run report:monocart` to view; downloadable CI artifact |
| **Release summary** | One page answering "is this build safe to release?": critical-path (`@smoke`) verdict, real failures, flaky tests, coverage by feature, gaps, and trend against earlier runs of the same size. | `npm run report:summary` → `release-summary/index.html`; downloadable CI artifact |
| **Teams failure alert** | Push notification, only fires on failure. | Posted to the connected Teams chat |

**How the reports are used.** Both Allure single-file and Monocart are kept, deliberately, as the shareable reports (emailable, no server, not tied to a git host) — each has strengths the other doesn't (Allure: Behaviors tree, descriptions, bug links; Monocart: sortable/searchable columns, a single-file trend). Any change to what the reports show is made so it reaches both — see each report's own file for exactly how.

**Where the information comes from.** Specs stay plain. `utils/allureTags.ts` (`tagAllure` per `describe` sets epic/feature/story/severity, layer derived automatically from the spec's path, and pushes the same values as Playwright annotations for Monocart) and `utils/step.ts` (the `@step` decorator on page-object methods turns each call into a named step, read by both reports) supply everything both reports show.

## Future Considerations

Things this repo deliberately hasn't done, given its current context and scale — not a backlog, just an honest record of what wasn't justified here:

- **CI-side Allure trend history** — not implemented; would need downloading the previous run's artifact before each report generation.
- **Currents (hosted test dashboard)** — evaluated, not adopted: no free tier justifies the cost at this project's scale.
- **Credentials** currently live in `.env` locally and CI/repo secrets — no vault or rotation strategy considered at this project's scale.
