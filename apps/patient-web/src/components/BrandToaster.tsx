'use client';

import React, { useEffect, useState } from 'react';
import { Toaster } from 'sonner';

/**
 * Brand-themed Sonner Toaster for ChekUp247.
 * - Top-right on desktop, top-center on mobile (native-app feel).
 * - Brand gold (#DFAB62) accent, dark chocolate (#2A170F) text, rounded, soft shadow.
 * - Distinct success (green) / error (red) accents via richColors + per-type overrides.
 * Mounted once in the root layout.
 */
export function BrandToaster() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <Toaster
      position={isMobile ? 'top-center' : 'top-right'}
      richColors
      closeButton
      expand={false}
      duration={4500}
      gap={10}
      offset={isMobile ? 12 : 20}
      toastOptions={{
        style: {
          borderRadius: '14px',
          border: '1px solid rgba(223,171,98,0.35)',
          background: '#FFFDF9',
          color: '#2A170F',
          boxShadow: '0 12px 32px rgba(42,23,15,0.16)',
          fontSize: '0.9rem',
          fontWeight: 600,
          padding: '14px 16px',
        },
        classNames: {
          title: 'chk-toast-title',
          description: 'chk-toast-desc',
          actionButton: 'chk-toast-action',
        },
      }}
    />
  );
}
