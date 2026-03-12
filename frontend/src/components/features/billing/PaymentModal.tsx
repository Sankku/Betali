import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, CreditCard, Lock } from 'lucide-react';
import { MercadoPagoBricks } from './MercadoPagoBricks';
import { mercadoPagoService } from '../../../services/api/mercadoPagoService';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../../hooks/useToast';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionId: string;
  planId: string;
  planName: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  currency: string;
}

export function PaymentModal({
  isOpen,
  onClose,
  subscriptionId,
  planId,
  planName,
  amount,
  billingCycle,
  currency
}: PaymentModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get public key from env
  const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || '';

  const handlePaymentSuccess = async (paymentId: string) => {
    toast({
      title: '¡Pago exitoso!',
      description: 'Tu suscripción está siendo activada...',
      variant: 'default'
    });

    // Invalidate subscription queries
    queryClient.invalidateQueries({ queryKey: ['current-subscription'] });
    queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });

    // Close modal and redirect
    onClose();
    navigate(`/payment/success?payment_id=${paymentId}&subscription_id=${subscriptionId}`);
  };

  const handlePaymentError = (error: any) => {
    toast({
      title: 'Error en el pago',
      description: error.message || 'Hubo un problema procesando tu pago',
      variant: 'destructive'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-neutral-200 modal-card">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    Completar Pago
                  </h2>
                  <p className="text-sm text-gray-600">
                    Plan {planName} - {mercadoPagoService.formatAmount(amount, currency)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {/* Security notice */}
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <Lock className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">
                  Pago seguro con Mercado Pago
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Tu información está protegida con encriptación de nivel bancario.
                  No guardamos tus datos de tarjeta.
                </p>
              </div>
            </div>

            {/* Payment summary */}
            <div className="mb-6 bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Resumen del Pago
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Plan:</span>
                  <span className="font-medium text-gray-900">{planName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ciclo de facturación:</span>
                  <span className="font-medium text-gray-900">
                    {billingCycle === 'monthly' ? 'Mensual' : 'Anual'}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total a pagar:</span>
                    <span className="font-bold text-xl text-gray-900">
                      {mercadoPagoService.formatAmount(amount, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Brick */}
            <MercadoPagoBricks
              amount={amount}
              currency={currency}
              onPaymentSuccess={handlePaymentSuccess}
              onPaymentError={handlePaymentError}
              publicKey={publicKey}
              subscriptionId={subscriptionId}
            />
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-2xl">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                <span>Conexión segura SSL</span>
              </div>
              <div className="flex items-center gap-4">
                <img
                  src="https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg"
                  alt="Mercado Pago"
                  className="h-6"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
