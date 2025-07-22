import React from 'react';
import { CellConfig } from '../../../types/table';

interface NumberCellProps {
  value: number;
  config?: CellConfig['numberConfig'];
}

export const NumberCell: React.FC<NumberCellProps> = ({ value, config = {} }) => {
  const {
    decimals = 0,
    prefix = '',
    suffix = '',
    format = 'decimal',
    locale = 'es-ES',
    showPositiveColor = false,
    showNegativeColor = false
  } = config;

  let formattedValue: string;

  try {
    switch (format) {
      case 'currency':
        formattedValue = new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: 'USD', // Podrías hacer esto configurable
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(value);
        break;
      
      case 'percentage':
        formattedValue = new Intl.NumberFormat(locale, {
          style: 'percent',
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(value / 100);
        break;
      
      default:
        formattedValue = new Intl.NumberFormat(locale, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }).format(value);
        break;
    }
  } catch (error) {
    // Fallback si hay error en el formateo
    formattedValue = value.toFixed(decimals);
  }

  // Determinar el color basado en el valor
  let colorClass = 'text-neutral-900';
  if (showPositiveColor && value > 0) {
    colorClass = 'text-success-700';
  } else if (showNegativeColor && value < 0) {
    colorClass = 'text-danger-700';
  }

  return (
    <span className={`font-medium tabular-nums ${colorClass}`}>
      {prefix}{formattedValue}{suffix}
    </span>
  );
};