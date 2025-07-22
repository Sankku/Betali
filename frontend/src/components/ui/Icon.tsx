import React from 'react';
import * as LucideIcons from 'lucide-react';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ 
  name, 
  size = 16, 
  color = 'currentColor',
  className = ''
}) => {
  // Convertir nombre a PascalCase para Lucide
  const iconName = name
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const IconComponent = (LucideIcons as any)[iconName];
  
  if (!IconComponent) {
    // Fallback a un ícono por defecto si no se encuentra
    const FallbackIcon = LucideIcons.Circle;
    return (
      <FallbackIcon 
        size={size} 
        color={color}
        className={className}
      />
    );
  }

  return (
    <IconComponent 
      size={size} 
      color={color}
      className={className}
    />
  );
};