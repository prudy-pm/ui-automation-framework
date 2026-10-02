# Allure report — how it's configured here

Used alongside Monocart (see [`../../README.md#reporting`](../../README.md#reporting)) — this file documents
Allure's own setup so it doesn't get lost inside `playwright.config.ts` comments.

## What generates it

`allure-playwright` writes raw results to `allure-results/` on every run (configured in `playwright.config.ts`):

```ts
['allure-playwright', { resultsDir: 'allure-results', environmentInfo: { ...buildInfo }, detail: false }],
```

- **`resultsDir`** — where raw results land; wiped at the top of `playwright.config.ts` before every run
  (`fs.rmSync('allure-results', ...)`, guarded by `TEST_WORKER_INDEX` so only the main process does it), so a
  stale run's results never leak into this run's report.
- **`environmentInfo: { ...buildInfo }`** — writes `allure-results/environment.properties` with the same build
  info Monocart gets (base URL, framework commit, configured browsers, run type). It's a copy because Playwright
  adds its own CI fields to the shared `buildInfo` object, which Allure would show as blank rows. See "What was
  tested" on the [release summary](../scripts/release-summary.js) and `buildInfo` in `playwright.config.ts` for
  where these values come from.
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

Allure's default folder-based report isn't used: it can't be opened from disk (browsers block its background
`fetch()` calls from `file://`, so it needs `npx allure open`), and its one extra feature — trend graphs — only
works on a single machine that keeps its `history/` folder between runs. Trend is provided instead by the
[release summary](../scripts/release-summary.js), which also compares only runs with the same number of browser
runs, so a filtered run doesn't distort it.

## What feeds Allure's content

- **Behaviors tab (epic → feature → story) + severity + layer** — `tagAllure({ epic, feature, story })`, called
  once per `test.describe` from `utils/allureTags.ts`. Severity is derived automatically from the title tag:
  `@smoke` → `critical`, everything else → `normal`. `layer` (Allure's own `LabelName.LAYER`, not a custom
  label) is derived automatically too, from the spec file's own path (`tests/api/` → `API`, everything else →
  `UI`) — not passed per `describe`, so a spec's layer can't drift out of sync with where it actually lives.
  This is also what pushes matching Playwright *annotations* (`epic`/`feature`/`story`/`severity`/`layer`) that
  Monocart's `visitor` reads — see `reporting/docs/monocart.md` — so the two reports agree.
- **Test description** — `describeTest('...')`, a one-line plain-English statement of what the test proves.
  Currently only on the `@smoke` tests.
- **Bug links** — `linkIssue(id)` calls `allure.issue()` under a placeholder tracker URL (`ISSUE_URL` in
  `utils/allureTags.ts`). No real tracker exists for this project; swap `ISSUE_URL` when one does.
- **Steps** — the `@step` method decorator (`utils/step.ts`) on every page-object method, e.g.
  `CartPage.proceedToCheckout` → step "Cart: proceed to checkout". Specs stay plain: step names come from the
  page-object methods, so every spec gets readable steps without naming them by hand.

## Where it's generated in CI

`.github/workflows/playwright.yml` runs `npx allure generate allure-results --single-file --clean -o
allure-report-single` and uploads `allure-report-single/` as the `allure-report` artifact (only if the secret
scan passes — see "Keeping secrets out of reports" in the README).

## Known limitations, as configured here

- No trend/history graphs (single-file format limitation — see above for why that's an accepted trade-off).
- The bug-tracker link is a placeholder, not a real system.
- Only `@smoke` tests have a `describeTest()` description.
- The single-file report is ~3 MB even for a small run: ~2.6 MB of it is Allure's own viewer app.
