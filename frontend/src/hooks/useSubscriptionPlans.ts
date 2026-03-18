import { useQuery, useMutation, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import {
  subscriptionService,
  SubscriptionPlan,
  PlanComparison,
  PlanLimits,
  UpgradeCheck,
  PlanRecommendation,
  ProrationCalculation,
  UsageData
} from '../services/api/subscriptionService';
import { toast } from '../lib/toast';

/**
 * Query keys for subscription plans
 */
export const subscriptionKeys = {
  all: ['subscription-plans'] as const,
  lists: () => [...subscriptionKeys.all, 'list'] as const,
  list: (filter: string) => [...subscriptionKeys.lists(), filter] as const,
  details: () => [...subscriptionKeys.all, 'detail'] as const,
  detail: (id: string) => [...subscriptionKeys.details(), id] as const,
  comparison: () => [...subscriptionKeys.all, 'comparison'] as const,
  limits: (planName: string) => [...subscriptionKeys.all, 'limits', planName] as const,
  feature: (planName: string, featureName: string) => [...subscriptionKeys.all, 'feature', planName, featureName] as const,
};

/**
 * Hook to fetch all public subscription plans
 */
export function useSubscriptionPlans() {
  return useQuery({
    queryKey: subscriptionKeys.list('public'),
    queryFn: () => subscriptionService.getPublicPlans(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Hook to fetch plans comparison data for pricing page
 */
export function usePlansComparison(): UseQueryResult<PlanComparison[], Error> {
  return useQuery({
    queryKey: subscriptionKeys.comparison(),
    queryFn: () => subscriptionService.getPlansComparison(),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to fetch a specific plan by ID
 */
export function useSubscriptionPlan(planId: string | undefined) {
  return useQuery({
    queryKey: subscriptionKeys.detail(planId || ''),
    queryFn: () => subscriptionService.getPlanById(planId!),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch a specific plan by name
 */
export function useSubscriptionPlanByName(planName: string | undefined) {
  return useQuery({
    queryKey: subscriptionKeys.detail(planName || ''),
    queryFn: () => subscriptionService.getPlanByName(planName!),
    enabled: !!planName,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch plan limits
 */
export function usePlanLimits(planName: string | undefined): UseQueryResult<PlanLimits, Error> {
  return useQuery({
    queryKey: subscriptionKeys.limits(planName || ''),
    queryFn: () => subscriptionService.getPlanLimits(planName!),
    enabled: !!planName,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to check if plan has a feature
 */
export function usePlanFeature(planName: string | undefined, featureName: string) {
  return useQuery({
    queryKey: subscriptionKeys.feature(planName || '', featureName),
    queryFn: () => subscriptionService.checkFeature(planName!, featureName),
    enabled: !!planName && !!featureName,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to check if user can upgrade
 */
export function useCanUpgrade(): UseMutationResult<UpgradeCheck, Error, { currentPlan: string; targetPlan: string }> {
  return useMutation({
    mutationFn: ({ currentPlan, targetPlan }) =>
      subscriptionService.canUpgrade(currentPlan, targetPlan),
    onSuccess: (data) => {
      if (data.isUpgrade) {
        toast.success(`You can upgrade to ${data.targetPlan}`);
      } else if (data.isDowngrade) {
        toast.info(`This would be a downgrade to ${data.targetPlan}`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to check upgrade eligibility');
    }
  });
}

/**
 * Hook to get recommended plan based on usage
 */
export function useRecommendedPlan(): UseMutationResult<PlanRecommendation, Error, UsageData> {
  return useMutation({
    mutationFn: (usage) => subscriptionService.getRecommendedPlan(usage),
    onSuccess: (data) => {
      if (!data.isCurrentPlanSufficient) {
        toast.warning(`Your usage requires ${data.plan.display_name} plan`);
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to get plan recommendation');
    }
  });
}

/**
 * Hook to calculate proration
 */
export function useCalculateProration(): UseMutationResult<
  ProrationCalculation,
  Error,
  { currentSubscription: any; newPlanName: string }
> {
  return useMutation({
    mutationFn: ({ currentSubscription, newPlanName }) =>
      subscriptionService.calculateProration(currentSubscription, newPlanName),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to calculate proration');
    }
  });
}

/**
 * Hook to get current plan for organization
 */
export function useCurrentPlan(currentPlanName: string | undefined) {
  return useSubscriptionPlanByName(currentPlanName);
}

/**
 * Custom hook to handle limit enforcement errors
 */
export function useLimitEnforcement() {
  const handleLimitError = (error: any) => {
    if (error.response?.data?.code === 'LIMIT_EXCEEDED') {
      const details = error.response.data.details;
      toast.error(
        `You've reached the ${details.resource} limit (${details.current}/${details.limit}). Upgrade your plan to continue.`,
        {
          duration: 5000,
          action: {
            label: 'Upgrade',
            onClick: () => {
              // Navigate to billing page
              window.location.href = '/dashboard/billing';
            }
          }
        }
      );
      return true;
    }

    if (error.response?.data?.code === 'FEATURE_NOT_AVAILABLE') {
      const details = error.response.data.details;
      toast.error(
        `This feature (${details.feature}) is not available in your plan.`,
        {
          duration: 5000,
          action: {
            label: 'Upgrade',
            onClick: () => {
              window.location.href = '/dashboard/billing';
            }
          }
        }
      );
      return true;
    }

    if (error.response?.data?.code === 'SUBSCRIPTION_INACTIVE') {
      toast.error('Your subscription is not active. Please update your payment method.', {
        duration: 5000,
        action: {
          label: 'Billing',
          onClick: () => {
            window.location.href = '/dashboard/billing';
          }
        }
      });
      return true;
    }

    return false;
  };

  return { handleLimitError };
}

/**
 * Hook to check usage against limits
 */
export function useUsageStatus(
  currentUsage: number | undefined,
  limit: number | undefined
) {
  if (!currentUsage || !limit || limit === -1) {
    return {
      percentage: 0,
      isApproachingLimit: false,
      isAtLimit: false,
      isOverLimit: false,
      status: 'ok' as const
    };
  }

  const percentage = (currentUsage / limit) * 100;

  return {
    percentage,
    isApproachingLimit: percentage >= 80,
    isAtLimit: percentage >= 100,
    isOverLimit: percentage > 100,
    status:
      percentage >= 100 ? 'exceeded' as const :
      percentage >= 80 ? 'warning' as const :
      'ok' as const
  };
}

/**
 * Hook that returns the current organization's plan limits.
 * Uses the already-cached current-subscription query — no extra network requests
 * if the Pricing page (or any page) has already fetched it.
 */
export function useCurrentPlanLimits() {
  const { data: currentSubscription, isLoading: isLoadingSub } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: () => subscriptionService.getCurrentSubscription(),
    staleTime: 5 * 60 * 1000,
  });

  // Plan name from nested subscription_plans (if API embeds it), fallback to 'free'
  const planName =
    currentSubscription?.subscription?.subscription_plans?.name ?? 'free';

  const { data: limits, isLoading: isLoadingLimits } = usePlanLimits(planName);

  return {
    limits: limits ?? null,
    planName,
    isLoading: isLoadingSub || isLoadingLimits,
  };
}

/**
 * Returns whether a resource is at its plan limit.
 * Returns false while loading so the button stays enabled during fetch.
 * @param limitKey  e.g. 'max_warehouses', 'max_products', 'max_clients'
 * @param currentCount  length of the already-loaded list
 */
export function usePlanResourceLimit(
  limitKey: keyof import('../services/api/subscriptionService').PlanLimits,
  currentCount: number
): { atLimit: boolean; limit: number; remaining: number } {
  const { limits } = useCurrentPlanLimits();

  if (!limits) return { atLimit: false, limit: -1, remaining: -1 };

  const limit = limits[limitKey] as number;
  if (limit === -1) return { atLimit: false, limit: -1, remaining: -1 }; // unlimited

  const remaining = Math.max(0, limit - currentCount);
  return { atLimit: currentCount >= limit, limit, remaining };
}

/**
 * Hook to format limit display
 */
export function useFormatLimit() {
  const formatLimit = (value: number | string | undefined): string => {
    if (value === undefined || value === null) {
      return 'N/A';
    }

    if (subscriptionService.isUnlimited(value)) {
      return 'Unlimited';
    }

    if (typeof value === 'number') {
      return value.toLocaleString();
    }

    return value;
  };

  const formatUsage = (current: number | undefined, limit: number | string | undefined): string => {
    if (!current) return '0';
    if (!limit) return current.toLocaleString();

    if (subscriptionService.isUnlimited(limit)) {
      return `${current.toLocaleString()} / Unlimited`;
    }

    return `${current.toLocaleString()} / ${formatLimit(limit)}`;
  };

  return { formatLimit, formatUsage };
}
