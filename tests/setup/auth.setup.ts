import { test as setup } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { env } from '@config/env';
import { AUTH_FILE } from '@config/authFile';

// Logs in once as the shared, pre-existing env.testUser 
// checkout.spec.ts reuses it via test.use({ storageState: AUTH_FILE }) instead of logging in itself.
setup('authenticate as the shared test user', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.loginViaNav(env.testUser.email, env.testUser.password);
  await loginPage.expectLoggedInSuccessfully();
  await page.context().storageState({ path: AUTH_FILE });
});
