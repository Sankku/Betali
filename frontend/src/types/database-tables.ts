// Exportar tipos específicos de las tablas de la base de datos para fácil uso
import { Database } from './database';

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];

export type Warehouse = Database['public']['Tables']['warehouse']['Row'];
export type WarehouseInsert = Database['public']['Tables']['warehouse']['Insert'];
export type WarehouseUpdate = Database['public']['Tables']['warehouse']['Update'];

export type StockMovement = Database['public']['Tables']['stock_movements']['Row'];
export type StockMovementInsert = Database['public']['Tables']['stock_movements']['Insert'];
export type StockMovementUpdate = Database['public']['Tables']['stock_movements']['Update'];

// Tipos extendidos para las vistas con datos relacionados
export interface ProductWithRelations extends Product {
  senasa_product?: any; // Puedes tipificar esto si tienes la relación
}

export interface WarehouseWithStats extends Warehouse {
  stats?: {
    totalMovements: number;
    totalProducts: number;
    lastMovementDate?: string;
  };
}

export interface StockMovementWithDetails extends StockMovement {
  product?: Product;
  warehouse?: Warehouse;
}