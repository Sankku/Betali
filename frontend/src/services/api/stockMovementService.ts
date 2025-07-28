import { httpClient } from "../http/httpClient";
import { Database } from "../../types/database";

export type StockMovement = Database["public"]["Tables"]["stock_movements"]["Row"];
export type StockMovementInsert = Database["public"]["Tables"]["stock_movements"]["Insert"];
export type StockMovementUpdate = Database["public"]["Tables"]["stock_movements"]["Update"];

export interface StockMovementWithDetails extends StockMovement {
  product?: Database["public"]["Tables"]["products"]["Row"];
  warehouse?: Database["public"]["Tables"]["warehouse"]["Row"];
}

export interface StockMovementFormData {
  movement_type: string;
  quantity: number;
  product_id?: string;
  warehouse_id?: string;
  reference?: string;
  movement_date?: string;
}

/**
 * Service to handle stock movements
 */
export const stockMovementService = {
  /**
   * Get all the movements
   */
  async getAll(): Promise<StockMovementWithDetails[]> {
    try {
      const response = await httpClient.get<{ data: StockMovementWithDetails[] }>('/api/stock-movements');
      return response.data || response;
    } catch (error) {
      console.error('Error fetching movements:', error);
      throw error;
    }
  },

  /**
   * Get movement by id
   */
  async getById(id: string): Promise<StockMovementWithDetails> {
    try {
      const response = await httpClient.get<{ data: StockMovementWithDetails }>(`/api/stock-movements/${id}`);
      return response.data || response;
    } catch (error) {
      console.error(`Error fetching movement ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new movement
   */
  async create(movementData: StockMovementFormData): Promise<{
    message: string;
    data: StockMovement;
  }> {
    try {
      return await httpClient.post<{
        message: string;
        data: StockMovement;
      }>('/api/stock-movements', movementData);
    } catch (error) {
      console.error('Error creating movement:', error);
      throw error;
    }
  },

  /**
   * Update movements
   */
  async update(
    id: string, 
    movementData: Partial<StockMovementFormData>
  ): Promise<{
    message: string;
    data: StockMovement;
  }> {
    try {
      return await httpClient.put<{
        message: string;
        data: StockMovement;
      }>(`/api/stock-movements/${id}`, movementData);
    } catch (error) {
      console.error(`Error updating movement ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete movement
   */
  async delete(id: string): Promise<{
    message: string;
  }> {
    try {
      return await httpClient.delete<{
        message: string;
      }>(`/api/stock-movements/${id}`);
    } catch (error) {
      console.error(`Error deleting movement ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get movements by products
   */
  async getByProduct(productId: string): Promise<StockMovementWithDetails[]> {
    try {
      const response = await httpClient.get<{ data: StockMovementWithDetails[] }>(`/api/stock-movements/product/${productId}`);
      return response.data || response;
    } catch (error) {
      console.error(`Error fetching product movements ${productId}:`, error);
      throw error;
    }
  },

  /**
   * get movements by warehouse
   */
  async getByWarehouse(warehouseId: string): Promise<StockMovementWithDetails[]> {
    try {
      const response = await httpClient.get<{ data: StockMovementWithDetails[] }>(`/api/stock-movements/warehouse/${warehouseId}`);
      return response.data || response;
    } catch (error) {
      console.error(`Error fetching warehouse movements ${warehouseId}:`, error);
      throw error;
    }
  },

  /**
   * Get movements by a range of dates
   */
  async getByDateRange(startDate: string, endDate: string): Promise<StockMovementWithDetails[]> {
    try {
      const response = await httpClient.get<{ data: StockMovementWithDetails[] }>(`/api/stock-movements/date-range?start=${startDate}&end=${endDate}`);
      return response.data || response;
    } catch (error) {
      console.error(`Error fetching movements by date:`, error);
      throw error;
    }
  }
};