'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { QuickBookingWidget } from './QuickBookingWidget';
import { useAuth } from '../context/AuthContext';
import { QUICK_BOOK_ONLY } from '../lib/featureFlags';

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
    pathname.startsWith('/join') ||
    pathname === '/login' ||
    pathname === '/register';

  // Quick-Book-only mode: signed-in users open the widget from header / portal buttons
  // (no floating trigger for them), including on the portal routes that skip the public shell.
  const headlessQuickBook = QUICK_BOOK_ONLY && !isLoading && isAuthenticated;

  if (isExcludedRoute) {
    return (
      <>
        {children}
        {headlessQuickBook && <QuickBookingWidget showTrigger={false} />}
      </>
    );
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
      {headlessQuickBook && <QuickBookingWidget showTrigger={false} />}
    </>
  );
}
