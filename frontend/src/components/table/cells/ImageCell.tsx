import React from 'react';
import { CellConfig } from '../../../types/table';

interface ImageCellProps {
  value: string;
  config?: CellConfig['imageConfig'];
}

export const ImageCell: React.FC<ImageCellProps> = ({ value, config = {} }) => {
  const {
    size = 'md',
    shape = 'rounded',
    fallback = '',
    alt = 'Imagen'
  } = config;

  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-none',
    rounded: 'rounded-md'
  };

  if (!value && !fallback) {
    return <div className={`${sizeClasses[size]} ${shapeClasses[shape]} bg-neutral-200`} />;
  }

  return (
    <img
      src={value || fallback}
      alt={alt}
      className={`${sizeClasses[size]} ${shapeClasses[shape]} object-cover`}
      onError={(e) => {
        if (fallback && e.currentTarget.src !== fallback) {
          e.currentTarget.src = fallback;
        }
      }}
    />
  );
};