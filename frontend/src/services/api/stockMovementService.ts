import { httpClient } from "../http/httpClient";
import { Database } from "../../types/database";

type StockMovement = Database["public"]["Tables"]["stock_movements"]["Row"];
type StockMovementInsert = Database["public"]["Tables"]["stock_movements"]["Insert"];
type StockMovementUpdate = Database["public"]["Tables"]["stock_movements"]["Update"];

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
 * Servicio para gestionar movimientos de stock
 */
export const stockMovementService = {
  /**
   * Obtener todos los movimientos de stock
   */
  async getAll(): Promise<StockMovementWithDetails[]> {
    try {
      const response = await httpClient.get<{ data: StockMovementWithDetails[] }>('/api/stock-movements');
      return response.data || response;
    } catch (error) {
      console.error('Error al obtener movimientos:', error);
      throw error;
    }
  },

  /**
   * Obtener movimiento por ID
   */
  async getById(id: string): Promise<StockMovementWithDetails> {
    try {
      const response = await httpClient.get<{ data: StockMovementWithDetails }>(`/api/stock-movements/${id}`);
      return response.data || response;
    } catch (error) {
      console.error(`Error al obtener movimiento ${id}:`, error);
      throw error;
    }
  },

  /**
   * Crear nuevo movimiento
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
      console.error('Error al crear movimiento:', error);
      throw error;
    }
  },

  /**
   * Actualizar movimiento existente
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
      console.error(`Error al actualizar movimiento ${id}:`, error);
      throw error;
    }
  },

  /**
   * Eliminar movimiento
   */
  async delete(id: string): Promise<{
    message: string;
  }> {
    try {
      return await httpClient.delete<{
        message: string;
      }>(`/api/stock-movements/${id}`);
    } catch (error) {
      console.error(`Error al eliminar movimiento ${id}:`, error);
      throw error;
    }
  },

  /**
   * Obtener movimientos por producto
   */
  async getByProduct(productId: string): Promise<StockMovementWithDetails[]> {
    try {
      const response = await httpClient.get<{ data: StockMovementWithDetails[] }>(`/api/stock-movements/product/${productId}`);
      return response.data || response;
    } catch (error) {
      console.error(`Error al obtener movimientos del producto ${productId}:`, error);
      throw error;
    }
  },

  /**
   * Obtener movimientos por almacén
   */
  async getByWarehouse(warehouseId: string): Promise<StockMovementWithDetails[]> {
    try {
      const response = await httpClient.get<{ data: StockMovementWithDetails[] }>(`/api/stock-movements/warehouse/${warehouseId}`);
      return response.data || response;
    } catch (error) {
      console.error(`Error al obtener movimientos del almacén ${warehouseId}:`, error);
      throw error;
    }
  },

  /**
   * Obtener movimientos por rango de fechas
   */
  async getByDateRange(startDate: string, endDate: string): Promise<StockMovementWithDetails[]> {
    try {
      const response = await httpClient.get<{ data: StockMovementWithDetails[] }>(`/api/stock-movements/date-range?start=${startDate}&end=${endDate}`);
      return response.data || response;
    } catch (error) {
      console.error(`Error al obtener movimientos por fecha:`, error);
      throw error;
    }
  }
};