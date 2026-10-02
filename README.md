# UI Automation Framework

End-to-end UI and API test automation for [AutomationExercise](https://automationexercise.com), built with Playwright and TypeScript using the Page Object Model. Designed as a reusable foundation, not a one-off demo — see [Future Considerations](#future-considerations) for what changes when this points at a live product.

## Getting Started

**Prerequisite:** Node.js LTS.

**Clone the repository:**
```bash
git clone <this-repository-url>
cd ui-automation-framework
```

```bash
npm install
npx playwright install
```

**`.env.example` is a ready-to-use template, checked into this repo** — copy it to `.env`, then replace the two `{{...}}` placeholders with your own values (everything else can stay as-is):
```bash
cp .env.example .env
```
```
BASE_URL=https://automationexercise.com
API_BASE_URL=https://automationexercise.com/api/
TEST_USER_EMAIL={{TestUsername}}                    # <- replace with your test account's email
TEST_USER_PASSWORD={{ReplaceThisWithRealPassword}}  # <- replace with your test account's password
```

**Never commit `.env`.** It's gitignored by default — confirm it stays that way; once you've filled in the placeholders above, it holds a real password.

Note the trailing slash on `API_BASE_URL` — required for correct URL resolution against the API clients' relative paths.

**Getting a `TEST_USER_EMAIL` / `TEST_USER_PASSWORD`.** `env.testUser` must be a real, already-registered account on [automationexercise.com](https://automationexercise.com) — the suite only logs in with it (UI login, API `verifyLogin`), it never signs one up automatically:

- Go to [automationexercise.com](https://automationexercise.com) and use **Signup / Login** to register a new account.
- This is a public practice site with no real payment or personal data involved, so a dedicated test-only account is expected and normal — don't reuse a real personal password here.
- This is a one-time setup step: the same account is reused indefinitely, including for the checkout flow's shared session (see [`ARCHITECTURE.md`](ARCHITECTURE.md) for why that's safe).
- Replace the `{{TestUsername}}` / `{{ReplaceThisWithRealPassword}}` placeholders in your local `.env` with that account's real email/password — never in code, docs, commit messages, or chat.
- `.env` is gitignored — it never gets committed.

`config/globalSetup.ts` logs in with this account once before the suite runs and **aborts the whole run if that login fails** — so a wrong/missing password fails every test, not just the login ones. See [Troubleshooting](#troubleshooting) if that happens.

Want to run this in a pipeline? See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the required secrets.

**Allure reports require a local JDK (Java 8+).** Run `java -version` to confirm. If missing, install one (e.g. [Eclipse Temurin](https://adoptium.net)) — this only affects local report generation; CI is unaffected.

## Running Tests

```bash
npm test                     # everything
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
npm run report:scan-secrets  # fail if any .env secret appears in any report -- run before sharing one
```

## Troubleshooting

- **Everything looks broken immediately after cloning (editor errors, the Playwright test extension failing to list tests).** Expected — `config/env.ts` fails fast at import time if `.env` doesn't exist yet. Create it first (see [Getting Started](#getting-started)) and this clears.
- **Every test fails immediately, at setup.** Almost always a missing/wrong test account — see [Getting Started](#getting-started). `globalSetup.ts` aborts the whole run if it can't log in.
- **`report:allure:single` fails locally.** Needs a local JDK (Java 8+) — `java -version` to confirm. CI is unaffected.
- **Tests time out or fail intermittently, but pass on retry.** Expected — [automationexercise.com](https://automationexercise.com) is a free public demo site with no SLA, and this repo already accounts for it (longer timeouts, retries). Full reasoning and evidence: [`ARCHITECTURE.md`](ARCHITECTURE.md).
- **Run a subset instead of the full suite:**
  ```bash
  npx playwright test tests/ui/auth/login.spec.ts       # one file
  npx playwright test --project=chromium                # one browser
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
│   ├── ui/              # auth, products, cart, checkout, newsletter -- feature-organized specs
│   └── api/             # products, account CRUD lifecycle, layered validation
├── pages/               # Page Object Model classes extending BasePage, plus FooterComponent (shared)
├── api/                 # API client classes, all extending BaseApiClient
├── fixtures/            # pageFixtures.ts, apiFixtures.ts
├── data/                # JSON, one Excel example, TS types
├── config/              # env.ts, authFile.ts, globalSetup.ts
├── utils/               # faker wrappers, excelData, accountFactory, allureTags.ts, step.ts
├── reporting/           # everything specific to Allure/Monocart reporting
│   ├── docs/            # allure.md, monocart.md
│   ├── scripts/         # release-summary.js, coverage-gaps.js, archive-reports.js, scan-secrets.js
│   ├── data/            # featureInventory.json -- hand-kept coverage list
│   └── report-examples/ # a committed Allure + Monocart report from one CI run
├── ARCHITECTURE.md      # why the codebase is built the way it is
├── .env.example         # template for your local .env (see Getting Started)
├── tsconfig.json        # @pages/@fixtures/@config/@data/@utils/@api aliases
└── playwright.config.ts # chromium/firefox/webkit; checkout is chromium-only
```

Tests are grouped by **feature**, not by type. Tests are tagged (`@smoke`, `@regression`) so subsets can be run independently. For how the codebase is organized and the reasoning behind it, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

## Approach

The scenarios automated here are less important than the patterns behind them — this table points at *how* things are structured, since that's what's meant to carry over to a real project:

| Pattern | Where to look |
|---|---|
| Data-driven tests using runtime-generated fake data (not committed) | `tests/ui/auth/login.spec.ts` (invalid credentials), `tests/ui/newsletter/newsletter.spec.ts` (Faker-generated emails via the shared `FooterComponent`) |
| Data-driven tests using an Excel source | `utils/excelData.ts` + `tests/ui/products/productsSearch.spec.ts` (reads `data/productSearchTerms.xlsx`) |
| Data-driven tests using committed JSON fixtures | `tests/ui/cart/productQuantity.spec.ts` (`data/productQuantities.json`), `tests/api/auth.spec.ts` (`data/accountProfiles.json`) |
| One authenticated session shared across a whole suite (global sign-in) | `config/globalSetup.ts` — logs in once and caches `storageState`, reused by `tests/ui/checkout/checkout.spec.ts` (see [`ARCHITECTURE.md`](ARCHITECTURE.md) for why that's safe here) |
| Shared/base page objects and components | `pages/BasePage.ts` (extended by every page object), `pages/FooterComponent.ts` (one component reused by two different pages' newsletter forms) |
| Shared/base API clients | `api/BaseApiClient.ts` (extended by `AccountApiClient` and `ProductsApiClient`) |
| Lifecycle tests that verify a write actually persisted, not just that the response code looked right | `tests/api/auth.spec.ts` — Create → Read → Update → Read → Delete |
| Consistent, automatic step reporting across every page-object/API-client method | `utils/step.ts` (the `@step` decorator), applied throughout `pages/` and `api/` |
| Tagging strategy for running subsets (`@smoke`, `@regression`) | applied across `tests/`, wired to `npm run test:smoke` / `npm run test:regression` |
| Allure/Monocart labelling (epic/feature/story/severity/layer) kept in one place instead of repeated per test | `utils/allureTags.ts`, called once per `test.describe` |

For scenario-level coverage against AutomationExercise's own documented test cases (what's automated, what's a gap, by risk), run `npm run report:gaps` — backed by the hand-kept `reporting/data/featureInventory.json`.

## Reporting

| Layer | What it's for | Where to find it |
|---|---|---|
| **Playwright HTML report** | Fast, built-in, single-run diagnostics: screenshots, traces, timelines on failure. A snapshot of the last run only — Playwright overwrites `playwright-report/` every time. | `npm run report`; downloadable CI artifact |
| **Allure single-file report** | Suites, behaviors (epic → feature → story), severity, categories, retries and per-test steps in one self-contained `index.html` (attachments embedded), opens by double-click with no server. Configuration and rationale: [`reporting/docs/allure.md`](reporting/docs/allure.md). | `npm run report:allure:single` → `allure-report-single/`; downloadable CI artifact |
| **Monocart report** | Grid of every test with Layer / Epic / Feature / Story / Severity columns, tags, flaky marks and steps, all searchable/sortable. `zip: true` bundles HTML, JSON and every attachment into one `.zip`. Configuration and rationale: [`reporting/docs/monocart.md`](reporting/docs/monocart.md). | `monocart-report/index.zip` after any run; `npm run report:monocart` to view; downloadable CI artifact |
| **Release summary** | One page answering "is this build safe to release?": critical-path (`@smoke`) verdict, real failures, flaky tests, coverage by feature, gaps, and trend against earlier runs of the same size. | `npm run report:summary` → `release-summary/index.html`; downloadable CI artifact |
| **Teams failure alert** | Push notification, only fires on failure. | Posted to the connected Teams chat |

Allure single-file and Monocart are both kept deliberately, not narrowed to one — each has strengths the other doesn't. See each report's own file above for the full rationale and where its data comes from.

### Keeping secrets out of reports

Playwright records every action with its arguments, so a plain `fill(password)` puts the password into the HTML
and Monocart reports; traces capture it in request bodies and DOM snapshots; and a failed test's page snapshot
(`error-context.md`) prints every input's value — password fields included. Two layers stop that here:

- **At the source** — real credentials are typed with `BasePage.fillSecret()` (recorded as `Evaluate`, not
  `Fill "<value>"`), and any spec that uses them sets `test.use({ trace: 'off' })` (`login.spec.ts`, `api/auth.spec.ts`).
  `fillSecret` fields are blanked right after a valid form is submitted (`clearSubmittedSecrets()`) and again
  after any failed test (`fixtures/pageFixtures.ts`), so the failure snapshot never sees them.
- **Safety net** — `npm run report:scan-secrets` searches every report output (inside zips, embedded base64 and
  compressed data) for the value of every secret-looking key in `.env.example`. CI runs it before uploading
  anything; if it fails, no artifact is uploaded. A new secret key in `.env.example` is covered automatically.
  Each finding shows where in the file it is and the surrounding text, with the secret masked.

Adding a test that uses a real secret? Use `fillSecret`, call `clearSubmittedSecrets()` after submitting, turn
trace off for that spec, and run the scan. Known gap: failure screenshots are images the scan can't read — a
password field shows dots, but a visible email address is legible.

**Haven't run the suite yet and want to see what these look like?** See [`reporting/report-examples/`](reporting/report-examples/) for a static example of each, from one full run.

## Future Considerations

Things this repo deliberately hasn't done, given its current context and scale — not a backlog, just an honest record of what wasn't justified here:

- **CI-side Allure trend history** — not implemented; would need downloading the previous run's artifact before each report generation.
- **Currents (hosted test dashboard)** — evaluated, not adopted: no free tier justifies the cost at this project's scale.
- **Credentials** currently live in `.env` locally and CI/repo secrets — no vault or automated rotation at this project's scale. Rotate the test account's password manually if it is ever exposed.
