import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { mercadoPagoService, Payment } from '@/services/api/mercadoPagoService';
import { subscriptionService } from '@/services/api/subscriptionService';
import { toast } from '@/lib/toast';

const PaymentHistory: React.FC = () => {
  const navigate = useNavigate();

  // Get current subscription
  const { data: currentSubscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: () => subscriptionService.getCurrentSubscription()
  });

  const subscriptionId = currentSubscription?.subscription?.subscription_id;

  // Get payment history
  const { data: payments, isLoading: isLoadingPayments, error } = useQuery({
    queryKey: ['payment-history', subscriptionId],
    queryFn: () => mercadoPagoService.getSubscriptionPayments(subscriptionId!),
    enabled: !!subscriptionId
  });

  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      await mercadoPagoService.downloadReceipt(paymentId);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Error al descargar el recibo. Por favor intenta de nuevo.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    };

    const labels: Record<string, string> = {
      confirmed: 'Confirmado',
      pending: 'Pendiente',
      failed: 'Fallido'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      'credit_card': 'Tarjeta de Credito',
      'debit_card': 'Tarjeta de Debito',
      'bank_transfer': 'Transferencia',
      'mercadopago': 'MercadoPago',
      'cash': 'Efectivo'
    };
    return labels[method] || method || 'MercadoPago';
  };

  if (isLoadingSubscription || isLoadingPayments) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!subscriptionId) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay suscripcion activa</h3>
            <p className="mt-1 text-sm text-gray-500">
              Necesitas una suscripcion para ver el historial de pagos.
            </p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/dashboard/pricing')}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Ver Planes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard/subscription')}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver a Suscripcion
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Historial de Pagos</h1>
          <p className="mt-1 text-sm text-gray-600">
            Revisa todos tus pagos y descarga los recibos.
          </p>
        </div>

        {/* Summary Card */}
        {payments && payments.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Total de pagos</p>
                <p className="text-2xl font-semibold text-gray-900">{payments.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pagos confirmados</p>
                <p className="text-2xl font-semibold text-green-600">
                  {payments.filter(p => p.status === 'confirmed').length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Monto total pagado</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {formatCurrency(
                    payments
                      .filter(p => p.status === 'confirmed')
                      .reduce((sum, p) => sum + p.amount, 0),
                    payments[0]?.currency || 'ARS'
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {error ? (
            <div className="p-6 text-center">
              <p className="text-red-600">Error al cargar el historial de pagos</p>
            </div>
          ) : !payments || payments.length === 0 ? (
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay pagos registrados</h3>
              <p className="mt-1 text-sm text-gray-500">
                Los pagos apareceran aqui una vez que realices tu primera compra.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {/* Table Header */}
              <div className="bg-gray-50 px-6 py-3 hidden sm:grid sm:grid-cols-5 gap-4">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</span>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Metodo</span>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</span>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</span>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Acciones</span>
              </div>

              {/* Table Rows */}
              {payments.map((payment) => (
                <div key={payment.payment_id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="sm:grid sm:grid-cols-5 sm:gap-4 sm:items-center">
                    {/* Date */}
                    <div className="mb-2 sm:mb-0">
                      <p className="text-sm font-medium text-gray-900">
                        {formatDate(payment.payment_date)}
                      </p>
                      <p className="text-xs text-gray-500 sm:hidden">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </p>
                    </div>

                    {/* Method */}
                    <div className="hidden sm:block">
                      <p className="text-sm text-gray-900">{getPaymentMethodLabel(payment.payment_method)}</p>
                      {payment.reference_number && (
                        <p className="text-xs text-gray-500">Ref: {payment.reference_number}</p>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="mb-2 sm:mb-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(payment.amount, payment.currency)}
                      </p>
                    </div>

                    {/* Status */}
                    <div className="mb-2 sm:mb-0">
                      {getStatusBadge(payment.status)}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end space-x-2">
                      {payment.status === 'confirmed' && (
                        <button
                          onClick={() => handleDownloadReceipt(payment.payment_id)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Recibo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Notes (if any) */}
                  {payment.notes && (
                    <div className="mt-2 text-xs text-gray-500">
                      <span className="font-medium">Nota:</span> {payment.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Necesitas ayuda?
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Si tienes alguna pregunta sobre tus pagos o necesitas una factura, contactanos a{' '}
                  <a href="mailto:soporte@betali.app" className="font-medium underline">
                    soporte@betali.app
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentHistory;
