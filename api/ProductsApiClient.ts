import { BaseApiClient } from './BaseApiClient';

export class ProductsApiClient extends BaseApiClient {
  async getAllProducts() {
    return this.get('productsList');
  }

  async searchProduct(searchTerm: string) {
    return this.post('searchProduct', { search_product: searchTerm });
  }
}