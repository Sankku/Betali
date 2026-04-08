import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Link } from 'react-router-dom';
import { useOrganization } from '../../../context/OrganizationContext';
import { useTranslation } from '../../../contexts/LanguageContext';

interface ActivityItemProps {
  type: string;
  product?: string;
  warehouse?: string;
  date: string;
  status?: string;
}

const getTypeLabel = (type: string, t: (key: string) => string) => {
  const types: Record<string, string> = {
    entry: t('stockMovements.types.entry'),
    exit: t('stockMovements.types.exit'),
    adjustment: t('stockMovements.types.adjustment'),
    transfer: t('stockMovements.types.transfer'),
    senasa: 'SENASA',
  };
  return types[type] || type;
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'entry':      return 'bg-green-100 dark:bg-green-500/20 text-green-800 dark:text-green-400 border border-green-200 dark:border-green-500/30';
    case 'exit':       return 'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 border border-red-200 dark:border-red-500/30';
    case 'adjustment': return 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30';
    case 'transfer':   return 'bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-400 border border-purple-200 dark:border-purple-500/30';
    default:           return 'bg-neutral-100 dark:bg-neutral-500/20 text-neutral-800 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-500/30';
  }
};

export const ActivityItem: React.FC<ActivityItemProps> = ({
  type,
  product,
  warehouse,
  date,
  status,
}) => {
  const { t } = useTranslation();
  const typeLabel = getTypeLabel(type, t);
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
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-200 truncate">
            {product || t('dashboard.unknownProduct')}
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
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
  const { t } = useTranslation();
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
          product_lots(lot_number, product_types(name)),
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
    <div className="bg-white dark:bg-neutral-800/90 shadow-sm rounded-xl border border-neutral-100 dark:border-neutral-700/50 backdrop-blur-md h-full flex flex-col overflow-hidden">
      <div className="px-5 py-5 border-b border-neutral-100 dark:border-neutral-700/50">
        <h3 className="text-lg font-semibold leading-6 text-neutral-900 dark:text-white tracking-tight">{t('dashboard.recentMovements')}</h3>
      </div>
      <div className="px-4 py-3 sm:px-6 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : recentActivity && recentActivity.length > 0 ? (
          <ul className="divide-y divide-neutral-200">
            {recentActivity.map((movement: any) => (
              <ActivityItem
                key={movement.movement_id}
                type={movement.movement_type}
                product={(movement.product_lots as any)?.product_types?.name || (movement.product_lots as any)?.lot_number}
                warehouse={movement.warehouse?.name}
                date={new Date(movement.movement_date).toLocaleDateString()}
              />
            ))}
          </ul>
        ) : (
          <p className="text-neutral-500 text-sm text-center py-4">{t('dashboard.noActivity')}</p>
        )}
      </div>
      <div className="px-5 py-4 border-t border-neutral-100 dark:border-neutral-700/50 bg-neutral-50 dark:bg-neutral-800/50 mt-auto">
        <Link
          to="/dashboard/stock-movements"
          className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center justify-center sm:justify-start transition-colors duration-150"
        >
          {t('dashboard.viewAllMovements')}
          <span aria-hidden="true" className="ml-1">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
