import { Page } from '@playwright/test';
import { step } from '@utils/step';
import { BasePage } from './BasePage';

// Shares the /login URL with LoginPage (both forms render on one page) but is its own page object -- signup
// is a distinct feature, not an implementation detail of login.
export class SignupPage extends BasePage {
  protected readonly defaultPath = '/login';

  private readonly nameInput = this.page.locator('[data-qa="signup-name"]');
  private readonly emailInput = this.page.locator('[data-qa="signup-email"]');
  private readonly signupButton = this.page.locator('[data-qa="signup-button"]');

  constructor(page: Page) {
    super(page);
  }

  @step
  async submitSignup(name: string, email: string): Promise<void> {
    await this.fill(this.nameInput, name);
    await this.fill(this.emailInput, email);
    await this.click(this.signupButton);
  }

  @step
  async expectNameFieldRejectedByBrowser(): Promise<void> {
    await this.expectFieldInvalid(this.nameInput);
  }

  @step
  async expectEmailFieldRejectedByBrowser(): Promise<void> {
    await this.expectFieldInvalid(this.emailInput);
  }
}
