import { AccountProfile } from '@data/types';
import { NewAccountDetails } from '@api/AccountApiClient';

/**
 * Maps a centralized AccountProfile fixture onto the field names
 * AutomationExercise's createAccount/updateAccount API actually expects
 * (confirmed via a real call -- see AccountApiClient.ts). Shared by
 * tests/api/auth.spec.ts and fixtures/accountFixtures.ts so both build the
 * same payload shape from the same fixture data.
 */
export function toApiPayload(profile: AccountProfile, email: string, password: string): NewAccountDetails {
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
