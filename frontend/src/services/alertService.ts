import { httpClient } from './http/httpClient';
import { Database } from '../types/database';

type InventoryAlert = Database['public']['Tables']['inventory_alerts']['Row'];
type AlertInsert = Database['public']['Tables']['inventory_alerts']['Insert'];

export interface AlertStatistics {
  total: number;
  active: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface AlertWithDetails extends InventoryAlert {
  products?: {
    product_id: string;
    name: string;
  };
  warehouse?: {
    warehouse_id: string;
    name: string;
  };
}

/**
 * Service for managing inventory alerts
 */
class AlertService {
  /**
   * Get all active alerts for the current organization
   */
  async getActiveAlerts(): Promise<AlertWithDetails[]> {
    const response = await httpClient.get<{ success: boolean; data: AlertWithDetails[] }>(
      '/api/alerts/active'
    );
    return response.data || response;
  }

  /**
   * Get alert by ID
   */
  async getAlertById(alertId: string): Promise<InventoryAlert> {
    const response = await httpClient.get<{ success: boolean; data: InventoryAlert }>(
      `/api/alerts/${alertId}`
    );
    return response.data || response;
  }

  /**
   * Get alerts for a specific product
   */
  async getAlertsByProduct(productId: string, status?: string): Promise<AlertWithDetails[]> {
    const params = status ? { status } : {};
    const response = await httpClient.get<{ success: boolean; data: AlertWithDetails[] }>(
      `/api/alerts/product/${productId}`,
      { params }
    );
    return response.data || response;
  }

  /**
   * Get alerts for a specific warehouse
   */
  async getAlertsByWarehouse(warehouseId: string, status?: string): Promise<AlertWithDetails[]> {
    const params = status ? { status } : {};
    const response = await httpClient.get<{ success: boolean; data: AlertWithDetails[] }>(
      `/api/alerts/warehouse/${warehouseId}`,
      { params }
    );
    return response.data || response;
  }

  /**
   * Get alert statistics for dashboard
   */
  async getAlertStatistics(): Promise<AlertStatistics> {
    const response = await httpClient.get<{ success: boolean; data: AlertStatistics }>(
      '/api/alerts/statistics'
    );
    return response.data || response;
  }

  /**
   * Dismiss an alert
   */
  async dismissAlert(alertId: string): Promise<InventoryAlert> {
    const response = await httpClient.patch<{ success: boolean; data: InventoryAlert }>(
      `/api/alerts/${alertId}/dismiss`
    );
    return response.data || response;
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<InventoryAlert> {
    const response = await httpClient.patch<{ success: boolean; data: InventoryAlert }>(
      `/api/alerts/${alertId}/resolve`
    );
    return response.data || response;
  }

  /**
   * Check inventory and create new alerts
   */
  async checkInventoryAlerts(): Promise<{
    success: boolean;
    alertsCreated: number;
    alerts: InventoryAlert[];
  }> {
    const response = await httpClient.post<{
      success: boolean;
      data: { success: boolean; alertsCreated: number; alerts: InventoryAlert[] };
    }>('/api/alerts/check');
    return response.data || response;
  }

  /**
   * Bulk dismiss alerts
   */
  async bulkDismissAlerts(alertIds: string[]): Promise<{
    success: boolean;
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const response = await httpClient.post<{
      success: boolean;
      data: {
        success: boolean;
        total: number;
        successful: number;
        failed: number;
        errors: string[];
      };
    }>('/api/alerts/bulk-dismiss', { alertIds });
    return response.data || response;
  }
}

export const alertService = new AlertService();
export default alertService;
