import { test as base } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { ProductsPage } from '@pages/ProductsPage';
import { CartPage } from '@pages/CartPage';
import { FooterComponent } from '@pages/FooterComponent';

type PageFixtures = {
  loginPage: LoginPage;
  productsPage: ProductsPage;
  cartPage: CartPage;
  footer: FooterComponent;
};

const AD_URL_PATTERNS = [
  /googlesyndication\.com/,
  /doubleclick\.net/,
  /adservice\.google\.com/,
  /google_vignette/,
  /googletagservices\.com/,
];

export const test = base.extend<PageFixtures>({
 
  page: async ({ page }, use) => {
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (AD_URL_PATTERNS.some((pattern) => pattern.test(url))) {
        return route.abort();
      }
      return route.continue();
    });
    await use(page);
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
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
});

export { expect } from '@playwright/test';