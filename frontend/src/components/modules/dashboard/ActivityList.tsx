import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Link } from 'react-router-dom';
import { useOrganization } from '../../../context/OrganizationContext';

interface ActivityItemProps {
  type: string;
  product?: string;
  warehouse?: string;
  date: string;
  status?: string;
}

const getTypeLabel = (type: string) => {
  const types: Record<string, string> = {
    entry: 'Entrada',
    exit: 'Salida',
    adjustment: 'Ajuste',
    transfer: 'Transferencia',
    senasa: 'SENASA'
  };
  return types[type] || type;
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'entry':      return 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-800/60 dark:text-green-200 dark:border-green-600';
    case 'exit':       return 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-800/60 dark:text-red-200 dark:border-red-600';
    case 'adjustment': return 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-800/60 dark:text-blue-200 dark:border-blue-600';
    case 'transfer':   return 'bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-800/60 dark:text-purple-200 dark:border-purple-600';
    default:           return 'bg-neutral-100 text-neutral-800 border border-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:border-neutral-500';
  }
};

export const ActivityItem: React.FC<ActivityItemProps> = ({
  type,
  product,
  warehouse,
  date,
  status,
}) => {
  const typeLabel = getTypeLabel(type);
  const typeColor = getTypeColor(type);

  return (
    <li className="py-3">
      <div className="flex items-center space-x-4">
        <div className="flex-shrink-0">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeColor}`}>
            {typeLabel}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {product || 'Producto desconocido'}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
            {warehouse && <span>{warehouse} • </span>}
            {date}
          </p>
        </div>
      </div>
    </li>
  );
};

export function ActivityList() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;

  const { data: recentActivity, isLoading } = useQuery({
    queryKey: ['recentActivity', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select(
          `
          movement_id,
          movement_date,
          movement_type,
          quantity,
          products(name),
          warehouse:warehouse_id(name)
        `
        )
        .eq('organization_id', orgId!)
        .order('movement_date', { ascending: false })
        .limit(5);

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="bg-white dark:bg-neutral-900 shadow rounded-lg flex flex-col h-full border border-neutral-200 dark:border-neutral-700">
      <div className="px-4 py-5 sm:px-6 border-b border-neutral-200 dark:border-neutral-700">
        <h3 className="text-lg font-medium leading-6 text-neutral-900 dark:text-neutral-100">Movimientos Recientes</h3>
      </div>
      <div className="px-4 py-3 sm:px-6 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : recentActivity && recentActivity.length > 0 ? (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {recentActivity.map((movement: any) => (
              <ActivityItem
                key={movement.movement_id}
                type={movement.movement_type}
                product={movement.products?.name}
                warehouse={movement.warehouse?.name}
                date={new Date(movement.movement_date).toLocaleDateString()}
              />
            ))}
          </ul>
        ) : (
          <p className="text-neutral-500 dark:text-neutral-400 text-sm text-center py-4">No hay actividad reciente</p>
        )}
      </div>
      <div className="px-4 py-4 sm:px-6 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 rounded-b-lg">
        <Link
          to="/dashboard/stock-movements"
          className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center justify-center sm:justify-start transition-colors duration-150"
        >
          Ver todos los movimientos
          <span aria-hidden="true" className="ml-1">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
