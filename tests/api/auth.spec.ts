import { test, expect } from '@fixtures/apiFixtures';
import { env } from '@config/env';
import { generateUniqueEmail, generateRandomPassword } from '@utils/helpers';
import { toApiPayload } from '@utils/accountFactory';
import accountProfiles from '@data/accountProfiles.json';
import { AccountProfile } from '@data/types';

test.describe('Account API', () => {
  test('verifyLogin succeeds for the existing test account @smoke', async ({ accountApi }) => {
    const response = await accountApi.verifyLogin(env.testUser.email, env.testUser.password);
    const body = await response.json();
    expect(body.responseCode).toBe(200);
  });

  test('verifyLogin fails for invalid credentials @regression', async ({ accountApi }) => {
    const response = await accountApi.verifyLogin('no.such.account@example.com', 'WrongPassword123!');
    const body = await response.json();
    expect(body.responseCode).toBe(404);
  });

  test('createAccount rejects an email that already exists @regression', async ({ accountApi }) => {
    const [profile] = accountProfiles as AccountProfile[];
    const response = await accountApi.createAccount(
      toApiPayload(profile, env.testUser.email, generateRandomPassword())
    );
    const body = await response.json();
    expect(body.responseCode).toBe(400);
    expect(body.message).toBe('Email already exists!');
  });

  // Confirmed via a real exploratory call: updateAccount only accepts PUT.
  // POST returns a 405 with this exact message -- a real, observed API
  // contract detail, not a guess about how REST "should" behave.
  test('updateAccount rejects the wrong HTTP method @regression', async ({ accountApi }) => {
    const response = await accountApi.post('updateAccount', { email: env.testUser.email });
    expect(response.status()).toBe(405);
    const body = await response.json();
    expect(body.detail).toBe('Method "POST" not allowed.');
  });

  // Confirmed via a real call -- distinct message from verifyLogin's 404 above.
  test('getUserDetailByEmail returns 404 for an email that was never registered @regression', async ({
    accountApi,
  }) => {
    const response = await accountApi.getUserDetailByEmail('definitely.not.a.real.account.xyz123@example.com');
    const body = await response.json();
    expect(body.responseCode).toBe(404);
    expect(body.message).toBe('Account not found with this email, try another email!');
  });

  // Confirmed via a real call.
  test('deleteAccount returns 404 for an account that does not exist @regression', async ({ accountApi }) => {
    const response = await accountApi.deleteAccount('definitely.not.a.real.account.xyz123@example.com', 'whatever');
    const body = await response.json();
    expect(body.responseCode).toBe(404);
    expect(body.message).toBe('Account not found!');
  });

  // Confirmed via a real call.
  test('verifyLogin rejects a request missing the password parameter @regression', async ({ accountApi }) => {
    const response = await accountApi.post('verifyLogin', { email: 'someone@example.com' });
    const body = await response.json();
    expect(body.responseCode).toBe(400);
    expect(body.message).toBe('Bad request, email or password parameter is missing in POST request.');
  });

  // Confirmed via a real call.
  test('createAccount rejects a request missing a required field @regression', async ({ accountApi }) => {
    const response = await accountApi.post('createAccount', { email: 'missing.fields.test@example.com' });
    const body = await response.json();
    expect(body.responseCode).toBe(400);
    expect(body.message).toBe('Bad request, name parameter is missing in POST request.');
  });

  (accountProfiles as AccountProfile[]).forEach((profile) => {
    // Full resource lifecycle: create it, read it back to confirm the data
    // persisted correctly, update one field, read again to confirm the
    // update actually took effect, then delete. Each step's assertion
    // depends on the real state left by the step before it -- this is
    // deliberately stateful, unlike the earlier standalone tests above.
    test(`account lifecycle: create, verify, update, verify, delete a ${profile.profile} @regression`, async ({
      accountApi,
    }) => {
      const email = generateUniqueEmail();
      const password = generateRandomPassword();

      // create/verify/update/verify in `try`, delete in `finally`: a failed
      // assertion partway through must not leak the account on the real
      // automationexercise.com site with no bulk-delete tool to clean it up.
      try {
        const createResponse = await accountApi.createAccount(toApiPayload(profile, email, password));
        expect((await createResponse.json()).responseCode).toBe(201);

        const afterCreate = await (await accountApi.getUserDetailByEmail(email)).json();
        expect(afterCreate.responseCode).toBe(200);
        expect(afterCreate.user.first_name).toBe(profile.personalInfo.firstname);
        expect(afterCreate.user.last_name).toBe(profile.personalInfo.lastname);

        const updatedFirstName = 'Updated';
        const updateResponse = await accountApi.updateAccount({
          ...toApiPayload(profile, email, password),
          firstname: updatedFirstName,
        });
        const updateBody = await updateResponse.json();
        expect(updateBody.responseCode).toBe(200);
        expect(updateBody.message).toBe('User updated!');

        const afterUpdate = await (await accountApi.getUserDetailByEmail(email)).json();
        expect(afterUpdate.user.first_name).toBe(updatedFirstName);
      } finally {
        const deleteResponse = await accountApi.deleteAccount(email, password);
        expect((await deleteResponse.json()).responseCode).toBe(200);
      }
    });
  });
});