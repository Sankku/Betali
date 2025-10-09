import { ShoppingCart, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface OrderData {
  date: string;
  orders: number;
  total: number;
}

export function TrendChart() {
  const { data: orderTrends, isLoading } = useQuery({
    queryKey: ['orderTrends'],
    queryFn: async (): Promise<OrderData[]> => {
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);

      const { data, error } = await supabase
        .from('orders')
        .select('created_at, total_amount')
        .gte('created_at', last7Days.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const grouped: Record<string, { orders: number; total: number }> = {};
      
      data?.forEach((order) => {
        const date = new Date(order.created_at).toLocaleDateString('es-ES', { 
          month: 'short', 
          day: 'numeric' 
        });
        
        if (!grouped[date]) {
          grouped[date] = { orders: 0, total: 0 };
        }
        
        grouped[date].orders += 1;
        grouped[date].total += order.total_amount || 0;
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

  if (!orderTrends || orderTrends.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Órdenes Recientes</h3>
        </div>
        <div className="px-4 py-5 sm:p-6 flex items-center justify-center h-64">
          <div className="text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Sin órdenes</h3>
            <p className="mt-1 text-sm text-gray-500">
              No hay órdenes registradas en los últimos 7 días
            </p>
            <div className="mt-6">
              <Link
                to="/dashboard/orders"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                Crear orden
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Órdenes Recientes</h3>
          <Link
            to="/dashboard/orders"
            className="text-sm text-green-600 hover:text-green-700 font-medium"
          >
            Ver todas
          </Link>
        </div>
        <p className="mt-1 text-sm text-gray-500">Últimos 7 días</p>
      </div>
      <div className="px-4 py-5 sm:p-6">
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={orderTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
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
                name === 'orders' ? `${value} órdenes` : `$${value}`,
                name === 'orders' ? 'Cantidad' : 'Total'
              ]}
            />
            <Bar 
              dataKey="orders" 
              fill="#3b82f6" 
              name="orders"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-4 flex justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded mr-2"></div>
            <span className="text-gray-600">Número de órdenes</span>
          </div>
          {orderTrends.some(d => d.total > 0) && (
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
              <span className="text-gray-600">Total: ${orderTrends.reduce((sum, d) => sum + d.total, 0).toFixed(2)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
