import React from 'react';
import { Package, Calendar, Activity } from 'lucide-react';
import { StatsSection, StatItem } from '../../templates/stats-section';
import { useTranslation } from '../../../contexts/LanguageContext';

export interface WarehouseStatsData {
  totalMovements: number;
  recentMovements: Array<{
    movement_id: string;
    movement_date: string;
    movement_type: string;
    quantity: number;
    products?: {
      name: string;
    };
  }>;
}

export interface WarehouseStatsProps {
  warehouse: {
    warehouse_id: string;
    name: string;
    created_at: string | null;
    stats?: WarehouseStatsData;
  };
}

export const WarehouseStats: React.FC<WarehouseStatsProps> = ({ warehouse }) => {
  const { t } = useTranslation();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('warehouse.stats.noDate');
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const stats: StatItem[] = [
    {
      title: t('warehouse.stats.totalMovements'),
      value: warehouse.stats?.totalMovements || 0,
      description: t('warehouse.stats.totalMovementsDesc'),
      icon: Package,
      variant: 'primary',
    },
    {
      title: t('warehouse.stats.creationDate'),
      value: formatDate(warehouse.created_at),
      description: t('warehouse.stats.creationDateDesc'),
      icon: Calendar,
      variant: 'success',
    },
    {
      title: t('warehouse.stats.recentMovements'),
      value: warehouse.stats?.recentMovements?.length || 0,
      description: t('warehouse.stats.recentMovementsDesc'),
      icon: Activity,
      variant: 'warning',
    },
  ];

  return (
    <StatsSection
      title={t('warehouse.stats.statsTitle')}
      description={t('warehouse.stats.statsSubtitle')}
      stats={stats}
      columns={3}
    />
  );
};
