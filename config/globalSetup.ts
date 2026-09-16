import { request } from '@playwright/test';
import { env } from './env';
import { ProductsApiClient } from '@api/ProductsApiClient';
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
