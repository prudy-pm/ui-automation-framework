#!/usr/bin/env node
// Runs only the intentional-failure @demo tests. They are excluded from normal
// runs by `grepInvert` in playwright.config.ts unless RUN_DEMO is set; setting
// it here keeps `npm run test:demo` working on Windows and Unix alike.
const { spawnSync } = require('child_process');

const result = spawnSync('npx playwright test --grep @demo', {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, RUN_DEMO: '1' },
});
process.exit(result.status ?? 1);
