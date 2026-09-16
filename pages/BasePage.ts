import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage holds actions and behaviour shared by every page object.
 * Individual page classes extend this and define their own locators,
 * rather than repeating click/fill/wait logic in every page.
 */
export class BasePage {
    readonly page: Page;

    /**
     * The path `goto()` navigates to when called with no argument. '/' by
     * default; a subclass overrides it with a field, e.g.
     * `protected readonly defaultPath = '/products';` -- not a `goto()`
     * override. CartPage, ProductsPage, and CheckoutPage previously each
     * redeclared an identical `goto()` body just to change this one
     * string; centralizing it here means the domcontentloaded navigation
     * logic below now has exactly one place to live, too.
     */
    protected readonly defaultPath: string = '/';

    constructor(page: Page) {
        this.page = page;
    }

    async goto(path: string = this.defaultPath): Promise<void> {
        // 'domcontentloaded' instead of Playwright's default 'load':
        // confirmed via a direct curl that this site's TTFB alone runs
        // 10+ seconds, and 'load' additionally blocks on every image,
        // font, and third-party ad iframe finishing -- none of which any
        // test ever touches. Every subsequent action (click/fill) still
        // auto-waits for its own target element regardless, so this loses
        // no real safety while cutting a lot of unnecessary wait time.
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