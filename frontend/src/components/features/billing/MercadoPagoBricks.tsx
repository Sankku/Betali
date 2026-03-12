import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle, X } from 'lucide-react';
import { httpClient } from '../../../services/http/httpClient';

interface MercadoPagoBricksProps {
  amount: number;
  currency: string;
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentError: (error: any) => void;
  publicKey: string;
  subscriptionId: string;
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}

// Human-readable messages for MP rejection codes
const REJECTION_MESSAGES: Record<string, string> = {
  cc_rejected_insufficient_amount:   'Saldo insuficiente. Revisá tu cuenta o usá otra tarjeta.',
  cc_rejected_bad_filled_card_number:'Número de tarjeta incorrecto. Revisá y volvé a intentar.',
  cc_rejected_bad_filled_date:       'Fecha de vencimiento incorrecta.',
  cc_rejected_bad_filled_security_code: 'Código de seguridad incorrecto.',
  cc_rejected_bad_filled_other:      'Datos de tarjeta incorrectos. Revisá la información ingresada.',
  cc_rejected_blacklist:             'Esta tarjeta no puede ser procesada. Probá con otra.',
  cc_rejected_call_for_authorize:    'Llamá a tu banco para autorizar el pago e intentá de nuevo.',
  cc_rejected_duplicated_payment:    'Pago duplicado detectado. Esperá unos minutos e intentá de nuevo.',
  cc_rejected_high_risk:             'Pago rechazado por seguridad. Probá con otra tarjeta.',
  cc_rejected_max_attempts:          'Superaste el límite de intentos. Esperá un rato antes de reintentar.',
  cc_rejected_other_reason:          'Tu banco rechazó el pago. Contactate con ellos o probá otra tarjeta.',
};

function getRejectionMessage(statusDetail: string): string {
  return REJECTION_MESSAGES[statusDetail] ?? 'El pago fue rechazado. Revisá los datos e intentá nuevamente.';
}

/**
 * MercadoPagoBricks - Payment form using Mercado Pago Checkout Bricks
 *
 * Error handling:
 * - SDK/init errors  → fatalError state  → full replacement UI (requires page reload)
 * - Payment rejected → paymentError state → inline dismissible banner + brick reinit (no reload)
 */
