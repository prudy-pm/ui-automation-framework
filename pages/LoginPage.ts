import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
    private readonly loginNavLink = this.page.getByRole('link', { name: 'Signup / Login' });
    private readonly emailInput = this.page.locator('[data-qa="login-email"]');
    private readonly passwordInput = this.page.locator('[data-qa="login-password"]');
    private readonly loginButton = this.page.locator('[data-qa="login-button"]');
    private readonly errorMessage = this.page.getByText('Your email or password is incorrect!');
    private readonly loggedInIndicator = this.page.getByText('Logged in as');

    constructor(page: Page) {
        super(page);
    }

    async openViaNav(): Promise<void> {
        await this.click(this.loginNavLink);
    }

    async login(email: string, password: string): Promise<void> {
        await this.fill(this.emailInput, email);
        await this.fill(this.passwordInput, password);
        await this.click(this.loginButton);
    }

    async expectLoginErrorVisible(): Promise<void> {
        await this.expectVisible(this.errorMessage);
    }

    async expectLoggedInSuccessfully(): Promise<void> {
        await this.expectVisible(this.loggedInIndicator);
    }

    async expectEmailFieldRejectedByBrowser(): Promise<void> {
        await this.expectFieldInvalid(this.emailInput);
    }
}