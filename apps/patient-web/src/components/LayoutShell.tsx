'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { QuickBookingWidget } from './QuickBookingWidget';
import { useAuth } from '../context/AuthContext';

interface LayoutShellProps {
  children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  const pathname = usePathname() || '';
  const { isAuthenticated, isLoading } = useAuth();

  // Dedicated authenticated portal and auth routes should NOT render public marketing header & footer
  const isExcludedRoute =
    pathname.startsWith('/appointments') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/bookings') ||
    pathname === '/profile' ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/prescriptions') ||
    pathname.startsWith('/consultations') ||
    pathname.startsWith('/consultation') ||
    pathname === '/login' ||
    pathname === '/register';

  if (isExcludedRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1} style={{ flex: 1, outline: 'none' }}>
        {children}
      </main>
      <Footer />
      {/* Floating Quick Book is for visitors only; signed-in users get a header button instead */}
      {!isLoading && !isAuthenticated && <QuickBookingWidget />}
    </>
  );
}
