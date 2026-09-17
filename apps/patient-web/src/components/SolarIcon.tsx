'use client';

import React from 'react';
import { Icon, addCollection } from '@iconify/react';
import solarData from '@iconify-json/solar/icons.json';

// Register complete Solar Icons collection locally for zero-latency offline rendering
addCollection(solarData as any);

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
