import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../lib/toast";
import { useOrganization } from "../context/OrganizationContext";
import { httpClient } from "../services/http/httpClient";
import { translateApiError } from "../utils/apiErrorTranslator";

export interface TaxRate {
  tax_rate_id: string;
  organization_id: string;
  name: string;
  description?: string;
  rate: number; // Decimal format (0.21 for 21%)
  is_inclusive: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTaxRateData {
  name: string;
  description?: string;
  rate: number;
  is_inclusive: boolean;
  is_active?: boolean;
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
      try {
        const endpoint = options.active_only ? '/api/tax-rates/active' : '/api/tax-rates';
        const response = await httpClient.get(endpoint);
        // Backend returns { success: true, data: [...], meta: {...} }
        // But component expects { data: [...] }, so we return the full response
        return response;
      } catch (error) {
        console.error('Error fetching tax rates:', error);
        // Return empty array on error to prevent UI break
        return { data: [] };
      }
    },
    enabled: options.enabled !== false && !!currentOrganization,
    staleTime: 5 * 60 * 1000,
    retry: 1, // Only retry once
  });
}

// Get single tax rate
export function useTaxRate(taxRateId: string, enabled = true) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ["taxRate", taxRateId, currentOrganization?.organization_id],
    queryFn: async () => {
      const response = await httpClient.get(`/api/tax-rates/${taxRateId}`);
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
      const response = await httpClient.post('/api/tax-rates', data);
      return response.data;
    },
    onSuccess: (response) => {
      // Invalidate all tax rate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["taxRates"] });
      queryClient.invalidateQueries({ queryKey: ["taxRates", currentOrganization?.organization_id] });
      queryClient.invalidateQueries({ queryKey: ["taxRates", currentOrganization?.organization_id, true] });
      queryClient.invalidateQueries({ queryKey: ["taxRates", currentOrganization?.organization_id, false] });
      toast.success("Tasa de impuesto creada exitosamente");
      return response;
    },
    onError: (error: any) => {
      toast.error(translateApiError(error, 'Error al crear la tasa de impuesto. Intenta de nuevo.'));
      throw error;
    }
  });
}

// Update tax rate
export function useUpdateTaxRate() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: async ({ taxRateId, taxRateData }: { taxRateId: string; taxRateData: UpdateTaxRateData }) => {
      const response = await httpClient.put(`/api/tax-rates/${taxRateId}`, taxRateData);
      return response.data;
    },
    onSuccess: (response, { taxRateId }) => {
      // Invalidate all tax rate queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["taxRates"] });
      queryClient.invalidateQueries({ queryKey: ["taxRate", taxRateId] });
      queryClient.invalidateQueries({ queryKey: ["taxRates", currentOrganization?.organization_id] });
      queryClient.invalidateQueries({ queryKey: ["taxRates", currentOrganization?.organization_id, true] });
      queryClient.invalidateQueries({ queryKey: ["taxRates", currentOrganization?.organization_id, false] });
      toast.success("Tasa de impuesto actualizada exitosamente");
      return response;
    },
    onError: (error: any) => {
      toast.error(translateApiError(error, 'Error al actualizar la tasa de impuesto. Intenta de nuevo.'));
      throw error;
    }
  });
}

// Delete tax rate
export function useDeleteTaxRate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taxRateId: string) => {
      const response = await httpClient.delete(`/api/tax-rates/${taxRateId}`);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["taxRates"] });
      toast.success("Tasa de impuesto eliminada exitosamente");
      return response;
    },
    onError: (error: any) => {
      toast.error(translateApiError(error, 'Error al eliminar la tasa de impuesto. Intenta de nuevo.'));
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

export const calculateTaxAmount = (amount: number, taxRate: number, isInclusive: boolean = false): number => {
  if (isInclusive) {
    // Tax-inclusive: extract tax from total price
    // baseAmount = totalPrice / (1 + rate)
    // taxAmount = totalPrice - baseAmount
    const baseAmount = amount / (1 + taxRate);
    return amount - baseAmount;
  } else {
    // Tax-exclusive: calculate tax on base amount
    return amount * taxRate;
  }
};

export const calculateTotalWithTax = (amount: number, taxRate: number, isInclusive: boolean = false): number => {
  if (isInclusive) {
    // Tax-inclusive: the amount already includes tax
    return amount;
  } else {
    // Tax-exclusive: add tax to base amount
    return amount + (amount * taxRate);
  }
};

export const calculateBaseAmount = (amount: number, taxRate: number, isInclusive: boolean = false): number => {
  if (isInclusive) {
    // Tax-inclusive: extract base amount from total price
    return amount / (1 + taxRate);
  } else {
    // Tax-exclusive: the amount is already the base amount
    return amount;
  }
};