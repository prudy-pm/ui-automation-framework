export interface InvalidLoginCase {
  case: string;
  email: string;
  password: string;
  expectedError: string;
}
export interface ProductSearchCase {
  searchTerm: string;
}

export interface BirthDate {
  day: string;
  month: string;
  year: string;
}

export interface PersonalInfo {
  title: string;
  firstname: string;
  lastname: string;
  birthDate: BirthDate;
}

export interface Address {
  company: string;
  address1: string;
  address2: string;
  country: string;
  state: string;
  city: string;
  zipcode: string;
}

export interface AccountProfile {
  profile: string;
  personalInfo: PersonalInfo;
  address: Address;
  mobileNumber: string;
}