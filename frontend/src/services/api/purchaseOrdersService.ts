import { httpClient } from '../http/httpClient';
import {
  PurchaseOrder,
  PurchaseOrderListItem,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  UpdatePurchaseOrderStatusRequest,
  PurchaseOrderFilters,
  PurchaseOrderSummary,
} from '../../types/purchaseOrders';

/**
 * Service for managing purchase orders
 *
 * Provides API methods for CRUD operations on purchase orders
 * and status management
 */
export const purchaseOrdersService = {
  /**
   * Get all purchase orders with optional filters
   * @param filters - Optional filters (status, supplier, date range, etc.)
   * @returns Promise<PurchaseOrder[]>
   */
  async getAll(filters?: PurchaseOrderFilters): Promise<PurchaseOrder[]> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        if (filters.status) params.append('status', filters.status);
        if (filters.supplier_id) params.append('supplier_id', filters.supplier_id);
        if (filters.warehouse_id) params.append('warehouse_id', filters.warehouse_id);
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.search) params.append('search', filters.search);
      }

      const queryString = params.toString();
      const url = queryString ? `/api/purchase-orders?${queryString}` : '/api/purchase-orders';

      const response = await httpClient.get<{ data: PurchaseOrder[] }>(url);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      throw error;
    }
  },

  /**
   * Get a single purchase order by ID
   * @param id - Purchase Order ID
   * @returns Promise<PurchaseOrder>
   */
  async getById(id: string): Promise<PurchaseOrder> {
    try {
      const response = await httpClient.get<{ data: PurchaseOrder }>(
        `/api/purchase-orders/${id}`
      );
      return response.data || response;
    } catch (error) {
      console.error(`Error fetching purchase order ${id}:`, error);
      throw error;
    }
  },

  /**
   * Create a new purchase order
   * @param purchaseOrderData - Purchase order creation data
   * @returns Promise<PurchaseOrder>
   */
  async create(purchaseOrderData: CreatePurchaseOrderRequest): Promise<PurchaseOrder> {
    try {
      const response = await httpClient.post<{ data: PurchaseOrder }>(
        '/api/purchase-orders',
        purchaseOrderData
      );
      return response.data || response;
    } catch (error) {
      console.error('Error creating purchase order:', error);
      throw error;
    }
  },

  /**
   * Update a purchase order
   * @param id - Purchase Order ID
   * @param purchaseOrderData - Purchase order update data
   * @returns Promise<PurchaseOrder>
   */
  async update(
    id: string,
    purchaseOrderData: UpdatePurchaseOrderRequest
  ): Promise<PurchaseOrder> {
    try {
      const response = await httpClient.put<{ data: PurchaseOrder }>(
        `/api/purchase-orders/${id}`,
        purchaseOrderData
      );
      return response.data || response;
    } catch (error) {
      console.error(`Error updating purchase order ${id}:`, error);
      throw error;
    }
  },

  /**
   * Update purchase order status
   * IMPORTANT: When status is changed to "received", stock movements are created
   * @param id - Purchase Order ID
   * @param statusData - New status
   * @returns Promise<PurchaseOrder>
   */
  async updateStatus(
    id: string,
    statusData: UpdatePurchaseOrderStatusRequest
  ): Promise<PurchaseOrder> {
    try {
      const response = await httpClient.patch<{ data: PurchaseOrder }>(
        `/api/purchase-orders/${id}/status`,
        statusData
      );
      return response.data || response;
    } catch (error) {
      console.error(`Error updating purchase order status ${id}:`, error);
      throw error;
    }
  },

  /**
   * Cancel a purchase order (soft delete)
   * @param id - Purchase Order ID
   * @returns Promise<{ message: string }>
   */
  async cancel(id: string): Promise<{ message: string }> {
    try {
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Invalid or missing purchase order ID');
      }
      return await httpClient.delete<{ message: string }>(`/api/purchase-orders/${id}`);
    } catch (error) {
      console.error(`Error cancelling purchase order ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get purchase orders by status
   * @param status - Purchase order status
   * @returns Promise<PurchaseOrder[]>
   */
  async getByStatus(status: string): Promise<PurchaseOrder[]> {
    return this.getAll({ status: status as any });
  },

  /**
   * Get purchase orders by supplier
   * @param supplierId - Supplier ID
   * @returns Promise<PurchaseOrder[]>
   */
  async getBySupplier(supplierId: string): Promise<PurchaseOrder[]> {
    return this.getAll({ supplier_id: supplierId });
  },

  /**
   * Get purchase orders by warehouse
   * @param warehouseId - Warehouse ID
   * @returns Promise<PurchaseOrder[]>
   */
  async getByWarehouse(warehouseId: string): Promise<PurchaseOrder[]> {
    return this.getAll({ warehouse_id: warehouseId });
  },

  /**
   * Get purchase orders by date range
   * @param dateFrom - Start date (YYYY-MM-DD)
   * @param dateTo - End date (YYYY-MM-DD)
   * @returns Promise<PurchaseOrder[]>
   */
  async getByDateRange(dateFrom: string, dateTo: string): Promise<PurchaseOrder[]> {
    return this.getAll({ date_from: dateFrom, date_to: dateTo });
  },

  /**
   * Search purchase orders by PO number or notes
   * @param searchTerm - Search term
   * @returns Promise<PurchaseOrder[]>
   */
  async search(searchTerm: string): Promise<PurchaseOrder[]> {
    return this.getAll({ search: searchTerm });
  },

  /**
   * Get purchase order summary statistics
   * NOTE: This endpoint may not exist yet in backend - implement when needed
   * @returns Promise<PurchaseOrderSummary>
   */
  async getSummary(): Promise<PurchaseOrderSummary> {
    try {
      const response = await httpClient.get<{ data: PurchaseOrderSummary }>(
        '/api/purchase-orders/summary'
      );
      return response.data || response;
    } catch (error) {
      console.error('Error fetching purchase order summary:', error);
      throw error;
    }
  },

  /**
   * Helper: Mark purchase order as received
   * This is a convenience method that updates status to "received"
   * which triggers stock entry movements in the backend
   * @param id - Purchase Order ID
   * @returns Promise<PurchaseOrder>
   */
  async markAsReceived(id: string): Promise<PurchaseOrder> {
    return this.updateStatus(id, { status: 'received' });
  },

  /**
   * Helper: Approve purchase order
   * Changes status from pending to approved
   * @param id - Purchase Order ID
   * @returns Promise<PurchaseOrder>
   */
  async approve(id: string): Promise<PurchaseOrder> {
    return this.updateStatus(id, { status: 'approved' });
  },

  /**
   * Helper: Submit purchase order for approval
   * Changes status from draft to pending
   * @param id - Purchase Order ID
   * @returns Promise<PurchaseOrder>
   */
  async submit(id: string): Promise<PurchaseOrder> {
    return this.updateStatus(id, { status: 'pending' });
  },
};
