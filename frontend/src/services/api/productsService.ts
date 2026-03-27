import { httpClient } from "../http/httpClient";
import { Database } from "../../types/database";

type Product = Database["public"]["Tables"]["products"]["Row"];

export interface ProductImportRow {
  name: string;
  batch_number: string;
  origin_country: string;
  expiration_date: string;
  price: string | number;
  description?: string;
  unit?: string;
  product_type?: string;
  initial_stock?: string | number;
  warehouse_name?: string;
}

export interface BulkImportResult {
  created: number;
  updated: number;
  failed: { row: number; batch_number: string | null; errors: string[] }[];
  stock_skipped: { row: number; batch_number: string; reason: string }[];
}

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
  },

  async bulkImport(rows: ProductImportRow[]): Promise<BulkImportResult> {
    try {
      const response = await httpClient.post<{ data: BulkImportResult }>(
        '/api/products/bulk-import',
        { products: rows }
      );
      return (response as any).data || response;
    } catch (error) {
      console.error('Error in bulk import:', error);
      throw error;
    }
  },

  /**
   * Get available stock for a product (physical stock - reserved stock)
   * @param productId - Product ID
   * @param warehouseId - Warehouse ID
   * @returns Available stock quantity
   */
  async getAvailableStock(productId: string, warehouseId: string): Promise<{
    product_id: string;
    warehouse_id: string;
    organization_id: string;
    available_stock: number;
    timestamp: string;
  }> {
    try {
      if (!productId || !warehouseId) {
        throw new Error('Product ID and Warehouse ID are required');
      }

      const response = await httpClient.get<{
        product_id: string;
        warehouse_id: string;
        organization_id: string;
        available_stock: number;
        timestamp: string;
      }>(`/api/products/${productId}/available-stock?warehouse_id=${warehouseId}`);

      return response;
    } catch (error) {
      console.error(`Error fetching available stock for product ${productId}:`, error);
      throw error;
    }
  },

  /**
   * Get stock breakdown by warehouse for a product
   */
  async getStockByWarehouse(productId: string): Promise<{
    product_id: string;
    organization_id: string;
    warehouses: Array<{
      warehouse_id: string;
      warehouse_name: string;
      warehouse_location: string | null;
      physical_stock: number;
      reserved_stock: number;
      available_stock: number;
    }>;
    total_physical: number;
    total_available: number;
  }> {
    return httpClient.get(`/api/products/${productId}/stock-by-warehouse`);
  },
};