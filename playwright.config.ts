import { defineConfig, devices } from '@playwright/test';
import { env } from './config/env';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  /* Pre-flight catalog check -- see config/globalSetup.ts. */
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
    ['allure-playwright', { resultsDir: 'allure-results' }],
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
    /* Runs tests/setup/auth.setup.ts once, before chromium, to produce
     * playwright/.auth/testUser.json -- see that file and config/authFile.ts. */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    /* checkout.spec.ts reuses one shared, pre-existing account's session
     * (see tests/setup/auth.setup.ts) and only runs here, not on
     * firefox/webkit -- a full paid checkout journey doesn't need to prove
     * itself cross-browser the way a smoke check does, and restricting it
     * to one project means there's only ever one instance of that test
     * touching that account's cart at a time, so nothing races. */
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
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
