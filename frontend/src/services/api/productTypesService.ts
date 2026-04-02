import { httpClient } from "../http/httpClient";

export interface ProductType {
  product_type_id: string;
  sku: string;
  name: string;
  product_type: 'standard' | 'raw_material' | 'finished_good';
  unit: 'kg' | 'g' | 'mg' | 'l' | 'ml' | 'unidad' | 'docena';
  min_stock?: number;
  max_stock?: number;
  description?: string;
  alert_enabled: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProductTypeFormData {
  sku: string;
  name: string;
  product_type: 'standard' | 'raw_material' | 'finished_good';
  unit: 'kg' | 'g' | 'mg' | 'l' | 'ml' | 'unidad' | 'docena';
  min_stock?: number;
  max_stock?: number;
  description?: string;
  alert_enabled?: boolean;
}

export interface BulkImportRow {
  sku: string;
  name: string;
  product_type: string;
  unit: string;
  lot_number: string;
  expiration_date: string;
  origin_country: string;
  price: string | number;
  description?: string;
  initial_stock?: string | number;
  warehouse_name?: string;
}

export interface BulkImportResult {
  created: number;
  updated: number;
  failed: { row: number; sku: string | null; lot_number: string | null; errors: string[] }[];
  stock_skipped: { row: number; lot_number: string; reason: string }[];
}

export const productTypesService = {
  async getAll(): Promise<ProductType[]> {
    try {
      const response = await httpClient.get<{ data: ProductType[] }>('/api/product-types');
      return response.data;
    } catch (error) {
      console.error('Error fetching product types:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<ProductType> {
    try {
      const response = await httpClient.get<{ data: ProductType }>(`/api/product-types/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching product type ${id}:`, error);
      throw error;
    }
  },

  async search(q: string): Promise<ProductType[]> {
    try {
      const response = await httpClient.get<{ data: ProductType[] }>(
        `/api/product-types/search?q=${encodeURIComponent(q)}`
      );
      return response.data;
    } catch (error) {
      console.error('Error searching product types:', error);
      throw error;
    }
  },

  async create(data: ProductTypeFormData): Promise<ProductType> {
    try {
      const response = await httpClient.post<{ data: ProductType }>('/api/product-types', data);
      return response.data;
    } catch (error) {
      console.error('Error creating product type:', error);
      throw error;
    }
  },

  async update(id: string, data: Partial<ProductTypeFormData>): Promise<ProductType> {
    try {
      const response = await httpClient.put<{ data: ProductType }>(`/api/product-types/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating product type ${id}:`, error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await httpClient.delete<void>(`/api/product-types/${id}`);
    } catch (error) {
      console.error(`Error deleting product type ${id}:`, error);
      throw error;
    }
  },

  async getAvailableStock(productTypeId: string, warehouseId: string): Promise<{
    product_type_id: string;
    warehouse_id: string;
    organization_id: string;
    available_stock: number;
    timestamp: string;
  }> {
    const response = await httpClient.get<{ data: { product_type_id: string; warehouse_id: string; organization_id: string; available_stock: number; timestamp: string; } }>(
      `/api/product-types/${productTypeId}/available-stock?warehouse_id=${encodeURIComponent(warehouseId)}`
    );
    return response.data;
  },

  async getAvailableLots(productTypeId: string, warehouseId: string): Promise<Array<{
    lot_id: string;
    lot_number: string;
    expiration_date: string | null;
    available_stock: number;
  }>> {
    const response = await httpClient.get<{ data: Array<{ lot_id: string; lot_number: string; expiration_date: string | null; available_stock: number; }> }>(
      `/api/product-types/${productTypeId}/available-lots?warehouse_id=${encodeURIComponent(warehouseId)}`
    );
    return response.data;
  },

  async bulkImport(rows: BulkImportRow[]): Promise<BulkImportResult> {
    try {
      const response = await httpClient.post<{ data: BulkImportResult }>(
        '/api/product-types/bulk-import',
        { products: rows }
      );
      return response.data;
    } catch (error) {
      console.error('Error in bulk import:', error);
      throw error;
    }
  },
};
