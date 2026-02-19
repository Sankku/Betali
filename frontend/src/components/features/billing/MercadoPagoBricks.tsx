import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
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

/**
 * MercadoPagoBricks - Payment form using Mercado Pago Checkout Bricks
 *
 * This component loads the MP SDK and renders the payment brick
 */
export function MercadoPagoBricks({
  amount,
  currency,
  onPaymentSuccess,
  onPaymentError,
  publicKey,
  subscriptionId
}: MercadoPagoBricksProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const paymentBrickController = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load Mercado Pago SDK
    const loadMercadoPagoSDK = () => {
      if (window.MercadoPago) {
        initializeBrick();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      script.onload = () => initializeBrick();
      script.onerror = () => {
        setError('Failed to load Mercado Pago SDK');
        setIsLoading(false);
      };
      document.body.appendChild(script);
    };

    const initializeBrick = async () => {
      try {
        // Initialize Mercado Pago instance
        const mp = new window.MercadoPago(publicKey, {
          locale: 'es-AR'
        });

        // Create Payment Brick (processes payment directly in the page)
        const bricksBuilder = mp.bricks();

        const settings = {
          initialization: {
            amount: amount,
          },
          customization: {
            visual: {
              style: {
                theme: 'default'
              }
            },
            paymentMethods: {
              creditCard: 'all',
              debitCard: 'all',
              maxInstallments: 12
            }
          },
          callbacks: {
            onReady: () => {
              setIsLoading(false);
            },
            onSubmit: async (formData: any) => {
              try {
                setIsLoading(true);

                // Send payment data to our backend
                const result = await httpClient.post<{ success: boolean; data: { paymentId: string; status: string; statusDetail: string } }>(
                  '/api/mercadopago/process-payment',
                  {
                    paymentData: formData,
                    subscriptionId: subscriptionId,
                    amount: amount,
                    currency: currency
                  }
                );

                if (result.success && result.data.status === 'approved') {
                  onPaymentSuccess(result.data.paymentId);
                } else if (result.data.status === 'rejected') {
                  onPaymentError(new Error('Pago rechazado'));
                  setIsLoading(false);
                } else {
                  // Pending or in_process
                  onPaymentSuccess(result.data.paymentId);
                }

              } catch (error) {
                console.error('Error processing payment:', error);
                onPaymentError(error);
                setIsLoading(false);
              }
            },
            onError: (error: any) => {
              console.error('Payment Brick error:', error);
              setError('Error en el formulario de pago');
              onPaymentError(error);
            },
          },
        };

        // Render the Payment brick
        paymentBrickController.current = await bricksBuilder.create(
          'payment',
          'mercadopago-brick-container',
          settings
        );

      } catch (error) {
        console.error('Error initializing Mercado Pago Payment Brick:', error);
        setError('Error al cargar el formulario de pago');
        setIsLoading(false);
      }
    };

    loadMercadoPagoSDK();

    // Cleanup
    return () => {
      if (paymentBrickController.current) {
        paymentBrickController.current.unmount();
      }
    };
  }, [amount, currency, publicKey, subscriptionId, onPaymentSuccess, onPaymentError]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
        <p className="text-red-800 text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-red-600 hover:text-red-700 text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Cargando formulario de pago...</p>
          </div>
        </div>
      )}

      {/* Mercado Pago Brick will render here */}
      <div id="mercadopago-brick-container" ref={containerRef} />
    </div>
  );
}
