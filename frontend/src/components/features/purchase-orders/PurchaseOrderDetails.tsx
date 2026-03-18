import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Building, MapPin, Package, Calendar, FileText, Truck } from 'lucide-react';
import { PurchaseOrder, STATUS_LABELS, STATUS_COLORS } from '@/types/purchaseOrders';

interface PurchaseOrderDetailsProps {
  order: PurchaseOrder;
  onClose: () => void;
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-800 border-gray-200',
  yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  blue: 'bg-blue-100 text-blue-800 border-blue-200',
  orange: 'bg-orange-100 text-orange-800 border-orange-200',
  green: 'bg-green-100 text-green-800 border-green-200',
  red: 'bg-red-100 text-red-800 border-red-200',
};

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(dateString: string | null | undefined) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PurchaseOrderDetails({ order, onClose }: PurchaseOrderDetailsProps) {
  const statusColor = STATUS_COLORS[order.status] ?? 'gray';
  const statusLabel = STATUS_LABELS[order.status] ?? order.status;
  const badgeClass = STATUS_BADGE_CLASSES[statusColor] ?? STATUS_BADGE_CLASSES.gray;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">
            OC #{order.purchase_order_number || order.purchase_order_id.slice(-8).toUpperCase()}
          </h2>
          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>{formatDateTime(order.order_date)}</span>
            </div>
            <Badge className={badgeClass}>{statusLabel}</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier & Warehouse */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Proveedor
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {order.suppliers ? (
                  <>
                    <div>
                      <p className="text-xs text-neutral-500 mb-0.5">Nombre</p>
                      <p className="font-medium">{order.suppliers.name}</p>
                    </div>
                    {order.suppliers.email && (
                      <div>
                        <p className="text-xs text-neutral-500 mb-0.5">Email</p>
                        <p className="break-all">{order.suppliers.email}</p>
                      </div>
                    )}
                    {order.suppliers.phone && (
                      <div>
                        <p className="text-xs text-neutral-500 mb-0.5">Teléfono</p>
                        <p>{order.suppliers.phone}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-neutral-500">Sin proveedor asignado</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Almacén
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {order.warehouse ? (
                  <>
                    <div>
                      <p className="text-xs text-neutral-500 mb-0.5">Nombre</p>
                      <p className="font-medium">{order.warehouse.name}</p>
                    </div>
                    {(order.warehouse as any).location && (
                      <div>
                        <p className="text-xs text-neutral-500 mb-0.5">Ubicación</p>
                        <p>{(order.warehouse as any).location}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-neutral-500">Sin almacén asignado</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Delivery dates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Entrega esperada</p>
                <p>{formatDate(order.expected_delivery_date)}</p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 mb-0.5">Fecha de recepción</p>
                <p>{formatDate(order.received_date)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Package className="h-4 w-4" />
                Productos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {order.purchase_order_details && order.purchase_order_details.length > 0 ? (
                  order.purchase_order_details.map((detail) => (
                    <div
                      key={detail.detail_id}
                      className="flex items-start justify-between gap-4 p-4 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">
                          {detail.products?.name ?? detail.product_id}
                        </p>
                        {detail.products?.sku && (
                          <p className="text-xs text-neutral-500 mt-0.5">
                            SKU: {detail.products.sku}
                          </p>
                        )}
                        {detail.notes && (
                          <p className="text-xs text-neutral-400 mt-1 italic">{detail.notes}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0 text-sm">
                        <p className="text-neutral-500">
                          {detail.quantity} × ${(detail.unit_price ?? 0).toFixed(2)}
                        </p>
                        {detail.received_quantity > 0 && (
                          <p className="text-xs text-neutral-400">
                            Recibidos: {detail.received_quantity}
                          </p>
                        )}
                        <p className="font-bold mt-1">
                          ${(detail.line_total ?? detail.quantity * detail.unit_price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500 py-6 text-center">
                    Sin productos en esta orden
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Notas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-neutral-700">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: summary & timeline */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500">Subtotal</span>
                <span>${(order.subtotal ?? 0).toFixed(2)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento</span>
                  <span>−${order.discount_amount.toFixed(2)}</span>
                </div>
              )}
              {order.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Impuestos</span>
                  <span>${order.tax_amount.toFixed(2)}</span>
                </div>
              )}
              {order.shipping_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-neutral-500">Envío</span>
                  <span>${order.shipping_amount.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-green-600">${(order.total ?? 0).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Historial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Creada</p>
                  <p className="text-xs text-neutral-500">{formatDateTime(order.created_at)}</p>
                </div>
              </div>
              {order.updated_at !== order.created_at && (
                <div className="flex items-start gap-3">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Última actualización</p>
                    <p className="text-xs text-neutral-500">{formatDateTime(order.updated_at)}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <div className={`w-2.5 h-2.5 bg-${statusColor}-500 rounded-full mt-1.5 flex-shrink-0`} />
                <div>
                  <p className="font-medium">Estado actual</p>
                  <p className="text-xs text-neutral-500">{statusLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={onClose} variant="outline">
          Cerrar
        </Button>
      </div>
    </div>
  );
}
