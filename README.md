# UI Automation Framework

End-to-end UI and API test automation for [AutomationExercise](https://automationexercise.com), built with Playwright and TypeScript using the Page Object Model. Designed as a reusable foundation, not a once-off demo — see [Future Considerations](#future-considerations) for what will need to change when this framework points at a live product.

## Tech Stack

- **Playwright Test** (`@playwright/test`) — test runner, browser automation, and API testing (`request` fixture)
- **TypeScript** — type-safe tests, page objects, API clients, and fixtures
- **@faker-js/faker** — generates test data at runtime instead of committing static/predictable values
- **dotenv** — environment-based config for URLs and credentials
- **Playwright HTML Reporter** + **Allure Report** — two complementary reporting layers (see [Reporting](#reporting))
- **@estruyf/github-actions-reporter** — writes a pass/fail summary directly to the GitHub Actions run page

## Project Structure

```
ui-automation-framework/
├── tests/
│   ├── ui/                # feature-organized UI specs (auth, products, cart)
│   └── api/                # API specs, sharing config/reporting with the UI suite
├── pages/                  # Page Object Model classes, all extending BasePage
├── api/                    # API client classes, all extending BaseApiClient
├── fixtures/                # pageFixtures.ts and apiFixtures.ts -- wire page/API
│                             #  objects into Playwright's test, no manual instantiation
├── data/                   # Data-driven test data (JSON) + TypeScript types for it
├── config/                 # env.ts -- single source of truth for base URL & credentials
├── utils/                  # Shared helpers (e.g. generateUniqueEmail, faker wrappers)
├── .env.example            # Template for required environment variables
├── tsconfig.json           # Includes @pages/@fixtures/@config/@data/@utils/@api aliases
└── playwright.config.ts
```

Tests are grouped by **feature**, not by type, so anyone can find "the login tests" or "the cart tests" immediately. Tests are tagged (`@smoke`, `@regression`) so subsets can be run independently.

## Getting Started

```bash
npm install
npx playwright install
```

Copy `.env.example` to `.env` and fill in a real (disposable-mailbox-based) AutomationExercise test account:
```
BASE_URL=https://automationexercise.com
API_BASE_URL=https://automationexercise.com/api/
TEST_USER_EMAIL=
TEST_USER_PASSWORD=
```
`.env` is gitignored — never commit real credentials. Note the trailing slash on `API_BASE_URL` — required for correct URL resolution against the API clients' relative paths.

**Allure reports also require a local JDK (Java 8+)** to generate/view — run `java -version` to confirm one's installed. This only affects local report generation; GitHub Actions' runners already include Java, so CI is unaffected.

## Running Tests

```bash
npm test                    # everything
npm run test:ui              # UI suite only
npm run test:api             # API suite only
npm run test:smoke           # @smoke-tagged tests only
npm run test:regression      # @regression-tagged tests only
npm run report               # open the last Playwright HTML report
npm run report:allure        # generate + open the Allure report
```

Tests run against chromium, firefox, and webkit by default (Playwright's standard project setup) — no extra config needed for cross-browser coverage.

## Reporting

Two report tools are deliberately in place, plus two CI-native visibility mechanisms — each solving a different problem rather than one replacing another:

| Layer | What it's for | Where to find it |
|---|---|---|
| **Playwright HTML report** | Fast, zero-dependency, built-in. Screenshots, traces, step-by-step timelines on failure. | `npm run report` locally; downloadable `playwright-report` artifact on every CI run |
| **Allure report** | Richer breakdown (suites, categories, behaviors, packages) and the foundation for trend history across runs later. | `npm run report:allure` locally; downloadable `allure-report` artifact on every CI run |
| **GitHub Actions job summary** | Fast visibility, no download — pass/fail table rendered directly on the CI run page the moment it finishes. | Actions tab → the run itself, no extra step |
| **Teams failure alert** | Push notification, not a report you have to remember to check — fires only when a run fails, with a direct link to it. | Posted to the connected Teams chat automatically |

**Important: don't open a downloaded Allure report by double-clicking `index.html`.** Allure's report loads its data via background requests that browsers block when a page is opened directly from disk (`file://`), which shows as a generic "500 Failed to fetch" on every panel — this isn't a broken report, it's how Allure works everywhere, for everyone. Always use:
```bash
npx allure open <path-to-extracted-allure-report-folder>
```
This spins up a small local server so the report can actually load its data, the same way `allure serve` (used for local runs) already does automatically.

**On a real Azure DevOps pipeline** (as opposed to this project's GitHub Actions setup), the same underlying problem has a platform-native fix: the official `PublishAllureReport@2` task (published by Qameta Software, Allure's own creators) embeds the report as its own tab directly inside the pipeline run page — no download, no CLI, and no technical knowledge needed for anyone viewing it, QA/dev/stakeholder alike. See the comment above the "Generate Allure Report" step in `.github/workflows/playwright.yml` for the exact reasoning.

## Design Decisions

- **Page Object Model**, all page classes extend `BasePage`; all API client classes extend `BaseApiClient` — same reusability principle applied to both layers.
- **Fixtures over manual instantiation** (`fixtures/pageFixtures.ts`, `fixtures/apiFixtures.ts`) — specs declare only the page objects/API clients they need as test parameters. This is one valid pattern among several (Java-style base-class inheritance is another) — chosen here because it's Playwright/TypeScript's idiomatic approach, not because it's the only correct one.
- **Test data is split by what's safe to commit.** Static, structural test data (scenario names, nested profile shapes) is committed; anything credential-shaped or uniqueness-sensitive is generated at runtime via `@faker-js/faker` — committing plausible-looking fake credentials to a public repo would let anyone register those exact accounts and silently break the tests later.
- **Validation is tested per layer, not per field.** A field can be rejected by the browser (HTML5 format validation), the server (auth/format checks), or a business rule (e.g. duplicate email on signup) — each is its own test, so one layer's failure can never mask whether another layer still works.
- **API tests never launch a browser.** `apiFixtures.ts` uses Playwright's `request.newContext()` directly, scoped to the API base URL — faster and more honest about what's actually being tested (the HTTP layer, not the UI).
- **Ad-blocking is applied globally**, once, in the `page` fixture — AutomationExercise runs live third-party ads that can overlap page content; this was a real, diagnosed reliability issue, fixed structurally rather than papering over it with longer waits or forced clicks.

## Future Considerations

This framework is built to transfer cleanly to a live project. What's already reusable vs. what would deliberately be revisited:

| Already built for reuse                                                    | Would be revisited for a live project |
|---|---|
| Page Object Model + API client pattern, both extending shared base classes | `.env` → a real secrets vault once there's a team and multiple environments |
| `config/env.ts` — env-driven, just re-point the URL | Target-specific locators/base URL (expected, not rework) |
| Fixtures, path aliases, tsconfig | `storageState` auth-caching, once auth-gated flows are slow enough to need it |
| Feature-organized folder structure | JSON test data → likely a proper test-data service or deeper `faker` use at scale |
| GitHub Actions CI: secrets, job summary, Teams alert, two report artifacts | Currents (Playwright-native hosted dashboard) or a GitHub Pages dated-archive, if a single persistent link with trend history over time is wanted beyond what Allure's per-run reports give today |
| Allure Report, generated locally and in CI | Allure's own trend/history graphs, which need a `history` folder preserved between runs — not wired up yet |
| Layered field-validation testing (client/server/business-rule, kept as separate tests) | — |

## Status

- [x] Login (UI) — valid credentials, data-driven invalid credentials, browser-validation edge case
- [x] Products (UI) — search, add to cart
- [x] Cart (UI) — full add-to-cart-to-checkout-view flow
- [x] API tests — products, account lifecycle (nested data), layered login/signup validation
- [x] CI pipeline — secrets, cross-browser matrix, job summary, Teams failure alert
- [x] Two report tools compared and running (Playwright HTML + Allure)
- [ ] Optional: Excel-based test data import