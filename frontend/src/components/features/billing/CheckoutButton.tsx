import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, CreditCard } from 'lucide-react';
import { mercadoPagoService } from '../../../services/api/mercadoPagoService';
import { Button } from '../../ui/button';
import { useToast } from '../../../hooks/useToast';

interface CheckoutButtonProps {
  subscriptionId: string;
  planId: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  currency?: 'ARS' | 'USD' | 'BRL' | 'MXN' | 'CLP' | 'COP' | 'PEN' | 'UYU';
  planName?: string;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'outline';
  fullWidth?: boolean;
  children?: React.ReactNode;
}

export function CheckoutButton({
  subscriptionId,
  planId,
  amount,
  billingCycle,
  currency = 'ARS',
  planName,
  disabled = false,
  variant = 'primary',
  fullWidth = false,
  children
}: CheckoutButtonProps) {
  const { toast } = useToast();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { mutate: initiateCheckout, isPending } = useMutation({
    mutationFn: async () => {
      const checkout = await mercadoPagoService.createCheckout({
        subscriptionId,
        planId,
        billingCycle,
        currency
      });
      return checkout;
    },
    onSuccess: (checkout) => {
      // Show success toast
      toast({
        title: 'Redirigiendo a Mercado Pago',
        description: 'Serás redirigido al checkout seguro de Mercado Pago.',
        variant: 'default'
      });

      // Redirect to Mercado Pago after a short delay
      setIsRedirecting(true);
      setTimeout(() => {
        mercadoPagoService.redirectToCheckout(checkout.initPoint);
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: 'Error al iniciar el pago',
        description:
          error.response?.data?.message ||
          'No pudimos iniciar el proceso de pago. Por favor, intenta nuevamente.',
        variant: 'destructive'
      });
    }
  });

  const handleClick = () => {
    if (amount === 0) {
      toast({
        title: 'Plan gratuito',
        description: 'Este plan no requiere pago.',
        variant: 'default'
      });
      return;
    }

    initiateCheckout();
  };

  const isLoading = isPending || isRedirecting;

  const getButtonStyles = () => {
    const baseStyles = fullWidth ? 'w-full' : '';
    const variantStyles = {
      default: 'bg-gray-900 hover:bg-gray-800 text-white',
      primary: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg',
      outline: 'border-2 border-green-500 text-green-600 hover:bg-green-50'
    };

    return `${baseStyles} ${variantStyles[variant]}`;
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={getButtonStyles()}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {isRedirecting ? 'Redirigiendo...' : 'Procesando...'}
        </span>
      ) : children ? (
        children
      ) : (
        <span className="flex items-center justify-center gap-2">
          <CreditCard className="h-4 w-4" />
          {amount === 0 ? 'Plan Gratuito' : `Pagar ${mercadoPagoService.formatAmount(amount, currency)}`}
        </span>
      )}
    </Button>
  );
}
