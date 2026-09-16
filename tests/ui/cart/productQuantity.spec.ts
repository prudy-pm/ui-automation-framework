import { test } from '@fixtures/pageFixtures';
import { ProductQuantityCase } from '@data/types';
import { CATALOG_PRODUCT } from '@data/scenarios';
import quantityCases from '@data/productQuantities.json';

test.describe('Product Quantity in Cart', () => {
  (quantityCases as ProductQuantityCase[]).forEach((data) => {
    test(`cart reflects quantity of ${data.quantity} @regression`, async ({
      productsPage,
      productDetailPage,
      cartPage,
    }) => {
      await productsPage.goto();
      await productsPage.viewProductAt(0);
      await productDetailPage.setQuantity(data.quantity);
      await productDetailPage.addToCart();
      await productsPage.goToCartFromModal();

      await cartPage.expectCartPageLoaded();
      await cartPage.expectProductQuantity(CATALOG_PRODUCT.name, data.quantity);
    });
  });
});
