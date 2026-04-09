import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Copy, Edit, Package, User, MapPin, Calendar, FileText } from 'lucide-react';
import { Order } from '@/services/api/orderService';
import { getOrderStatusColor } from '@/hooks/useOrders';
import { useDuplicateOrder } from '@/hooks/useOrders';
import { useTranslation } from '@/contexts/LanguageContext';
import { useDateFormat } from '@/contexts/DateFormatContext';
import { OrderStatusBadge } from '@/components/features/orders/order-status-badge';

interface OrderDetailsProps {
  order: Order;
  onClose: () => void;
  onEdit?: () => void;
}

export function OrderDetails({ order, onClose, onEdit }: OrderDetailsProps) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const duplicateOrderMutation = useDuplicateOrder();

  // Guard clause - if no order, show error
  if (!order) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">{t('orders.details.errorNotAvailable')}</p>
      </div>
    );
  }

  const handleDuplicate = async () => {
    try {
      await duplicateOrderMutation.mutateAsync(order.order_id);
      onClose();
    } catch (error) {
      // Error handled by mutation hook
    }
  };

  const formatDate = (dateString: string) => formatDateTime(dateString);

  const statusColor = getOrderStatusColor(order.status);

  // Use tax_amount from DB, fallback to legacy tax field
  const displayTax = order.tax_amount ?? order.tax ?? 0;
  // Use total from DB, fallback to legacy total_price field
  const displayTotal = order.total ?? order.total_price ?? 0;

  return (
    <div className="space-y-6">
      {/* Order Header */}
      <div className="flex items-start justify-between ">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-800">
            {t('orders.modal.viewTitle', { id: order.order_id?.slice(-8).toUpperCase() || 'N/A' })}
          </h2>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1 ">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(order.order_date)}</span>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>
        </div>

        <div className="flex gap-2">
          {onEdit && (
            <Button onClick={onEdit} size="sm" className="flex items-center gap-2 text-gray-800">
              <Edit className="h-4 w-4" />
              {t('common.edit')}
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
            {duplicateOrderMutation.isPending
              ? t('orders.details.duplicating')
              : t('orders.details.duplicate')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Shipping Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t('orders.details.customerTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.clients ? (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('orders.details.nameLabel')}</p>
                      <p className="font-medium">{order.clients.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('orders.details.emailLabel')}</p>
                      <p className="text-sm break-all">{order.clients.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('orders.details.phoneLabel')}</p>
                      <p className="text-sm">{order.clients.phone}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">{t('orders.details.noCustomer')}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {t('orders.details.warehouseTitle')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.warehouse ? (
                  <>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('orders.details.nameLabel')}</p>
                      <p className="font-medium">{order.warehouse.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">{t('orders.details.locationLabel')}</p>
                      <p className="text-sm">{order.warehouse.location}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500">{t('orders.details.noWarehouse')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Items */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t('orders.details.itemsTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-gray-500">
                {order.order_details?.map((item, index) => (
                  <div
                    key={item.order_detail_id}
                    className="flex items-start justify-between gap-4 p-5 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-base mb-1">
                        {item.product_types?.name || item.products?.name || '—'}
                      </div>
                      {item.product_types?.sku && (
                        <div className="text-xs text-gray-400 font-mono mb-1">SKU: {item.product_types.sku}</div>
                      )}
                      {item.product_lots?.lot_number && (
                        <div className="text-sm text-gray-600">Lote: {item.product_lots.lot_number}</div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-medium text-base mb-1">
                        {item.quantity} × ${(item.price ?? 0).toFixed(2)}
                      </div>
                      <div className="text-lg font-bold">
                        ${(item.quantity * (item.price ?? 0)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )) || (
                  <p className="text-sm text-gray-500 py-8 text-center">
                    {t('orders.details.noItems')}
                  </p>
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
                  {t('orders.details.notesTitle')}
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
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">
                {t('orders.details.summaryTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm">{t('orders.details.subtotal')}</span>
                  <span className="text-base font-medium">${(order.subtotal ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm">{t('orders.details.tax')}</span>
                  <span className="text-base font-medium">${displayTax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center py-2">
                  <span className="text-base font-semibold text-gray-500">
                    {t('orders.details.total')}
                  </span>
                  <span className="text-xl font-bold text-green-600">
                    ${displayTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">
                {t('orders.details.timelineTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-1">{t('orders.details.orderCreated')}</p>
                    <p className="text-xs">{formatDate(order.created_at)}</p>
                  </div>
                </div>

                {order.updated_at !== order.created_at && (
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold mb-1">{t('orders.details.lastUpdated')}</p>
                      <p className="text-xs">{formatDate(order.updated_at)}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div
                    className={`w-2.5 h-2.5 bg-${statusColor}-500 rounded-full mt-1.5 flex-shrink-0`}
                  ></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold mb-1">{t('orders.details.currentStatus')}</p>
                    <p className="text-xs capitalize">
                      {order.status
                        ? t(`orders.status.${order.status}`)
                        : t('orders.details.unknown')}
                    </p>
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
          {t('common.close')}
        </Button>
      </div>
    </div>
  );
}
