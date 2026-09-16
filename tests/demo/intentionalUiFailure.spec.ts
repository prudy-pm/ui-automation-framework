import { test, expect } from '@fixtures/pageFixtures';
import { CATALOG_PRODUCT } from '@data/scenarios';

// TEMPORARY -- UI half of tests/demo/intentionalApiFailure.spec.ts. Delete after the demo.
test.describe('DEMO: intentional failure (UI)', () => {
  test('cart shows a loyalty discount banner that does not exist on this site @demo', async ({
    productsPage,
    cartPage,
  }) => {
    await productsPage.goto();
    await productsPage.searchAndAddFirstToCart(CATALOG_PRODUCT.searchTerm);
    await productsPage.goToCartFromModal();

    await cartPage.expectCartPageLoaded();
    // Deliberately false -- this banner doesn't exist on the real cart page.
    await expect(cartPage.page.getByText('Loyalty Discount Applied')).toBeVisible();
  });
});
