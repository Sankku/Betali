import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../lib/toast";
import { useOrganization } from "../context/OrganizationContext";
import { httpClient } from "../services/http/httpClient";
import { translateApiError } from "../utils/apiErrorTranslator";

export interface DiscountRule {
  discount_rule_id: string;
  organization_id: string;
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping';
  value: number;
  applies_to: string;
  min_order_amount?: number;
  max_discount_amount?: number;
  min_quantity?: number;
  coupon_code?: string;
  requires_coupon: boolean;
  max_uses?: number;
  max_uses_per_customer?: number;
  current_uses: number;
  is_active: boolean;
  valid_from?: string;
  valid_to?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateDiscountRuleData {
  name: string;
  description?: string;
  type: 'percentage' | 'fixed_amount' | 'buy_x_get_y' | 'free_shipping';
  value: number;
  min_order_amount?: number;
  max_discount_amount?: number;
  min_quantity?: number;
  coupon_code?: string;
  max_uses?: number;
  max_uses_per_customer?: number;
  valid_from?: string;
  valid_to?: string;
  is_active?: boolean;
}

export interface UpdateDiscountRuleData extends Partial<CreateDiscountRuleData> {
  discount_rule_id?: string;
}

export interface UseDiscountRulesOptions {
  enabled?: boolean;
  active_only?: boolean;
}

export interface ValidateCouponRequest {
  coupon_code: string;
}

export interface DiscountStats {
  total_rules: number;
  active_rules: number;
  inactive_rules: number;
  total_uses: number;
  total_savings: number;
}

// Get all discount rules
export function useDiscountRules(options: UseDiscountRulesOptions = {}) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ["discountRules", currentOrganization?.organization_id, options.active_only],
    queryFn: async () => {
      const endpoint = options.active_only ? '/api/discount-rules/active' : '/api/discount-rules';
      const response = await httpClient.get(endpoint);
      return response.data;
    },
    enabled: options.enabled !== false && !!currentOrganization,
    staleTime: 5 * 60 * 1000,
  });
}

// Get single discount rule
export function useDiscountRule(discountRuleId: string, enabled = true) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ["discountRule", discountRuleId, currentOrganization?.organization_id],
    queryFn: async () => {
      const response = await httpClient.get(`/api/discount-rules/${discountRuleId}`);
      return response.data?.data || response.data;
    },
    enabled: enabled && !!discountRuleId && !!currentOrganization,
    staleTime: 5 * 60 * 1000,
  });
}

// Get discount statistics
export function useDiscountStats(enabled = true) {
  const { currentOrganization } = useOrganization();
  
  return useQuery({
    queryKey: ["discountStats", currentOrganization?.organization_id],
    queryFn: async () => {
      const response = await httpClient.get('/api/discount-rules/stats');
      return response.data?.data || response.data;
    },
    enabled: enabled && !!currentOrganization,
    staleTime: 5 * 60 * 1000,
  });
}

// Create discount rule
export function useCreateDiscountRule() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: async (data: CreateDiscountRuleData) => {
      const response = await httpClient.post('/api/discount-rules', data);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["discountRules"] });
      queryClient.invalidateQueries({ queryKey: ["discountStats"] });
      toast.success("Regla de descuento creada exitosamente");
      return response;
    },
    onError: (error: any) => {
      toast.error(translateApiError(error, 'Error al crear la regla de descuento. Intenta de nuevo.'));
      throw error;
    }
  });
}

// Update discount rule
export function useUpdateDiscountRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ discountRuleId, discountRuleData }: { discountRuleId: string; discountRuleData: UpdateDiscountRuleData }) => {
      const response = await httpClient.put(`/api/discount-rules/${discountRuleId}`, discountRuleData);
      return response.data;
    },
    onSuccess: (response, { discountRuleId }) => {
      queryClient.invalidateQueries({ queryKey: ["discountRules"] });
      queryClient.invalidateQueries({ queryKey: ["discountRule", discountRuleId] });
      queryClient.invalidateQueries({ queryKey: ["discountStats"] });
      toast.success("Regla de descuento actualizada exitosamente");
      return response;
    },
    onError: (error: any) => {
      toast.error(translateApiError(error, 'Error al actualizar la regla de descuento. Intenta de nuevo.'));
      throw error;
    }
  });
}

