import { test } from '@fixtures/pageFixtures';
import { CATALOG_PRODUCT } from '@data/scenarios';
import { AUTH_FILE } from '@config/authFile';

// Checkout requires a logged-in account (a guest's "Proceed To Checkout" is
// redirected into a register/login prompt instead). Reuses the session
// tests/setup/auth.setup.ts already logged in and saved -- see that file.
test.use({ storageState: AUTH_FILE });

test.describe('Checkout', () => {
  test('logged-in user can complete checkout with a card payment @smoke', async ({
    productsPage,
    cartPage,
    checkoutPage,
    paymentPage,
    orderConfirmationPage,
  }) => {
    // The shared account's cart carries over between runs -- clear it first
    // so quantities/totals below are deterministic.
    await cartPage.clearCart();

    await productsPage.goto();
    await productsPage.searchAndAddFirstToCart(CATALOG_PRODUCT.searchTerm);
    await productsPage.goToCartFromModal();

    await cartPage.expectCartPageLoaded();
    await cartPage.proceedToCheckout();

    await checkoutPage.expectAddressDetailsVisible();
    await checkoutPage.expectProductInReview(CATALOG_PRODUCT.name);
    await checkoutPage.expectOrderTotal(CATALOG_PRODUCT.price);
    await checkoutPage.addOrderComment('Please deliver in the evening.');
    await checkoutPage.placeOrder();

    await paymentPage.payWithCard({
      nameOnCard: 'Automation Test',
      cardNumber: '4242424242424242',
      cvc: '123',
      expiryMonth: '12',
      expiryYear: '2030',
    });

    await orderConfirmationPage.expectOrderConfirmed();
  });
});
