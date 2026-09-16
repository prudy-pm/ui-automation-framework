import * as fs from 'fs';
import * as path from 'path';
import { request } from '@playwright/test';
import { test as pageTest } from './pageFixtures';
import { LoginPage } from '@pages/LoginPage';
import { env } from '@config/env';
import { AccountApiClient } from '@api/AccountApiClient';
import { toApiPayload } from '@utils/accountFactory';
import { generateUniqueEmail, generateRandomPassword } from '@utils/helpers';
import accountProfiles from '@data/accountProfiles.json';
import { AccountProfile } from '@data/types';

export type FreshAccount = {
  email: string;
  password: string;
};

type WorkerFixtures = {
  // One throwaway account per Playwright *worker*, not per test or shared
  // globally. Each worker process gets its own real account (and so its
  // own server-side cart), which is what lets every worker run checkout
  // concurrently without racing another worker over the same cart -- the
  // failure that used to force checkout's browsers to run one at a time
  // (see README > Authenticated Tests).
  workerAccount: FreshAccount;
  // Logs in once per worker as that worker's account and caches the
  // resulting session to a per-worker file. This is Playwright's documented
  // pattern for isolating test data per parallel worker -- see
  // https://playwright.dev/docs/test-parallel#worker-index. Every test in
  // this worker then starts already authenticated for free, the same
  // benefit the old single-shared-account storageState gave, just no
  // longer built on a session every worker was fighting over.
  workerStorageState: string;
};

export const test = pageTest.extend<{}, WorkerFixtures>({
  workerAccount: [
    async ({}, use) => {
      const apiContext = await request.newContext({ baseURL: env.apiBaseUrl });
      const accountApi = new AccountApiClient(apiContext);
      const [profile] = accountProfiles as AccountProfile[];
      const email = generateUniqueEmail('ui.checkout');
      const password = generateRandomPassword();

      const createResponse = await accountApi.createAccount(toApiPayload(profile, email, password));
      const createBody = await createResponse.json();
      if (createBody.responseCode !== 201) {
        await apiContext.dispose();
        throw new Error(`Failed to seed a throwaway account (${email}) for test setup: ${createBody.message}`);
      }

      try {
        await use({ email, password });
      } finally {
        await accountApi.deleteAccount(email, password);
        await apiContext.dispose();
      }
    },
    { scope: 'worker' },
  ],

  workerStorageState: [
    async ({ browser, workerAccount }, use, workerInfo) => {
      const statePath = path.resolve('playwright/.auth', `worker-${workerInfo.workerIndex}.json`);
      fs.mkdirSync(path.dirname(statePath), { recursive: true });

      // A worker-scoped context bypasses the normal per-test fixture
      // pipeline that applies playwright.config.ts's `use.baseURL`
      // automatically -- it has to be passed explicitly here, or
      // `loginViaNav`'s relative goto('/') fails as an invalid URL.
      const context = await browser.newContext({ baseURL: env.baseUrl });
      const page = await context.newPage();
      const loginPage = new LoginPage(page);
      await loginPage.loginViaNav(workerAccount.email, workerAccount.password);
      await loginPage.expectLoggedInSuccessfully();
      await context.storageState({ path: statePath });
      await context.close();

      await use(statePath);
    },
    { scope: 'worker' },
  ],

  // The built-in `storageState` option is test-scoped (it's read fresh for
  // every test's context); overriding it to just hand back the worker's
  // cached path is what makes every test in this worker start already
  // logged in, without each one re-running the login UI flow itself.
  storageState: async ({ workerStorageState }, use) => {
    await use(workerStorageState);
  },
});

export { expect } from '@playwright/test';
