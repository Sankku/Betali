import { ShoppingCart, Loader2, Info, Calendar, X } from 'lucide-react';

// Brand color constants for Recharts (can't use Tailwind classes in SVG attributes)
const CHART_PRIMARY = 'oklch(0.50 0.20 206)';   // primary-500
const CHART_SUCCESS = 'oklch(0.36 0.30 142)';   // success-500
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { orderService } from '../../../services/api/orderService';
import { useTranslation } from '../../../contexts/LanguageContext';
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
  const { t } = useTranslation();
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
    enabled: dateRange !== 'custom' || (!!customDateRange?.from && !!customDateRange?.to),
    queryFn: async (): Promise<OrderData[]> => {
      const response = await orderService.getOrders({
        date_from: startDate.toISOString(),
        date_to: endDate.toISOString(),
        sortBy: 'order_date',
        sortOrder: 'asc',
      });

      const orders = response.data || [];

      // Group by date
      const grouped: Record<string, { orders: number; total: number }> = {};

      orders.forEach((order: any) => {
        const date = new Date(order.order_date || order.created_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
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
        total: Math.round(values.total * 100) / 100,
      }));
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-neutral-200">
          <h3 className="text-lg font-medium leading-6 text-neutral-900">{t('trendChart.title')}</h3>
        </div>
        <div className="px-4 py-5 sm:p-6 flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 text-neutral-400 animate-spin" />
            <p className="mt-2 text-sm text-neutral-500">{t('trendChart.loadingData')}</p>
          </div>
        </div>
      </div>
    );
  }

  const hasNoData = !orderTrends || orderTrends.length === 0;

  const getRangeLabel = () => {
    switch (dateRange) {
      case 'today':
        return t('trendChart.labelToday');
      case 'week':
        return t('trendChart.labelWeek');
      case 'month':
        return t('trendChart.labelMonth');
      case 'year':
        return t('trendChart.labelYear');
      case 'custom':
        if (customDateRange?.from && customDateRange?.to) {
          return `${customDateRange.from.toLocaleDateString()} - ${customDateRange.to.toLocaleDateString()}`;
        }
        return t('trendChart.labelCustomRange');
      default:
        return t('trendChart.labelWeek');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium leading-6 text-neutral-900">{t('trendChart.title')}</h3>
            <div className="relative">
              <button
                onClick={() => setShowInfo(!showInfo)}
                className="p-1 rounded-full hover:bg-neutral-100 transition-colors"
                aria-label={t('trendChart.chartInfoAriaLabel')}
              >
                <Info className="h-4 w-4 text-neutral-500" />
              </button>
              {showInfo && (
                <div className="absolute left-0 top-8 z-50 w-80 bg-white border border-neutral-200 rounded-lg shadow-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-sm">{t('trendChart.aboutChartTitle')}</h4>
                    <button
                      onClick={() => setShowInfo(false)}
                      className="text-neutral-400 hover:text-neutral-600 cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-neutral-600 leading-relaxed">
                    {t('trendChart.aboutChartDesc')}
                  </p>
                </div>
              )}
            </div>
          </div>
          <Link
            to="/dashboard/orders"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            {t('trendChart.viewAll')}
          </Link>
        </div>

        {/* Date Range Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => { setDateRange('today'); setShowCustomDatePicker(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                dateRange === 'today'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {t('trendChart.rangeToday')}
            </button>
            <button
              onClick={() => { setDateRange('week'); setShowCustomDatePicker(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                dateRange === 'week'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {t('trendChart.rangeWeek')}
            </button>
            <button
              onClick={() => { setDateRange('month'); setShowCustomDatePicker(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                dateRange === 'month'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {t('trendChart.rangeMonth')}
            </button>
            <button
              onClick={() => { setDateRange('year'); setShowCustomDatePicker(false); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                dateRange === 'year'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              {t('trendChart.rangeYear')}
            </button>
            <button
              onClick={() => {
                setDateRange('custom');
                setShowCustomDatePicker(!showCustomDatePicker);
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1 ${
                dateRange === 'custom'
                  ? 'bg-primary-600 text-white'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <Calendar className="w-3 h-3" />
              {t('trendChart.rangeCustom')}
            </button>
          </div>
          <span className="text-xs text-neutral-500 ml-2">{getRangeLabel()}</span>
        </div>

        {/* Custom Date Picker */}
        {showCustomDatePicker && dateRange === 'custom' && (
          <div className="mt-3 p-3 bg-neutral-50 rounded-md border border-neutral-200">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  {t('trendChart.selectDateRange')}
                </label>
                <DateRangePicker
                  value={pendingCustomDateRange}
                  onChange={setPendingCustomDateRange}
                  placeholder={t('trendChart.selectDateRangePlaceholder')}
                  className="w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setCustomDateRange(pendingCustomDateRange);
                  }}
                  disabled={!pendingCustomDateRange?.from || !pendingCustomDateRange?.to}
                  className="bg-primary-600 hover:bg-primary-700 text-white"
                >
                  {t('trendChart.applyFilter')}
                </Button>
                <Button
                  onClick={() => {
                    setPendingCustomDateRange(undefined);
                    setCustomDateRange(undefined);
                    setDateRange('week');
                    setShowCustomDatePicker(false);
                  }}
                  variant="outline"
                  className="border-neutral-300"
                >
                  {t('trendChart.clear')}
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
                  <Calendar className="mx-auto h-12 w-12 text-neutral-400" />
                  <h3 className="mt-2 text-sm font-medium text-neutral-900">{t('trendChart.selectDateRange')}</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {t('trendChart.selectRangeHint')}
                  </p>
                </>
              ) : (
                <>
                  <ShoppingCart className="mx-auto h-12 w-12 text-neutral-400" />
                  <h3 className="mt-2 text-sm font-medium text-neutral-900">{t('trendChart.noOrders')}</h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {t('trendChart.noOrdersDesc')}
                  </p>
                  <div className="mt-6">
                    <Link
                      to="/dashboard/orders"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                    >
                      {t('trendChart.createOrder')}
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
                border: '1px solid oklch(0.92 0.00 0)',
                borderRadius: '6px',
                fontSize: '12px'
              }}
              labelStyle={{ color: 'oklch(0.27 0.01 286)', fontWeight: 'medium' }}
              formatter={(value, name) => [
                name === 'orders' ? `${value} ${t('trendChart.tooltipOrders')}` : `$${Number(value).toFixed(2)}`,
                name === 'orders' ? t('trendChart.tooltipOrdersLabel') : t('trendChart.tooltipRevenueLabel')
              ]}
            />
            <Bar
              yAxisId="left"
              dataKey="orders"
              fill={CHART_PRIMARY}
              name="orders"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="total"
              stroke={CHART_SUCCESS}
              strokeWidth={2}
              name="total"
              dot={{ fill: CHART_SUCCESS, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="mt-4 flex justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-primary-500 rounded mr-2"></div>
            <span className="text-neutral-600">{t('trendChart.legendOrders')}</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-success-500 rounded mr-2"></div>
            <span className="text-neutral-600">{t('trendChart.legendRevenue')}</span>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );
}
