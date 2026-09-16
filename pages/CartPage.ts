import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CartPage extends BasePage {
  private readonly cartInfoContainer = this.page.locator('#cart_info');
  // Not a role-based locator: this <a> has no href (navigation is JS-driven
  // so the site can check login state first), so Chrome's accessibility
  // tree doesn't expose it with the `link` role -- confirmed by inspecting
  // the live DOM after getByRole('link', ...) failed to match it.
  private readonly proceedToCheckoutLink = this.page.locator('a.check_out');
  protected readonly defaultPath = '/view_cart';

  constructor(page: Page) {
    super(page);
  }

  async expectCartPageLoaded(): Promise<void> {
    await this.expectVisible(this.cartInfoContainer);
  }

  async proceedToCheckout(): Promise<void> {
    await this.click(this.proceedToCheckoutLink);
  }

  private getRowByProductName(productName: string) {
    return this.cartInfoContainer.locator('tbody tr', { hasText: productName });
  }

  async expectProductInCart(productName: string): Promise<void> {
    await this.expectVisible(this.getRowByProductName(productName));
  }

  async expectProductTotal(productName: string, total: string): Promise<void> {
    const row = this.getRowByProductName(productName);
    await this.expectVisible(row.locator('.cart_total_price', { hasText: total }));
  }

  async removeProduct(productName: string): Promise<void> {
    const row = this.getRowByProductName(productName);
    await this.click(row.locator('.cart_quantity_delete'));
  }

  // Empties the cart, one row at a time -- needed before checkout.spec.ts, whose
  // shared account's cart carries over between runs (see tests/setup/auth.setup.ts).
  async clearCart(): Promise<void> {
    await this.goto();
    const rows = this.cartInfoContainer.locator('tbody tr');
    while (await rows.count() > 0) {
      const row = rows.first();
      await this.click(row.locator('.cart_quantity_delete'));
      await row.waitFor({ state: 'detached' });
    }
  }

  async expectProductRemoved(productName: string): Promise<void> {
    await this.expectHidden(this.getRowByProductName(productName));
  }

  async expectProductQuantity(productName: string, quantity: number): Promise<void> {
    const row = this.getRowByProductName(productName);
    await this.expectVisible(row.getByRole('cell', { name: quantity.toString(), exact: true }));
  }
}