import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpCircle,
  Loader2
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout/Dashboard';
import { Button } from '../../components/ui/button';
import { subscriptionService } from '../../services/api/subscriptionService';
import { mercadoPagoService } from '../../services/api/mercadoPagoService';
import { useToast } from '../../hooks/useToast';

export default function SubscriptionManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // Fetch current subscription
  const { data: currentSubscription, isLoading } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: () => subscriptionService.getCurrentSubscription(),
  });

  // Fetch subscription plans for upgrade options
  const { data: plans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => subscriptionService.getPlans(),
  });

  // Fetch payment history
  const { data: payments, isLoading: isLoadingPayments } = useQuery({
    queryKey: ['subscription-payments', currentSubscription?.subscription?.subscription_id],
    queryFn: () =>
      currentSubscription?.subscription?.subscription_id
        ? mercadoPagoService.getSubscriptionPayments(currentSubscription.subscription.subscription_id)
        : Promise.resolve([]),
    enabled: !!currentSubscription?.subscription?.subscription_id,
  });

  // Cancel subscription mutation
  const { mutate: cancelSubscription, isPending: isCanceling } = useMutation({
    mutationFn: ({ subscriptionId, reason }: { subscriptionId: string; reason?: string }) =>
      mercadoPagoService.cancelSubscription(subscriptionId, reason),
    onSuccess: () => {
      toast({
        title: 'Suscripción Cancelada',
        description: 'Tu suscripción ha sido cancelada exitosamente',
        variant: 'default',
      });
      queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
      setShowCancelDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No pudimos cancelar tu suscripción',
        variant: 'destructive',
      });
    },
  });

  const rawSubscription = currentSubscription?.subscription;
  // Treat canceled/expired subscriptions as "no active plan" so we show the free state
  const INACTIVE_STATUSES = ['canceled', 'cancelled', 'expired'];
  const subscription = rawSubscription && !INACTIVE_STATUSES.includes(rawSubscription.status)
    ? rawSubscription
    : null;
  const plan = subscription ? currentSubscription?.plan : null;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { icon: any; color: string; bg: string; text: string }> = {
      active: {
        icon: CheckCircle,
        color: 'text-green-700',
        bg: 'bg-green-100',
        text: 'Activa',
      },
      trialing: {
        icon: Clock,
        color: 'text-blue-700',
        bg: 'bg-blue-100',
        text: 'Período de Prueba',
      },
      pending_payment: {
        icon: AlertCircle,
        color: 'text-yellow-700',
        bg: 'bg-yellow-100',
        text: 'Pago Pendiente',
      },
      past_due: {
        icon: AlertCircle,
        color: 'text-red-700',
        bg: 'bg-red-100',
        text: 'Pago Vencido',
      },
      canceled: {
        icon: XCircle,
        color: 'text-gray-700',
        bg: 'bg-gray-100',
        text: 'Cancelada',
      },
    };

    const config = statusConfig[status] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
        <Icon className="h-4 w-4 mr-1.5" />
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'ARS') => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const handleCancelClick = () => {
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = () => {
    if (subscription?.subscription_id) {
      cancelSubscription({
        subscriptionId: subscription.subscription_id,
        reason: cancelReason || undefined,
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
            <p className="mt-4 text-lg text-gray-600">Cargando suscripción...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!subscription) {
    return (
      <DashboardLayout>
        <div className="max-w-4xl mx-auto py-12 px-4">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No tienes una suscripción activa
            </h2>
            <p className="text-gray-600 mb-8">
              Selecciona un plan para comenzar a usar todas las funcionalidades
            </p>
            <Button
              onClick={() => navigate('/dashboard/pricing')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Ver Planes
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mi Suscripción</h1>
          <p className="mt-2 text-gray-600">
            Gestiona tu plan y revisa tu historial de pagos
          </p>
        </div>

        {/* Current Subscription Card */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {plan?.display_name || plan?.name || 'Plan Actual'}
                </h2>
                <p className="text-blue-100 mt-1">
                  {formatCurrency(subscription.amount, subscription.currency)} / {subscription.billing_cycle === 'monthly' ? 'mes' : 'año'}
                </p>
              </div>
              <div>
                {getStatusBadge(subscription.status)}
              </div>
            </div>
          </div>

          <div className="px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Period Info */}
              <div>
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <Calendar className="h-4 w-4 mr-2" />
                  Período Actual
                </div>
                <div className="text-sm font-medium text-gray-900">
                  {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                </div>
              </div>

              {/* Trial Info */}
              {subscription.status === 'trialing' && subscription.trial_end && (
                <div>
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <Clock className="h-4 w-4 mr-2" />
                    Prueba Termina
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatDate(subscription.trial_end)}
                  </div>
                </div>
              )}

              {/* Next Billing */}
              {subscription.status === 'active' && (
                <div>
                  <div className="flex items-center text-sm text-gray-600 mb-2">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Próximo Pago
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatDate(subscription.current_period_end)}
                  </div>
                </div>
              )}

              {/* Payment Gateway */}
              <div>
                <div className="flex items-center text-sm text-gray-600 mb-2">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Método de Pago
                </div>
                <div className="text-sm font-medium text-gray-900 capitalize">
                  {subscription.payment_gateway || 'MercadoPago'}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex gap-4">
              <Button
                onClick={() => navigate('/dashboard/pricing')}
                variant="outline"
                className="flex items-center"
              >
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Cambiar Plan
              </Button>

              {(subscription.status === 'active' || subscription.status === 'trialing') && (
                <Button
                  onClick={handleCancelClick}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Cancelar Suscripción
                </Button>
              )}

              {subscription.status === 'pending_payment' && (
                <>
                  <Button
                    onClick={() => navigate('/dashboard/pricing')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Completar Pago
                  </Button>
                  <Button
                    onClick={handleCancelClick}
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900">Historial de Pagos</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard/payments')}
            >
              Ver todo
            </Button>
          </div>

          {isLoadingPayments ? (
            <div className="px-8 py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Cargando pagos...</p>
            </div>
          ) : payments && payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Método
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Referencia
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment: any) => (
                    <tr key={payment.payment_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(payment.payment_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                        {payment.payment_method || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            payment.status === 'confirmed'
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {payment.status === 'confirmed' ? 'Confirmado' : payment.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {payment.reference_number || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-8 py-12 text-center">
              <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600">No hay pagos registrados</p>
            </div>
          )}
        </div>

        {/* Cancel Dialog */}
        {showCancelDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                ¿Cancelar Suscripción?
              </h3>
              <p className="text-gray-600 mb-6">
                Tu suscripción permanecerá activa hasta el final del período actual ({formatDate(subscription.current_period_end)}).
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cuéntanos por qué cancelas (opcional)
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Tu feedback nos ayuda a mejorar..."
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setShowCancelDialog(false)}
                  variant="outline"
                  className="flex-1"
                  disabled={isCanceling}
                >
                  Mantener Suscripción
                </Button>
                <Button
                  onClick={handleConfirmCancel}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={isCanceling}
                >
                  {isCanceling ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cancelando...
                    </>
                  ) : (
                    'Confirmar Cancelación'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
