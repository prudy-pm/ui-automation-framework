#!/usr/bin/env node
/**
 * Prints what is and isn't automated, per layer (ui / api), against the site's
 * documented cases -- 26 UI test cases (https://automationexercise.com/test_cases)
 * and 14 APIs (https://automationexercise.com/api_list) -- kept by hand in
 * reporting/data/featureInventory.json. Also fails if the inventory cites a spec file
 * that no longer exists, so the list can't quietly drift out of date.
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..', '..');
const inventory = JSON.parse(fs.readFileSync(path.join(rootDir, 'reporting', 'data', 'featureInventory.json'), 'utf8'));

const missing = inventory.flatMap((item) => item.specs.filter((spec) => !fs.existsSync(path.join(rootDir, spec)))
  .map((spec) => `${item.id} cites ${spec}, which does not exist`));

const rank = { high: 0, medium: 1, low: 2 };
const pct = (n, total) => `${Math.round((n / total) * 100)}%`;

for (const layer of ['ui', 'api']) {
  const items = inventory.filter((item) => item.layer === layer);
  console.log(`${layer.toUpperCase()} cases: ${items.length}`);
  for (const level of ['full', 'partial', 'none']) {
    const n = items.filter((item) => item.coverage === level).length;
    console.log(`  ${level.padEnd(8)} ${String(n).padStart(2)}  (${pct(n, items.length)})`);
  }
  const gaps = items.filter((item) => item.coverage !== 'full').sort((a, b) => rank[a.risk] - rank[b.risk]);
  console.log(`  Gaps, highest risk first:`);
  for (const item of gaps) {
    const note = item.note ? ` -- ${item.note}` : '';
    console.log(`    [${item.risk.padEnd(6)}] ${item.coverage.padEnd(7)} ${item.id.padEnd(5)} ${item.title}${note}`);
  }
  console.log('');
}

if (missing.length) {
  console.error(`\nInventory is out of date:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
