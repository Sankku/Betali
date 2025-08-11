import React from 'react';
import { CellConfig } from '../../../types/table';
import { GenericCell } from '../GenericCell';

interface CompoundCellProps {
  row: any;
  config?: CellConfig['compoundConfig'];
}

export const CompoundCell: React.FC<CompoundCellProps> = ({ row, config }) => {
  if (!config?.fields) {
    return <span>—</span>;
  }

  const { fields, layout = 'vertical', spacing = 'normal' } = config;


  const spacingClass = {
    tight: 'gap-1',
    normal: 'gap-2', 
    loose: 'gap-3'
  }[spacing];

  const containerClass = `flex ${
    layout === 'horizontal' ? 'items-center' : 'flex-col'
  } ${spacingClass}`;

  return (
    <div className={containerClass}>
      {fields.map((field, index) => {
        const value = row[field.key];
        return (
          <GenericCell
            key={`${field.key}-${index}`}
            value={value}
            row={row}
            config={{ dataType: field.type, ...field.config }}
          />
        );
      })}
    </div>
  );
};