import { chromium, expect, request } from '@playwright/test';
import { env } from './env';
import { AUTH_FILE } from './authFile';
import { ProductsApiClient } from '@api/ProductsApiClient';
import { LoginPage } from '@pages/LoginPage';
import { CATALOG_PRODUCT } from '@data/scenarios';

type CatalogProduct = { name: string; price: string };

export default async function globalSetup(): Promise<void> {
  const apiContext = await request.newContext({ baseURL: env.apiBaseUrl });
  const productsApi = new ProductsApiClient(apiContext);

  try {
    const searchBody = await (await productsApi.searchProduct(CATALOG_PRODUCT.searchTerm)).json();
    assertFirstProductMatches(searchBody.products, `searchProduct('${CATALOG_PRODUCT.searchTerm}')`);

    const listBody = await (await productsApi.getAllProducts()).json();
    assertFirstProductMatches(listBody.products, 'productsList');
  } finally {
    await apiContext.dispose();
  }

  await saveTestUserSession();
}

// Logs in once as the shared env.testUser and saves the session to AUTH_FILE;
// checkout.spec.ts reuses it via test.use({ storageState: AUTH_FILE }). Done
// here, not as a test, so it doesn't show up in reports as a scenario.
// Retried once: the live site's origin is slow and occasionally resets connections.
async function saveTestUserSession(): Promise<void> {
  expect.configure({ timeout: 10_000 });
  const browser = await chromium.launch();
  try {
    for (let attempt = 1; ; attempt++) {
      const context = await browser.newContext({ baseURL: env.baseUrl });
      try {
        const loginPage = new LoginPage(await context.newPage());
        await loginPage.loginViaNav(env.testUser.email, env.testUser.password);
        await loginPage.expectLoggedInSuccessfully();
        await context.storageState({ path: AUTH_FILE });
        return;
      } catch (error) {
        if (attempt >= 2) throw new Error(`Test-user login (global setup) failed: ${error}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

function assertFirstProductMatches(products: CatalogProduct[] | undefined, source: string): void {
  const first = products?.[0];
  if (!first || first.name !== CATALOG_PRODUCT.name || first.price !== CATALOG_PRODUCT.price) {
    throw new Error(
      `Pre-flight catalog check failed: ${source} now returns "${first?.name}" at "${first?.price}" first, ` +
        `but data/scenarios.ts assumes "${CATALOG_PRODUCT.name}" at "${CATALOG_PRODUCT.price}". ` +
        `automationexercise.com's live catalog has changed -- update data/scenarios.ts (and any page-order ` +
        `assumptions in ProductsPage.viewProductAt/searchAndAddFirstToCart) before re-running the suite.`
    );
  }
}
