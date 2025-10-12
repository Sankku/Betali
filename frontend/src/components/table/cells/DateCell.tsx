import React from 'react';
import { CellConfig } from '../../../types/table';
import { useDateFormat } from '../../../contexts/DateFormatContext';

interface DateCellProps {
  value: string | Date;
  config?: CellConfig['dateConfig'];
}

export const DateCell: React.FC<DateCellProps> = ({ value, config = {} }) => {
  const { formatDate } = useDateFormat();
  const { format } = config;

  const date = value instanceof Date ? value : new Date(value);

  if (isNaN(date.getTime())) {
    return <span className="text-neutral-400">Fecha inválida</span>;
  }

  const formattedDate = formatDate(date, format);

  return (
    <span className="text-neutral-700 text-sm tabular-nums">
      {formattedDate}
    </span>
  );
};