import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Order } from '@/services/api/orderService';
import { getOrderStatusColor } from '@/hooks/useOrders';

interface OrderStatusBadgeProps {
  status: Order['status'];
  variant?: 'default' | 'outline';
}

export function OrderStatusBadge({ status, variant = 'outline' }: OrderStatusBadgeProps) {
  const color = getOrderStatusColor(status);
  
  const colorClasses = {
    gray: 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
    green: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
    red: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
  };

  return (
    <Badge variant={variant} className={colorClasses[color]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}