import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Link } from 'react-router-dom';
import { Package, Warehouse, ShoppingBag, AlertTriangle, DollarSign } from 'lucide-react';
import { productsService } from '../../../services/api/productsService';
import { useOrganization } from '../../../context/OrganizationContext';

interface StatCardProps {
  title: string;
  value: string | number | undefined;
  description?: string;
  icon: React.ReactNode;
  to: string;
  color: string;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  description,
  icon,
  to,
  color,
  loading,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden border border-neutral-100">
        <div className="p-5 animate-pulse">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-md w-12 h-12 bg-neutral-200" />
            <div className="ml-5 flex-1 space-y-2">
              <div className="h-3 bg-neutral-200 rounded w-3/4" />
              <div className="h-5 bg-neutral-300 rounded w-1/2" />
              <div className="h-3 bg-neutral-200 rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link to={to} className="block group cursor-pointer">
      <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-all duration-200 border border-transparent group-hover:border-neutral-200">
        <div className="p-5">
          <div className="flex items-center">
            <div className={`flex-shrink-0 rounded-md p-3 ${color} shadow-sm`}>{icon}</div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-neutral-500 truncate">{title}</dt>
                <dd>
                  <div className="text-lg font-bold text-neutral-900">{value}</div>
                </dd>
                {description && <dd className="mt-1 text-sm text-neutral-500 truncate">{description}</dd>}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export function DashboardStats() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  // Products Stats (Count, Value, Low Stock)
  const { data: productStats, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['dashboardProductStats', orgId],
    queryFn: async () => {
      const products = await productsService.getAll();

      const stats = products.reduce((acc, product: any) => {
        const stock = product.current_stock || 0;
        const price = product.price || 0;

        return {
          count: acc.count + 1,
          value: acc.value + (stock * price),
          lowStock: acc.lowStock + (stock < 10 ? 1 : 0)
        };
      }, { count: 0, value: 0, lowStock: 0 });

      return stats;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: warehousesCount, isLoading: isLoadingWarehouses } = useQuery({
    queryKey: ['warehousesCount', orgId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('warehouse')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId!);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: monthlyOrders, isLoading: isLoadingOrders } = useQuery({
    queryKey: ['monthlyOrdersCount', orgId],
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { count, error } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId!)
        .gte('created_at', firstDay);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Valor de Inventario"
        value={formatCurrency(productStats?.value || 0)}
        description={`${productStats?.count || 0} productos total`}
        icon={<DollarSign className="h-6 w-6 text-white" />}
        to="/dashboard/products"
        color="bg-success-500"
        loading={isLoadingProducts}
      />

      <StatCard
        title="Órdenes del Mes"
        value={monthlyOrders}
        description="Ventas este mes"
        icon={<ShoppingBag className="h-6 w-6 text-white" />}
        to="/dashboard/orders"
        color="bg-primary-500"
        loading={isLoadingOrders}
      />

      <StatCard
        title="Almacenes Activos"
        value={warehousesCount}
        description="Depósitos registrados"
        icon={<Warehouse className="h-6 w-6 text-white" />}
        to="/dashboard/warehouse"
        color="bg-primary-700"
        loading={isLoadingWarehouses}
      />

      <StatCard
        title="Alertas de Stock"
        value={productStats?.lowStock || 0}
        description="Productos stock bajo (<10)"
        icon={<AlertTriangle className="h-6 w-6 text-white" />}
        to="/dashboard/products"
        color="bg-warning-500"
        loading={isLoadingProducts}
      />
    </div>
  );
}
