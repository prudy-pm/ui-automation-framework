import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage holds actions and behaviour shared by every page object.
 * Individual page classes extend this and define their own locators,
 * rather than repeating click/fill/wait logic in every page.
 */
export class BasePage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async goto(path: string = '/'): Promise<void> {
        await this.page.goto(path);
    }

    async click(locator: Locator): Promise<void> {
        await locator.waitFor({ state: 'visible' });
        await locator.click();
    }

    async fill(locator: Locator, value: string): Promise<void> {
        await locator.waitFor({ state: 'visible' });
        await locator.fill(value);
    }

    async getText(locator: Locator): Promise<string> {
        await locator.waitFor({ state: 'visible' });
        return (await locator.textContent())?.trim() ?? '';
    }

    async isVisible(locator: Locator): Promise<boolean> {
        return locator.isVisible();
    }

    async expectVisible(locator: Locator): Promise<void> {
        await expect(locator).toBeVisible();
    }

    async expectText(locator: Locator, expected: string): Promise<void> {
        await expect(locator).toHaveText(expected);
    }

    async expectFieldInvalid(locator: Locator): Promise<void> {
        const isValid = await locator.evaluate((el: HTMLInputElement) => el.checkValidity());
        expect(isValid).toBe(false);
    }
}