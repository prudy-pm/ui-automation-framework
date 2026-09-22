import { Page } from '@playwright/test';
import { step } from '@utils/step';
import { BasePage } from './BasePage';
export class OrderConfirmationPage extends BasePage {
  private readonly orderPlacedHeading = this.page.getByRole('heading', { name: 'Order Placed!' });
  private readonly confirmationMessage = this.page.getByText('Congratulations! Your order has been confirmed!');
  private readonly continueButton = this.page.locator('[data-qa="continue-button"]');

  constructor(page: Page) {
    super(page);
  }

  @step
  async expectOrderConfirmed(): Promise<void> {
    await this.expectVisible(this.orderPlacedHeading);
    await this.expectVisible(this.confirmationMessage);
  }

  @step
  async continueShopping(): Promise<void> {
    await this.click(this.continueButton);
  }
}