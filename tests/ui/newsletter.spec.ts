import { test } from '@fixtures/pageFixtures';
import { generateRandomEmail } from '@utils/helpers';

test.describe('Newsletter Subscription', () => {
  test('user can subscribe from the home page @regression', async ({ page, footer }) => {
    await page.goto('/');
    await footer.expectSectionVisible();
    await footer.subscribe(generateRandomEmail());
    await footer.expectSubscriptionSuccess();
  });

  test('user can subscribe from the cart page @regression', async ({ cartPage, footer }) => {
    await cartPage.goto('/view_cart');
    await footer.expectSectionVisible();
    await footer.subscribe(generateRandomEmail());
    await footer.expectSubscriptionSuccess();
  });
});
