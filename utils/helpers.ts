import { faker } from '@faker-js/faker';

export function generateUniqueEmail(prefix: string = 'api.test', domain: string = 'mailinator.com'): string {
  return `${prefix}.${Date.now()}@${domain}`;
}

export function generateRandomEmail(): string {
  return faker.internet.email();
}

export function generateRandomPassword(): string {
  return faker.internet.password({ length: 12 });
}