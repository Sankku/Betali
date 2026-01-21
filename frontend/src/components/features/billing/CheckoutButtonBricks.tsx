import { useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { PaymentModal } from './PaymentModal';
import { Button } from '../../ui/button';

interface CheckoutButtonBricksProps {
  subscriptionId: string;
  planId: string;
  planName: string;
  amount: number;
  billingCycle: 'monthly' | 'yearly';
  currency?: 'ARS' | 'USD' | 'BRL' | 'MXN' | 'CLP' | 'COP' | 'PEN' | 'UYU';
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'outline';
  fullWidth?: boolean;
  children?: React.ReactNode;
}

/**
 * CheckoutButtonBricks - Opens payment modal with Mercado Pago Bricks
 *
 * This version uses Checkout Bricks for in-page payment processing
 */
export function CheckoutButtonBricks({
  subscriptionId,
  planId,
  planName,
  amount,
  billingCycle,
  currency = 'ARS',
  disabled = false,
  variant = 'primary',
  fullWidth = false,
  children
}: CheckoutButtonBricksProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    if (amount === 0) {
      return;
    }
    setIsModalOpen(true);
  };

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
    <>
      <Button
        onClick={handleOpenModal}
        disabled={disabled}
        className={getButtonStyles()}
      >
        {children ? (
          children
        ) : (
          <span className="flex items-center justify-center gap-2">
            <CreditCard className="h-4 w-4" />
            {amount === 0 ? 'Plan Gratuito' : 'Pagar Ahora'}
          </span>
        )}
      </Button>

      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        subscriptionId={subscriptionId}
        planId={planId}
        planName={planName}
        amount={amount}
        billingCycle={billingCycle}
        currency={currency}
      />
    </>
  );
}
