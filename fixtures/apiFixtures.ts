import { test as base, request } from '@playwright/test';
import { env } from '@config/env';
import { ProductsApiClient } from '@api/ProductsApiClient';
import { AccountApiClient } from '@api/AccountApiClient';

type ApiFixtures = {
  productsApi: ProductsApiClient;
  accountApi: AccountApiClient;
};

// Each fixture creates its own APIRequestContext scoped to the API base URL
// (distinct from the UI baseURL in playwright.config.ts) and disposes it after
// the test -- no browser is ever launched for these tests.
export const test = base.extend<ApiFixtures>({
  productsApi: async ({}, use) => {
    const apiContext = await request.newContext({ baseURL: env.apiBaseUrl });
    await use(new ProductsApiClient(apiContext));
    await apiContext.dispose();
  },
  accountApi: async ({}, use) => {
    const apiContext = await request.newContext({ baseURL: env.apiBaseUrl });
    await use(new AccountApiClient(apiContext));
    await apiContext.dispose();
  },
});

export { expect } from '@playwright/test';