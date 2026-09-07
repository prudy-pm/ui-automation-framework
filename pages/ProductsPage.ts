import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProductsPage extends BasePage {
  private readonly productsNavLink = this.page.getByRole('link', { name: /Products/ });
  private readonly cartNavLink = this.page.getByRole('link', { name: /Cart/ });
  private readonly searchInput = this.page.getByRole('textbox', { name: 'Search Product' });
  private readonly searchButton = this.page.locator('#submit_search');
  private readonly searchResultsHeading = this.page.getByText('Searched Products', { exact: false });

  // Each product card renders two "Add to cart" matches in the DOM (confirmed via codegen);
  // the second match per card is the always-visible, clickable button.

//  private readonly firstAddToCartLink = this.page.getByText('Add to cart').first();

 private readonly firstAddToCartLink = this.page.locator('.productinfo a.add-to-cart').first();

  private readonly continueShoppingButton = this.page.getByRole('button', { name: 'Continue Shopping' });
  private readonly viewCartLink = this.page.getByRole('link', { name: 'View Cart' });

  constructor(page: Page) {
    super(page);
  }

  async openViaNav(): Promise<void> {
    await this.click(this.productsNavLink);
  }

  async searchProduct(name: string): Promise<void> {
    await this.fill(this.searchInput, name);
    await this.click(this.searchButton);
  }

  async expectResultsVisible(): Promise<void> {
    await this.expectVisible(this.searchResultsHeading);
  }

  async addFirstResultToCart(): Promise<void> {
    await this.click(this.firstAddToCartLink);
    await this.expectVisible(this.continueShoppingButton);
  }

  async continueShopping(): Promise<void> {
    await this.click(this.continueShoppingButton);
  }

  async goToCartFromModal(): Promise<void> {
    await this.click(this.viewCartLink);
  }
}