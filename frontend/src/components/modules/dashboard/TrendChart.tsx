import { ShoppingCart, Loader2, Info, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { orderService } from '../../../services/api/orderService';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Bar } from 'recharts';
import { DateRangePicker, DateRange } from '@/components/ui/date-range-picker';
import { Button } from '@/components/ui/button';

interface OrderData {
  date: string;
  orders: number;
  total: number;
}

type DateRangeType = 'today' | 'week' | 'month' | 'year' | 'custom';

export function TrendChart() {
  const [showInfo, setShowInfo] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeType>('week');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [pendingCustomDateRange, setPendingCustomDateRange] = useState<DateRange | undefined>();
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();

    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'custom':
        if (customDateRange?.from) {
          startDate = customDateRange.from;
        }
        break;
    }

    const endDate = dateRange === 'custom' && customDateRange?.to
      ? customDateRange.to
      : now;

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  const { data: orderTrends, isLoading } = useQuery({
    queryKey: ['orderTrends', dateRange, customDateRange?.from, customDateRange?.to],
    queryFn: async (): Promise<OrderData[]> => {

      // Fetch orders using the API service
      const response = await orderService.getOrders({
        page: 1,
        limit: 200, // Maximum allowed by backend
        sortBy: 'created_at',
        sortOrder: 'desc',
      });

      const orders = response.data || [];

      // Filter orders by selected date range (using order_date instead of created_at)
      const filteredOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.order_date || order.created_at);
        return orderDate >= startDate && orderDate <= endDate;
      });

      // Group by date
      const grouped: Record<string, { orders: number; total: number }> = {};

      filteredOrders.forEach((order: any) => {
        const date = new Date(order.order_date || order.created_at).toLocaleDateString('es-ES', {
          month: 'short',
          day: 'numeric'
        });

        if (!grouped[date]) {
          grouped[date] = { orders: 0, total: 0 };
        }

        grouped[date].orders += 1;
        grouped[date].total += order.total || 0;
      });

      return Object.entries(grouped).map(([date, values]) => ({
        date,
        orders: values.orders,
        total: Math.round(values.total * 100) / 100 // Round to 2 decimals
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Órdenes Recientes</h3>
        </div>
        <div className="px-4 py-5 sm:p-6 flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 text-gray-400 animate-spin" />
            <p className="mt-2 text-sm text-gray-500">Cargando datos...</p>
          </div>
        </div>
      </div>
    );
  }

  const hasNoData = !orderTrends || orderTrends.length === 0;

  const getRangeLabel = () => {
    switch (dateRange) {
      case 'today':
        return 'Hoy';
      case 'week':
        return 'Últimos 7 días';
      case 'month':
        return 'Último mes';
      case 'year':
        return 'Último año';
      case 'custom':
        if (customDateRange?.from && customDateRange?.to) {
          return `${customDateRange.from.toLocaleDateString('es-ES')} - ${customDateRange.to.toLocaleDateString('es-ES')}`;
        }
        return 'Rango personalizado';
      default:
        return 'Últimos 7 días';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Órdenes Recientes</h3>
            <div className="relative">
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Información del gráfico"
              >
                <Info className="h-4 w-4 text-gray-500" />
              </button>
              {showInfo && (
                <div className="absolute left-0 top-8 z-50 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm">Acerca de este gráfico</h4>
                    <button
                      onClick={() => setShowInfo(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Este gráfico muestra el número de órdenes creadas (barras azules) y el revenue total generado (línea verde) durante el período seleccionado.
                    Útil para identificar tendencias de ventas y días de mayor actividad.
                  </p>
                </div>
              )}
            </div>
          </div>
          <Link
            to="/dashboard/orders"
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            Ver todas
          </Link>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setDateRange('today'); setShowCustomDatePicker(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                dateRange === 'today'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => { setDateRange('week'); setShowCustomDatePicker(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                dateRange === 'week'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => { setDateRange('month'); setShowCustomDatePicker(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                dateRange === 'month'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => { setDateRange('year'); setShowCustomDatePicker(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                dateRange === 'year'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Año
            </button>
            <button
              onClick={() => {
                setDateRange('custom');
                setShowCustomDatePicker(!showCustomDatePicker);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                dateRange === 'custom'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Calendar className="w-3 h-3" />
              Personalizado
            </button>
          </div>
          <span className="text-xs text-gray-500 ml-2">{getRangeLabel()}</span>
        </div>

        {/* Custom Date Picker */}
        {showCustomDatePicker && dateRange === 'custom' && (
          <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Selecciona rango de fechas
                </label>
                <DateRangePicker
                  value={pendingCustomDateRange}
                  onChange={setPendingCustomDateRange}
                  placeholder="Selecciona fechas..."
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setCustomDateRange(pendingCustomDateRange);
                  }}
                  disabled={!pendingCustomDateRange?.from || !pendingCustomDateRange?.to}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Aplicar filtro
                </Button>
                <Button
                  onClick={() => {
                    setPendingCustomDateRange(undefined);
                    setCustomDateRange(undefined);
                    setDateRange('week');
                    setShowCustomDatePicker(false);
                  }}
                  variant="outline"
                  className="border-gray-300"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="px-4 py-5 sm:p-6">
        {hasNoData ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              {dateRange === 'custom' && (!customDateRange?.from || !customDateRange?.to) ? (
                <>
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Selecciona un rango de fechas</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Usa el selector de fechas arriba y haz clic en "Aplicar filtro" para ver las estadísticas
                  </p>
                </>
              ) : (
                <>
                  <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Sin órdenes</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No hay órdenes registradas en el período seleccionado
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/dashboard/orders"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                    >
                      Crear orden
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={orderTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px'
              }}
              labelStyle={{ color: '#374151', fontWeight: 'medium' }}
              formatter={(value, name) => [
                name === 'orders' ? `${value} órdenes` : `$${Number(value).toFixed(2)}`,
                name === 'orders' ? 'Cantidad de órdenes' : 'Revenue total'
              ]}
            />
            <Bar
              yAxisId="left"
              dataKey="orders"
              fill="#3b82f6"
              name="orders"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="total"
              stroke="#10b981"
              strokeWidth={2}
              name="total"
              dot={{ fill: '#10b981', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="mt-4 flex justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span className="text-gray-600">Número de órdenes</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span className="text-gray-600">Revenue total</span>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
