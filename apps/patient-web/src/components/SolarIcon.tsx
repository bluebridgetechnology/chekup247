'use client';

import React from 'react';
import { Icon, addCollection } from '@iconify/react';
import solarIcons from '../lib/solar-icons.json';

// Register the icons this app uses locally so they render instantly and offline
// instead of being fetched from the public Iconify API. Regenerate the subset with
// `npm run icons:build` after adding a new icon name.
addCollection(solarIcons as Parameters<typeof addCollection>[0]);

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
