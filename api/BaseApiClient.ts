import { APIRequestContext, APIResponse } from '@playwright/test';

// Matches exactly what Playwright's `form` request option accepts --
// using `unknown` here (as an earlier version did) doesn't satisfy
// Playwright's own type for form-encoded bodies.
type FormFields = Record<string, string | number | boolean>;

export class BaseApiClient {
  constructor(protected readonly api: APIRequestContext) {}

  async get(path: string): Promise<APIResponse> {
    return this.api.get(path);
  }

  // AutomationExercise's API expects form-encoded bodies, not JSON --
  // { form: data } sends application/x-www-form-urlencoded, matching what
  // its documented Postman collection uses.
  async post(path: string, data: FormFields): Promise<APIResponse> {
    return this.api.post(path, { form: data });
  }

  async delete(path: string, data: FormFields): Promise<APIResponse> {
    return this.api.delete(path, { form: data });
  }
}