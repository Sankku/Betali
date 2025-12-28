import { httpClient } from '../http/httpClient';

export interface SubscriptionPlan {
  plan_id: string;
  name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  max_users: number;
  max_products: number;
  max_warehouses: number;
  max_stock_movements_per_month: number;
  max_orders_per_month: number;
  max_clients: number;
  max_suppliers: number;
  max_storage_mb: number;
  features: Record<string, boolean>;
  trial_days: number;
  is_active: boolean;
  is_public: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PlanComparison {
  id: string;
  name: string;
  displayName: string;
  description: string;
  pricing: {
    monthly: number;
    yearly: number;
    currency: string;
    savings: number;
  };
  limits: {
    users: number | string;
    products: number | string;
    warehouses: number | string;
    stockMovements: number | string;
    orders: number | string;
    clients: number | string;
    suppliers: number | string;
    storage: string;
  };
  features: Record<string, boolean>;
  trial: {
    days: number;
    available: boolean;
  };
  sortOrder: number;
}

export interface PlanLimits {
  max_users: number;
  max_products: number;
  max_warehouses: number;
  max_stock_movements_per_month: number;
  max_orders_per_month: number;
  max_clients: number;
  max_suppliers: number;
  max_storage_mb: number;
}

export interface UpgradeCheck {
  canUpgrade: boolean;
  currentPlan: string;
  targetPlan: string;
  priceDifference: number;
  isUpgrade: boolean;
  isDowngrade: boolean;
  isSamePlan: boolean;
}

export interface PlanRecommendation {
  plan: SubscriptionPlan;
  reason: string;
  isCurrentPlanSufficient: boolean;
}

export interface ProrationCalculation {
  currentPlan: string;
  newPlan: string;
  remainingDays: number;
  totalDays: number;
  unusedAmount: string;
  proratedAmount: string;
  chargeAmount: string;
  effectiveDate: string;
  nextBillingDate: string;
}

export interface UsageData {
  users_count: number;
  products_count: number;
  warehouses_count: number;
  stock_movements_count: number;
  orders_count: number;
  clients_count: number;
  suppliers_count: number;
  storage_used_mb: number;
}

export interface Subscription {
  subscription_id: string;
  organization_id: string;
  plan_id: string;
  status: 'pending' | 'active' | 'cancelled' | 'expired';
  billing_cycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  start_date: string | null;
  end_date: string | null;
  next_billing_date: string | null;
  cancelled_at: string | null;
  requested_by: string | null;
  activated_by: string | null;
  created_at: string;
  updated_at: string;
  subscription_plans?: SubscriptionPlan;
}

export interface PlanChangeRequest {
  planId: string;
  currency: 'USD' | 'ARS';
}

export interface ManualPayment {
  payment_id: string;
  subscription_id: string;
  organization_id: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: 'pending' | 'confirmed' | 'failed';
  payment_date: string;
  confirmed_at: string | null;
  reference_number: string | null;
  notes: string | null;
  recorded_by: string;
  confirmed_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecordPaymentData {
  subscriptionId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
}

class SubscriptionService {
  private readonly BASE_PATH = '/api/subscription-plans';
  private readonly SUBSCRIPTIONS_PATH = '/api/subscriptions';

  /**
   * Get all public subscription plans
   */
  async getPublicPlans(): Promise<SubscriptionPlan[]> {
    const response = await httpClient.get<{ data: SubscriptionPlan[] }>(this.BASE_PATH);
    return response.data.data;
  }

  /**
   * Get plans comparison data for pricing page
   */
  async getPlansComparison(): Promise<PlanComparison[]> {
    const response = await httpClient.get<{ data: PlanComparison[] }>(`${this.BASE_PATH}/comparison`);
    return response.data.data;
  }

  /**
   * Get a specific plan by ID
   */
  async getPlanById(planId: string): Promise<SubscriptionPlan> {
    const response = await httpClient.get<{ data: SubscriptionPlan }>(`${this.BASE_PATH}/${planId}`);
    return response.data.data;
  }

  /**
   * Get a specific plan by name
   */
  async getPlanByName(planName: string): Promise<SubscriptionPlan> {
    const response = await httpClient.get<{ data: SubscriptionPlan }>(`${this.BASE_PATH}/name/${planName}`);
    return response.data.data;
  }

  /**
   * Get plan limits
   */
  async getPlanLimits(planName: string): Promise<PlanLimits> {
    const response = await httpClient.get<{ data: PlanLimits }>(`${this.BASE_PATH}/${planName}/limits`);
    return response.data.data;
  }

