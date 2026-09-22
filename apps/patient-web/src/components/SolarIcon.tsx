'use client';

import React from 'react';
import { Icon } from '@iconify/react';

interface SolarIconProps {
  name: string;
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function SolarIcon({ name, size = 18, color, className, style }: SolarIconProps) {
  const iconName = name.startsWith('solar:') ? name : `solar:${name}`;
  return <Icon icon={iconName} width={size} height={size} color={color} className={className} style={style} />;
}
