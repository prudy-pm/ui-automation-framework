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

  // For real credentials: fill() records 'Fill "<value>"' in every report, evaluate() records only "Evaluate".
  // Traces still capture the value -- specs using this must also set test.use({ trace: 'off' }).
  // data-secret lets pageFixtures clear the field before a failed test's page snapshot (which prints input values).
  @step
  async fillSecret(locator: Locator, value: string): Promise<void> {
    await locator.waitFor({ state: 'visible' });
    await locator.evaluate((el: HTMLInputElement, secret: string) => {
      el.setAttribute('data-secret', '');
      el.value = secret;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, value);
  }

  // Call right after submitting: if the click doesn't navigate (swallowed by the site's JS, or not registered), the
  // filled form stays on screen for a failing assertion's page snapshot. Browser-blocked (invalid) forms are left
  // untouched so validation tests still see what was typed.
  @step
  async clearSubmittedSecrets(): Promise<void> {
    await this.page
      .evaluate(() => {
        // Decide validity before clearing anything -- blanking one required field would make the rest look invalid.
        const fields = [...document.querySelectorAll<HTMLInputElement>('[data-secret]')];
        const submitted = fields.filter((el) => el.form?.checkValidity());
        submitted.forEach((el) => (el.value = ''));
      })
      .catch(() => {}); // the page may already be navigating away -- nothing left to clear
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
