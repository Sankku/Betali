import { httpClient } from '../http/httpClient';
import type { Tables } from '@/types/database';

export type Supplier = Tables<'suppliers'>;

export interface CreateSupplierData {
  name: string;
  email: string;
  cuit: string;
  phone?: string;
  address?: string;
  business_type?: string;
  contact_person?: string;
  website?: string;
  payment_terms?: string;
  tax_category?: string;
  credit_limit?: number;
  is_preferred?: boolean;
  notes?: string;
}

export interface UpdateSupplierData extends Partial<CreateSupplierData> {}

export interface SupplierSearchOptions {
  search?: string;
  business_type?: string;
  is_active?: boolean;
  is_preferred?: boolean;
  branch_id?: string;
  limit?: number;
  offset?: number;
  page?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface SupplierStats {
  total: number;
  active: number;
  inactive: number;
  preferred: number;
  businessTypes: Record<string, number>;
}

export interface SupplierValidation {
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

/**
 * Supplier API service
 * Handles all supplier-related API requests with multi-tenant support
 */
export const supplierService = {
  /**
   * Get all suppliers for the current organization
   */
  async getAll(options?: SupplierSearchOptions): Promise<Supplier[]> {
    const params = new URLSearchParams();
    
    if (options?.search) params.append('search', options.search);
    if (options?.business_type) params.append('business_type', options.business_type);
    if (options?.is_active !== undefined) params.append('is_active', String(options.is_active));
    if (options?.is_preferred !== undefined) params.append('is_preferred', String(options.is_preferred));
    if (options?.branch_id) params.append('branch_id', options.branch_id);
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.page) params.append('page', String(options.page));
    if (options?.orderBy) params.append('orderBy', options.orderBy);
    if (options?.orderDirection) params.append('orderDirection', options.orderDirection);

    const queryString = params.toString();
    const url = queryString ? `/api/suppliers?${queryString}` : '/api/suppliers';
    
    const response = await httpClient.get<{ data: Supplier[] }>(url);
    return response.data;
  },

  /**
   * Get supplier by ID
   */
  async getById(id: string): Promise<Supplier> {
    const response = await httpClient.get<{ data: Supplier }>(`/api/suppliers/${id}`);
    return response.data;
  },

