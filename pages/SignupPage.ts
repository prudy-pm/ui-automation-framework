import { Page } from '@playwright/test';
import { step } from '@utils/step';
import { BasePage } from './BasePage';

// Signup lives on the same /login page as LoginPage (automationexercise.com
// renders both forms side by side under one URL) but is modeled as its own
// page object rather than folded into LoginPage -- signup is a distinct
// feature, not an implementation detail of login, the same reasoning that
// keeps FooterComponent its own component despite living inside every page.
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
