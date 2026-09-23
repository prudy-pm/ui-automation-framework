import { Page, Locator, expect } from '@playwright/test';
import { step } from '@utils/step';

// Shared actions/behaviour for every page object; subclasses add their own locators.
export class BasePage {
    readonly page: Page;

    // Override via a field in a subclass (e.g. `protected readonly defaultPath = '/products';'), not a goto() override.
    protected readonly defaultPath: string = '/';

    constructor(page: Page) {
        this.page = page;
    }

    @step
    async goto(path: string = this.defaultPath): Promise<void> {
        // 'domcontentloaded' not 'load': this site's slow, and 'load' waits on every image/ad iframe too.
        // Actions still auto-wait for their own target, so no real safety is lost.
        await this.page.goto(path, { waitUntil: 'domcontentloaded' });
    }

    @step
    async click(locator: Locator): Promise<void> {
        await locator.waitFor({ state: 'visible' });
        await locator.click();
    }

    @step
    async fill(locator: Locator, value: string): Promise<void> {
        await locator.waitFor({ state: 'visible' });
        await locator.fill(value);
    }

    @step
    async getText(locator: Locator): Promise<string> {
        await locator.waitFor({ state: 'visible' });
        return (await locator.textContent())?.trim() ?? '';
    }

    @step
    async isVisible(locator: Locator): Promise<boolean> {
        return locator.isVisible();
    }

    @step
    async expectVisible(locator: Locator): Promise<void> {
        await expect(locator).toBeVisible();
    }

    @step
    async expectText(locator: Locator, expected: string): Promise<void> {
        await expect(locator).toHaveText(expected);
    }

    @step
    async expectFieldInvalid(locator: Locator): Promise<void> {
        const isValid = await locator.evaluate((el: HTMLInputElement) => el.checkValidity());
        expect(isValid).toBe(false);
    }

    @step
    async expectHidden(locator: Locator): Promise<void> {
        await expect(locator).toHaveCount(0);
    }
}