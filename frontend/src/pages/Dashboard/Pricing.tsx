import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, X } from 'lucide-react';
import { subscriptionService } from '../../services/api/subscriptionService';
import { PricingCard } from '../../components/features/billing/PricingCard';
import { PaymentModal } from '../../components/features/billing/PaymentModal';
import { Button } from '../../components/ui/button';
import { useToast } from '../../hooks/useToast';
import { DashboardLayout } from '../../components/layout/Dashboard';

export default function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [currentSubscriptionId, setCurrentSubscriptionId] = useState<string | null>(null);
  const [pendingPaymentAmount, setPendingPaymentAmount] = useState<number | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch all plans
  const { data: plans, isLoading: isLoadingPlans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => subscriptionService.getPlans(),
  });

  // Fetch current subscription
  const { data: currentSubscription } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: () => subscriptionService.getCurrentSubscription(),
  });

  // Auto-open payment modal if there's a pending payment subscription
  useEffect(() => {
    const subscription = currentSubscription?.subscription;
    if (subscription?.status === 'pending_payment' && plans) {
      setSelectedPlanId(subscription.plan_id);
      setCurrentSubscriptionId(subscription.subscription_id);
      setPendingPaymentAmount(subscription.amount);
      setPaymentModalOpen(true);
    }
  }, [currentSubscription, plans]);

  // Create pending subscription before opening payment modal
  const { mutate: createPendingSubscription, isPending: isCreatingSubscription } = useMutation({
    mutationFn: async ({ planId, currency }: { planId: string; currency: 'ARS' | 'USD' }) => {
      // Create pending subscription first
      const subscription = await subscriptionService.requestPlanChange({
        planId,
        currency,
      });
      return { subscription, planId };
    },
    onSuccess: ({ subscription }) => {
      // Store the subscription ID and open payment modal
      setCurrentSubscriptionId(subscription.subscription_id);
      setPaymentModalOpen(true);

      toast({
        title: 'Suscripción creada',
        description: 'Completa el pago para activar tu plan',
        variant: 'default',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No pudimos crear la suscripción. Por favor intenta nuevamente.',
        variant: 'destructive',
      });
      setSelectedPlanId(null);
    },
  });

  const handleSelectPlan = (planId: string) => {
    const plan = plans?.find((p) => p.plan_id === planId);
    if (!plan) return;

    // If it's the free plan, just redirect to signup/register
    if (plan.price_monthly === 0) {
      navigate('/register');
      return;
    }

    // If there's already a pending payment for this plan, just open the modal
    const subscription = currentSubscription?.subscription;
    if (subscription?.status === 'pending_payment' && subscription?.plan_id === planId) {
      setSelectedPlanId(planId);
      setCurrentSubscriptionId(subscription.subscription_id);
      setPendingPaymentAmount(subscription.amount);
      setPaymentModalOpen(true);
      return;
    }

    // Create pending subscription (will trigger payment flow via CheckoutButton)
    setSelectedPlanId(planId);
    createPendingSubscription({
      planId,
      currency: 'ARS'
    });
  };

  const currentPlanId = currentSubscription?.subscription?.plan_id;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50/50 py-12">
        {isLoadingPlans ? (
          <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-green-600" />
              <p className="mt-4 text-lg text-gray-600">Loading pricing plans...</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Choose Your Plan
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Start free and scale as you grow. All plans include core inventory management.
            </p>
          </div>

          {/* Billing Cycle Toggle */}
          <div className="mt-10 flex justify-center">
            <div className="relative flex items-center rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`
                  relative z-10 rounded-md px-6 py-2 text-sm font-medium transition-all
                  ${billingCycle === 'monthly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`
                  relative z-10 rounded-md px-6 py-2 text-sm font-medium transition-all
                  ${billingCycle === 'yearly'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }
                `}
              >
                Yearly
                <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="mt-12 grid gap-8 lg:grid-cols-4 md:grid-cols-2 sm:grid-cols-1">
            {plans?.map((plan) => {
              const isLoadingThisPlan = isCreatingSubscription && selectedPlanId === plan.plan_id;
              const isPendingPaymentPlan = currentSubscription?.subscription?.status === 'pending_payment'
                && currentSubscription?.subscription?.plan_id === plan.plan_id;

              return (
                <PricingCard
                  key={plan.plan_id}
                  plan={plan}
                  isCurrentPlan={currentPlanId === plan.plan_id}
                  isPopular={plan.name === 'professional'}
                  billingCycle={billingCycle}
                  onSelectPlan={handleSelectPlan}
                  isLoading={isLoadingThisPlan}
                  hasActiveSubscription={!!currentSubscription?.subscription}
                  hasPendingPayment={isPendingPaymentPlan}
                />
              );
            })}
          </div>

          {/* Payment Modal */}
          {paymentModalOpen && currentSubscriptionId && selectedPlanId && (
            <PaymentModal
              isOpen={paymentModalOpen}
              onClose={() => {
                setPaymentModalOpen(false);
                setCurrentSubscriptionId(null);
                setSelectedPlanId(null);
                setPendingPaymentAmount(null);
              }}
              subscriptionId={currentSubscriptionId}
              planId={selectedPlanId}
              planName={plans?.find(p => p.plan_id === selectedPlanId)?.display_name || ''}
              amount={
                pendingPaymentAmount !== null
                  ? pendingPaymentAmount
                  : billingCycle === 'monthly'
                    ? plans?.find(p => p.plan_id === selectedPlanId)?.price_monthly || 0
                    : plans?.find(p => p.plan_id === selectedPlanId)?.price_yearly || 0
              }
              billingCycle={billingCycle}
              currency="ARS"
            />
          )}

          {/* Feature Comparison Table */}
          <div className="mt-24">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900">
                Compare Plans
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Detailed breakdown of features and limits for each plan
              </p>
            </div>

            <div className="mt-10 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-gray-200/40">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200">
                      <th className="p-6 text-left text-sm font-bold text-gray-900 uppercase tracking-wider w-1/4">
                        Features
                      </th>
                      {plans?.map((plan) => (
                        <th key={plan.plan_id} className="p-6 text-center text-sm font-bold text-gray-900 uppercase tracking-wider">
                          {plan.display_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* Users */}
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-6 text-sm font-medium text-gray-700">Users</td>
                      {plans?.map((plan) => (
                        <td key={plan.plan_id} className="p-6 text-center text-sm font-medium text-gray-900">
                          {plan.max_users === -1 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Unlimited
                            </span>
                          ) : plan.max_users}
                        </td>
                      ))}
                    </tr>

                    {/* Warehouses */}
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-6 text-sm font-medium text-gray-700">Warehouses</td>
                      {plans?.map((plan) => (
                        <td key={plan.plan_id} className="p-6 text-center text-sm font-medium text-gray-900">
                          {plan.max_warehouses === -1 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Unlimited
                            </span>
                          ) : plan.max_warehouses}
                        </td>
                      ))}
                    </tr>

                    {/* Orders per Month */}
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-6 text-sm font-medium text-gray-700">Orders per Month</td>
                      {plans?.map((plan) => (
                        <td key={plan.plan_id} className="p-6 text-center text-sm font-medium text-gray-900">
                          {plan.max_orders_per_month === -1 ? (
                             <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                               Unlimited
                             </span>
                          ) : plan.max_orders_per_month?.toLocaleString() || 'N/A'}
                        </td>
                      ))}
                    </tr>

                    {/* API Access */}
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-6 text-sm font-medium text-gray-700">API Access</td>
                      {plans?.map((plan) => (
                        <td key={plan.plan_id} className="p-6 text-center">
                          {plan.features?.api_access ? (
                            <div className="flex justify-center">
                              <div className="bg-green-100 rounded-full p-1">
                                <Check className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <X className="h-5 w-5 text-gray-300" />
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Advanced Analytics */}
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-6 text-sm font-medium text-gray-700">Advanced Analytics</td>
                      {plans?.map((plan) => (
                        <td key={plan.plan_id} className="p-6 text-center">
                          {plan.features?.advanced_analytics ? (
                            <div className="flex justify-center">
                              <div className="bg-green-100 rounded-full p-1">
                                <Check className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <X className="h-5 w-5 text-gray-300" />
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Custom Reports */}
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-6 text-sm font-medium text-gray-700">Custom Reports</td>
                      {plans?.map((plan) => (
                        <td key={plan.plan_id} className="p-6 text-center">
                          {plan.features?.custom_reports ? (
                            <div className="flex justify-center">
                              <div className="bg-green-100 rounded-full p-1">
                                <Check className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <X className="h-5 w-5 text-gray-300" />
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Priority Support */}
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-6 text-sm font-medium text-gray-700">Priority Support</td>
                      {plans?.map((plan) => (
                        <td key={plan.plan_id} className="p-6 text-center">
                          {plan.features?.priority_support ? (
                            <div className="flex justify-center">
                              <div className="bg-green-100 rounded-full p-1">
                                <Check className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <X className="h-5 w-5 text-gray-300" />
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* SSO */}
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-6 text-sm font-medium text-gray-700">Single Sign-On (SSO)</td>
                      {plans?.map((plan) => (
                        <td key={plan.plan_id} className="p-6 text-center">
                          {plan.features?.sso ? (
                            <div className="flex justify-center">
                              <div className="bg-green-100 rounded-full p-1">
                                <Check className="h-5 w-5 text-green-600" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <X className="h-5 w-5 text-gray-300" />
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* FAQ or Contact Section */}
          <div className="mt-20 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 p-12 text-center shadow-lg">
            <h2 className="text-3xl font-bold text-white">
              Need a Custom Plan?
            </h2>
            <p className="mt-4 text-lg text-green-50">
              Contact our sales team for enterprise solutions and custom pricing
            </p>
            <Button
              onClick={() => navigate('/contact')}
              className="mt-8 bg-white text-green-600 hover:bg-green-50 px-8 py-6 text-lg font-semibold h-auto"
            >
              Contact Sales
            </Button>
          </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
