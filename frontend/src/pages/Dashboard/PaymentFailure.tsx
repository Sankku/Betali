import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCcw, HelpCircle } from 'lucide-react';
import { mercadoPagoService } from '../../services/api/mercadoPagoService';
import { Button } from '../../components/ui/button';
import { DashboardLayout } from '../../components/layout/Dashboard';

export default function PaymentFailure() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const status = searchParams.get('status') || 'rejected';
  const subscriptionId = searchParams.get('subscription_id') || searchParams.get('external_reference');
  const paymentId = searchParams.get('payment_id');

  const statusInfo = mercadoPagoService.getStatusMessage(status);

  // Common rejection reasons
  const getRejectionHelp = () => {
    return [
      {
        title: 'Fondos Insuficientes',
        description: 'Verifica que tu tarjeta tenga saldo disponible'
      },
      {
        title: 'Datos Incorrectos',
        description: 'Revisa que los datos de tu tarjeta sean correctos'
      },
      {
        title: 'Límite Excedido',
        description: 'Puede que hayas alcanzado tu límite de compras'
      },
      {
        title: 'Tarjeta Vencida',
        description: 'Verifica la fecha de vencimiento de tu tarjeta'
      }
    ];
  };

  return (
    <DashboardLayout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Failure Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-white rounded-full p-4">
                  <XCircle className="h-16 w-16 text-red-500" />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {statusInfo.title}
              </h1>
              <p className="text-red-100 text-lg">
                {statusInfo.message}
              </p>
            </div>

            {/* Details */}
            <div className="p-8">
              {paymentId && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Detalles del Intento de Pago
                  </h2>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">ID de Pago:</span>
                      <span className="font-mono text-sm text-gray-900">{paymentId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Estado:</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {status === 'cancelled' ? 'Cancelado' : 'Rechazado'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Help Section */}
              {status === 'rejected' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                  <div className="flex items-start gap-3 mb-4">
                    <HelpCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Posibles Causas del Rechazo
                      </h3>
                      <p className="text-sm text-gray-600">
                        Aquí hay algunas razones comunes por las que un pago puede ser rechazado:
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getRejectionHelp().map((item, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 border border-yellow-100">
                        <h4 className="font-medium text-gray-900 text-sm mb-1">{item.title}</h4>
                        <p className="text-xs text-gray-600">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* What to Do Next */}
              <div className="bg-blue-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">¿Qué puedes hacer?</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">→</span>
                    <span>Verifica los datos de tu tarjeta y vuelve a intentarlo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">→</span>
                    <span>Intenta con otro método de pago</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">→</span>
                    <span>Contacta a tu banco para verificar que no haya restricciones</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 mt-0.5">→</span>
                    <span>Si el problema persiste, contáctanos para ayudarte</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => navigate('/pricing')}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Intentar Nuevamente
                </Button>
                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="flex-1"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver al Dashboard
                </Button>
              </div>

              {/* Support Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  ¿Necesitas ayuda?{' '}
                  <button
                    onClick={() => navigate('/contact')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Contacta a Soporte
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
