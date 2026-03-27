import { httpClient } from "../http/httpClient";

export interface ProductLot {
  lot_id: string;
  lot_number: string;
  product_type_id: string;
  expiration_date: string;
  origin_country: string;
  price: number;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProductLotFormData {
  lot_number: string;
  expiration_date: string;
  origin_country: string;
  price: number;
}

export const productLotsService = {
  async getByType(typeId: string): Promise<ProductLot[]> {
    try {
      const response = await httpClient.get<{ data: ProductLot[] }>(
        `/api/product-types/${typeId}/lots`
      );
      return response.data;
    } catch (error) {
      console.error(`Error fetching lots for type ${typeId}:`, error);
      throw error;
    }
  },

  async getById(id: string): Promise<ProductLot> {
    try {
      const response = await httpClient.get<{ data: ProductLot }>(`/api/product-lots/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching lot ${id}:`, error);
      throw error;
    }
  },

  async create(typeId: string, data: ProductLotFormData): Promise<ProductLot> {
    try {
      const response = await httpClient.post<{ data: ProductLot }>(
        `/api/product-types/${typeId}/lots`,
        data
      );
      return response.data;
    } catch (error) {
      console.error(`Error creating lot for type ${typeId}:`, error);
      throw error;
    }
  },

  async update(id: string, data: Partial<ProductLotFormData>): Promise<ProductLot> {
    try {
      const response = await httpClient.put<{ data: ProductLot }>(`/api/product-lots/${id}`, data);
      return response.data;
    } catch (error) {
      console.error(`Error updating lot ${id}:`, error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await httpClient.delete<void>(`/api/product-lots/${id}`);
    } catch (error) {
      console.error(`Error deleting lot ${id}:`, error);
      throw error;
    }
  },
};
