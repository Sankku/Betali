import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, XCircle, Package, Warehouse } from 'lucide-react';
import { alertService, AlertWithDetails } from '../../../services/alertService';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { toast } from '../../../lib/toast';

const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
};

const SEVERITY_ICONS = {
  critical: XCircle,
  high: AlertTriangle,
  medium: AlertTriangle,
  low: AlertTriangle,
};

const ALERT_TYPE_LABELS = {
  low_stock: 'Low Stock',
  out_of_stock: 'Out of Stock',
  overstock: 'Overstock',
  expiring_soon: 'Expiring Soon',
};

interface AlertsWidgetProps {
  maxAlerts?: number;
  showDismissButton?: boolean;
  className?: string;
}

export function AlertsWidget({
  maxAlerts = 5,
  showDismissButton = true,
  className = ''
}: AlertsWidgetProps) {
  const queryClient = useQueryClient();

  // Fetch active alerts
  const { data: alerts = [], isLoading, error } = useQuery<AlertWithDetails[]>({
    queryKey: ['alerts', 'active'],
    queryFn: () => alertService.getActiveAlerts(),
    refetchInterval: 60000, // Refetch every minute
  });

  // Dismiss alert mutation
  const dismissMutation = useMutation({
    mutationFn: (alertId: string) => alertService.dismissAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert dismissed successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to dismiss alert');
    },
  });

  const handleDismiss = (alertId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dismissMutation.mutate(alertId);
  };

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Inventory Alerts</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-red-600">
            <AlertTriangle className="inline w-5 h-5 mr-2" />
            Error Loading Alerts
          </h3>
        </div>
        <p className="text-sm text-gray-600">
          {error instanceof Error ? error.message : 'Failed to load alerts'}
        </p>
      </Card>
    );
  }

  const displayedAlerts = alerts.slice(0, maxAlerts);
  const hasMoreAlerts = alerts.length > maxAlerts;

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <h3 className="text-lg font-semibold">Inventory Alerts</h3>
          {alerts.length > 0 && (
            <span className="px-2 py-1 text-xs font-semibold text-white bg-red-600 rounded-full">
              {alerts.length}
            </span>
          )}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle className="w-12 h-12 mb-3 text-green-500" />
          <p className="text-sm font-medium text-gray-700">All Clear!</p>
          <p className="text-xs text-gray-500 mt-1">
            No active inventory alerts at this time
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedAlerts.map((alert) => {
            const SeverityIcon = SEVERITY_ICONS[alert.severity];
            const severityColor = SEVERITY_COLORS[alert.severity];

            return (
              <div
                key={alert.alert_id}
                className={`border rounded-lg p-3 ${severityColor} transition-all hover:shadow-md`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <SeverityIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide">
                          {ALERT_TYPE_LABELS[alert.alert_type]}
                        </span>
                        <span className="text-xs opacity-75">
                          {alert.severity}
                        </span>
                      </div>

                      <p className="text-sm font-medium line-clamp-2">
                        {alert.message}
                      </p>

                      <div className="flex items-center gap-4 mt-2 text-xs opacity-75">
                        {alert.products && (
                          <div className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            <span className="truncate max-w-[150px]">
                              {alert.products.name}
                            </span>
                          </div>
                        )}
                        {alert.warehouse && (
                          <div className="flex items-center gap-1">
                            <Warehouse className="w-3 h-3" />
                            <span className="truncate max-w-[100px]">
                              {alert.warehouse.name}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-2 text-xs opacity-75">
                        Stock: {alert.current_stock}
                        {alert.min_stock && ` / Min: ${alert.min_stock}`}
                      </div>
                    </div>
                  </div>

                  {showDismissButton && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDismiss(alert.alert_id, e)}
                      disabled={dismissMutation.isPending}
                      className="flex-shrink-0 hover:bg-white/50"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {hasMoreAlerts && (
            <div className="pt-2 text-center border-t">
              <p className="text-xs text-gray-600">
                +{alerts.length - maxAlerts} more alert{alerts.length - maxAlerts > 1 ? 's' : ''}
              </p>
              <Button
                variant="link"
                size="sm"
                className="text-xs mt-1"
                onClick={() => {
                  // TODO: Navigate to full alerts page
                  toast.info('Full alerts page coming soon!');
                }}
              >
                View All Alerts
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default AlertsWidget;
