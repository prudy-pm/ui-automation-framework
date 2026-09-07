import { test } from '@fixtures/pageFixtures';

test.describe('Cart', () => {
  test('added product appears in cart with correct price @smoke', async ({ productsPage, cartPage }) => {
    await productsPage.goto('/products');
    await productsPage.searchProduct('top');
    await productsPage.expectResultsVisible();
    await productsPage.addFirstResultToCart();
    await productsPage.goToCartFromModal();

    await cartPage.expectCartPageLoaded();
    await cartPage.expectProductInCart('Blue Top');
    await cartPage.expectProductTotal('Blue Top', 'Rs. 500');
  });
});