import { test, expect } from '@fixtures/apiFixtures';
import { linkIssue } from '@utils/allureTags';

// TEMPORARY -- proves the Teams/Allure failure reporting works. Delete after the demo.
test.describe('DEMO: intentional failure (API)', () => {
  test('productsList includes a seasonal product that was never added @demo', async ({ productsApi }) => {
    await linkIssue('DEMO-1');
    const response = await productsApi.getAllProducts();
    const body = await response.json();

    const productNames = (body.products as { name: string }[]).map((product) => product.name);
    // Deliberately false -- no such product exists in the live catalog.
    expect(productNames).toContain('Limited Edition Holiday Top');
  });
});
