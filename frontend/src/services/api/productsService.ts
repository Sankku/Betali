import { httpClient } from "../http/httpClient";
import { Database } from "../../types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];

/**
 * Service for managing products
 */
export const productsService = {
  async getAll(): Promise<Product[]> {
    try {
      const response = await httpClient.get<{ data: Product[] }>('/api/products');
      return response.data || response;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<Product> {
    try {
      const response = await httpClient.get<{ data: Product }>(`/api/products/${id}`);
      return response.data || response;
    } catch (error) {
      console.error(`Error fetching product ${id}:`, error);
      throw error;
    }
  },

  async create(productData: {
    name: string;
    batch_number: string;
    origin_country: string;
    expiration_date: string;
    description?: string;
    senasa_product_id?: string;
  }): Promise<Product> {
    try {
      const response = await httpClient.post<{ data: Product }>('/api/products', productData);
      return response.data || response; 
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  },

  async update(id: string, productData: {
    name: string;
    batch_number: string;
    origin_country: string;
    expiration_date: string;
    description?: string;
    senasa_product_id?: string;
  }): Promise<Product> {
    try {
      const response = await httpClient.put<{ data: Product }>(`/api/products/${id}`, productData);
      return response.data || response; 
    } catch (error) {
      console.error(`Error updating product ${id}:`, error);
      throw error;
    }
  },

  async delete(id: string): Promise<{ message: string }> {
    try {
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Invalid or missing product ID');
      }
      return await httpClient.delete<{ message: string }>(`/api/products/${id}`);
    } catch (error) {
      console.error(`Error deleting product ${id}:`, error);
      throw error;
    }
  }
};