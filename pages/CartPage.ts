import { Page } from '@playwright/test';
import { step } from '@utils/step';
import { BasePage } from './BasePage';

export class CartPage extends BasePage {
  private readonly cartInfoContainer = this.page.locator('#cart_info');
  // Not role-based: this <a> has no href (nav is JS-driven), so it has no accessible `link` role.
  private readonly proceedToCheckoutLink = this.page.locator('a.check_out');
  protected readonly defaultPath = '/view_cart';

  constructor(page: Page) {
    super(page);
  }

  @step
  async expectCartPageLoaded(): Promise<void> {
    await this.expectVisible(this.cartInfoContainer);
  }

  @step
  async proceedToCheckout(): Promise<void> {
    await this.click(this.proceedToCheckoutLink);
  }

  private getRowByProductName(productName: string) {
    return this.cartInfoContainer.locator('tbody tr', { hasText: productName });
  }

  @step
  async expectProductInCart(productName: string): Promise<void> {
    await this.expectVisible(this.getRowByProductName(productName));
  }

  @step
  async expectProductTotal(productName: string, total: string): Promise<void> {
    const row = this.getRowByProductName(productName);
    await this.expectVisible(row.locator('.cart_total_price', { hasText: total }));
  }

  @step
  async removeProduct(productName: string): Promise<void> {
    const row = this.getRowByProductName(productName);
    await this.click(row.locator('.cart_quantity_delete'));
  }

  // Needed before checkout: the shared account's cart carries over between runs.
  @step
  async clearCart(): Promise<void> {
    await this.goto();
    const rows = this.cartInfoContainer.locator('tbody tr');
    while (await rows.count() > 0) {
      const row = rows.first();
      await this.click(row.locator('.cart_quantity_delete'));
      await row.waitFor({ state: 'detached' });
    }
  }

  @step
  async expectProductRemoved(productName: string): Promise<void> {
    await this.expectHidden(this.getRowByProductName(productName));
  }

  @step
  async expectProductQuantity(productName: string, quantity: number): Promise<void> {
    const row = this.getRowByProductName(productName);
    await this.expectVisible(row.getByRole('cell', { name: quantity.toString(), exact: true }));
  }
}