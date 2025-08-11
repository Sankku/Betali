import React from 'react';
import { Toggle, ToggleProps } from './toggle';

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  name?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  size = 'md',
  ...props
}) => {
  return (
    <Toggle
      checked={checked}
      onChange={onCheckedChange}
      disabled={disabled}
      size={size}
      {...props}
    />
  );
};