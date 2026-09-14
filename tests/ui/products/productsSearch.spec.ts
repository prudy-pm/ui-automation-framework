import { test } from '@fixtures/pageFixtures';
import { readExcelSheet } from '@utils/excelData';
import { ProductSearchCase } from '@data/types';

const productSearchCases = readExcelSheet<ProductSearchCase>('data/productSearchTerms.xlsx');

test.describe('Product Search', () => {
  productSearchCases.forEach((data) => {
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