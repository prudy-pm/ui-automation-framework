# Allure report — how it's configured here

Kept alongside Monocart deliberately (see [`../../README.md#reporting`](../../README.md#reporting)) — this file
documents Allure's own setup so it doesn't get lost inside `playwright.config.ts` comments. For the general
Allure history/trend-preservation technique (not used in this repo any more — see below), see the separate
[`allure-reporting-reference`](../../../allure-reporting-reference) project.

## What generates it

`allure-playwright` writes raw results to `allure-results/` on every run (configured in `playwright.config.ts`):

```ts
['allure-playwright', { resultsDir: 'allure-results', environmentInfo: buildInfo, detail: false }],
```

- **`resultsDir`** — where raw results land; wiped at the top of `playwright.config.ts` before every run
  (`fs.rmSync('allure-results', ...)`, guarded by `TEST_WORKER_INDEX` so only the main process does it), so a
  stale earlier run's results never leak into this run's report.
- **`environmentInfo: buildInfo`** — writes `allure-results/environment.properties` with the same build info
  Monocart gets (base URL, framework commit, configured browsers, run type). See "What was tested" on the
  [release summary](../scripts/release-summary.js) and `buildInfo` in `playwright.config.ts` for where these
  values come from.
- **`detail: false`** — Allure's own option to hide fixture/hook/raw-action steps and show only `test.step`
  steps. Every page-object method is wrapped in a named step by the `@step` decorator (`utils/step.ts`), so in
  practice this means the report shows readable steps like "Cart: proceed to checkout" instead of low-level
  `page.click(...)` calls.

## Report format: single-file, not the folder-based report

```bash
npm run report:allure:single
# npx allure generate allure-results --single-file --clean -o allure-report-single
```

Produces **one self-contained `allure-report-single/index.html`** (attachments base64-embedded). Opens by
double-click, no server, no `npx allure open` needed — safe to email or drop in a chat.

**This repo used to also generate a folder-based Allure report** (`allure-report/`, via
`scripts/generate-allure-report.js`, which carried `allure-report/history/` forward into
`allure-results/history/` before each `generate --clean` so trend graphs survived across local runs — `allure
generate --clean` otherwise wipes that folder, discarding history, and `allure serve` never persists a report
at all). That report and script were **removed**: it needed `npx allure open` to view (browsers block a
folder report's background `fetch()` calls from `file://`), and its only real advantage over the single-file
report — trend graphs — was local-machine-only and is now covered by the
[release summary](../scripts/release-summary.js)'s trend section instead, which additionally compares only
runs with the same number of browser runs (the old Allure trend didn't distinguish a full run from a filtered
one). The carry-forward technique itself is preserved as a working, documented example in the separate
[`allure-reporting-reference`](../../../allure-reporting-reference) project, in case a future project wants
folder-based Allure with trend graphs again.

## What feeds Allure's content

- **Behaviors tab (epic → feature → story) + severity** — `tagAllure({ epic, feature, story })`, called once per
  `test.describe` from `utils/allureTags.ts`. Severity is derived automatically from the title tag: `@smoke` →
  `critical`, everything else → `normal`. This is also what pushes matching Playwright *annotations*
  (`epic`/`feature`/`story`/`severity`) that Monocart's `visitor` reads — see `reporting/docs/monocart.md` — so
  the two reports agree.
- **Test description** — `describeTest('...')`, a one-line plain-English statement of what the test proves.
  Currently only on the `@smoke` tests.
- **Bug links** — `linkIssue(id)` calls `allure.issue()` under a placeholder tracker URL (`ISSUE_URL` in
  `utils/allureTags.ts`). No real tracker exists yet for this project; swap `ISSUE_URL` when one does.
- **Steps** — the `@step` method decorator (`utils/step.ts`) on every page-object method, e.g.
  `CartPage.proceedToCheckout` → step "Cart: proceed to checkout". Specs stay plain; nothing is hand-wrapped in
  `test.step` any more (it was, in three specs, during the trial — removed once the decorator covered the same
  ground for every spec, not just those three, without repeating step names by hand).

## Where it's generated in CI

`.github/workflows/playwright.yml` runs `npx allure generate allure-results --single-file --clean -o
allure-report-single` and uploads `allure-report-single/` as the `allure-report` artifact.

## Known limitations, as configured here

- No trend/history graphs (single-file format limitation — see above for why that's an accepted trade-off).
- The bug-tracker link is a placeholder, not a real system.
- Only `@smoke` tests have a `describeTest()` description so far.
