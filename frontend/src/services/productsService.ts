import { httpClient } from "../lib/httpClient";
import { Database } from "../types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];

export const productsService = {
  /**
   * Obtiene todos los productos del usuario autenticado
   */
  async getAll(): Promise<Product[]> {
    try {
      return await httpClient.get<Product[]>('/api/products');
    } catch (error) {
      console.error('Error al obtener productos:', error);
      throw error;
    }
  },

  /**
   * Obtiene un producto específico por su ID
   */
  async getById(id: string): Promise<Product> {
    try {
      return await httpClient.get<Product>(`/api/products/${id}`);
    } catch (error) {
      console.error(`Error al obtener producto ${id}:`, error);
      throw error;
    }
  },

  /**
   * Crea un nuevo producto
   */
  async create(productData: Partial<Product>): Promise<Product> {
    try {
      // El backend asignará automáticamente el owner_id
      return await httpClient.post<Product>('/api/products', productData);
    } catch (error) {
      console.error('Error al crear producto:', error);
      throw error;
    }
  },

  /**
   * Actualiza un producto existente
   */
  async update(id: string, productData: Partial<Product>): Promise<Product> {
    try {
      return await httpClient.put<Product>(`/api/products/${id}`, productData);
    } catch (error) {
      console.error(`Error al actualizar producto ${id}:`, error);
      throw error;
    }
  },

  /**
   * Elimina un producto
   */
  async delete(id: string): Promise<{ message: string }> {
    try {
      return await httpClient.delete<{ message: string }>(`/api/products/${id}`);
    } catch (error) {
      console.error(`Error al eliminar producto ${id}:`, error);
      throw error;
    }
  }
};