import { httpClient } from "../http/httpClient";
import { Database } from "../../types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];

/**
 * Servicio para gestionar productos
 */
export const productsService = {
  async getAll(): Promise<Product[]> {
    try {
      const response = await httpClient.get<{ data: Product[] }>('/api/products');
      return response.data || response;
    } catch (error) {
      console.error('Error al obtener productos:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<Product> {
    try {
      const response = await httpClient.get<{ data: Product }>(`/api/products/${id}`);
      return response.data || response;
    } catch (error) {
      console.error(`Error al obtener producto ${id}:`, error);
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
      console.error('Error al crear producto:', error);
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
      console.error(`Error al actualizar producto ${id}:`, error);
      throw error;
    }
  },

  async delete(id: string): Promise<{ message: string }> {
    try {
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('ID de producto inválido o faltante');
      }
      return await httpClient.delete<{ message: string }>(`/api/products/${id}`);
    } catch (error) {
      console.error(`Error al eliminar producto ${id}:`, error);
      throw error;
    }
  }
};