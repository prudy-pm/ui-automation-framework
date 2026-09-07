export interface InvalidLoginCase {
  case: string;
  email: string;
  password: string;
  expectedError: string;
}