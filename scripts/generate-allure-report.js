#!/usr/bin/env node
/**
 * Generates the local Allure report while preserving trend/history graphs
 * across runs.
 *
 * `allure generate --clean` wipes its output folder every time, which would
 * silently discard the previous report's `history/` folder along with it --
 * that folder is exactly what Allure reads to draw trend graphs (pass/fail
 * over time, duration, retries) across multiple runs. Allure looks for
 * `history/` inside the *results* directory when generating, not the old
 * report, so the fix is to carry it forward: copy last run's
 * `allure-report/history` into this run's `allure-results/history` before
 * generating.
 *
 * `allure serve` (the previous local script) never persisted a report
 * directory at all -- it builds into a temp folder and opens it, so no
 * history could ever accumulate. This script + `allure open` replaces that.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const resultsDir = path.join(rootDir, 'allure-results');
const reportDir = path.join(rootDir, 'allure-report');
const previousHistory = path.join(reportDir, 'history');
const carriedHistory = path.join(resultsDir, 'history');

if (fs.existsSync(previousHistory)) {
  fs.cpSync(previousHistory, carriedHistory, { recursive: true });
  console.log('Carried forward allure-report/history so trend graphs continue across runs.');
} else {
  console.log('No previous allure-report/history found -- this will be the first point on the trend graphs.');
}

// npx (not a bare `allure` call) so this resolves the locally installed
// allure-commandline binary regardless of how the script is invoked --
// confirmed necessary: a bare `allure` only resolves when npm has already
// put node_modules/.bin on PATH for the current process, which isn't true
// when this script is run directly with `node`.
//
// Built as one string for execSync (rather than execFileSync's args array)
// because the array form combined with Windows' required shell:true just
// concatenates args with spaces instead of escaping them -- confirmed by a
// real failure where the repo's own spaced path ("...Entelect Software
// (Pty) Ltd...") silently split into multiple broken arguments. Quoting
// each path ourselves and building the full string avoids that.
const quote = (value) => (/\s/.test(value) ? `"${value}"` : value);
execSync(`npx allure generate ${quote(resultsDir)} --clean -o ${quote(reportDir)}`, {
  stdio: 'inherit',
});
