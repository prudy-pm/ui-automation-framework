import { test as base } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { SignupPage } from '@pages/SignupPage';
import { ProductsPage } from '@pages/ProductsPage';
import { CartPage } from '@pages/CartPage';
import { FooterComponent } from '@pages/FooterComponent';
import { ProductDetailPage } from '@pages/ProductDetailPage';
import { CheckoutPage } from '@pages/CheckoutPage';
import { PaymentPage } from '@pages/PaymentPage';
import { OrderConfirmationPage } from '@pages/OrderConfirmationPage';

type PageFixtures = {
  loginPage: LoginPage;
  signupPage: SignupPage;
  productsPage: ProductsPage;
  cartPage: CartPage;
  footer: FooterComponent;
  productDetailPage: ProductDetailPage;
  checkoutPage: CheckoutPage;
  paymentPage: PaymentPage;
  orderConfirmationPage: OrderConfirmationPage;
};

const AD_URL_PATTERNS = [
  /googlesyndication\.com/,
  /doubleclick\.net/,
  /adservice\.google\.com/,
  /google_vignette/,
  /googletagservices\.com/,
];

export const test = base.extend<PageFixtures>({
  page: async ({ page }, use, testInfo) => {
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (AD_URL_PATTERNS.some((pattern) => pattern.test(url))) {
        return route.abort();
      }
      return route.continue();
    });
    await use(page);
    // On failure Playwright snapshots the page into the report, input values included -- blank fillSecret fields first.
    // Capped at 2s: a page stuck mid-navigation must not turn a fast failure into a teardown timeout.
    if (testInfo.status !== testInfo.expectedStatus) {
      const clear = page
        .evaluate(() => document.querySelectorAll<HTMLInputElement>('[data-secret]').forEach((el) => (el.value = '')))
        .catch(() => {});
      await Promise.race([clear, new Promise((resolve) => setTimeout(resolve, 2_000))]);
    }
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  signupPage: async ({ page }, use) => {
    await use(new SignupPage(page));
  },
  productsPage: async ({ page }, use) => {
    await use(new ProductsPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  footer: async ({ page }, use) => {
    await use(new FooterComponent(page));
  },

  productDetailPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },

  checkoutPage: async ({ page }, use) => {
    await use(new CheckoutPage(page));
  },
  paymentPage: async ({ page }, use) => {
    await use(new PaymentPage(page));
  },
  orderConfirmationPage: async ({ page }, use) => {
    await use(new OrderConfirmationPage(page));
  },
});

export { expect } from '@playwright/test';