export function MercadoPagoBricks({
  amount,
  currency,
  onPaymentSuccess,
  onPaymentError,
  publicKey,
  subscriptionId
}: MercadoPagoBricksProps) {
  const [isLoading, setIsLoading]     = useState(true);
  const [fatalError, setFatalError]   = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  // Incrementing retryKey triggers the effect to unmount+recreate the brick
  const [retryKey, setRetryKey]       = useState(0);

  const paymentBrickController = useRef<any>(null);
  const containerRef           = useRef<HTMLDivElement>(null);

  // Keep callback refs stable so we don't re-create the brick on every parent render
  const onSuccessRef = useRef(onPaymentSuccess);
  const onErrorRef   = useRef(onPaymentError);
  useEffect(() => {
    onSuccessRef.current = onPaymentSuccess;
    onErrorRef.current   = onPaymentError;
  });

  useEffect(() => {
    setIsLoading(true);

    const loadMercadoPagoSDK = () => {
      if (window.MercadoPago) {
        initializeBrick();
        return;
      }
      const script    = document.createElement('script');
      script.src      = 'https://sdk.mercadopago.com/js/v2';
      script.async    = true;
      script.onload   = () => initializeBrick();
      script.onerror  = () => {
        setFatalError('No se pudo cargar Mercado Pago. Revisá tu conexión y recargá la página.');
        setIsLoading(false);
      };
      document.body.appendChild(script);
    };

    const initializeBrick = async () => {
      try {
        const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark';
        const mp           = new window.MercadoPago(publicKey, { locale: 'es-AR' });
        const bricksBuilder = mp.bricks();

        const settings = {
          initialization: { amount },
          customization: {
            visual: {
              style: { theme: isDarkMode ? 'dark' : 'default' }
            },
            paymentMethods: {
              creditCard:       'all',
              debitCard:        'all',
              maxInstallments:  12
            }
          },
          callbacks: {
            onReady: () => {
              setIsLoading(false);
            },

            onSubmit: async (formData: any) => {
              try {
                setIsLoading(true);
                setPaymentError(null);

                const result = await httpClient.post<{
                  success: boolean;
                  data: { paymentId: string; status: string; statusDetail: string };
                }>('/api/mercadopago/process-payment', {
                  paymentData:    formData,
                  subscriptionId,
                  amount,
                  currency
                });

                if (result.success && result.data.status === 'approved') {
                  // Payment confirmed — activate subscription and go to success page
                  onSuccessRef.current(result.data.paymentId);
                } else if (
                  result.data.status === 'in_process' ||
                  result.data.status === 'pending'
                ) {
                  // Cash / bank-transfer payments: submitted but not yet credited.
                  // The subscription stays pending_payment until the webhook confirms it.
                  // Do NOT call onPaymentSuccess — the user is NOT subscribed yet.
                  setIsLoading(false);
                  setPaymentError(
                    'Tu pago fue recibido y está siendo procesado. ' +
                    'Recibirás un email cuando se acredite y tu suscripción se active.'
                  );
                } else if (result.data.status === 'rejected') {
                  // Non-fatal: show inline banner + reinit brick so user can correct and retry
                  const msg = getRejectionMessage(result.data.statusDetail);
                  setPaymentError(msg);
                  onErrorRef.current(new Error(msg));
                  setIsLoading(false);
                  setRetryKey(k => k + 1);
                }
              } catch (error) {
                console.error('Error processing payment:', error);
                setPaymentError('Error de conexión. Revisá tu internet e intentá nuevamente.');
                onErrorRef.current(error);
                setIsLoading(false);
                setRetryKey(k => k + 1);
              }
            },

            onError: (error: any) => {
              console.error('Payment Brick SDK error:', error);
              // MP Brick sends non_critical errors for validation issues
              // (e.g. unknown BIN, missing payment info). These are handled
              // inline by the Brick itself — don't replace the form.
              if (error?.type === 'non_critical') return;
              // Only truly unrecoverable errors reach here
              setFatalError('Error al cargar el formulario de pago. Por favor, recargá la página.');
            },
          },
        };

        paymentBrickController.current = await bricksBuilder.create(
          'payment',
          'mercadopago-brick-container',
          settings
        );
      } catch (error) {
        console.error('Error initializing Mercado Pago Payment Brick:', error);
        setFatalError('Error al cargar el formulario de pago. Por favor, recargá la página.');
        setIsLoading(false);
      }
    };

    loadMercadoPagoSDK();

    return () => {
      if (paymentBrickController.current) {
        paymentBrickController.current.unmount();
        paymentBrickController.current = null;
      }
    };
    // retryKey is intentional: incrementing it recreates the brick after rejection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, currency, publicKey, subscriptionId, retryKey]);

  // ── Fatal SDK error ── requires page reload, show full replacement
  if (fatalError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <AlertCircle className="h-5 w-5 text-red-600 mx-auto mb-2" />
        <p className="text-red-800 text-sm">{fatalError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium cursor-pointer"
        >
          Recargar página
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* ── Non-invasive inline rejection banner ── dismissible, above the form */}
      {paymentError && (
        <div className="mb-3 flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 flex-1">{paymentError}</p>
          <button
            onClick={() => setPaymentError(null)}
            className="text-red-400 hover:text-red-600 transition-colors shrink-0 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              {retryKey > 0 ? 'Reiniciando formulario...' : 'Cargando formulario de pago...'}
            </p>
          </div>
        </div>
      )}

      {/* Mercado Pago Brick will render here */}
      <div id="mercadopago-brick-container" ref={containerRef} />
    </div>
  );
}
