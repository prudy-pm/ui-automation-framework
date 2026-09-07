export interface InvalidLoginCase {
  case: string;
  email: string;
  password: string;
  expectedError: string;
}
export interface ProductSearchCase {
  searchTerm: string;
}