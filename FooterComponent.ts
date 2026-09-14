import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class FooterComponent extends BasePage {
  private readonly subscriptionHeading = this.page.getByRole('heading', { name: 'Subscription' });
  private readonly emailInput = this.page.getByRole('textbox', { name: 'Your email address' });
  private readonly subscribeButton = this.page.locator('#subscribe');
  private readonly successMessage = this.page.getByText('You have been successfully subscribed!');

  constructor(page: Page) {
    super(page);
  }

  async expectSectionVisible(): Promise<void> {
    await this.expectVisible(this.subscriptionHeading);
  }

  async subscribe(email: string): Promise<void> {
    await this.fill(this.emailInput, email);
    await this.click(this.subscribeButton);
  }

  async expectSubscriptionSuccess(): Promise<void> {
    await this.expectVisible(this.successMessage);
  }
}
