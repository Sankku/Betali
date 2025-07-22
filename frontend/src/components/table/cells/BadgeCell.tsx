import React from 'react';
import { Badge } from '../../ui/badge';
import { CellConfig, BadgeVariant } from '../../../types/table';

interface BadgeCellProps {
  value: any;
  config?: CellConfig['badgeConfig'];
}

export const BadgeCell: React.FC<BadgeCellProps> = ({ value, config = {} }) => {
  const {
    variant = 'default',
    variantMap = {},
    labelMap = {},
    size = 'md'
  } = config;

  // Determinar la variante a usar
  const finalVariant: BadgeVariant = variantMap[String(value)] || variant;
  
  // Determinar la etiqueta a mostrar
  const label = labelMap[String(value)] || String(value);

  return (
    <Badge 
      variant={finalVariant}
      size={size}
    >
      {label}
    </Badge>
  );
};