import { test as base, request } from '@playwright/test';
import { env } from '@config/env';
import { ProductsApiClient } from '@api/ProductsApiClient';
import { AccountApiClient } from '@api/AccountApiClient';

type ApiFixtures = {
  productsApi: ProductsApiClient;
  accountApi: AccountApiClient;
};

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