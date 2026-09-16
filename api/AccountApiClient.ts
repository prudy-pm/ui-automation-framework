import { BaseApiClient } from './BaseApiClient';

export type NewAccountDetails = {
  name: string;
  email: string;
  password: string;
  title: string;
  birth_date: string;
  birth_month: string;
  birth_year: string;
  firstname: string;
  lastname: string;
  company: string;
  address1: string;
  address2: string;
  country: string;
  zipcode: string;
  state: string;
  city: string;
  mobile_number: string;
};

// Field names here (first_name, last_name, birth_day) intentionally differ
// from NewAccountDetails' input names (firstname, lastname, birth_date)
// AutomationExercise's own API is inconsistent between what it accepts and what it returns.
export type UserDetailResponse = {
  responseCode: number;
  user: {
    id: number;
    name: string;
    email: string;
    title: string;
    birth_day: string;
    birth_month: string;
    birth_year: string;
    first_name: string;
    last_name: string;
    company: string;
    address1: string;
    address2: string;
    country: string;
    state: string;
    city: string;
    zipcode: string;
  };
};

export class AccountApiClient extends BaseApiClient {
  async verifyLogin(email: string, password: string) {
    return this.post('verifyLogin', { email, password });
  }

  async createAccount(details: NewAccountDetails) {
    return this.post('createAccount', details);
  }

  async deleteAccount(email: string, password: string) {
    return this.delete('deleteAccount', { email, password });
  }

  async updateAccount(details: NewAccountDetails) {
    return this.put('updateAccount', details);
  }

  async getUserDetailByEmail(email: string) {
    return this.get(`getUserDetailByEmail?email=${email}`);
  }
}