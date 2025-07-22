import React from 'react';
import { CellConfig } from '../../../types/table';

interface LinkCellProps {
  value: string;
  config?: CellConfig['linkConfig'];
}

export const LinkCell: React.FC<LinkCellProps> = ({ value, config = {} }) => {
  const {
    external = false,
    color = 'text-primary-600',
    underline = true
  } = config;

  const className = `${color} hover:${color.replace('600', '700')} ${
    underline ? 'underline' : ''
  } transition-colors`;

  if (external) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {value}
      </a>
    );
  }

  return (
    <a href={value} className={className}>
      {value}
    </a>
  );
};