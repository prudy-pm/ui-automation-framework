import { Page } from '@playwright/test';
import { step } from '@utils/step';
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

    @step
    async openViaNav(): Promise<void> {
        await this.click(this.loginNavLink);
    }

    @step
    async login(email: string, password: string): Promise<void> {
        await this.fill(this.emailInput, email);
        await this.fill(this.passwordInput, password);
        await this.click(this.loginButton);
    }

    // Composed flow: go home, open login via nav, submit. Also used once by
    // config/globalSetup.ts to log in and cache the session for checkout.spec.ts.
    @step
    async loginViaNav(email: string, password: string): Promise<void> {
        await this.goto();
        await this.openViaNav();
        await this.login(email, password);
    }

    @step
    async expectLoginErrorVisible(): Promise<void> {
        await this.expectVisible(this.errorMessage);
    }

    @step
    async expectLoggedInSuccessfully(): Promise<void> {
        await this.expectVisible(this.loggedInIndicator);
    }

    @step
    async expectEmailFieldRejectedByBrowser(): Promise<void> {
        await this.expectFieldInvalid(this.emailInput);
    }

    @step
    async expectPasswordFieldRejectedByBrowser(): Promise<void> {
        await this.expectFieldInvalid(this.passwordInput);
    }
}