// Delete discount rule
export function useDeleteDiscountRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (discountRuleId: string) => {
      const response = await httpClient.delete(`/api/discount-rules/${discountRuleId}`);
      return response.data;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["discountRules"] });
      queryClient.invalidateQueries({ queryKey: ["discountStats"] });
      toast.success("Regla de descuento eliminada exitosamente");
      return response;
    },
    onError: (error: any) => {
      toast.error(translateApiError(error, 'Error al eliminar la regla de descuento. Intenta de nuevo.'));
      throw error;
    }
  });
}

// Validate coupon code
export function useValidateCoupon() {
  return useMutation({
    mutationFn: async (data: ValidateCouponRequest) => {
      const response = await httpClient.post('/api/discount-rules/validate-coupon', data);
      return response.data;
    },
    onError: (error: any) => {
      toast.error(translateApiError(error, 'Error al validar el cupón. Intenta de nuevo.'));
      throw error;
    }
  });
}

// Increment usage count
export function useIncrementDiscountUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (discountRuleId: string) => {
      const response = await httpClient.post(`/api/discount-rules/${discountRuleId}/increment-usage`);
      return response.data;
    },
    onSuccess: (response, discountRuleId) => {
      queryClient.invalidateQueries({ queryKey: ["discountRules"] });
      queryClient.invalidateQueries({ queryKey: ["discountRule", discountRuleId] });
      queryClient.invalidateQueries({ queryKey: ["discountStats"] });
    },
    onError: (error: any) => {
      toast.error(translateApiError(error, 'Error al actualizar el uso del descuento. Intenta de nuevo.'));
      throw error;
    }
  });
}

// Discount type options for forms
export const DISCOUNT_TYPE_OPTIONS = [
  {
    value: 'percentage' as const,
    label: 'Percentage',
    description: 'Discount by percentage (e.g., 15% off)'
  },
  {
    value: 'fixed_amount' as const,
    label: 'Fixed Amount',
    description: 'Discount by fixed amount (e.g., $10 off)'
  },
  {
    value: 'buy_x_get_y' as const,
    label: 'Buy X Get Y',
    description: 'Buy X items, get Y items free'
  },
  {
    value: 'free_shipping' as const,
    label: 'Free Shipping',
    description: 'Waive shipping costs'
  }
];

// Utility functions
export const formatDiscountValue = (type: string, value: number): string => {
  switch (type) {
    case 'percentage':
      return `${(value * 100).toFixed(1)}%`;
    case 'fixed_amount':
      return `$${value.toFixed(2)}`;
    case 'buy_x_get_y':
      return `Buy ${Math.floor(value)}, Get ${(value % 1 * 10).toFixed(0)} Free`;
    case 'free_shipping':
      return 'Free Shipping';
    default:
      return value.toString();
  }
};

export const calculateDiscountAmount = (
  orderAmount: number, 
  discountRule: Pick<DiscountRule, 'type' | 'value' | 'min_order_amount' | 'max_discount_amount'>
): number => {
  // Check minimum order amount
  if (discountRule.min_order_amount && orderAmount < discountRule.min_order_amount) {
    return 0;
  }

  let discount = 0;

  switch (discountRule.type) {
    case 'percentage':
      discount = orderAmount * discountRule.value;
      break;
    case 'fixed_amount':
      discount = discountRule.value;
      break;
    case 'free_shipping':
      // This would need integration with shipping calculation
      discount = 0; // Placeholder
      break;
    case 'buy_x_get_y':
      // This would need integration with item quantity calculation
      discount = 0; // Placeholder
      break;
    default:
      discount = 0;
  }

  // Apply maximum discount limit
  if (discountRule.max_discount_amount && discount > discountRule.max_discount_amount) {
    discount = discountRule.max_discount_amount;
  }

  // Don't exceed order amount
  if (discount > orderAmount) {
    discount = orderAmount;
  }

  return discount;
};

export const isDiscountRuleValid = (discountRule: DiscountRule): boolean => {
  if (!discountRule.is_active) return false;

  const now = new Date();
  
  if (discountRule.valid_from && new Date(discountRule.valid_from) > now) {
    return false;
  }
  
  if (discountRule.valid_to && new Date(discountRule.valid_to) < now) {
    return false;
  }

  if (discountRule.max_uses && discountRule.current_uses >= discountRule.max_uses) {
    return false;
  }

  return true;
};