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
│   │   └── newsletter/       # subscription from home & cart pages (Faker-driven)
│   └── api/                  # products, account CRUD lifecycle, layered validation
├── pages/                     # Page Object Model classes, all extending BasePage
│   └── FooterComponent.ts       # shared, cross-page component (not tied to one page)
├── api/                        # API client classes, all extending BaseApiClient
├── fixtures/                    # pageFixtures.ts and apiFixtures.ts
├── data/                         # JSON, nested JSON, and Excel test data + TS types
├── config/                        # env.ts -- single source of truth for URL & credentials
├── utils/                          # generateUniqueEmail, faker wrappers, readExcelSheet
├── .env.example
├── tsconfig.json                    # @pages/@fixtures/@config/@data/@utils/@api aliases
└── playwright.config.ts
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
npm run report:allure        # generate + open the Allure report
```

## What's Covered

**UI:**
- Login — valid credentials, data-driven invalid credentials (Faker-generated, not committed), browser-validation edge case
- Products — Excel-driven search, add to cart
- Cart — add/verify price, remove/verify gone, quantity carries through correctly from product detail page (Excel-driven)
- Newsletter subscription — home page and cart page, both using a shared `FooterComponent` (Faker-generated emails)

**API:**
- Products — list, search
- Account — login verification (valid/invalid), duplicate-email rejection (a real documented AutomationExercise test case), wrong-HTTP-method rejection (discovered via exploratory testing, not assumed), and a full **Create → Read → Update → Read → Delete** lifecycle that verifies each write actually persisted by reading it back, not just trusting the response code

## Reporting

| Layer | What it's for | Where to find it |
|---|---|---|
| **Playwright HTML report** | Fast, built-in. Screenshots, traces, timelines on failure. | `npm run report`; downloadable CI artifact |
| **Allure report** | Richer breakdown (suites, categories, behaviors). | `npm run report:allure`; downloadable CI artifact |
| **GitHub Actions job summary** | Fast visibility, no download. | Actions tab → the run itself |
| **Teams failure alert** | Push notification, only fires on failure. | Posted to the connected Teams chat |

**Never open a downloaded Allure report by double-clicking `index.html`** — it needs `npx allure open <folder>` (browsers block the background requests it needs when opened from disk). On Azure DevOps specifically, the official `PublishAllureReport@2` task solves this natively by embedding the report as a pipeline tab — see the comment above "Generate Allure Report" in `.github/workflows/playwright.yml`.

## Design Decisions

- **Page Object Model + API client pattern**, both extending shared base classes. Shared, cross-page UI elements (e.g. the footer) become their own **component**, not duplicated per page.
- **Fixtures over manual instantiation** — one valid pattern among several (Java-style base-class inheritance is another), chosen for being Playwright/TypeScript's idiomatic approach.
- **Test data is split by what's safe to commit.** Structural/scenario data is committed; anything credential-shaped or uniqueness-sensitive is generated at runtime — committing plausible fake credentials to a public repo would let anyone register those exact accounts and silently break the tests later.
- **Validation is tested per layer, not per field** — browser, server, and business-rule rejections are separate tests, so one layer's failure can never mask another's.
- **Explore before asserting.** Where a response shape or API contract wasn't already confirmed (e.g. `updateAccount`'s required HTTP method, `getUserDetailByEmail`'s field-naming inconsistency with the create endpoint), a temporary exploratory test logged the real response first — assertions were written from evidence, not assumptions.
- **Data source is chosen deliberately per case**: Excel where a non-technical stakeholder might realistically edit the data (search terms, quantities); JSON for anything nested or structural (account profiles, scenario metadata); Faker for anything that must never be predictable (credentials, subscription emails).

## Future Considerations

| Already built | Parked / deliberately deferred |
|---|---|
| Page Object Model + API client pattern, shared base classes | Empty-field validation tests (login + signup) — separated out early as a distinct concern from server-side validation, not yet built |
| `config/env.ts` — env-driven | Place Order / checkout flow (TC14-16) |
| Fixtures, path aliases, tsconfig | `storageState` auth-caching — genuinely useful now that several tests start from a logged-out state each time |
| Feature-organized folder structure | Allure trend/history graphs across runs (needs a preserved `history` folder) |
| GitHub Actions CI: secrets, job summary, Teams alert, dual report artifacts | Currents (hosted dashboard) or a GitHub Pages dated-archive, as alternatives to Allure |
| Excel + JSON + Faker data strategies, chosen deliberately per case | A real secrets vault, once there's a team and multiple environments |
| Layered field-validation testing | — |
| Full API resource lifecycle (CRUD) testing | — |

**Explicitly out of scope for this repo:** k6 load testing — deliberately excluded as it runs under a different tool/runtime and belongs in its own separate project, not bolted onto this one.

## Status

- [x] Login, Products, Cart, Newsletter (UI)
- [x] Products, Account CRUD lifecycle, layered validation (API)
- [x] CI pipeline — secrets, cross-browser matrix, job summary, Teams alert, dual reporting
- [x] Excel, JSON, and Faker data strategies, each used deliberately
- [ ] Empty-field validation tests
- [ ] Place Order / checkout flow
- [ ] `storageState` auth-caching