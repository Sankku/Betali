import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle, Loader2, ArrowRight, LayoutDashboard, Check, CreditCard, Calendar } from 'lucide-react';
import { mercadoPagoService } from '../../services/api/mercadoPagoService';
import { subscriptionService } from '../../services/api/subscriptionService';
import { Button } from '../../components/ui/button';
import { DashboardLayout } from '../../components/layout/Dashboard';

export default function PaymentSuccess() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const queryClient     = useQueryClient();
  const [verificationComplete, setVerificationComplete] = useState(false);

  const paymentId      = searchParams.get('payment_id');
  const subscriptionId = searchParams.get('subscription_id') || searchParams.get('external_reference');

  const { data: paymentStatus, isLoading: isLoadingPayment } = useQuery({
    queryKey: ['payment-status', paymentId],
    queryFn:  () => paymentId ? mercadoPagoService.getPaymentStatus(paymentId) : null,
    enabled:  !!paymentId,
    retry: 3,
    retryDelay: 2000,
  });

  const { data: subscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['subscription-verification', subscriptionId],
    queryFn:  () => subscriptionService.getCurrentSubscription(),
    enabled:  !!subscriptionId && !!paymentStatus,
    retry: 5,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 10000),
  });

  useEffect(() => {
    if (subscription?.subscription?.status === 'active') {
      setVerificationComplete(true);
      queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
    }
  }, [subscription, queryClient]);

  const isLoading  = isLoadingPayment || isLoadingSubscription;
  const planName   = subscription?.subscription?.subscription_plans?.display_name;
  const nextBilling = subscription?.subscription?.next_billing_date;

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-neutral-50 p-4">
        <div className="w-full max-w-lg">

          {isLoading ? (
            /* ── Loading ── */
            <div className="bg-white modal-card rounded-2xl shadow-xl p-10 text-center">
              <Loader2 className="h-12 w-12 text-green-500 animate-spin mx-auto mb-4" />
              <h1 className="text-xl font-bold text-neutral-900 mb-2">Verificando tu pago…</h1>
              <p className="text-sm text-neutral-600 mb-6">
                Confirmando con Mercado Pago. Un momento.
              </p>
              <div className="space-y-2 text-sm">
                <Step done={!!paymentId}       label="Pago registrado" />
                <Step done={!!paymentStatus}   label="Estado del pago confirmado" />
                <Step done={verificationComplete} label="Suscripción activada" />
              </div>
            </div>

          ) : (
            /* ── Success ── */
            <div className="bg-white modal-card rounded-2xl shadow-xl overflow-hidden">

              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-8 text-center">
                <div className="inline-flex items-center justify-center bg-white/20 rounded-full p-3 mb-3">
                  <CheckCircle className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">¡Pago Exitoso!</h1>
                <p className="text-green-100 text-sm mt-1">Tu suscripción ha sido activada correctamente</p>
              </div>

              {/* Details grid */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">

                  {/* Payment details */}
                  <div className="col-span-2 bg-neutral-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5" /> Pago
                    </p>
                    <div className="space-y-2">
                      {paymentStatus && (
                        <>
                          <Row label="ID" value={
                            <span className="font-mono text-xs">{paymentStatus.id}</span>
                          } />
                          <Row label="Monto" value={
                            <span className="font-semibold">
                              {mercadoPagoService.formatAmount(paymentStatus.amount, paymentStatus.currency)}
                            </span>
                          } />
                          <Row label="Método" value={
                            <span className="capitalize">{paymentStatus.paymentMethod}</span>
                          } />
                          <Row label="Estado" value={
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <Check className="h-3 w-3" /> Aprobado
                            </span>
                          } />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Subscription details */}
                  {subscription?.subscription && (
                    <div className="col-span-2 bg-neutral-100 rounded-xl p-4">
                      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" /> Suscripción
                      </p>
                      <div className="space-y-2">
                        {planName && (
                          <Row label="Plan" value={<span className="font-semibold">{planName}</span>} />
                        )}
                        <Row label="Estado" value={
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="h-3 w-3" /> Activo
                          </span>
                        } />
                        {nextBilling && (
                          <Row label="Próximo cobro" value={
                            new Date(nextBilling).toLocaleDateString('es-AR', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })
                          } />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <Button
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                  >
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Ir al Dashboard
                  </Button>
                  <Button
                    onClick={() => navigate('/dashboard/subscription')}
                    variant="outline"
                    className="flex-1"
                  >
                    Mi Suscripción
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

/* ── tiny helpers ── */
function Step({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-sm">
      {done
        ? <span className="text-green-500 font-medium">✓ {label}</span>
        : <span className="text-neutral-400">○ {label}</span>
      }
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-600">{label}:</span>
      <span className="text-neutral-900">{value}</span>
    </div>
  );
}
