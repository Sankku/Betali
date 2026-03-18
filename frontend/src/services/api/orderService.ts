import { httpClient } from "../http/httpClient";
import { supabase } from "../../lib/supabase";

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

export interface Order {
  order_id: string;
  client_id: string | null;
  warehouse_id: string | null;
  order_date: string;
  status: 'draft' | 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  subtotal?: number;
  tax_amount?: number;
  total?: number;
  // Legacy fields for backwards compatibility
  tax?: number;
  total_price?: number;
  notes: string | null;
  organization_id: string;
  created_at: string;
  updated_at: string;
  // Relations
  clients?: {
    client_id: string;
    name: string;
    email: string;
    phone: string;
  };
  warehouse?: {
    warehouse_id: string;
    name: string;
    location: string;
  };
  order_details?: OrderDetail[];
}

export interface OrderDetail {
  order_detail_id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price?: number;
  organization_id: string;
  created_at: string;
  // Relations
  products?: {
    product_id: string;
    name: string;
    batch_number?: string;
    price: number;
    description?: string;
  };
}

export interface CreateOrderData {
  client_id?: string;
  warehouse_id?: string;
  status?: Order['status'];
  notes?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    price?: number;
  }>;
}

export interface UpdateOrderData {
  client_id?: string;
  warehouse_id?: string;
  status?: Order['status'];
  notes?: string;
  items?: Array<{
    product_id: string;
    quantity: number;
    price?: number;
  }>;
}

export interface OrderFilters {
  status?: Order['status'];
  client_id?: string;
  warehouse_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface OrderStats {
  total_orders: number;
  total_revenue: number;
  orders_by_status: Record<Order['status'], number>;
  orders_this_month: number;
  revenue_this_month: number;
}

export interface OrderQueryParams extends OrderFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const BASE_URL = '/api/orders';

export const orderService = {
  // Get all orders with optional filters and pagination
  async getOrders(params?: OrderQueryParams): Promise<{
    data: Order[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const url = queryParams.toString() ? `${BASE_URL}?${queryParams}` : BASE_URL;
    return httpClient.get(url);
  },

  // Get order by ID
  async getOrderById(orderId: string): Promise<Order> {
    return httpClient.get(`${BASE_URL}/${orderId}`);
  },

  // Create new order
  async createOrder(orderData: CreateOrderData): Promise<Order> {
    return httpClient.post(BASE_URL, orderData);
  },

  // Update order
  async updateOrder(orderId: string, orderData: UpdateOrderData): Promise<Order> {
    return httpClient.put(`${BASE_URL}/${orderId}`, orderData);
  },

  // Update order status
  async updateOrderStatus(orderId: string, status: Order['status']): Promise<Order> {
    return httpClient.patch(`${BASE_URL}/${orderId}/status`, { status });
  },

  // Delete/cancel order
  async deleteOrder(orderId: string): Promise<void> {
    return httpClient.delete(`${BASE_URL}/${orderId}`);
  },

  // Duplicate order
  async duplicateOrder(orderId: string): Promise<Order> {
    return httpClient.post(`${BASE_URL}/${orderId}/duplicate`);
  },

  // Get order statistics
  async getOrderStats(): Promise<OrderStats> {
    return httpClient.get(`${BASE_URL}/stats`);
  },

  // Get order history (if implemented)
  async getOrderHistory(orderId: string): Promise<any[]> {
    return httpClient.get(`${BASE_URL}/${orderId}/history`);
  },

  // Search orders
  async searchOrders(query: string, filters?: OrderFilters): Promise<Order[]> {
    const params = new URLSearchParams({ search: query });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await this.getOrders(Object.fromEntries(params));
    return response.data;
  },

  // Process order (mark as processing)
  async processOrder(orderId: string): Promise<Order> {
    return httpClient.post(`${BASE_URL}/${orderId}/process`);
  },

  // Fulfill order (mark as shipped and deduct stock)
  async fulfillOrder(orderId: string, fulfillmentData?: any): Promise<Order> {
    return httpClient.post(`${BASE_URL}/${orderId}/fulfill`, fulfillmentData || {});
  },

  // Complete order
  async completeOrder(orderId: string): Promise<Order> {
    return httpClient.post(`${BASE_URL}/${orderId}/complete`);
  },

  // Download order as PDF
  async downloadPdf(orderId: string): Promise<void> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${BASE_URL}/${orderId}/pdf`, {
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PDF download error:', response.status, errorText);
      throw new Error(`Error al descargar el PDF de la orden: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orden-${orderId.substring(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Get PDF blob for preview (single order)
  async getPdfBlob(orderId: string): Promise<Blob> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${BASE_URL}/${orderId}/pdf`, {
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('PDF download error:', response.status, errorText);
      throw new Error(`Error al obtener el PDF de la orden: ${response.status}`);
    }

    return response.blob();
  },

  // Download batch PDF for multiple orders
  async downloadBatchPdf(orderIds: string[]): Promise<void> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${BASE_URL}/batch-pdf`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderIds })
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
    a.download = `ordenes-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Get batch PDF blob for preview
  async getBatchPdfBlob(orderIds: string[]): Promise<Blob> {
    const headers = await getAuthHeaders();

    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}${BASE_URL}/batch-pdf`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ orderIds })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Batch PDF error:', response.status, errorText);
      throw new Error(`Error al obtener el PDF: ${response.status}`);
    }

    return response.blob();
  }
};

export default orderService;