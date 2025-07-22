import React from 'react';
import { CellConfig } from '../../../types/table';
import { TextCell } from './TextCell';
import { Icon } from '../../ui/Icon'; // Componente genérico de ícono

interface IconTextCellProps {
  value: any;
  row: any;
  config: CellConfig;
}

export const IconTextCell: React.FC<IconTextCellProps> = ({ value, row, config }) => {
  const { iconConfig, textConfig } = config;
  
  if (!iconConfig) {
    return <TextCell value={value} config={textConfig} />;
  }

  const {
    name = 'circle',
    position = 'left',
    size = 16,
    color = 'currentColor'
  } = iconConfig;

  const iconElement = (
    <Icon 
      name={name}
      size={size}
      color={color}
      className="flex-shrink-0"
    />
  );

  const textElement = <TextCell value={value} config={textConfig} />;

  const containerClass = `flex items-center ${
    position === 'left' || position === 'right' ? 'gap-2' : 'gap-1 flex-col'
  }`;

  return (
    <div className={containerClass}>
      {(position === 'left' || position === 'top') && iconElement}
      {textElement}
      {(position === 'right' || position === 'bottom') && iconElement}
    </div>
  );
};