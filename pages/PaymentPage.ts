import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export type CardDetails = {
  nameOnCard: string;
  cardNumber: string;
  cvc: string;
  expiryMonth: string;
  expiryYear: string;
};

export class PaymentPage extends BasePage {
  private readonly nameOnCardInput = this.page.locator('[data-qa="name-on-card"]');
  private readonly cardNumberInput = this.page.locator('[data-qa="card-number"]');
  private readonly cvcInput = this.page.locator('[data-qa="cvc"]');
  private readonly expiryMonthInput = this.page.locator('[data-qa="expiry-month"]');
  private readonly expiryYearInput = this.page.locator('[data-qa="expiry-year"]');
  private readonly payButton = this.page.locator('[data-qa="pay-button"]');

  constructor(page: Page) {
    super(page);
  }

  async payWithCard(card: CardDetails): Promise<void> {
    await this.fill(this.nameOnCardInput, card.nameOnCard);
    await this.fill(this.cardNumberInput, card.cardNumber);
    await this.fill(this.cvcInput, card.cvc);
    await this.fill(this.expiryMonthInput, card.expiryMonth);
    await this.fill(this.expiryYearInput, card.expiryYear);
    await this.click(this.payButton);
  }
}
