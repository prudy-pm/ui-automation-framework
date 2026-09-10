import { test, expect } from '@fixtures/apiFixtures';
import { env } from '@config/env';
import { generateUniqueEmail, generateRandomPassword } from '@utils/helpers';
import accountProfiles from '@data/accountProfiles.json';
import { AccountProfile } from '@data/types';
import { NewAccountDetails } from '@api/AccountApiClient';


function toApiPayload(profile: AccountProfile, email: string, password: string): NewAccountDetails {
  return {
    name: `${profile.personalInfo.firstname} ${profile.personalInfo.lastname}`,
    email,
    password,
    title: profile.personalInfo.title,
    birth_date: profile.personalInfo.birthDate.day,
    birth_month: profile.personalInfo.birthDate.month,
    birth_year: profile.personalInfo.birthDate.year,
    firstname: profile.personalInfo.firstname,
    lastname: profile.personalInfo.lastname,
    company: profile.address.company,
    address1: profile.address.address1,
    address2: profile.address.address2,
    country: profile.address.country,
    zipcode: profile.address.zipcode,
    state: profile.address.state,
    city: profile.address.city,
    mobile_number: profile.mobileNumber,
  };
}

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

  (accountProfiles as AccountProfile[]).forEach((profile) => {
    test(`account lifecycle: create then delete a ${profile.profile} @regression`, async ({ accountApi }) => {
      const email = generateUniqueEmail();
      const password = generateRandomPassword();

      const createResponse = await accountApi.createAccount(toApiPayload(profile, email, password));
      const createBody = await createResponse.json();
      expect(createBody.responseCode).toBe(201);

      const deleteResponse = await accountApi.deleteAccount(email, password);
      const deleteBody = await deleteResponse.json();
      expect(deleteBody.responseCode).toBe(200);
    });
  });
});