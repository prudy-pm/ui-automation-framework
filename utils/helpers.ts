import { faker } from '@faker-js/faker';

/**
 * Generates a unique, timestamp-based email for tests that need to create
 * throwaway data without colliding with previous runs (e.g. account
 * creation). Not tied to any specific page or API -- pure utility.
 */
export function generateUniqueEmail(prefix: string = 'api.test', domain: string = 'mailinator.com'): string {
  return `${prefix}.${Date.now()}@${domain}`;
}

/**
 * Generates a random email guaranteed (for practical purposes) not to exist
 * as a real account. Used for negative-login test cases so nothing
 * predictable ever sits committed in git -- see loginScenarios.json.
 */
export function generateRandomEmail(): string {
  return faker.internet.email();
}

/**
 * Generates a random password string, used wherever a test needs "some
 * value that will be rejected" without hardcoding a specific string.
 */
export function generateRandomPassword(): string {
  return faker.internet.password({ length: 12 });
}