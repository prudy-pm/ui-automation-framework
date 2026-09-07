import { test } from '@fixtures/pageFixtures';
import productSearchCases from '@data/products.json';
import { ProductSearchCase } from '@data/types';

test.describe('Product Search', () => {
  (productSearchCases as ProductSearchCase[]).forEach((data) => {
    test(`search returns results for "${data.searchTerm}" @regression`, async ({ productsPage }) => {
      await productsPage.goto('/products');
      await productsPage.searchProduct(data.searchTerm);
      await productsPage.expectResultsVisible();
    });
  });

  test('user can add first search result to cart @smoke', async ({ productsPage }) => {
    await productsPage.goto('/products');
    await productsPage.searchProduct('top');
    await productsPage.expectResultsVisible();
    await productsPage.addFirstResultToCart();
    await productsPage.continueShopping();
  });
});