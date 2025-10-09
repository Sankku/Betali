import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "../lib/toast";
import { useOrganization } from "../context/OrganizationContext";
import { httpClient } from "../services/http/httpClient";

export interface OrderPricingData {
  client_id?: string;
  warehouse_id?: string;
  items: Array<{
    product_id: string;
    quantity: number;
    price?: number;
  }>;
  coupon_code?: string;
  order_date?: string;
}

export interface PricingLineItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  line_subtotal: number;
  line_tax_amount: number;
  line_discount_amount: number;
  line_total: number;
  applied_tax_rates?: Array<{
    tax_rate_id: string;
    name: string;
    rate: number;
    amount: number;
  }>;
}

export interface OrderPricingResult {
  line_items: PricingLineItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  shipping_amount: number;
  total: number;
  tax_breakdown?: Array<{
    tax_rate_id: string;
    name: string;
    rate: number;
    taxable_amount: number;
    tax_amount: number;
  }>;
  applied_discounts?: Array<{
    discount_rule_id: string;
    name: string;
    type: string;
    amount: number;
  }>;
}

export interface CouponValidationData {
  coupon_code: string;
  order_data?: OrderPricingData;
}

export interface CouponValidationResult {
  valid: boolean;
  discount_amount?: number;
  discount_type?: 'percentage' | 'fixed_amount';
  reason?: string;
  discount_rule?: {
    discount_rule_id: string;
    name: string;
    description: string;
  };
}

// Calculate order pricing
export function useCalculateOrderPricing() {
  const { currentOrganization } = useOrganization();

  return useMutation({
    mutationFn: async (orderData: OrderPricingData) => {
      const response = await httpClient.post('/api/pricing/calculate', orderData);
      return response.data?.data || response.data;
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to calculate pricing";
      console.error('Pricing calculation error:', message);
      // Don't show toast for pricing errors as they happen in real-time
    }
  });
}

// Calculate order pricing via orders endpoint (alternative)
export function useCalculateOrderPricingViaOrders() {
  return useMutation({
    mutationFn: async (orderData: OrderPricingData) => {
      const response = await httpClient.post('/api/orders/calculate-pricing', orderData);
      return response.data?.data || response.data;
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to calculate order pricing";
      console.error('Order pricing calculation error:', message);
    }
  });
}

// Validate coupon code
export function useValidateCoupon() {
  return useMutation({
    mutationFn: async (couponData: CouponValidationData) => {
      const response = await httpClient.post('/api/pricing/validate-coupon', couponData);
      return response.data?.data || response.data;
    },
    onSuccess: (result: CouponValidationResult) => {
      if (result.valid) {
        toast.success(`Coupon applied! ${result.discount_amount}${result.discount_type === 'percentage' ? '%' : '$'} discount`);
      } else {
        toast.error(result.reason || 'Invalid coupon code');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || error.message || "Failed to validate coupon";
      toast.error(message);
    }
  });
}

// Utility functions for pricing calculations
export const calculateLineTotal = (quantity: number, unitPrice: number): number => {
  return quantity * unitPrice;
};

export const formatPricing = (amount: number): string => {
  return `$${amount.toFixed(2)}`;
};

export const calculateTaxRate = (taxAmount: number, subtotal: number): number => {
  return subtotal > 0 ? (taxAmount / subtotal) * 100 : 0;
};

// Hook for real-time pricing calculation
export function useRealtimePricing(orderData: OrderPricingData | null, enabled: boolean = true) {
  const calculatePricing = useCalculateOrderPricing();
  
  const isValidOrderData = useMemo(() => {
    return orderData && 
      orderData.items && 
      orderData.items.length > 0 && 
      orderData.items.every(item => item.product_id && item.quantity > 0);
  }, [orderData]);

  return {
    mutation: calculatePricing,
    orderData,
    pricingResult: calculatePricing.data as OrderPricingResult | undefined,
    isLoading: calculatePricing.isPending,
    error: calculatePricing.error,
    isValidData: !!isValidOrderData,
    enabled
  };
}