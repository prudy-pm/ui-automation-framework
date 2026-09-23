import { Page, Locator, expect } from '@playwright/test';

// Shared actions/behaviour for every page object; subclasses add their own locators.
export class BasePage {
    readonly page: Page;

    // Override via a field in a subclass (e.g. `protected readonly defaultPath = '/products';'), not a goto() override.
    protected readonly defaultPath: string = '/';

    constructor(page: Page) {
        this.page = page;
    }

    async goto(path: string = this.defaultPath): Promise<void> {
        // 'domcontentloaded' not 'load': this site's slow, and 'load' waits on every image/ad iframe too.
        // Actions still auto-wait for their own target, so no real safety is lost.
        await this.page.goto(path, { waitUntil: 'domcontentloaded' });
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

    async expectHidden(locator: Locator): Promise<void> {
        await expect(locator).toHaveCount(0);
    }
}