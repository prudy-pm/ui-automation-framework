import { test } from '@fixtures/pageFixtures';
import { describeTest, tagAllure } from '@utils/allureTags';
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

// Trace off for this whole file: the @smoke test below submits the real
// env.testUser.password via the UI, and trace: 'on-first-retry'
// (playwright.config.ts) would otherwise capture that login POST body in
// plaintext into a CI-uploaded report artifact if this test ever flakes
// and retries. The other tests below never use the real password
// (faker-generated), so losing their trace on retry costs nothing. Must be
// top-level in the file (not inside describe) -- Playwright rejects
// test.use({ trace }) in a describe group since it forces a new worker.
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