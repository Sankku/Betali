import { httpClient } from "../http/httpClient";
import { Database } from "../../types/database";

export type Client = Database["public"]["Tables"]["clients"]["Row"];
export type CreateClientData = Database["public"]["Tables"]["clients"]["Insert"];
export type UpdateClientData = Database["public"]["Tables"]["clients"]["Update"];

export interface ClientStats {
  total: number;
  active: number;
  inactive: number;
  recentlyAdded: number;
}

export interface ClientValidation {
  cuit: {
    valid: boolean;
    exists: boolean;
    error?: string;
  };
  email: {
    valid: boolean;
    exists: boolean;
    error?: string;
  };
}

export interface ClientSearchOptions {
  page?: number;
  limit?: number;
  search?: string;
  branch_id?: string;
}

export interface ClientResponse<T> {
  data: T;
  meta?: {
    total: number;
    organizationId: string;
    [key: string]: any;
  };
}

/**
 * Service for managing clients
 */
export const clientService = {
  async getAll(options?: ClientSearchOptions): Promise<Client[]> {
    try {
      const params = new URLSearchParams();
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.search) params.append('search', options.search);
      if (options?.branch_id) params.append('branch_id', options.branch_id);
      
      const url = params.toString() ? `/api/clients?${params}` : '/api/clients';
      const response = await httpClient.get<ClientResponse<Client[]>>(url);
      return response.data || response;
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
  },

  async getById(id: string): Promise<Client> {
    try {
      const response = await httpClient.get<ClientResponse<Client>>(`/api/clients/${id}`);
      return response.data || response;
    } catch (error) {
      console.error(`Error fetching client ${id}:`, error);
      throw error;
    }
  },

  async getByCuit(cuit: string): Promise<Client> {
    try {
      const response = await httpClient.get<ClientResponse<Client>>(`/api/clients/cuit/${cuit}`);
      return response.data || response;
    } catch (error) {
      console.error(`Error fetching client with CUIT ${cuit}:`, error);
      throw error;
    }
  },

  async getByBranch(branchId: string, options?: ClientSearchOptions): Promise<Client[]> {
    try {
      const params = new URLSearchParams();
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.search) params.append('search', options.search);
      
      const url = params.toString() ? `/api/clients/branch/${branchId}?${params}` : `/api/clients/branch/${branchId}`;
      const response = await httpClient.get<ClientResponse<Client[]>>(url);
      return response.data || response;
    } catch (error) {
      console.error(`Error fetching clients for branch ${branchId}:`, error);
      throw error;
    }
  },

  async create(clientData: CreateClientData): Promise<Client> {
    try {
      const response = await httpClient.post<ClientResponse<Client>>('/api/clients', clientData);
      return response.data || response;
    } catch (error) {
      console.error('Error creating client:', error);
      throw error;
    }
  },

  async update(id: string, clientData: UpdateClientData): Promise<Client> {
    try {
      const response = await httpClient.put<ClientResponse<Client>>(`/api/clients/${id}`, clientData);
      return response.data || response;
    } catch (error) {
      console.error(`Error updating client ${id}:`, error);
      throw error;
    }
  },

  async bulkDelete(ids: string[]): Promise<{ deleted: number; not_found: number }> {
    try {
      const response = await httpClient.delete<{ data: { deleted: number; not_found: number } }>('/api/clients/bulk', { ids });
      return response.data;
    } catch (error) {
      console.error('Error bulk deleting clients:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await httpClient.delete(`/api/clients/${id}`);
    } catch (error) {
      console.error(`Error deleting client ${id}:`, error);
      throw error;
    }
  },

  async search(query: string, options?: Omit<ClientSearchOptions, 'search'>): Promise<Client[]> {
    try {
      const params = new URLSearchParams({ q: query });
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.branch_id) params.append('branch_id', options.branch_id);
      
      const response = await httpClient.get<ClientResponse<Client[]>>(`/api/clients/search?${params}`);
      return response.data || response;
    } catch (error) {
      console.error('Error searching clients:', error);
      throw error;
    }
  },

  async getStats(): Promise<ClientStats> {
    try {
      const response = await httpClient.get<ClientResponse<ClientStats>>('/api/clients/stats');
      return response.data || response;
    } catch (error) {
      console.error('Error fetching client stats:', error);
      throw error;
    }
  },

  async validate(data: { cuit?: string; email?: string }): Promise<ClientValidation> {
    try {
      const response = await httpClient.post<ClientResponse<ClientValidation>>('/api/clients/validate', data);
      return response.data || response;
    } catch (error) {
      console.error('Error validating client data:', error);
      throw error;
    }
  },

  // Helper method for CUIT formatting
  formatCuit(cuit: string): string {
    const cleaned = cuit.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 10)}-${cleaned.slice(10)}`;
    }
    return cuit;
  },

  // Helper method for CUIT validation
  isValidCuitFormat(cuit: string): boolean {
    const cleaned = cuit.replace(/\D/g, '');
    return cleaned.length === 11;
  },
};