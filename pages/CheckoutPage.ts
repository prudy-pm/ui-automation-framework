import { Page } from '@playwright/test';
import { step } from '@utils/step';
import { BasePage } from './BasePage';

// Requires an authenticated session -- reached via a saved storageState (see config/globalSetup.ts).
export class CheckoutPage extends BasePage {
  // hasText needed: `.step-one` also matches the "Review Your Order" section (strict-mode violation otherwise).
  private readonly addressDetailsSection = this.page.locator('.step-one', { hasText: 'Address Details' });
  private readonly orderReviewTable = this.page.locator('#cart_info');
  // Scoped to the "Total Amount" row: with one line item, its row total and the grand total are otherwise ambiguous.
  private readonly grandTotalRow = this.orderReviewTable.locator('tr', { hasText: 'Total Amount' });
  private readonly commentBox = this.page.locator('textarea[name="message"]');
  private readonly placeOrderLink = this.page.getByRole('link', { name: 'Place Order' });
  protected readonly defaultPath = '/checkout';

  constructor(page: Page) {
    super(page);
  }

  @step
  async expectAddressDetailsVisible(): Promise<void> {
    await this.expectVisible(this.addressDetailsSection);
  }

  @step
  async expectProductInReview(productName: string): Promise<void> {
    await this.expectVisible(this.orderReviewTable.locator('tbody tr', { hasText: productName }));
  }

  @step
  async expectOrderTotal(total: string): Promise<void> {
    await this.expectVisible(this.grandTotalRow.locator('.cart_total_price', { hasText: total }));
  }

  @step
  async addOrderComment(comment: string): Promise<void> {
    await this.fill(this.commentBox, comment);
  }

  @step
  async placeOrder(): Promise<void> {
    await this.click(this.placeOrderLink);
  }
}
