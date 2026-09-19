'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { Footer } from './Footer';

interface LayoutShellProps {
  children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  const pathname = usePathname() || '';

  // Dedicated authenticated portal routes should NOT render public marketing header & footer
  const isPortalRoute =
    pathname.startsWith('/appointments') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/bookings') ||
    pathname === '/profile' ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/prescriptions') ||
    pathname.startsWith('/consultations') ||
    pathname.startsWith('/consultation');

  if (isPortalRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} style={{ flex: 1, outline: 'none' }}>
        {children}
      </main>
      <Footer />
    </>
  );
}
