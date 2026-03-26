
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Link } from 'react-router-dom';
import { Warehouse, ShoppingBag, AlertTriangle, DollarSign } from 'lucide-react';
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
      <div className="bg-white dark:bg-neutral-800/80 rounded-xl shadow-sm overflow-hidden border border-neutral-100 dark:border-neutral-700/50 h-full">
        <div className="p-5 animate-pulse">
          <div className="flex items-center">
            <div className="flex-shrink-0 rounded-xl w-12 h-12 bg-neutral-200 dark:bg-neutral-700" />
            <div className="ml-5 flex-1 space-y-3">
              <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
              <div className="h-6 bg-neutral-300 dark:bg-neutral-600 rounded w-1/2" />
              <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Extract base color name from tailwind bg class to create subtle backgrounds
  const baseColor = color.replace('bg-', '').replace('-500', '').replace('-700', '');
  
  const theme = {
    primary: {
      bgProps: 'bg-primary-50 dark:bg-primary-500/20',
      textProps: 'text-primary-600 dark:text-primary-400',
      hoverBg: 'group-hover:!bg-primary-500 dark:group-hover:!bg-primary-600',
      border: 'border-primary-100 dark:border-primary-500/20',
    },
    success: {
      bgProps: 'bg-success-50 dark:bg-success-500/20',
      textProps: 'text-success-600 dark:text-success-400',
      hoverBg: 'group-hover:!bg-success-500 dark:group-hover:!bg-success-600',
      border: 'border-success-100 dark:border-success-500/20',
    },
    warning: {
      bgProps: 'bg-warning-50 dark:bg-warning-500/20',
      textProps: 'text-warning-600 dark:text-warning-400',
      hoverBg: 'group-hover:!bg-warning-500 dark:group-hover:!bg-warning-600',
      border: 'border-warning-100 dark:border-warning-500/20',
    },
    blue: {
      bgProps: 'bg-blue-50 dark:bg-blue-500/20',
      textProps: 'text-blue-600 dark:text-blue-400',
      hoverBg: 'group-hover:!bg-blue-500 dark:group-hover:!bg-blue-600',
      border: 'border-blue-100 dark:border-blue-500/20',
    }
  }[baseColor] || {
      bgProps: 'bg-primary-50 dark:bg-primary-500/20',
      textProps: 'text-primary-600 dark:text-primary-400',
      hoverBg: 'group-hover:!bg-primary-500 dark:group-hover:!bg-primary-600',
      border: 'border-primary-100 dark:border-primary-500/20',
  };

  return (
    <Link to={to} className="block group cursor-pointer hover-lift h-full">
      <div className="bg-white dark:bg-neutral-800/80 rounded-xl shadow-sm overflow-hidden transition-all duration-300 border border-neutral-100 dark:border-neutral-700/50 group-hover:border-primary-200 dark:group-hover:border-primary-500/30 group-hover:shadow-md h-full backdrop-blur-lg">
        <div className="p-5">
          <div className="flex items-start">
            <div className={`flex-shrink-0 rounded-xl p-3 ${theme.bgProps} ${theme.textProps} ${theme.hoverBg} group-hover:text-white transition-colors duration-300 shadow-sm border ${theme.border} group-hover:border-transparent`}>
              {icon}
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-neutral-500 dark:text-neutral-400 truncate">{title}</dt>
                <dd>
                  <div className="text-2xl font-bold text-neutral-900 dark:text-white mt-1.5 tracking-tight">{value}</div>
                </dd>
                {description && <dd className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 truncate">{description}</dd>}
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
        icon={<DollarSign className="h-6 w-6" />}
        to="/dashboard/products"
        color="bg-success-500"
        loading={isLoadingProducts}
      />

      <StatCard
        title="Órdenes del Mes"
        value={monthlyOrders}
        description="Ventas este mes"
        icon={<ShoppingBag className="h-6 w-6" />}
        to="/dashboard/orders"
        color="bg-primary-500"
        loading={isLoadingOrders}
      />

      <StatCard
        title="Almacenes Activos"
        value={warehousesCount}
        description="Depósitos registrados"
        icon={<Warehouse className="h-6 w-6" />}
        to="/dashboard/warehouse"
        color="bg-blue-500"
        loading={isLoadingWarehouses}
      />

      <StatCard
        title="Alertas de Stock"
        value={productStats?.lowStock || 0}
        description="Productos stock bajo (<10)"
        icon={<AlertTriangle className="h-6 w-6" />}
        to="/dashboard/products"
        color="bg-warning-500"
        loading={isLoadingProducts}
      />
    </div>
  );
}
