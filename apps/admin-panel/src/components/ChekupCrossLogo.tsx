'use client';

import React from 'react';

/**
 * Precision Chekup247 Brand Medical Cross Mark (Isolated Admin Instance)
 * Diagonal seam and specular reflection highlight matching the platform design standard.
 */
export function ChekupCrossLogo({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="crossGoldGradAdmin" x1="3" y1="2" x2="25" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-gold-light, #ECC27E)" />
          <stop offset="50%" stopColor="var(--color-gold-base, #DFAB62)" />
          <stop offset="100%" stopColor="var(--color-gold-dark, #C9944A)" />
        </linearGradient>
        <clipPath id="crossClipShapeAdmin">
          <rect x="9.5" y="1.5" width="9" height="25" rx="4.5" />
          <rect x="1.5" y="9.5" width="25" height="9" rx="4.5" />
        </clipPath>
      </defs>

      <g clipPath="url(#crossClipShapeAdmin)">
        <rect x="0" y="0" width="28" height="28" fill="url(#crossGoldGradAdmin)" />
        {/* Diagonal split seam */}
        <line
          x1="5"
          y1="23"
          x2="23"
          y2="5"
          stroke="var(--color-chocolate-base, #2A170F)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* Reflection highlight along the diagonal seam */}
        <path
          d="M8.5 21L21 8.5"
          stroke="var(--color-white, #FFFFFF)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />
        {/* Soft specular reflection */}
        <ellipse cx="17.5" cy="12" rx="3.5" ry="1.8" transform="rotate(-45 17.5 12)" fill="var(--color-white, #FFFFFF)" fillOpacity="0.3" />
      </g>
    </svg>
  );
}

export default ChekupCrossLogo;
