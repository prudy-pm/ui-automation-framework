import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

// Lands here at /payment_done/<order_id> after a successful payment --
// the order id in the URL is server-generated, so this page is reached
// via navigation rather than a fixed goto() path.
export class OrderConfirmationPage extends BasePage {
  private readonly orderPlacedHeading = this.page.getByRole('heading', { name: 'Order Placed!' });
  private readonly confirmationMessage = this.page.getByText('Congratulations! Your order has been confirmed!');
  private readonly continueButton = this.page.locator('[data-qa="continue-button"]');

  constructor(page: Page) {
    super(page);
  }

  async expectOrderConfirmed(): Promise<void> {
    await this.expectVisible(this.orderPlacedHeading);
    await this.expectVisible(this.confirmationMessage);
  }

  async continueShopping(): Promise<void> {
    await this.click(this.continueButton);
  }
}
