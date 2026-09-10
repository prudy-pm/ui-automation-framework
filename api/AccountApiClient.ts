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
}