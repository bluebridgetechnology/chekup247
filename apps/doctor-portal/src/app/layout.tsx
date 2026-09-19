'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import '../styles/globals.css';
import { CollapsibleSidebar } from '../components/CollapsibleSidebar';
import { DoctorHeader } from '../components/DoctorHeader';
import { DoctorMobileDrawer } from '../components/DoctorMobileDrawer';
import { DoctorAuthProvider } from '../context/DoctorAuthContext';

function DoctorLayoutInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = usePathname();

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/callback';

  const isConsultationRoom = pathname?.startsWith('/consultations/') && !pathname?.includes('/prescribe');

  if (isAuthPage || isConsultationRoom) {
    return (
      <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--color-cream-base, #FAF6EE)' }}>
        {children}
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: isConsultationRoom ? 'var(--color-chocolate-dark, #1E100A)' : 'var(--color-cream-base, #FAF6EE)',
      }}
    >
      {/* WCAG 2.1 AA Skip Link */}
      <a href="#clinical-main-content" className="skip-to-content">
        Skip to clinical workspace
      </a>

      {/* Desktop Sidebar (hidden on screens < 900px) */}
      <div className="doctor-desktop-sidebar">
        <CollapsibleSidebar
          collapsed={isConsultationRoom ? true : collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* Mobile Navigation Drawer */}
      <DoctorMobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* Main Workspace Column */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: '100vh',
          overflowY: 'auto',
          backgroundColor: isConsultationRoom ? 'var(--color-chocolate-dark, #1E100A)' : 'var(--color-cream-base, #FAF6EE)',
        }}
      >
        {!isConsultationRoom && (
          <DoctorHeader onMobileToggle={() => setMobileDrawerOpen(true)} />
        )}
        <main
          id="clinical-main-content"
          style={{
            flex: 1,
            padding: isConsultationRoom ? '0' : '32px',
            outline: 'none',
          }}
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DoctorRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Doctor Practice Portal — ChekUp247</title>
        <meta name="description" content="ChekUp247 Doctor Practice Management and Telehealth Suite" />
        <style>{`
          @media (max-width: 900px) {
            .doctor-desktop-sidebar {
              display: none !important;
            }
            .mobile-toggle {
              display: flex !important;
            }
            .desktop-doctor-info {
              display: none !important;
            }
          }
          @media (min-width: 901px) {
            .mobile-toggle {
              display: none !important;
            }
            .desktop-doctor-info {
              display: block !important;
            }
          }
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        <DoctorAuthProvider>
          <DoctorLayoutInner>{children}</DoctorLayoutInner>
        </DoctorAuthProvider>
      </body>
    </html>
  );
}
