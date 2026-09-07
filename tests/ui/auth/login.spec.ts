import { test } from '@fixtures/pageFixtures';
import { env } from '@config/env';
import invalidLoginCases from '@data/users.json';
import { InvalidLoginCase } from '@data/types';

test.describe('Login', () => {
  test('user can log in with valid credentials @smoke', async ({ loginPage }) => {
    await loginPage.goto('/');
    await loginPage.openViaNav();
    await loginPage.login(env.testUser.email, env.testUser.password);
    await loginPage.expectLoggedInSuccessfully();
  });

  (invalidLoginCases as InvalidLoginCase[]).forEach((data) => {
    test(`login fails - ${data.case} @regression`, async ({ loginPage }) => {
      await loginPage.goto('/');
      await loginPage.openViaNav();
      await loginPage.login(data.email, data.password);
      await loginPage.expectLoginErrorVisible();
    });
  });

  test('browser blocks malformed email format before submission @regression', async ({ loginPage }) => {
    await loginPage.goto('/');
    await loginPage.openViaNav();
    await loginPage.login('not-a-valid-email', 'SomePassword123!');
    await loginPage.expectEmailFieldRejectedByBrowser();
  });
});