  /**
   * Get supplier by CUIT within current organization
   */
  async getByCuit(cuit: string): Promise<Supplier | null> {
    try {
      const response = await httpClient.get<{ data: Supplier }>(`/api/suppliers/cuit/${cuit}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get preferred suppliers
   */
  async getPreferred(): Promise<Supplier[]> {
    const response = await httpClient.get<{ data: Supplier[] }>('/api/suppliers/preferred');
    return response.data;
  },

  /**
   * Get suppliers by business type
   */
  async getByBusinessType(businessType: string): Promise<Supplier[]> {
    const response = await httpClient.get<{ data: Supplier[] }>(`/api/suppliers/business-type/${encodeURIComponent(businessType)}`);
    return response.data;
  },

  /**
   * Get available business types
   */
  async getBusinessTypes(): Promise<string[]> {
    const response = await httpClient.get<{ data: string[] }>('/api/suppliers/business-types');
    return response.data;
  },

  /**
   * Create new supplier
   */
  async create(data: CreateSupplierData): Promise<Supplier> {
    const response = await httpClient.post<{ data: Supplier }>('/api/suppliers', data);
    return response.data;
  },

  /**
   * Update supplier
   */
  async update(id: string, data: UpdateSupplierData): Promise<Supplier> {
    const response = await httpClient.put<{ data: Supplier }>(`/api/suppliers/${id}`, data);
    return response.data;
  },

  /**
   * Delete supplier (hard delete)
   */
  async delete(id: string): Promise<void> {
    await httpClient.delete(`/api/suppliers/${id}`);
  },

  /**
   * Deactivate supplier (soft delete)
   */
  async deactivate(id: string): Promise<Supplier> {
    const response = await httpClient.put<{ data: Supplier }>(`/api/suppliers/${id}/deactivate`);
    return response.data;
  },

  /**
   * Reactivate supplier
   */
  async reactivate(id: string): Promise<Supplier> {
    const response = await httpClient.put<{ data: Supplier }>(`/api/suppliers/${id}/reactivate`);
    return response.data;
  },

  /**
   * Set supplier preferred status
   */
  async setPreferred(id: string, isPreferred: boolean): Promise<Supplier> {
    const response = await httpClient.put<{ data: Supplier }>(`/api/suppliers/${id}/preferred`, {
      is_preferred: isPreferred
    });
    return response.data;
  },

  /**
   * Search suppliers
   */
  async search(query: string, options?: Omit<SupplierSearchOptions, 'search'>): Promise<Supplier[]> {
    const params = new URLSearchParams({ q: query });
    
    if (options?.business_type) params.append('business_type', options.business_type);
    if (options?.is_active !== undefined) params.append('is_active', String(options.is_active));
    if (options?.is_preferred !== undefined) params.append('is_preferred', String(options.is_preferred));
    if (options?.branch_id) params.append('branch_id', options.branch_id);
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.page) params.append('page', String(options.page));

    const response = await httpClient.get<{ data: Supplier[] }>(`/api/suppliers/search?${params.toString()}`);
    return response.data;
  },

  /**
   * Get supplier statistics
   */
  async getStats(): Promise<SupplierStats> {
    const response = await httpClient.get<{ data: SupplierStats }>('/api/suppliers/stats');
    return response.data;
  },

  /**
   * Validate supplier data
   */
  async validate(data: { cuit?: string; email?: string }): Promise<SupplierValidation> {
    const response = await httpClient.post<{ data: SupplierValidation }>('/api/suppliers/validate', data);
    return response.data;
  },

  /**
   * Check if CUIT is available
   */
  async isCuitAvailable(cuit: string): Promise<boolean> {
    try {
      const validation = await this.validate({ cuit });
      return validation.cuit.valid && !validation.cuit.exists;
    } catch {
      return false;
    }
  },

  /**
   * Check if email is available
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    try {
      const validation = await this.validate({ email });
      return validation.email.valid && !validation.email.exists;
    } catch {
      return false;
    }
  },

  /**
   * Format CUIT for display (XX-XXXXXXXX-X)
   */
  formatCuit(cuit: string): string {
    if (!cuit) return '';
    
    // Remove all non-digits
    const cleaned = cuit.replace(/\D/g, '');
    
    // Format as XX-XXXXXXXX-X if 11 digits
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 10)}-${cleaned.slice(10)}`;
    }
    
    // Return as-is if not 11 digits
    return cuit;
  },

  /**
   * Clean CUIT for storage (remove formatting)
   */
  cleanCuit(cuit: string): string {
    return cuit.replace(/\D/g, '');
  },

  /**
   * Validate CUIT format and checksum
   */
  validateCuit(cuit: string): boolean {
    const cleaned = this.cleanCuit(cuit);
    
    // Must be 11 digits
    if (cleaned.length !== 11) return false;
    
    // Validate checksum using Argentina CUIT algorithm
    const digits = cleaned.split('').map(Number);
    const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += digits[i] * multipliers[i];
    }
    
    const checkDigit = 11 - (sum % 11);
    const finalCheckDigit = checkDigit === 11 ? 0 : checkDigit === 10 ? 9 : checkDigit;
    
    return finalCheckDigit === digits[10];
  },

  /**
   * Get business type options with translations
   */
  getBusinessTypeOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'Manufacturer', label: 'Fabricante' },
      { value: 'Distributor', label: 'Distribuidor' },
      { value: 'Wholesaler', label: 'Mayorista' },
      { value: 'Retailer', label: 'Minorista' },
      { value: 'Importer', label: 'Importador' },
      { value: 'Exporter', label: 'Exportador' },
      { value: 'Service Provider', label: 'Proveedor de Servicios' },
      { value: 'Contractor', label: 'Contratista' },
      { value: 'Other', label: 'Otro' }
    ];
  },

  /**
   * Get payment terms options
   */
  getPaymentTermsOptions(): Array<{ value: string; label: string }> {
    return [
      { value: 'COD', label: 'Contra Entrega (COD)' },
      { value: 'Net 15', label: 'Net 15 días' },
      { value: 'Net 30', label: 'Net 30 días' },
      { value: 'Net 45', label: 'Net 45 días' },
      { value: 'Net 60', label: 'Net 60 días' },
      { value: 'Net 90', label: 'Net 90 días' },
      { value: 'Advance Payment', label: 'Pago Anticipado' },
      { value: '2/10 Net 30', label: '2/10 Net 30' }
    ];
  }
};