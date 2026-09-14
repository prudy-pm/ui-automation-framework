import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductDetailPage extends BasePage {
  private readonly quantityInput = this.page.locator('#quantity');
  private readonly addToCartButton = this.page.getByRole('button', { name: /Add to cart/ });

  constructor(page: Page) {
    super(page);
  }

  async setQuantity(quantity: number): Promise<void> {
    await this.fill(this.quantityInput, quantity.toString());
  }

  async addToCart(): Promise<void> {
    await this.click(this.addToCartButton);
  }
}
