import { httpClient } from "../lib/httpClient";
import { Database } from "../types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];


export const productsService = {
  async getAll(): Promise<Product[]> {
    return await httpClient.get<Product[]>('/api/products');
  },


  async getById(id: string): Promise<Product> {
    return await httpClient.get<Product>(`/api/products/${id}`);
  },

  async create(productData: Partial<Product>): Promise<Product> {
    return await httpClient.post<Product>('/api/products', productData);
  },

  async update(id: string, productData: Partial<Product>): Promise<Product> {
    return await httpClient.put<Product>(`/api/products/${id}`, productData);
  },

  async delete(id: string): Promise<{ message: string }> {
    return await httpClient.delete<{ message: string }>(`/api/products/${id}`);
  }
};