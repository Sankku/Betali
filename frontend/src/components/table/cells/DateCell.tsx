import React from 'react';
import { CellConfig } from '../../../types/table';

interface DateCellProps {
  value: string | Date;
  config?: CellConfig['dateConfig'];
}

export const DateCell: React.FC<DateCellProps> = ({ value, config = {} }) => {
  const {
    format = 'short',
    locale = 'es-ES',
    timezone
  } = config;

  const date = value instanceof Date ? value : new Date(value);
  
  if (isNaN(date.getTime())) {
    return <span className="text-neutral-400">Fecha inválida</span>;
  }

  let formattedDate: string;

  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
    };

    switch (format) {
      case 'short':
        options.dateStyle = 'short';
        break;
      case 'medium':
        options.dateStyle = 'medium';
        break;
      case 'long':
        options.dateStyle = 'long';
        break;
      case 'relative':
        // Para fechas relativas usamos una lógica simple
        const now = new Date();
        const diffTime = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
          formattedDate = 'Hoy';
        } else if (diffDays === 1) {
          formattedDate = 'Ayer';
        } else if (diffDays < 7) {
          formattedDate = `Hace ${diffDays} días`;
        } else {
          formattedDate = new Intl.DateTimeFormat(locale, { dateStyle: 'short' }).format(date);
        }
        break;
      default:
        options.dateStyle = 'short';
    }

    if (format !== 'relative') {
      formattedDate = new Intl.DateTimeFormat(locale, options).format(date);
    }
  } catch (error) {
    // Fallback
    formattedDate = date.toLocaleDateString();
  }

  return (
    <span className="text-neutral-700 text-sm tabular-nums">
      {formattedDate}
    </span>
  );
};