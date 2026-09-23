import { Page } from '@playwright/test';
import { step } from '@utils/step';
import { BasePage } from './BasePage';

export class ProductsPage extends BasePage {
  private readonly productsNavLink = this.page.getByRole('link', { name: /Products/ });
  private readonly cartNavLink = this.page.getByRole('link', { name: /Cart/ });
  private readonly searchInput = this.page.getByRole('textbox', { name: 'Search Product' });
  private readonly searchButton = this.page.locator('#submit_search');
  private readonly searchResultsHeading = this.page.getByText('Searched Products', { exact: false });
  private readonly viewProductLinks = this.page.getByRole('link', { name: /View Product/ });

  // Each product card renders two "Add to cart" matches; this is the always-visible, clickable one.
  private readonly firstAddToCartLink = this.page.locator('.productinfo a.add-to-cart').first();

  private readonly continueShoppingButton = this.page.getByRole('button', { name: 'Continue Shopping' });
  private readonly viewCartLink = this.page.getByRole('link', { name: 'View Cart' });
  protected readonly defaultPath = '/products';

  constructor(page: Page) {
    super(page);
  }

  @step
  async openViaNav(): Promise<void> {
    await this.click(this.productsNavLink);
  }

  @step
  async searchProduct(name: string): Promise<void> {
    await this.fill(this.searchInput, name);
    await this.click(this.searchButton);
  }

  @step
  async expectResultsVisible(): Promise<void> {
    await this.expectVisible(this.searchResultsHeading);
  }

  @step
  async addFirstResultToCart(): Promise<void> {
    await this.click(this.firstAddToCartLink);
    await this.expectVisible(this.continueShoppingButton);
  }

  // Composed flow for tests that need "a product in the cart" as a precondition, not as the thing under test.
  @step
  async searchAndAddFirstToCart(searchTerm: string): Promise<void> {
    await this.searchProduct(searchTerm);
    await this.expectResultsVisible();
    await this.addFirstResultToCart();
  }

  @step
  async continueShopping(): Promise<void> {
    await this.click(this.continueShoppingButton);
  }

  @step
  async goToCartFromModal(): Promise<void> {
    await this.click(this.viewCartLink);
  }

  @step
  async viewProductAt(index: number): Promise<void> {
    await this.click(this.viewProductLinks.nth(index));
  }
}