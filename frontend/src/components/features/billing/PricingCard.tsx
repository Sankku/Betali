import { Check, Zap } from 'lucide-react';
import { SubscriptionPlan } from '../../../services/api/subscriptionService';
import { Button } from '../../ui/button';
import { useTranslation } from '../../../contexts/LanguageContext';
import { translations } from '../../../locales';

interface PricingCardProps {
  plan: SubscriptionPlan;
  isCurrentPlan?: boolean;
  isPopular?: boolean;
  billingCycle: 'monthly' | 'yearly';
  onSelectPlan: (planId: string) => void;
  isLoading?: boolean;
  hasActiveSubscription?: boolean;
  hasPendingPayment?: boolean;
}

export function PricingCard({
  plan,
  isCurrentPlan = false,
  isPopular = false,
  billingCycle,
  onSelectPlan,
  isLoading = false,
  hasActiveSubscription = false,
  hasPendingPayment = false
}: PricingCardProps) {
  const { t, locale } = useTranslation();
  const price = billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly;
  const displayPrice = billingCycle === 'monthly' ? price : price / 12;

  // Calculate savings for yearly
  const savings = billingCycle === 'yearly'
    ? Math.round(((plan.price_monthly * 12 - plan.price_yearly) / (plan.price_monthly * 12)) * 100)
    : 0;

  // Format features from JSONB
  const featureNameMap = translations[locale].pricing.featureNames as Record<string, string>;
  const features = Object.entries(plan.features || {})
    .filter(([_, value]) => value === true)
    .map(([key]) => {
      return featureNameMap[key] || key.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    });

  // Add limit-based features
  const limitFeatures = [];
  if (plan.max_users === -1) {
    limitFeatures.push(t('pricing.unlimitedUsers'));
  } else {
    limitFeatures.push(t('pricing.upToUsers', { count: plan.max_users }));
  }

  if (plan.max_warehouses === -1) {
    limitFeatures.push(t('pricing.unlimitedWarehouses'));
  } else {
    limitFeatures.push(t('pricing.warehouseCount', { count: plan.max_warehouses }));
  }

  if (plan.max_products === -1) {
    limitFeatures.push(t('pricing.unlimitedProducts'));
  } else if (plan.max_products) {
    limitFeatures.push(t('pricing.productCount', { count: plan.max_products.toLocaleString() }));
  }

  if (plan.max_clients === -1) {
    limitFeatures.push(t('pricing.unlimitedClients'));
  } else if (plan.max_clients) {
    limitFeatures.push(t('pricing.clientCount', { count: plan.max_clients.toLocaleString() }));
  }

  if (plan.max_suppliers === -1) {
    limitFeatures.push(t('pricing.unlimitedSuppliers'));
  } else if (plan.max_suppliers) {
    limitFeatures.push(t('pricing.supplierCount', { count: plan.max_suppliers.toLocaleString() }));
  }

  if (plan.max_orders_per_month === -1) {
    limitFeatures.push(t('pricing.unlimitedOrders'));
  } else if (plan.max_orders_per_month) {
    limitFeatures.push(t('pricing.ordersPerMonthCount', { count: plan.max_orders_per_month.toLocaleString() }));
  }

  if (plan.max_stock_movements_per_month === -1) {
    limitFeatures.push(t('pricing.unlimitedMovements'));
  } else if (plan.max_stock_movements_per_month) {
    limitFeatures.push(t('pricing.movementsPerMonthCount', { count: plan.max_stock_movements_per_month.toLocaleString() }));
  }

  const allFeatures = [...limitFeatures, ...features];

  return (
    <div
      className={`
        relative flex flex-col rounded-2xl border-2 p-8 shadow-sm
        ${isPopular
          ? 'border-green-500 shadow-lg shadow-green-500/20'
          : 'border-gray-200 hover:border-gray-300'
        }
        ${isCurrentPlan ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        transition-all duration-200 hover:shadow-md
      `}
    >
      {/* Popular Badge - Hide if current plan to avoid clutter */}
      {isPopular && !isCurrentPlan && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-green-500 to-green-600 px-4 py-1 text-sm font-semibold text-white shadow-lg">
            <Zap className="h-4 w-4" />
            {t('pricing.mostPopular')}
          </span>
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 right-4">
          <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
            hasPendingPayment
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-blue-100 text-blue-800'
          }`}>
            {hasPendingPayment ? 'Pago Pendiente' : t('pricing.currentPlan')}
          </span>
        </div>
      )}

      {/* Plan Header - min-h keeps price/button aligned across cards */}
      <div className="mb-6 min-h-[6rem]">
        <h3 className="text-2xl font-bold text-gray-900">{plan.display_name}</h3>
        <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
      </div>

      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-gray-900">
            ${displayPrice.toFixed(0)}
          </span>
          <span className="text-gray-600">{t('pricing.perMonth')}</span>
        </div>
        {billingCycle === 'yearly' && (
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-gray-500">
              ${plan.price_yearly.toFixed(0)} {t('pricing.billedAnnually')}
            </span>
            {savings > 0 && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                {t('pricing.savePercent', { percent: savings })}
              </span>
            )}
          </div>
        )}
      </div>

      {/* CTA Button */}
      <Button
        onClick={() => onSelectPlan(plan.plan_id)}
        disabled={(isCurrentPlan && !hasPendingPayment) || isLoading}
        className={`
          mb-6 w-full
          ${isCurrentPlan && !hasPendingPayment
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed shadow-none hover:bg-gray-100'
            : hasPendingPayment
            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
            : isPopular
            ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
            : 'bg-gray-900 hover:bg-gray-800 text-white'
          }
        `}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            {t('pricing.processing')}
          </span>
        ) : hasPendingPayment ? (
          'Completar Pago'
        ) : isCurrentPlan ? (
          t('pricing.currentPlan')
        ) : hasActiveSubscription ? (
          t('pricing.switchPlan')
        ) : plan.price_monthly === 0 ? (
          t('pricing.getStarted')
        ) : (
          t('pricing.upgradeNow')
        )}
      </Button>

      {/* Features List - grows to fill remaining space */}
      <div className="flex-1 space-y-3">
        <p className="text-sm font-semibold text-gray-900">{t('pricing.whatsIncluded')}</p>
        <ul className="space-y-2.5">
          {allFeatures.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className={`h-5 w-5 flex-shrink-0 ${isPopular ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="text-sm text-gray-600">{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Trial Badge + link - pinned to bottom */}
      <div className="mt-auto pt-4 space-y-4">
        {plan.trial_days > 0 && (
          <div className="rounded-lg bg-blue-50 p-3 text-center">
            <p className="text-sm font-medium text-blue-900">
              {t('pricing.trialIncluded', { days: plan.trial_days })}
            </p>
          </div>
        )}
        <div className="text-center">
          <a
            href="#plan-comparison"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('plan-comparison')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-sm text-gray-400 hover:text-gray-600 underline underline-offset-2 transition-colors"
          >
            {t('pricing.viewDetails')}
          </a>
        </div>
      </div>
    </div>
  );
}
