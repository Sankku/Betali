import { httpClient } from "../http/httpClient";

export interface Order {
  order_id: string;
  client_id: string | null;
  warehouse_id: string | null;
  order_date: string;
  status: 'draft' | 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  subtotal: number;
  tax: number;
  total_price: number;
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
  price: number;
  organization_id: string;
  created_at: string;
  // Relations
  products?: {
    product_id: string;
    name: string;
    sku: string;
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
  }
};

export default orderService;