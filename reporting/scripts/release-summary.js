#!/usr/bin/env node
/**
 * Builds release-summary/index.html: a one-page answer to "is this build safe
 * to release?", from the last run's Monocart data (monocart-report/index.json)
 * and the hand-kept coverage list (reporting/data/featureInventory.json).
 *
 * Definitions, so the numbers are read the same way every time:
 *  - critical path  = tests tagged @smoke
 *  - scenario       = one test as written; a browser run = that scenario in one browser
 *  - real failure   = a run that failed on every attempt; flaky = failed, then passed on retry
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const report = JSON.parse(fs.readFileSync(path.join(rootDir, 'monocart-report', 'index.json'), 'utf8'));
const inventory = JSON.parse(fs.readFileSync(path.join(rootDir, 'reporting', 'data', 'featureInventory.json'), 'utf8'));

const stripAnsi = (text) => String(text).replace(/\u001b\[[0-9;]*m/g, '');
const escapeHtml = (text) => String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const seconds = (ms) => (ms >= 60000 ? `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s` : `${Math.round(ms / 1000)}s`);

// ---- flatten Monocart's suite tree into one record per browser run --------
const runs = [];
(function walk(rows, project) {
  for (const row of rows) {
    const inProject = row.suiteType === 'project' ? row.title : project;
    if (row.type === 'case') {
      runs.push({
        browser: inProject,
        title: row.title,
        scenario: `${row.location.split(':')[0]}|${row.title}`,
        outcome: row.caseType, // passed | failed | flaky | skipped
        smoke: (row.tags || []).includes('@smoke'),
        feature: row.feature || 'Untagged',
        severity: row.severity || 'unknown',
        error: stripAnsi((row.errors || [])[0] || '').split('\n')[0].slice(0, 160),
      });
    }
    if (row.subs) walk(row.subs, inProject);
  }
})(report.rows, '');

// ---- roll runs up to scenarios (worst outcome across browsers wins) --------
// `browsers` and `error` describe only the runs that share that worst outcome.
const worst = ['failed', 'flaky', 'skipped', 'passed'];
const runsByScenario = new Map();
for (const run of runs) runsByScenario.set(run.scenario, [...(runsByScenario.get(run.scenario) || []), run]);
const scenarios = new Map();
for (const [key, group] of runsByScenario) {
  const outcome = worst.find((o) => group.some((run) => run.outcome === o));
  const affected = group.filter((run) => run.outcome === outcome);
  scenarios.set(key, { ...group[0], outcome, browsers: affected.map((run) => run.browser), error: affected.find((run) => run.error)?.error || '' });
}
const scenarioList = [...scenarios.values()];
const count = (list, outcome) => list.filter((item) => item.outcome === outcome).length;

// ---- release signal ------------------------------------------------------
const smoke = scenarioList.filter((s) => s.smoke);
const smokeFailed = smoke.filter((s) => s.outcome === 'failed');
const smokeFlaky = smoke.filter((s) => s.outcome === 'flaky');
const otherFailed = scenarioList.filter((s) => !s.smoke && s.outcome === 'failed');

// A run far smaller than the biggest one on record is a filtered run, not a full one.
const pastRuns = report.trends || [];
const largest = Math.max(report.summary.tests.value ?? report.summary.tests, ...pastRuns.map((t) => t.tests));
const totalRuns = runs.length;
const partial = totalRuns < largest * 0.9;

let verdict;
if (smokeFailed.length) verdict = { level: 'fail', text: 'CRITICAL PATH FAILING', detail: `${smokeFailed.length} of ${smoke.length} critical-path scenarios failed. Do not release until resolved.` };
else if (smokeFlaky.length) verdict = { level: 'warn', text: 'CRITICAL PATH PASSING, WITH RETRIES', detail: `${smokeFlaky.length} critical-path scenario(s) only passed on retry. Treat as a warning.` };
else verdict = { level: 'pass', text: 'CRITICAL PATH PASSING', detail: `All ${smoke.length} critical-path scenarios passed.` };

// ---- trend: only compare like with like (same number of browser runs) ----
const comparable = pastRuns.filter((t) => t.tests === totalRuns).slice(-6);
const previous = comparable[comparable.length - 1];
const trendLine = previous
  ? `Previous comparable run: ${previous.passed} passed, ${previous.failed} failed, ${previous.flaky} flaky, ${seconds(previous.duration)} (this run: ${count(runs, 'passed')} / ${count(runs, 'failed')} / ${count(runs, 'flaky')}, ${seconds(report.duration)}).`
  : 'No earlier run of the same size to compare with yet.';

// ---- per-feature table ----------------------------------------------------
const byFeature = {};
for (const s of scenarioList) {
  const f = (byFeature[s.feature] ||= { scenarios: 0, passed: 0, failed: 0, flaky: 0 });
  f.scenarios++;
  if (s.outcome in f) f[s.outcome]++;
}

// ---- coverage gaps (hand-kept inventory) -----------------------------------
const gapCounts = (layer) => {
  const items = inventory.filter((i) => i.layer === layer);
  return { total: items.length, full: items.filter((i) => i.coverage === 'full').length, partial: items.filter((i) => i.coverage === 'partial').length };
};
const highGaps = inventory.filter((i) => i.risk === 'high' && i.coverage !== 'full');

// ---- render ----------------------------------------------------------------
const table = (head, rows) => `<table><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const failureRows = (list) => list.map((s) => [escapeHtml(s.title), escapeHtml(s.feature), escapeHtml(s.severity), escapeHtml([...new Set(s.browsers)].join(', ')), escapeHtml(s.error || '')]);
const meta = Object.entries(report.metadata || {}).filter(([k]) => k !== 'actualWorkers');

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Release readiness summary</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--text:#1a1d21;--muted:#5b6470;--line:#dde1e6;--pass:#0b6b36;--passbg:#e3f4ea;--warn:#8a5300;--warnbg:#fdf0d8;--fail:#a4161a;--failbg:#fbe4e4}
@media (prefers-color-scheme:dark){:root{--bg:#14171b;--card:#1d2126;--text:#e8eaed;--muted:#a0a8b3;--line:#333a42;--pass:#6fd39a;--passbg:#163524;--warn:#f0b955;--warnbg:#3a2c12;--fail:#ff8b8e;--failbg:#402022}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.5 system-ui,sans-serif}
main{max-width:980px;margin:0 auto;padding:24px 16px 48px}
h1{font-size:1.3rem;margin:0 0 4px}h2{font-size:1.05rem;margin:28px 0 8px}
.sub{color:var(--muted);margin:0 0 16px}
.banner{border-radius:10px;padding:16px 18px;border:1px solid var(--line);margin-bottom:12px}
.banner b{display:block;font-size:1.15rem}
.pass{background:var(--passbg);color:var(--pass)}.warn{background:var(--warnbg);color:var(--warn)}.fail{background:var(--failbg);color:var(--fail)}
.note{background:var(--warnbg);color:var(--warn);border-radius:8px;padding:10px 14px;margin-bottom:12px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.tile{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px 14px}
.tile b{display:block;font-size:1.5rem}.tile span{color:var(--muted);font-size:.85rem}
table{width:100%;border-collapse:collapse;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden;font-size:.9rem}
th,td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:600}
tr:last-child td{border-bottom:0}.scroll{overflow-x:auto}p.small{color:var(--muted);font-size:.85rem}
</style></head><body><main>
<h1>Release readiness summary</h1>
<p class="sub">${escapeHtml(report.dateH)} &middot; run took ${escapeHtml(report.durationH)}</p>

<div class="banner ${verdict.level}"><b>${verdict.level === 'pass' ? '&#10003;' : verdict.level === 'warn' ? '&#9888;' : '&#10007;'} ${verdict.text}</b>${escapeHtml(verdict.detail)}</div>
${partial ? `<div class="note"><b>Partial run.</b> Only ${totalRuns} browser runs, against ${largest} in the largest run on record. This looks like a filtered run, so the picture below is incomplete.</div>` : ''}

<div class="tiles">
<div class="tile"><b>${scenarioList.length}</b><span>scenarios (${totalRuns} browser runs)</span></div>
<div class="tile"><b>${count(scenarioList, 'passed')}</b><span>passed</span></div>
<div class="tile"><b>${count(scenarioList, 'failed')}</b><span>failed (real failures)</span></div>
<div class="tile"><b>${count(scenarioList, 'flaky')}</b><span>flaky (passed on retry)</span></div>
</div>

<h2>Failures</h2>
${smokeFailed.length + otherFailed.length
  ? table(['Scenario', 'Feature', 'Severity', 'Browsers', 'Error'], failureRows([...smokeFailed, ...otherFailed]))
  : '<p class="small">No failures in this run.</p>'}

<h2>Flaky (needed a retry)</h2>
${count(scenarioList, 'flaky')
  ? table(['Scenario', 'Feature', 'Severity', 'Browsers', 'Error'], failureRows(scenarioList.filter((s) => s.outcome === 'flaky')))
  : '<p class="small">None.</p>'}

<h2>Coverage of this run, by feature</h2>
<div class="scroll">${table(['Feature', 'Scenarios', 'Passed', 'Failed', 'Flaky'], Object.entries(byFeature).sort().map(([name, f]) => [escapeHtml(name), f.scenarios, f.passed, f.failed, f.flaky]))}</div>

<h2>What is not automated</h2>
<p class="small">From the site's documented cases (reporting/data/featureInventory.json, kept by hand): UI ${gapCounts('ui').full} of ${gapCounts('ui').total} fully automated (${gapCounts('ui').partial} partial); API ${gapCounts('api').full} of ${gapCounts('api').total} (${gapCounts('api').partial} partial).</p>
${highGaps.length ? table(['Case', 'Layer', 'Coverage', 'Note'], highGaps.map((g) => [escapeHtml(`${g.id} ${g.title}`), g.layer.toUpperCase(), g.coverage, escapeHtml(g.note || '')])) : ''}
<p class="small">High-risk gaps shown; run <code>npm run report:gaps</code> for the full list.</p>

<h2>Trend</h2>
<p class="small">${escapeHtml(trendLine)}</p>
${comparable.length ? table(['Run', 'Passed', 'Failed', 'Flaky', 'Duration'], comparable.map((t) => [new Date(t.date).toLocaleString('en-ZA'), t.passed, t.failed, t.flaky, seconds(t.duration)])) : ''}
<p class="small">Only earlier runs with the same number of browser runs are compared.</p>

<h2>What was tested</h2>
${table(['Item', 'Value'], meta.map(([k, v]) => [escapeHtml(k), escapeHtml(v)]))}
<p class="small">The application under test is a third-party site with no version number to report.</p>
</main></body></html>
`;

const outDir = path.join(rootDir, 'release-summary');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html);

console.log(`${verdict.text}: ${verdict.detail}`);
console.log(`${scenarioList.length} scenarios / ${totalRuns} browser runs -- ${count(scenarioList, 'failed')} failed, ${count(scenarioList, 'flaky')} flaky${partial ? ' (PARTIAL RUN)' : ''}`);
console.log(`Written to ${path.join('release-summary', 'index.html')}`);
