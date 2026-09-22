import { test } from '@fixtures/pageFixtures';
import { describeTest, tagAllure } from '@utils/allureTags';
import { CATALOG_PRODUCT } from '@data/scenarios';

test.describe('Cart', () => {
  tagAllure({ epic: 'Shopping', feature: 'Cart', story: 'Add and remove' });
  test('added product appears in cart with correct price @smoke', async ({ productsPage, cartPage }) => {
    await describeTest('A product added from search appears in the cart at the correct price.');
    await productsPage.goto();
    await productsPage.searchAndAddFirstToCart(CATALOG_PRODUCT.searchTerm);
    await productsPage.goToCartFromModal();

    await cartPage.expectCartPageLoaded();
    await cartPage.expectProductInCart(CATALOG_PRODUCT.name);
    await cartPage.expectProductTotal(CATALOG_PRODUCT.name, CATALOG_PRODUCT.price);
  });

  test('user can remove a product from the cart @regression', async ({ productsPage, cartPage }) => {
    await productsPage.goto();
    await productsPage.searchAndAddFirstToCart(CATALOG_PRODUCT.searchTerm);
    await productsPage.goToCartFromModal();

    await cartPage.expectCartPageLoaded();
    await cartPage.expectProductInCart(CATALOG_PRODUCT.name);

    await cartPage.removeProduct(CATALOG_PRODUCT.name);
    await cartPage.expectProductRemoved(CATALOG_PRODUCT.name);
  });
});