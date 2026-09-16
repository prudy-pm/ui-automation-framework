import { test } from '@fixtures/pageFixtures';
import { generateRandomEmail, generateRandomPassword } from '@utils/helpers';

test.describe('Empty Field Validation', () => {
  test.describe('Login form', () => {
    test('browser blocks empty email before submission @regression', async ({ loginPage }) => {
      await loginPage.loginViaNav('', generateRandomPassword());
      await loginPage.expectEmailFieldRejectedByBrowser();
    });

    test('browser blocks empty password before submission @regression', async ({ loginPage }) => {
      await loginPage.loginViaNav(generateRandomEmail(), '');
      await loginPage.expectPasswordFieldRejectedByBrowser();
    });
  });

  test.describe('Signup form', () => {
    test('browser blocks empty name before submission @regression', async ({ signupPage }) => {
      await signupPage.goto();
      await signupPage.submitSignup('', generateRandomEmail());
      await signupPage.expectNameFieldRejectedByBrowser();
    });

    test('browser blocks empty email before submission @regression', async ({ signupPage }) => {
      await signupPage.goto();
      await signupPage.submitSignup('Test User', '');
      await signupPage.expectEmailFieldRejectedByBrowser();
    });
  });
});
