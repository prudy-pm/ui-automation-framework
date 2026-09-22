import { test } from '@fixtures/pageFixtures';
import { describeTest, tagAllure } from '@utils/allureTags';
import { CATALOG_PRODUCT } from '@data/scenarios';
import { AUTH_FILE } from '@config/authFile';

// Checkout requires a logged-in account (a guest's "Proceed To Checkout" is
// redirected into a register/login prompt instead). Reuses the session
// config/globalSetup.ts already logged in and saved -- see that file.
test.use({ storageState: AUTH_FILE });

test.describe('Checkout', () => {
  tagAllure({ epic: 'Shopping', feature: 'Checkout', story: 'Pay with card' });
  test('logged-in user can complete checkout with a card payment @smoke', async ({
    productsPage,
    cartPage,
    checkoutPage,
    paymentPage,
    orderConfirmationPage,
  }) => {
    await describeTest('A logged-in shopper can buy a product end to end: cart, address review, card payment and order confirmation.');
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
