import React from 'react';
import { Package, Calendar, Activity } from 'lucide-react';
import { StatsSection, StatItem } from '../../templates/stats-section';

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
    created_at: string;
    stats?: WarehouseStatsData;
  };
}

export const WarehouseStats: React.FC<WarehouseStatsProps> = ({ warehouse }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const stats: StatItem[] = [
    {
      title: 'Total Movimientos',
      value: warehouse.stats?.totalMovements || 0,
      description: 'Movimientos registrados',
      icon: Package,
      variant: 'primary',
    },
    {
      title: 'Fecha Creación',
      value: formatDate(warehouse.created_at),
      description: 'Almacén creado',
      icon: Calendar,
      variant: 'success',
    },
    {
      title: 'Últimos Movimientos',
      value: warehouse.stats?.recentMovements?.length || 0,
      description: 'Movimientos recientes',
      icon: Activity,
      variant: 'warning',
    },
  ];

  return (
    <StatsSection
      title="Estadísticas del Almacén"
      description="Información de actividad y métricas del almacén"
      stats={stats}
      columns={3}
    />
  );
};
