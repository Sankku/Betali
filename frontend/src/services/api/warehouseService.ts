import { Database } from "../../types/database";
import { httpClient } from "../http/httpClient";


type Warehouse = Database["public"]["Tables"]["warehouse"]["Row"];
type WarehouseInsert = Database["public"]["Tables"]["warehouse"]["Insert"];
type WarehouseUpdate = Database["public"]["Tables"]["warehouse"]["Update"];

interface WarehouseWithStats extends Warehouse {
  stats: {
    totalMovements: number;
    recentMovements: Array<{
      movement_id: string;
      movement_date: string;
      movement_type: string;
      quantity: number;
      products?: {
        name: string;
      };
    }>;
  };
}

interface WarehouseMovement {
  movement_id: string;
  movement_date: string;
  movement_type: string;
  quantity: number;
  reference: string | null;
  created_at: string;
  products?: {
    product_id: string;
    name: string;
    batch_number: string;
  } | null;
}

interface WarehouseMovementsResponse {
  movements: WarehouseMovement[];
  warehouse_id: string;
  warehouse_name: string;
}

export const warehouseService = {
  /**
   * Obtener todos los almacenes del usuario autenticado
   */
  async getAll(): Promise<WarehouseWithStats[]> {
    return await httpClient.get<WarehouseWithStats[]>('/api/warehouses');
  },

  /**
   * Obtener un almacén específico por ID
   */
  async getById(id: string): Promise<WarehouseWithStats> {
    return await httpClient.get<WarehouseWithStats>(`/api/warehouses/${id}`);
  },

  /**
   * Crear un nuevo almacén
   */
  async create(warehouseData: {
    name: string;
    location: string;
  }): Promise<{
    message: string;
    warehouse: Warehouse;
  }> {
    return await httpClient.post<{
      message: string;
      warehouse: Warehouse;
    }>('/api/warehouses', warehouseData);
  },

  /**
   * Actualizar un almacén existente
   */
  async update(
    id: string, 
    warehouseData: {
      name: string;
      location: string;
      is_active?: boolean;
    }
  ): Promise<{
    message: string;
    warehouse: Warehouse;
  }> {
    return await httpClient.put<{
      message: string;
      warehouse: Warehouse;
    }>(`/api/warehouses/${id}`, warehouseData);
  },

  /**
   * Desactivar un almacén (soft delete)
   */
  async deactivate(id: string): Promise<{
    message: string;
    warehouse: Warehouse;
  }> {
    return await httpClient.delete<{
      message: string;
      warehouse: Warehouse;
    }>(`/api/warehouses/${id}`);
  },

  /**
   * Eliminar permanentemente un almacén
   */
  async deletePermanently(id: string): Promise<{
    message: string;
    warehouse: Warehouse;
  }> {
    return await httpClient.delete<{
      message: string;
      warehouse: Warehouse;
    }>(`/api/warehouses/${id}/permanent`);
  },

  /**
   * Obtener movimientos de stock de un almacén
   */
  async getMovements(
    id: string, 
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<WarehouseMovementsResponse> {
    const params = new URLSearchParams();
    
    if (options?.limit) {
      params.append('limit', options.limit.toString());
    }
    
    if (options?.offset) {
      params.append('offset', options.offset.toString());
    }
    
    const queryString = params.toString();
    const endpoint = `/api/warehouses/${id}/movements${queryString ? `?${queryString}` : ''}`;
    
    return await httpClient.get<WarehouseMovementsResponse>(endpoint);
  },

  /**
   * Validar nombre único de almacén
   */
  async validateUniqueName(name: string, excludeId?: string): Promise<boolean> {
    try {
      const warehouses = await this.getAll();
      return !warehouses.some(
        w => w.name.toLowerCase().trim() === name.toLowerCase().trim() && 
             w.is_active && 
             w.warehouse_id !== excludeId
      );
    } catch (error) {
      console.error('Error al validar nombre único:', error);
      return false;
    }
  }
};