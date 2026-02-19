import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Loader2, ArrowRight, Home } from 'lucide-react';
import { mercadoPagoService } from '../../services/api/mercadoPagoService';
import { subscriptionService } from '../../services/api/subscriptionService';
import { Button } from '../../components/ui/button';
import { DashboardLayout } from '../../components/layout/Dashboard';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [verificationComplete, setVerificationComplete] = useState(false);

  const paymentId = searchParams.get('payment_id');
  const subscriptionId = searchParams.get('subscription_id') || searchParams.get('external_reference');
  const status = searchParams.get('status');

  // Fetch payment status
  const { data: paymentStatus, isLoading: isLoadingPayment } = useQuery({
    queryKey: ['payment-status', paymentId],
    queryFn: () => paymentId ? mercadoPagoService.getPaymentStatus(paymentId) : null,
    enabled: !!paymentId,
    retry: 3,
    retryDelay: 2000
  });

  // Fetch updated subscription
  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['subscription-verification', subscriptionId],
    queryFn: () => subscriptionService.getCurrentSubscription(),
    enabled: !!subscriptionId && !!paymentStatus,
    retry: 5,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000)
  });

  useEffect(() => {
    if (subscription?.subscription?.status === 'active') {
      setVerificationComplete(true);
      // Invalidate queries to refresh data across the app
      queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    }
  }, [subscription, queryClient]);

  const isLoading = isLoadingPayment || isLoadingSubscription;

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <div className="w-full max-w-2xl">
          {isLoading ? (
            // Loading State
            <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
              <div className="flex justify-center mb-6">
                <Loader2 className="h-16 w-16 text-green-500 animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Verificando tu pago...
              </h1>
              <p className="text-gray-600">
                Estamos confirmando tu pago con Mercado Pago. Esto puede tomar unos segundos.
              </p>
              <div className="mt-8 flex flex-col gap-2 text-sm text-gray-500">
                <div className="flex items-center justify-center gap-2">
                  {paymentId ? (
                    <span className="text-green-600">✓ Pago registrado</span>
                  ) : (
                    <span>○ Buscando información del pago...</span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2">
                  {paymentStatus ? (
                    <span className="text-green-600">✓ Estado del pago confirmado</span>
                  ) : (
                    <span>○ Verificando estado del pago...</span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2">
                  {verificationComplete ? (
                    <span className="text-green-600">✓ Suscripción activada</span>
                  ) : (
                    <span>○ Activando suscripción...</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // Success State
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              {/* Success Header */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-white rounded-full p-4">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  ¡Pago Exitoso!
                </h1>
                <p className="text-green-100 text-lg">
                  Tu suscripción ha sido activada correctamente
                </p>
              </div>

              {/* Payment Details */}
              <div className="p-8">
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Detalles del Pago
                  </h2>
                  <div className="space-y-3">
                    {paymentStatus && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">ID de Pago:</span>
                          <span className="font-mono text-sm text-gray-900">{paymentStatus.id}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Monto:</span>
                          <span className="font-semibold text-gray-900">
                            {mercadoPagoService.formatAmount(paymentStatus.amount, paymentStatus.currency)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Método de Pago:</span>
                          <span className="text-gray-900 capitalize">{paymentStatus.paymentMethod}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Estado:</span>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Aprobado
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Subscription Info */}
                {subscription?.subscription && (
                  <div className="bg-blue-50 rounded-lg p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Detalles de la Suscripción
                    </h2>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Plan:</span>
                        <span className="font-semibold text-gray-900">
                          {subscription.subscription.subscription_plans?.display_name || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Estado:</span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Activo
                        </span>
                      </div>
                      {subscription.subscription.next_billing_date && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Próximo Cobro:</span>
                          <span className="text-gray-900">
                            {new Date(subscription.subscription.next_billing_date).toLocaleDateString('es-AR', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Success Message */}
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-2">¿Qué sigue?</h3>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Ya tienes acceso a todas las funciones de tu plan</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Recibirás un email de confirmación con los detalles de tu suscripción</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>Puedes gestionar tu suscripción desde la sección de Facturación</span>
                    </li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Ir al Dashboard
                  </Button>
                  <Button
                    onClick={() => navigate('/dashboard/subscription')}
                    variant="outline"
                    className="flex-1"
                  >
                    Ver Mi Suscripción
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
