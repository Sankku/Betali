import { useQuery } from '@tanstack/react-query';
import { subscriptionService } from '../services/api/subscriptionService';

export interface FeatureAccessResult {
  hasAccess: boolean;
  loading: boolean;
  error: Error | null;
  currentPlan: string | null;
  refetch: () => void;
}

/**
 * Hook to check if the current organization has access to a specific feature
 *
 * @param featureName Feature key to check (e.g., 'api_access', 'advanced_analytics')
 * @param options Query options
 * @returns Feature access information
 *
 * @example
 * const { hasAccess, loading } = useFeatureAccess('api_access');
 * if (hasAccess) {
 *   // Show API settings
 * }
 */
export function useFeatureAccess(
  featureName: string,
  options?: {
    enabled?: boolean;
    retry?: boolean;
  }
): FeatureAccessResult {
  const {
    data: hasAccess,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['feature-access', featureName],
    queryFn: async () => {
      try {
        const result = await subscriptionService.checkFeatureAccess(featureName);
        return result;
      } catch (err) {
        console.error(`Error checking feature access for ${featureName}:`, err);
        // Default to false on error
        return false;
      }
    },
    enabled: options?.enabled !== false,
    retry: options?.retry !== false ? 1 : false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000 // Keep in cache for 10 minutes
  });

  // Get current plan
  const { data: subscription } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: () => subscriptionService.getCurrentSubscription(),
    enabled: options?.enabled !== false
  });

  const currentPlan = subscription?.subscription?.subscription_plans?.name || null;

  return {
    hasAccess: hasAccess || false,
    loading: isLoading,
    error: error as Error | null,
    currentPlan,
    refetch
  };
}

/**
 * Hook to check multiple features at once
 *
 * @param features Array of feature names
 * @returns Object with feature access status for each feature
 *
 * @example
 * const features = useMultipleFeatureAccess(['api_access', 'advanced_analytics', 'custom_reports']);
 * if (features.api_access) {
 *   // Show API settings
 * }
 */
export function useMultipleFeatureAccess(features: string[]): Record<string, boolean> {
  const results = features.map(feature =>
    useQuery({
      queryKey: ['feature-access', feature],
      queryFn: () => subscriptionService.checkFeatureAccess(feature),
      staleTime: 5 * 60 * 1000
    })
  );

  return features.reduce((acc, feature, index) => {
    acc[feature] = results[index].data || false;
    return acc;
  }, {} as Record<string, boolean>);
}

/**
 * Hook to get current subscription with plan details
 *
 * @returns Current subscription information
 *
 * @example
 * const { subscription, plan, loading } = useCurrentSubscription();
 * console.log(plan.name); // "Professional"
 */
export function useCurrentSubscription() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: () => subscriptionService.getCurrentSubscription(),
    staleTime: 2 * 60 * 1000 // Cache for 2 minutes
  });

  return {
    subscription: data?.subscription || null,
    plan: data?.subscription?.subscription_plans || null,
    loading: isLoading,
    error: error as Error | null,
    refetch
  };
}

/**
 * Hook to check if current plan has reached a usage limit
 *
 * @param limitKey Limit key (e.g., 'max_users', 'max_warehouses')
 * @param currentUsage Current usage count
 * @returns Limit status information
 *
 * @example
 * const { isNearLimit, isAtLimit, remaining, max } = usePlanLimit('max_users', 8);
 * if (isNearLimit) {
 *   // Show warning: "You're using 8 of 10 users"
 * }
 */
export function usePlanLimit(limitKey: string, currentUsage: number) {
  const { plan } = useCurrentSubscription();

  const maxValue = plan?.[limitKey as keyof typeof plan] as number || 0;
  const isUnlimited = maxValue === -1;
  const remaining = isUnlimited ? Infinity : Math.max(0, maxValue - currentUsage);
  const isAtLimit = !isUnlimited && currentUsage >= maxValue;
  const isNearLimit = !isUnlimited && remaining > 0 && remaining <= maxValue * 0.2; // 20% remaining

  return {
    max: isUnlimited ? 'Unlimited' : maxValue,
    current: currentUsage,
    remaining: isUnlimited ? 'Unlimited' : remaining,
    isUnlimited,
    isAtLimit,
    isNearLimit,
    percentUsed: isUnlimited ? 0 : Math.min(100, (currentUsage / maxValue) * 100)
  };
}
