import { test, expect } from '@fixtures/apiFixtures';
import { describeTest, tagAllure } from '@utils/allureTags';

test.describe('Products API', () => {
  tagAllure({ epic: 'Shopping', feature: 'Products', story: 'Catalog API' });
  test('GET productsList returns 200 and a non-empty product list @smoke', async ({ productsApi }) => {
    await describeTest('The product catalog API responds and returns a non-empty product list.');
    const response = await productsApi.getAllProducts();
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.responseCode).toBe(200);
    expect(Array.isArray(body.products)).toBe(true);
    expect(body.products.length).toBeGreaterThan(0);
  });

  test('POST searchProduct returns matching products @regression', async ({ productsApi }) => {
    const response = await productsApi.searchProduct('top');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.responseCode).toBe(200);
    expect(body.products.length).toBeGreaterThan(0);
  }); 
});