# Report Examples

The Allure and Monocart reports from one full CI run of the suite (all three browsers, 91/91 passed), committed so a
reader can see what each report actually looks like without having to run the suite themselves first.

- `allure/index.html` — the Allure single-file report. Open directly in a browser, no server needed.
- `monocart/index.zip` — the Monocart report. Unzip and open `index.html`.

**Source:** the CI workflow's own artifacts for commit `487253e` (shown as "Framework commit" in both reports). They
passed the CI secret scan before upload, and were checked again with `npm run report:scan-secrets` before being added
here. No test needed a retry, so no trace files are embedded — a trace adds 1–3 MB per retried test.

**Why the Allure file is ~3.3 MB:** ~2.6 MB of it is Allure's own viewer app, which every single-file report embeds
regardless of how many tests it holds — the test data itself is under 1 MB.

These are a point-in-time snapshot, not regenerated automatically — they won't reflect later changes to the
suite. To generate your own current versions, see [Reporting](../../README.md#reporting) in the main README.
