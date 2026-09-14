import { test } from '@fixtures/pageFixtures';
import { readExcelSheet } from '@utils/excelData';
import { ProductQuantityCase } from '@data/types';

const quantityCases = readExcelSheet<ProductQuantityCase>('data/productQuantities.xlsx');

test.describe('Product Quantity in Cart', () => {
  quantityCases.forEach((data) => {
    test(`cart reflects quantity of ${data.quantity} @regression`, async ({
      productsPage,
      productDetailPage,
      cartPage,
    }) => {
      await productsPage.goto('/products');
      await productsPage.viewProductAt(0);
      await productDetailPage.setQuantity(data.quantity);
      await productDetailPage.addToCart();
      await productsPage.goToCartFromModal();

      await cartPage.expectCartPageLoaded();
      await cartPage.expectProductQuantity('Blue Top', data.quantity);
    });
  });
});