  /**
   * Check if plan has a specific feature
   */
  async checkFeature(planName: string, featureName: string): Promise<boolean> {
    const response = await httpClient.get<{ data: { hasFeature: boolean } }>(
      `${this.BASE_PATH}/${planName}/features/${featureName}`
    );
    return response.data.data.hasFeature;
  }

  /**
   * Check if user can upgrade from current plan to target plan
   */
  async canUpgrade(currentPlan: string, targetPlan: string): Promise<UpgradeCheck> {
    const response = await httpClient.post<{ data: UpgradeCheck }>(`${this.BASE_PATH}/can-upgrade`, {
      currentPlan,
      targetPlan
    });
    return response.data.data;
  }

  /**
   * Get recommended plan based on usage
   */
  async getRecommendedPlan(usage: UsageData): Promise<PlanRecommendation> {
    const response = await httpClient.post<{ data: PlanRecommendation }>(`${this.BASE_PATH}/recommend`, {
      usage
    });
    return response.data.data;
  }

  /**
   * Calculate proration for plan change
   */
  async calculateProration(
    currentSubscription: any,
    newPlanName: string
  ): Promise<ProrationCalculation> {
    const response = await httpClient.post<{ data: ProrationCalculation }>(
      `${this.BASE_PATH}/calculate-proration`,
      {
        currentSubscription,
        newPlanName
      }
    );
    return response.data.data;
  }

  /**
   * Format price with currency
   */
  formatPrice(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  /**
   * Calculate yearly savings
   */
  calculateYearlySavings(monthlyPrice: number, yearlyPrice: number): number {
    const monthlyTotal = monthlyPrice * 12;
    return Math.round(((monthlyTotal - yearlyPrice) / monthlyTotal) * 100);
  }

  /**
   * Check if value is unlimited
   */
  isUnlimited(value: number | string): boolean {
    return value === -1 || value === 'Unlimited';
  }

  /**
   * Format limit value
   */
  formatLimit(value: number | string): string {
    if (this.isUnlimited(value)) {
      return 'Unlimited';
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return value;
  }

  // ============================================================================
  // MANUAL BILLING METHODS
  // ============================================================================

  /**
   * Get all plans (using new subscriptions endpoint)
   */
  async getPlans(): Promise<SubscriptionPlan[]> {
    const response = await httpClient.get<{ data: SubscriptionPlan[] }>(this.BASE_PATH);
    return response.data;
  }

  /**
   * Get current organization's subscription
   */
  async getCurrentSubscription(): Promise<{ subscription: Subscription | null }> {
    const response = await httpClient.get<{ subscription: Subscription | null }>(
      `${this.SUBSCRIPTIONS_PATH}/current`
    );
    return response.data;
  }

  /**
   * Request plan change
   */
  async requestPlanChange(data: PlanChangeRequest): Promise<Subscription> {
    const response = await httpClient.post<{ subscription: Subscription }>(
      `${this.SUBSCRIPTIONS_PATH}/request-change`,
      data
    );
    return response.data.subscription;
  }

  /**
   * Check if organization has access to a feature
   */
  async checkFeatureAccess(featureName: string): Promise<boolean> {
    const response = await httpClient.get<{ hasAccess: boolean }>(
      `${this.SUBSCRIPTIONS_PATH}/feature/${featureName}`
    );
    return response.data.hasAccess;
  }

  // ============================================================================
  // ADMIN METHODS
  // ============================================================================

  /**
   * Get pending subscriptions (admin only)
   */
  async getPendingSubscriptions(): Promise<Subscription[]> {
    const response = await httpClient.get<{ subscriptions: Subscription[] }>(
      `${this.SUBSCRIPTIONS_PATH}/pending`
    );
    return response.data.subscriptions;
  }

  /**
   * Activate subscription (admin only)
   */
  async activateSubscription(subscriptionId: string): Promise<Subscription> {
    const response = await httpClient.put<{ subscription: Subscription }>(
      `${this.SUBSCRIPTIONS_PATH}/${subscriptionId}/activate`
    );
    return response.data.subscription;
  }

  /**
   * Record manual payment (admin only)
   */
  async recordPayment(data: RecordPaymentData): Promise<ManualPayment> {
    const response = await httpClient.post<{ payment: ManualPayment }>(
      `${this.SUBSCRIPTIONS_PATH}/payments`,
      data
    );
    return response.data.payment;
  }

  /**
   * Confirm payment (admin only)
   */
  async confirmPayment(paymentId: string): Promise<{ payment: ManualPayment; subscription: Subscription }> {
    const response = await httpClient.put<{ payment: ManualPayment; subscription: Subscription }>(
      `${this.SUBSCRIPTIONS_PATH}/payments/${paymentId}/confirm`
    );
    return response.data;
  }
}

export const subscriptionService = new SubscriptionService();
