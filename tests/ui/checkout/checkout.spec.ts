import { test } from '@fixtures/accountFixtures';
import { CATALOG_PRODUCT } from '@data/scenarios';

// Checkout requires a logged-in account (a guest's "Proceed To Checkout" is
// redirected into a register/login prompt instead). Every test in this
// worker starts already authenticated as that worker's own throwaway
// account, via the worker-scoped storageState in fixtures/accountFixtures.ts
// -- a different worker (and so a different browser project running these
// tests concurrently) always gets a different account, so there's no shared
// server-side cart for parallel workers to race on.
test.describe('Checkout', () => {
  test('logged-in user can complete checkout with a card payment @smoke', async ({
    productsPage,
    cartPage,
    checkoutPage,
    paymentPage,
    orderConfirmationPage,
  }) => {
    // The worker's account/cart is reused across every test this worker
    // runs, so clear it first -- deterministic quantities/totals below
    // regardless of what an earlier test in this worker left behind.
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
