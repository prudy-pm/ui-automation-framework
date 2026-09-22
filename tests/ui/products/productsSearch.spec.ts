import { test } from '@fixtures/pageFixtures';
import { describeTest, tagAllure } from '@utils/allureTags';
import { readExcelSheet } from '@utils/excelData';
import { ProductSearchCase } from '@data/types';

const productSearchCases = readExcelSheet<ProductSearchCase>('data/productSearchTerms.xlsx');

test.describe('Product Search', () => {
  tagAllure({ epic: 'Shopping', feature: 'Products', story: 'Search' });
  productSearchCases.forEach((data) => {
    test(`search returns results for "${data.searchTerm}" @regression`, async ({ productsPage }) => {
      await productsPage.goto();
      await productsPage.searchProduct(data.searchTerm);
      await productsPage.expectResultsVisible();
    });
  });

  test('user can add first search result to cart @smoke', async ({ productsPage }) => {
    await describeTest('A shopper can search for a product and add the first result to the cart.');
    await productsPage.goto();
    await productsPage.searchAndAddFirstToCart('top');
    await productsPage.continueShopping();
  });
});