import { defineConfig, devices } from '@playwright/test';
import fs from 'fs';
import { execSync } from 'child_process';
import { env } from './config/env';

/* Start every run with an empty allure-results/ -- allure-playwright only adds
 * files, so results from earlier runs otherwise get mixed into this run's
 * report. Workers re-load this config mid-run, hence the TEST_WORKER_INDEX
 * guard (it is only unset in the main process). */
if (process.env.TEST_WORKER_INDEX === undefined) {
  fs.rmSync('allure-results', { recursive: true, force: true });
}

/* "Which build was tested" for the reports. The app under test is a third-party
 * live site with no version to read, so this records what we can: where we
 * pointed, which browsers, and which version of this framework ran. */
const git = (args: string): string => {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
};
const buildInfo = {
  'Base URL': env.baseUrl,
  'Framework commit': (git('rev-parse --short HEAD') || 'unknown') + (git('status --porcelain') ? ' (uncommitted changes)' : ''),
  'Configured browsers': 'chromium, firefox, webkit', // keep in sync with `projects` below; a filtered run may use fewer
  'Run type': process.env.CI ? 'CI' : 'local',
};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Shown as key/values in the Monocart report (see also environmentInfo on the Allure reporter). */
  metadata: buildInfo,
  /* @demo tests fail on purpose (to show how failures look in reports), so
   * they are excluded from normal runs. Opt in with `npm run test:demo`. */
  grepInvert: process.env.RUN_DEMO ? undefined : /@demo/,
  /* Pre-flight catalog check + test-user login -- see config/globalSetup.ts. */
  globalSetup: require.resolve('./config/globalSetup'),
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 1,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Default is 30s. automationexercise.com is a free public demo site with
   * no SLA -- real, repeated navigation timeouts/connection resets against
   * it (not app or config defects) made 30s too tight in practice. This
   * doesn't fix a genuine connection reset (only a retry can), but it stops
   * a merely-slow-but-working load from being reported as a failure. */
  timeout: 45_000,
  /* Default is 5s. Confirmed via a real failure: an AJAX-driven modal
   * (the "Add to cart" confirmation) missed this default while the site's
   * origin was measurably slow (~11s time-to-first-byte on a plain curl,
   * vs ~1s for a healthy site) -- the assertion itself was correct, the
   * server just hadn't responded yet. Matches the navigation `timeout`
   * bump above: same root cause, different default that was too tight. */
  expect: {
    timeout: 10_000,
  },
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['@estruyf/github-actions-reporter'],
    ['allure-playwright', { resultsDir: 'allure-results', environmentInfo: buildInfo, detail: false }],
    /* Trial: evaluating this against Allure for step-level detail + easy
     * sharing -- see README Reporting section. Kept alongside Allure long
     * term, not a replacement -- each has strengths the other doesn't.
     * `zip: true` also bundles attachments into one .zip alongside the
     * HTML. `trend` self-references this run's own previous index.json --
     * confirmed via source (lib/index.js) that trends are read before the
     * output dir is cleaned, so this accumulates across runs without a
     * carry-forward script (unlike Allure's history/ folder). */
    ['monocart-reporter', {
      name: 'UI Automation Framework Report',
      outputFile: 'monocart-report/index.html',
      zip: true,
      trend: './monocart-report/index.json',
      /* Copies the layer/epic/feature/story/severity annotations set by
       * utils/allureTags.ts onto each test row, shown as columns below.
       * Monocart has no epic()/feature()/story() API of its own like
       * Allure -- this is how the two reports end up agreeing. Also drops
       * the "Allure Metadata (metadata)" attachment(s) -- an internal
       * message allure-playwright sends itself via Playwright's own
       * attachment mechanism (contentType
       * application/vnd.allure.message+json, confirmed by inspecting a
       * real report's data), not a real attachment a reader would want to
       * open. Filtered by contentType, not the display name Monocart
       * derives from it, since that's more likely to stay stable.
       *
       * That filter only clears the case-level Attachments *column* --
       * every Allure API call (layer/epic/feature/story/severity, all called
       * inside tagAllure()'s beforeEach) also shows up as its own *step*
       * ("Attach \"Allure Metadata (metadata)\"", stepType: 'test.attach'),
       * nested under Before Hooks -> beforeEach hook, confirmed by
       * inspecting a real report's step tree. Steps don't carry
       * contentType (Monocart deliberately doesn't expose it there), so
       * this filters by stepType + title instead. Runs bottom-up (a
       * step's own subs are already built by the time its visitor call
       * happens, confirmed via Monocart's source), so filtering data.subs
       * here cleans every level on the way up to Before/After Hooks. */
      visitor: (data, metadata) => {
        for (const item of metadata.annotations ?? []) {
          if (['epic', 'feature', 'story', 'severity', 'layer'].includes(item.type) && item.description) {
            data[item.type] = item.description;
          }
        }
        if (data.attachments) {
          data.attachments = data.attachments.filter((a) => a.contentType !== 'application/vnd.allure.message+json');
        }
        if (data.subs) {
          data.subs = data.subs.filter((s) => !(s.stepType === 'test.attach' && s.title?.includes('Allure Metadata')));
        }
      },
      columns: (defaultColumns) => {
        /* expectedStatus is always "passed" here (no test.fail()/fixme() in
         * this suite -- confirmed), so it never carries information.
         * status duplicates outcome on every passing row and adds little
         * on a failing one; outcome (expected/unexpected/flaky/skipped) is
         * kept as the searchable/sortable text version of the caseType
         * icon. annotations is now redundant with the layer/epic/feature/
         * story/severity columns added below.
         * Must mutate defaultColumns in place -- confirmed via source
         * (lib/visitor.js) that this handler's return value is discarded. */
        const drop = new Set(['expectedStatus', 'status', 'annotations']);
        const kept = defaultColumns.filter((column) => !drop.has(column.id));
        defaultColumns.length = 0;
        defaultColumns.push(...kept);

        const at = defaultColumns.findIndex((column) => column.id === 'duration');
        defaultColumns.splice(at, 0,
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
        demo: { background: '#B36B00' },
      },
    }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL: env.baseUrl,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Attaches a screenshot to every failed test's report entry. */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    /* checkout.spec.ts reuses one shared, pre-existing account's session
     * (saved by config/globalSetup.ts) and only runs here, not on
     * firefox/webkit -- a full paid checkout journey doesn't need to prove
     * itself cross-browser the way a smoke check does, and restricting it
     * to one project means there's only ever one instance of that test
     * touching that account's cart at a time, so nothing races. */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: /tests[\\/]ui[\\/]checkout[\\/]/,
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /tests[\\/]ui[\\/]checkout[\\/]/,
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
