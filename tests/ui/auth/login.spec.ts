import { test } from '@fixtures/pageFixtures';
import { describeTest, tagAllure } from '@utils/allureTags';
import { env } from '@config/env';
import { generateRandomEmail, generateRandomPassword } from '@utils/helpers';
import loginScenarios from '@data/loginScenarios.json';

// Only scenario metadata is committed; actual credentials are generated at test time, never predictable.
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

// Trace off: the @smoke test below submits the real password, and trace: 'on-first-retry' would otherwise
// capture it in a CI-uploaded artifact on a flaky retry. Must be top-level, not inside describe (Playwright
// rejects test.use({ trace }) there -- it forces a new worker).
test.use({ trace: 'off' });

test.describe('Login', () => {
  tagAllure({ epic: 'Account', feature: 'Authentication', story: 'Login' });

  test('user can log in with valid credentials @smoke', async ({ loginPage }) => {
    await describeTest('A registered user can log in through the website with valid credentials.');
    await loginPage.loginViaNav(env.testUser.email, env.testUser.password);
    await loginPage.expectLoggedInSuccessfully();
  });

  loginScenarios.forEach((scenario) => {
    test(`login fails - ${scenario.case} @regression`, async ({ loginPage }) => {
      const { email, password } = resolveCredentials(scenario.source);
      await loginPage.loginViaNav(email, password);
      await loginPage.expectLoginErrorVisible();
    });
  });

  test('browser blocks malformed email format before submission @regression', async ({ loginPage }) => {
    await loginPage.loginViaNav('not-a-valid-email', 'SomePassword123!');
    await loginPage.expectEmailFieldRejectedByBrowser();
  });
});