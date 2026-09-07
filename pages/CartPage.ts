import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class CartPage extends BasePage {
  private readonly cartInfoContainer = this.page.locator('#cart_info');

  constructor(page: Page) {
    super(page);
  }

  async goto(path: string = '/view_cart'): Promise<void> {
    await super.goto(path);
  }

  async expectCartPageLoaded(): Promise<void> {
    await this.expectVisible(this.cartInfoContainer);
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
}