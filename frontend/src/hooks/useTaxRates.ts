import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../lib/toast";
import { useOrganization } from "../context/OrganizationContext";
import { httpClient } from "../services/http/httpClient";

export interface TaxRate {
  tax_rate_id: string;
  organization_id: string;
  name: string;
  description?: string;
  rate: number; // Decimal format (0.21 for 21%)
  is_inclusive: boolean; // true = tax included in price, false = tax added to price
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTaxRateData {
  name: string;
  description?: string;
  rate: number;
  is_inclusive: boolean;
  is_active: boolean;
}

export interface UpdateTaxRateData extends Partial<CreateTaxRateData> {
  tax_rate_id?: string;
}

export interface UseTaxRatesOptions {
  enabled?: boolean;
  active_only?: boolean;
}

// Get all tax rates
export function useTaxRates(options: UseTaxRatesOptions = {}) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ["taxRates", currentOrganization?.organization_id, options.active_only],
    queryFn: async () => {
      const params = options.active_only ? { active: 'true' } : {};
      const response = await httpClient.get('/api/pricing/taxes/rates', { params });
      return response.data;
    },
    enabled: options.enabled !== false && !!currentOrganization,
    staleTime: 5 * 60 * 1000,
  });
}

// Get single tax rate
export function useTaxRate(taxRateId: string, enabled = true) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ["taxRate", taxRateId, currentOrganization?.organization_id],
    queryFn: async () => {
      const response = await httpClient.get(`/api/pricing/taxes/rates/${taxRateId}`);
      return response.data?.data || response.data;
    },
    enabled: enabled && !!taxRateId && !!currentOrganization,
    staleTime: 5 * 60 * 1000,
  });
}

// Create tax rate
export function useCreateTaxRate() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: async (data: CreateTaxRateData) => {
      const response = await httpClient.post('/api/pricing/taxes/rates', data);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["taxRates"] });
      toast.success("Tax rate created successfully");
      return response;
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to create tax rate";
      toast.error(message);
      throw error;
    }
  });
}

// Update tax rate
export function useUpdateTaxRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taxRateId, taxRateData }: { taxRateId: string; taxRateData: UpdateTaxRateData }) => {
      const response = await httpClient.put(`/api/pricing/taxes/rates/${taxRateId}`, taxRateData);
      return response.data;
    },
    onSuccess: (response, { taxRateId }) => {
      queryClient.invalidateQueries({ queryKey: ["taxRates"] });
      queryClient.invalidateQueries({ queryKey: ["taxRate", taxRateId] });
      toast.success("Tax rate updated successfully");
      return response;
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to update tax rate";
      toast.error(message);
      throw error;
    }
  });
}

// Delete tax rate
export function useDeleteTaxRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taxRateId: string) => {
      const response = await httpClient.delete(`/api/pricing/taxes/rates/${taxRateId}`);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["taxRates"] });
      toast.success("Tax rate deleted successfully");
      return response;
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to delete tax rate";
      toast.error(message);
      throw error;
    }
  });
}

// Common tax rate presets for quick setup
export const TAX_RATE_PRESETS = [
  {
    name: "Standard VAT (21%)",
    description: "Standard Value Added Tax rate",
    rate: 0.21,
    is_inclusive: false
  },
  {
    name: "Reduced VAT (10.5%)",
    description: "Reduced VAT for essential goods",
    rate: 0.105,
    is_inclusive: false
  },
  {
    name: "Zero VAT (0%)",
    description: "Tax-exempt products",
    rate: 0.0,
    is_inclusive: false
  },
  {
    name: "IVA Argentina (21%)",
    description: "Impuesto al Valor Agregado - Argentina",
    rate: 0.21,
    is_inclusive: false
  },
  {
    name: "IVA Mexico (16%)",
    description: "Impuesto al Valor Agregado - Mexico",
    rate: 0.16,
    is_inclusive: false
  },
  {
    name: "Sales Tax US (8.5%)",
    description: "Typical US state sales tax",
    rate: 0.085,
    is_inclusive: false
  }
];

// Utility functions
export const formatTaxRate = (rate: number): string => {
  return `${(rate * 100).toFixed(2)}%`;
};

export const calculateTaxAmount = (amount: number, taxRate: number, isInclusive: boolean): number => {
  if (isInclusive) {
    // Tax is included in the amount: tax = amount - (amount / (1 + rate))
    return amount - (amount / (1 + taxRate));
  } else {
    // Tax is added to the amount: tax = amount * rate
    return amount * taxRate;
  }
};

export const calculateTotalWithTax = (amount: number, taxRate: number, isInclusive: boolean): number => {
  if (isInclusive) {
    // Total is the same as amount when tax is inclusive
    return amount;
  } else {
    // Total = amount + tax
    return amount + (amount * taxRate);
  }
};