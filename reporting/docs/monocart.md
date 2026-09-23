# Monocart report — how it's configured here

Kept alongside Allure single-file deliberately (see [`../../README.md#reporting`](../../README.md#reporting)) —
this file documents Monocart's own setup so it doesn't get lost inside `playwright.config.ts` comments.

## Configuration

In `playwright.config.ts`:

```ts
['monocart-reporter', {
  name: 'UI Automation Framework Report',
  outputFile: 'monocart-report/index.html',
  zip: true,
  trend: './monocart-report/index.json',
  visitor: (data, metadata) => { /* copies epic/feature/story/severity annotations onto each row;
                                     drops the internal "Allure Metadata" attachment */ },
  columns: (defaultColumns) => { /* drops expectedStatus/status/annotations; inserts
                                     Epic, Feature, Story, Severity columns before Duration */ },
  tags: { smoke: {...}, regression: {...} }, // colours the title tags in the grid
}],
```

- **`zip: true`** — bundles the HTML, its JSON data, and every attachment (screenshots, trace files) into one
  `monocart-report/index.zip`. Confirmed by inspection to be a genuine single-file artifact — safe to email or
  drop in a chat, unlike the folder-based Allure report this project used to also generate (see
  `reporting/docs/allure.md`).
- **`trend: './monocart-report/index.json'`** — self-references this run's own previous `index.json`. Confirmed
  via Monocart's source (`lib/index.js`) that trend data is read *before* the output directory is cleaned, so
  this accumulates across local runs with no carry-forward script needed (unlike Allure's `history/` folder,
  which is exactly why Allure needed one and Monocart doesn't).
- **`visitor`** — Monocart has no `epic()`/`feature()`/`story()` runtime API like Allure. Instead it reads
  Playwright's own `test.info().annotations`. `utils/allureTags.ts`'s `tagAllure()` pushes
  `epic`/`feature`/`story`/`severity` as annotations (in addition to calling Allure's own API), and this
  `visitor` function copies those annotations onto each row's `data`, which the `columns` function below then
  displays. It also strips the "Allure Metadata (metadata)" attachment(s) allure-playwright sends itself via
  Playwright's own attachment mechanism (`contentType: 'application/vnd.allure.message+json'`, confirmed by
  inspecting a real report's data) -- internal bookkeeping, not something a reader would ever want to open. That
  only clears the case-level Attachments *column*; every Allure API call also shows up as its own *step*
  ("Attach \"Allure Metadata (metadata)\"", nested under Before Hooks → beforeEach hook), which the visitor
  separately filters out of `data.subs` (steps don't carry `contentType`, so this one is matched by
  `stepType: 'test.attach'` + title instead).
- **`columns`** — drops three of Monocart's default columns, confirmed dead weight by inspecting real report
  data: **expectedStatus** (constant `'passed'` on every row in this suite -- nothing uses `test.fail()` or
  `test.fixme()`), **status** (duplicates **outcome** on every passing row), and **annotations** (superseded by
  the columns below). Inserts **Epic**, **Feature**, **Story** and **Severity** as searchable, sortable grid
  columns (before the built-in Duration column), populated from what `visitor` copied in. Must mutate the
  `defaultColumns` array in place -- confirmed via Monocart's source (`lib/visitor.js`) that this handler's
  return value is discarded.
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
`index.html`; some features like trace viewing may need serving, not confirmed cross-machine).

## What feeds Monocart's content

- **Feature / Story / Severity columns** — see `visitor`/`columns` above; same source of truth as Allure's
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
coverage table, and the trend section (comparing only against earlier runs with the same number of browser
runs, using Monocart's own `trends` array from the same file) all come from here. See
[`../scripts/release-summary.js`](../scripts/release-summary.js).

## Where it's generated in CI

`.github/workflows/playwright.yml` runs the normal `npx playwright test` step (Monocart writes its own output
as a reporter, same as Allure), then uploads `monocart-report/index.zip` as the `monocart-report` artifact.

## Known limitations, as configured here

- No severity-tree/Behaviors-style grouped view the way Allure has (Feature/Story are flat, sortable/searchable
  columns instead).
- No description or bug-link fields (Allure-only, via `describeTest()`/`linkIssue()` — Monocart has no
  equivalent API, only what a `visitor` can pull from annotations, and description/issue-link text isn't
  currently pushed as annotations).
- Fixture/hook step noise is not hidden (Allure's `detail: false` has no Monocart equivalent).
