#!/usr/bin/env node
/**
 * Copies the current report folders into reports-archive/<timestamp>/ so an
 * older run stays viewable after the next run overwrites them.
 * Run after a test run.
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}h${pad(now.getMinutes())}`;
const target = path.join(rootDir, 'reports-archive', stamp);

const sources = ['playwright-report', 'allure-report-single', 'monocart-report', 'release-summary'];
let copied = 0;

for (const name of sources) {
  const from = path.join(rootDir, name);
  if (!fs.existsSync(from)) continue;
  fs.cpSync(from, path.join(target, name), { recursive: true });
  copied++;
  console.log(`Archived ${name}`);
}

console.log(copied ? `Saved to ${target}` : 'No report folders found -- run the tests first.');
