import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import { execSync } from 'child_process';
import { env } from './config/env';

// allure-playwright only appends, so clear stale results before each run.
if (process.env.TEST_WORKER_INDEX === undefined) {
  fs.rmSync('allure-results', { recursive: true, force: true });
}

const git = (args: string): string => {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
};
const buildInfo = {
  'Base URL': env.baseUrl,
  'Framework commit':
    (git('rev-parse --short HEAD') || 'unknown') + (git('status --porcelain') ? ' (uncommitted changes)' : ''),
  'Configured browsers': 'chromium, firefox, webkit',
  'Run type': process.env.CI ? 'CI' : 'local',
};

export default defineConfig({
  testDir: './tests',
  metadata: buildInfo,
  globalSetup: require.resolve('./config/globalSetup'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  // Raised from Playwright's 30s default -- automationexercise.com has no SLA and often needs longer.
  timeout: 45_000,
  expect: {
    // Raised from Playwright's 5s default for the same reason.
    timeout: 10_000,
  },
  reporter: [
    ['html'],
    ['@estruyf/github-actions-reporter'],
    ['allure-playwright', { resultsDir: 'allure-results', environmentInfo: buildInfo, detail: false }],
    [
      'monocart-reporter',
      {
        name: 'UI Automation Framework Report',
        outputFile: 'monocart-report/index.html',
        zip: true,
        trend: './monocart-report/index.json',
        // monocart-reporter types visitor/columns data as `any` in its own d.ts -- no stronger type exists to import.
        visitor: (data: any, metadata: any) => {
          // Mirrors the layer/epic/feature/story/severity annotations utils/allureTags.ts sets, so both reports agree.
          for (const item of metadata.annotations ?? []) {
            if (['epic', 'feature', 'story', 'severity', 'layer'].includes(item.type) && item.description) {
              data[item.type] = item.description;
            }
          }
          // Drops Allure's internal "Attach Allure Metadata" noise -- not a real attachment a reader would want.
          if (data.attachments) {
            data.attachments = data.attachments.filter(
              (a: any) => a.contentType !== 'application/vnd.allure.message+json',
            );
          }
          if (data.subs) {
            data.subs = data.subs.filter(
              (s: any) => !(s.stepType === 'test.attach' && s.title?.includes('Allure Metadata')),
            );
          }
          // Monocart keeps raw "Fill <value>" action steps (Allure's detail: false drops them) -- mask so real credentials never land in the report.
          if (data.type === 'step' && data.title?.startsWith('Fill "')) {
            data.title = data.title.replace(/^Fill "[\s\S]*" (?=locator\(|getBy)/, 'Fill "***" ');
          }
        },
        columns: (defaultColumns: any[]) => {
          // Must mutate in place -- Monocart discards this callback's return value.
          const drop = new Set(['expectedStatus', 'status', 'annotations']);
          const kept = defaultColumns.filter((column: any) => !drop.has(column.id));
          defaultColumns.length = 0;
          defaultColumns.push(...kept);

          const at = defaultColumns.findIndex((column: any) => column.id === 'duration');
          defaultColumns.splice(
            at,
            0,
            { id: 'layer', name: 'Layer', width: 70, searchable: true, sortable: true },
            { id: 'epic', name: 'Epic', width: 100, searchable: true, sortable: true },
            { id: 'feature', name: 'Feature', width: 110, searchable: true, sortable: true },
            { id: 'story', name: 'Story', width: 150, searchable: true, sortable: true },
            { id: 'severity', name: 'Severity', width: 80, searchable: true, sortable: true },
          );
        },
        tags: {
          smoke: { background: '#0B7A3D' },
          regression: { background: '#0B5FA3' },
        },
      },
    ],
  ],
  use: {
    baseURL: env.baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      // checkout reuses one shared account's session -- kept to one project so nothing races its cart.
      testIgnore: /tests[\\/]ui[\\/]checkout[\\/]/,
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /tests[\\/]ui[\\/]checkout[\\/]/,
    },
  ],
});
