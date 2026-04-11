import { httpClient } from '../http/httpClient';
import { supabase } from '../../lib/supabase';
import {
  PurchaseOrder,
  PurchaseOrderListItem,
  CreatePurchaseOrderRequest,
  UpdatePurchaseOrderRequest,
  UpdatePurchaseOrderStatusRequest,
  PurchaseOrderFilters,
  PurchaseOrderSummary,
  ReceiptLine,
} from '../../types/purchaseOrders';

// Helper to get the current UI language for PDF generation
function getLang(): string {
  return localStorage.getItem('betali_language_preference') || 'es';
}

// Helper to get auth headers for PDF requests
async function getAuthHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  const headers: HeadersInit = {};

  if (session) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const currentOrganizationId = localStorage.getItem('currentOrganizationId');
  if (currentOrganizationId) {
    headers['x-organization-id'] = currentOrganizationId;
  }

  return headers;
}

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
  async getAll(filters?: PurchaseOrderFilters & { limit?: number; offset?: number }): Promise<PurchaseOrder[]> {
    try {
      const params = new URLSearchParams();

      if (filters) {
        if (filters.status) params.append('status', filters.status);
        if (filters.supplier_id) params.append('supplier_id', filters.supplier_id);
        if (filters.warehouse_id) params.append('warehouse_id', filters.warehouse_id);
        if (filters.date_from) params.append('date_from', filters.date_from);
        if (filters.date_to) params.append('date_to', filters.date_to);
        if (filters.search) params.append('search', filters.search);
        if (filters.limit) params.append('limit', String(filters.limit));
        if (filters.offset) params.append('offset', String(filters.offset));
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
   * Receive a purchase order with lot assignment per line
   * @param id - Purchase Order ID
   * @param lines - Array of ReceiptLine
   * @returns Promise<PurchaseOrder>
   */
  async receive(id: string, lines: ReceiptLine[]): Promise<PurchaseOrder> {
    try {
      const response = await httpClient.post<{ data: PurchaseOrder }>(
        `/api/purchase-orders/${id}/receive`,
        { lines }
      );
      return response.data || response;
    } catch (error) {
      console.error(`Error receiving purchase order ${id}:`, error);
      throw error;
    }
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

  /**
   * Download purchase order as PDF
   * @param id - Purchase Order ID
   */
  async downloadPdf(id: string): Promise<void> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/purchase-orders/${id}/pdf?lang=${getLang()}`, {
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PDF download error:', response.status, errorText);
      throw new Error(`Error al descargar el PDF de la orden de compra: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orden-compra-${id.substring(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * Get PDF blob for preview (single purchase order)
   * @param id - Purchase Order ID
   */
  async getPdfBlob(id: string): Promise<Blob> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/purchase-orders/${id}/pdf?lang=${getLang()}`, {
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PDF download error:', response.status, errorText);
      throw new Error(`Error al obtener el PDF: ${response.status}`);
    }

    return response.blob();
  },

  /**
   * Download batch PDF for multiple purchase orders
   * @param orderIds - Array of purchase order IDs
   */
  async downloadBatchPdf(orderIds: string[]): Promise<void> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/purchase-orders/batch-pdf`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderIds, lang: getLang() })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Batch PDF download error:', response.status, errorText);
      throw new Error(`Error al descargar el PDF: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ordenes-compra-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  /**
   * Get batch PDF blob for preview
   * @param orderIds - Array of purchase order IDs
   */
  async getBatchPdfBlob(orderIds: string[]): Promise<Blob> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/purchase-orders/batch-pdf`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderIds, lang: getLang() })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Batch PDF error:', response.status, errorText);
      throw new Error(`Error al obtener el PDF: ${response.status}`);
    }

    return response.blob();
  },

  /**
   * Delete a purchase order (hard-delete for draft, cancel for pending)
   */
  async deletePurchaseOrder(id: string): Promise<void> {
    try {
      if (!id || id === 'undefined' || id === 'null') {
        throw new Error('Invalid or missing purchase order ID');
      }
      await httpClient.delete<{ message: string }>(`/api/purchase-orders/${id}`);
    } catch (error) {
      console.error(`Error deleting purchase order ${id}:`, error);
      throw error;
    }
  },

  /**
   * Bulk delete purchase orders
   */
  async bulkDelete(ids: string[]): Promise<{ deleted: number; blocked: number; not_found: number }> {
    const response = await httpClient.delete<{ data: { deleted: number; blocked: number; not_found: number } }>(`/api/purchase-orders/bulk`, { ids });
    return response.data;
  },

  /**
   * Duplicate a purchase order as a new draft
   */
  async duplicate(id: string): Promise<PurchaseOrder> {
    try {
      const response = await httpClient.post<{ data: PurchaseOrder }>(
        `/api/purchase-orders/${id}/duplicate`,
        {}
      );
      return response.data || response;
    } catch (error) {
      console.error(`Error duplicating purchase order ${id}:`, error);
      throw error;
    }
  },
};
