import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Copy, Edit, Package, User, MapPin, Calendar, FileText } from 'lucide-react';
import { Order } from '@/services/api/orderService';
import { getOrderStatusColor } from '@/hooks/useOrders';
import { useDuplicateOrder } from '@/hooks/useOrders';

interface OrderDetailsProps {
  order: Order;
  onClose: () => void;
  onEdit?: () => void;
}

export function OrderDetails({ order, onClose, onEdit }: OrderDetailsProps) {
  const duplicateOrderMutation = useDuplicateOrder();

  const handleDuplicate = async () => {
    try {
      await duplicateOrderMutation.mutateAsync(order.order_id);
      onClose();
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusColor = getOrderStatusColor(order.status);

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Order #{order.order_id.slice(-8).toUpperCase()}</h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(order.order_date)}</span>
            </div>
            <Badge className={`bg-${statusColor}-100 text-${statusColor}-800 border-${statusColor}-200`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </Badge>
          </div>
        </div>
        
        <div className="flex gap-2">
          {onEdit && (
            <Button onClick={onEdit} size="sm" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          )}
          <Button
            onClick={handleDuplicate}
            disabled={duplicateOrderMutation.isPending}
            size="sm"
            variant="outline"
            className="flex items-center gap-2"
          >
            <Copy className="h-4 w-4" />
            {duplicateOrderMutation.isPending ? 'Duplicating...' : 'Duplicate'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Shipping Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.clients ? (
                  <div className="space-y-2">
                    <p className="font-medium">{order.clients.name}</p>
                    <p className="text-sm text-gray-600">{order.clients.email}</p>
                    <p className="text-sm text-gray-600">{order.clients.phone}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No customer assigned</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Warehouse
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.warehouse ? (
                  <div className="space-y-2">
                    <p className="font-medium">{order.warehouse.name}</p>
                    <p className="text-sm text-gray-600">{order.warehouse.location}</p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No warehouse assigned</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.order_details?.map((item, index) => (
                  <div key={item.order_detail_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{item.products?.name}</div>
                      <div className="text-sm text-gray-600">
                        SKU: {item.products?.sku}
                      </div>
                      {item.products?.description && (
                        <div className="text-sm text-gray-500 mt-1">
                          {item.products.description}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {item.quantity} × ${(item.price ?? 0).toFixed(2)}
                      </div>
                      <div className="text-sm font-semibold">
                        ${(item.quantity * (item.price ?? 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )) || (
                  <p className="text-sm text-gray-500">No items in this order</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${(order.subtotal ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>${(order.tax ?? 0).toFixed(2)}</span>
                </div>
                <hr className="border-t border-gray-200" />
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span>${(order.total_price ?? 0).toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium">Order Created</p>
                    <p className="text-xs text-gray-600">{formatDate(order.created_at)}</p>
                  </div>
                </div>
                
                {order.updated_at !== order.created_at && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-xs text-gray-600">{formatDate(order.updated_at)}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 bg-${statusColor}-500 rounded-full`}></div>
                  <div>
                    <p className="text-sm font-medium">Current Status</p>
                    <p className="text-xs text-gray-600 capitalize">{order.status}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Close Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      </div>
    </div>
  );
}