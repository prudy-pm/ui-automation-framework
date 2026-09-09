# UI Automation Framework

End-to-end UI and API test automation for [AutomationExercise](https://automationexercise.com), built with Playwright and TypeScript using the Page Object Model. Designed as a reusable foundation, not a one-off demo — see [Future Considerations](#future-considerations) for what changes when this points at a live product.

## Tech Stack

- **Playwright Test** (`@playwright/test`) — test runner and browser automation
- **TypeScript** — type-safe tests, page objects, and fixtures
- **dotenv** — environment-based config for URLs and credentials
- **Playwright HTML Reporter** — built-in run reporting

## Project Structure

```
ui-automation-framework/
├── tests/
│   ├── ui/              # feature-organized UI specs (auth, products, cart, checkout)
│   └── api/              # API specs, sharing config/reporting with the UI suite
├── pages/                 # Page Object Model classes, all extending BasePage
├── fixtures/              # Custom Playwright fixtures wiring page objects into tests
├── data/                  # Data-driven test data (JSON) + TypeScript types for it
├── config/                # env.ts — single source of truth for base URL & credentials
├── utils/                 # Shared helpers
├── .env.example           # Template for required environment variables
├── tsconfig.json          # Includes @pages/@fixtures/@config/@data/@utils path aliases
└── playwright.config.ts
```

Tests are grouped by **feature**, not by type, so anyone can find "the login tests" or "the cart tests" immediately. Tests are tagged (`@smoke`, `@regression`) so subsets can be run independently — see below.

## Getting Started

```bash
npm install
npx playwright install
```

Copy `.env.example` to `.env` and fill in a real (disposable-mailbox-based) AutomationExercise test account:
```
BASE_URL=https://automationexercise.com
API_BASE_URL=https://automationexercise.com/api
TEST_USER_EMAIL=
TEST_USER_PASSWORD=
```
`.env` is gitignored — never commit real credentials.

## Running Tests

```bash
npx playwright test                    # everything
npx playwright test --grep @smoke      # fast subset
npx playwright test --grep @regression # full regression pass
npx playwright test tests/ui/auth      # a single feature folder
npx playwright show-report             # open the last HTML report
```

Tests run against chromium, firefox, and webkit by default (Playwright's standard project setup) — no extra config needed for cross-browser coverage.

### Viewing reports from CI

Every push/PR run uploads the HTML report as a downloadable artifact — no separate hosting needed:

1. GitHub repo → **Actions** tab → select the workflow run
2. Scroll to **Artifacts** → download `playwright-report.zip`
3. Unzip and open `index.html`

Requires 4 repository secrets configured under **Settings → Secrets and variables → Actions**: `BASE_URL`, `API_BASE_URL`, `TEST_USER_EMAIL`, `TEST_USER_PASSWORD` — same values as your local `.env`.

## Design Decisions

- **Page Object Model**, all page classes extend `BasePage`, which centralizes actions (`click`, `fill`, `getText`) and assertions (`expectVisible`, `expectText`) behind explicit visibility waits — no scattered `waitForTimeout` calls.
- **Fixtures over manual instantiation** (`fixtures/pageFixtures.ts`) — specs declare the page objects they need as test parameters; they never `import` or `new` a page class directly.
- **Config and secrets are centralized** in `config/env.ts`, which fails fast with a clear error if a required variable is missing, rather than failing confusingly mid-test.
- **Data-driven tests are reserved for genuine input variation against the same behavior** (e.g. multiple invalid-credential combinations hitting the same server-side check). A single scenario testing a fundamentally different mechanism (e.g. browser-native HTML validation vs. server auth) is kept as its own explicit test rather than force-fit into the data set — see `login.spec.ts` for a worked example of this distinction.

## Future Considerations

This framework is built to transfer cleanly to a live project. What's already reusable vs. what would deliberately be revisited:

| Already built for reuse | Would be revisited for a live project |
|---|---|
| Page Object Model + `BasePage` pattern | `.env` → a real secrets vault once there's a team and multiple environments |
| `config/env.ts` — env-driven, just re-point the URL | Target-specific locators/base URL (expected, not rework) |
| Fixtures, path aliases, tsconfig | `storageState` auth-caching, once auth-gated flows are slow enough to need it |
| Feature-organized folder structure | JSON test data → likely a proper test-data service or `faker` at scale |
| GitHub Actions CI workflow — runs the suite and uploads the HTML report as a downloadable artifact on every push/PR | HTML report artifact → Allure Report (`allure-playwright`) for trend graphs, failure categorization, and pass/fail history across runs once this is a live, regularly-running suite; alternatively, publish the HTML report to GitHub Pages for a persistent shareable URL instead of a per-run download |

## Status

- [x] Login (UI) — valid credentials, data-driven invalid credentials, browser-validation edge case
- [x] Products (UI) — in progress
- [x] Cart (UI)
- [ ] API tests
- [ ] Optional: small-scale k6 load test demonstrating fundamentals (kept outside this framework's `tests/` since it runs under a different runtime)