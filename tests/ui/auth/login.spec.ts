import { test } from '@fixtures/pageFixtures';
import { env } from '@config/env';
import { generateRandomEmail, generateRandomPassword } from '@utils/helpers';
import loginScenarios from '@data/loginScenarios.json';

// Scenario metadata (which case, which data source) is committed -- it's
// not sensitive. The actual email/password values are generated at test
// time, so nothing predictable about real or plausible-looking credentials
// ever sits permanently in git history.
function resolveCredentials(source: string): { email: string; password: string } {
  switch (source) {
    case 'validEmailWrongPassword':
      return { email: env.testUser.email, password: generateRandomPassword() };
    case 'randomAccount':
      return { email: generateRandomEmail(), password: generateRandomPassword() };
    default:
      throw new Error(`Unknown login scenario source: ${source}`);
  }
}

test.describe('Login', () => {
  test('user can log in with valid credentials @smoke', async ({ loginPage }) => {
    await loginPage.goto('/');
    await loginPage.openViaNav();
    await loginPage.login(env.testUser.email, env.testUser.password);
    await loginPage.expectLoggedInSuccessfully();
  });

  loginScenarios.forEach((scenario) => {
    test(`login fails - ${scenario.case} @regression`, async ({ loginPage }) => {
      const { email, password } = resolveCredentials(scenario.source);
      await loginPage.goto('/');
      await loginPage.openViaNav();
      await loginPage.login(email, password);
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