import { APIRequestContext, APIResponse } from '@playwright/test';

type FormFields = Record<string, string | number | boolean>;
export class BaseApiClient {
  constructor(protected readonly api: APIRequestContext) { }

  async get(path: string): Promise<APIResponse> {
    return this.api.get(path);
  }

  async post(path: string, data: FormFields): Promise<APIResponse> {
    return this.api.post(path, { form: data });
  }

  async delete(path: string, data: FormFields): Promise<APIResponse> {
    return this.api.delete(path, { form: data });
  }

  async put(path: string, data: FormFields): Promise<APIResponse> {
    return this.api.put(path, { form: data });
  }
}