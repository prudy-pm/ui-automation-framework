import { Page } from '@playwright/test';
import { step } from '@utils/step';
import { BasePage } from './BasePage';

// Requires an authenticated session -- automationexercise.com redirects a
// guest cart's "Proceed To Checkout" into a register/login prompt instead
// of this page. checkout.spec.ts reaches here already authenticated via a
// saved storageState (see config/globalSetup.ts).
export class CheckoutPage extends BasePage {
  // `.step-one` is reused for both the "Address Details" and "Review Your
  // Order" sections on this page -- confirmed via a strict-mode violation
  // when the unqualified class matched both. hasText narrows to the one we
  // mean.
  private readonly addressDetailsSection = this.page.locator('.step-one', { hasText: 'Address Details' });
  private readonly orderReviewTable = this.page.locator('#cart_info');
  // Scoped to the "Total Amount" row specifically: with exactly one line
  // item, its row total and the grand total render the same text, and both
  // share the `.cart_total_price` class -- an unscoped locator is
  // ambiguous (confirmed via a strict-mode violation) whenever there's
  // only one item in the order.
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
