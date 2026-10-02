# Monocart report — how it's configured here

Used alongside Allure single-file (see [`../../README.md#reporting`](../../README.md#reporting)) — this file
documents Monocart's own setup so it doesn't get lost inside `playwright.config.ts` comments.

## Configuration

In `playwright.config.ts`:

```ts
['monocart-reporter', {
  name: 'UI Automation Framework Report',
  outputFile: 'monocart-report/index.html',
  zip: true,
  trend: './monocart-report/index.json',
  visitor: (data, metadata) => { /* copies layer/epic/feature/story/severity annotations onto each row;
                                     drops the internal "Allure Metadata" attachment; masks Fill values */ },
  columns: (defaultColumns) => { /* drops expectedStatus/status/annotations; inserts
                                     Layer, Epic, Feature, Story, Severity columns before Duration */ },
  tags: { smoke: {...}, regression: {...} }, // colours the title tags in the grid
}],
```

- **`zip: true`** — bundles the HTML, its JSON data, and every attachment (screenshots, trace files) into one
  `monocart-report/index.zip` — a single file that can be emailed or dropped in a chat.
- **`trend: './monocart-report/index.json'`** — points at this report's own previous `index.json`. Monocart reads
  it before cleaning the output folder (`lib/index.js`), so the trend accumulates across local runs with no
  extra script. It only persists on a machine that keeps that file between runs — a fresh CI checkout starts
  with no trend.
- **`visitor`** — Monocart has no `epic()`/`feature()`/`story()` runtime API like Allure. Instead it reads
  Playwright's own `test.info().annotations`. `utils/allureTags.ts`'s `tagAllure()` pushes
  `layer`/`epic`/`feature`/`story`/`severity` as annotations (in addition to calling Allure's own API), and this
  `visitor` function copies those annotations onto each row's `data`, which the `columns` function below then
  displays. It also:
  - strips the "Allure Metadata (metadata)" attachment allure-playwright sends through Playwright's attachment
    mechanism (`contentType: 'application/vnd.allure.message+json'`) — internal bookkeeping, not something a
    reader would open — and the matching "Attach \"Allure Metadata (metadata)\"" step (matched by
    `stepType: 'test.attach'` + title, since steps don't carry `contentType`);
  - masks the value in every `Fill "<value>"` step title as `Fill "***"`. Monocart keeps raw Playwright action
    steps (Allure's `detail: false` drops them), so without this a typed value would appear in the report. See
    "Keeping secrets out of reports" in the README for the full approach.
- **`columns`** — drops three default columns that carry no information in this suite: **expectedStatus**
  (always `'passed'` — nothing uses `test.fail()` or `test.fixme()`), **status** (duplicates **outcome** on
  every passing row), and **annotations** (superseded by the columns below). Inserts **Layer**, **Epic**,
  **Feature**, **Story** and **Severity** as searchable, sortable grid columns (before the built-in Duration
  column), populated from what `visitor` copied in. Monocart discards this handler's return value
  (`lib/visitor.js`), so it mutates `defaultColumns` in place.
- **`metadata`** (top-level `playwright.config.ts` option, not inside the reporter block) — Monocart's own
  "which build was tested" surface: reads the same `buildInfo` object (base URL, framework commit, configured
  browsers, run type) shown on the report as key/value pairs.

## Viewing it

```bash
npm run report:monocart
# npx monocart show-report monocart-report/index.html
```

Starts a small local server (`http://localhost:8090`) and opens the report. That URL only works on this
machine while the server runs — to share the report itself, send `monocart-report/index.zip` (unzip and open
`index.html`; some features, like trace viewing, may need the report to be served rather than opened from disk).

## What feeds Monocart's content

- **Layer / Feature / Story / Severity columns** — see `visitor`/`columns` above; same source of truth as Allure's
  Behaviors tab (`tagAllure()` in `utils/allureTags.ts`), so the two reports never disagree.
- **Tags** (`@smoke`, `@regression`) — Playwright's own title tags, coloured via the `tags` option.
- **Steps** — the `@step` method decorator on page objects (`utils/step.ts`) shows up the same way it does in
  Allure: named steps per page-object method call, e.g. "Cart: proceed to checkout", nested if one method calls
  another (e.g. `searchAndAddFirstToCart` shows its own search/expect/add sub-steps nested inside it). Monocart
  has no `detail: false`-equivalent option to hide fixture/hook steps the way Allure does — its tree still shows
  `Before Hooks`/`Fixture "..."` entries alongside the named `@step` ones.
- **Flaky detection** — built in (`caseType: 'flaky'` when a retry passed after an earlier attempt failed), used
  directly by `reporting/scripts/release-summary.js` to build the flaky-tests section of the release summary.

## Feeds the release summary

`reporting/scripts/release-summary.js` reads `monocart-report/index.json` directly (not Allure's results) to build
`release-summary/index.html` — the scenario/browser-run counts, the flaky and failure tables, the per-feature
coverage table, and the trend section (comparing only against previous runs with the same number of browser
runs, using Monocart's own `trends` array from the same file) all come from here. See
[`../scripts/release-summary.js`](../scripts/release-summary.js).

## Where it's generated in CI

`.github/workflows/playwright.yml` runs the normal `npx playwright test` step (Monocart writes its own output
as a reporter, same as Allure), then uploads `monocart-report/index.zip` as the `monocart-report` artifact (only
if the secret scan passes).

## Known limitations, as configured here

- No severity-tree/Behaviors-style grouped view the way Allure has (Feature/Story are flat, sortable/searchable
  columns instead).
- No description or bug-link fields (Allure-only, via `describeTest()`/`linkIssue()` — Monocart has no
  equivalent API, only what a `visitor` can pull from annotations, and description/issue-link text isn't
  pushed as annotations).
- Fixture/hook step noise is not hidden (Allure's `detail: false` has no Monocart equivalent).
