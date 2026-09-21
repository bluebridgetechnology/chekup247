'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import '../styles/globals.css';
import { CollapsibleSidebar } from '../components/CollapsibleSidebar';
import { DoctorHeader } from '../components/DoctorHeader';
import { DoctorMobileDrawer } from '../components/DoctorMobileDrawer';
import { DoctorAuthProvider, useDoctorAuth } from '../context/DoctorAuthContext';
import { BrandToaster } from '../components/BrandToaster';
import { ChekupCrossLogo } from '../components/common/ChekupCrossLogo';

function DoctorLayoutInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useDoctorAuth();

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/callback';

  const isConsultationRoom = pathname?.startsWith('/consultations/') && !pathname?.includes('/prescribe');

  // If already authenticated and visiting /login or /register, redirect to /calendar
  useEffect(() => {
    if (!isLoading && isAuthenticated && (pathname === '/login' || pathname === '/register')) {
      router.replace('/calendar');
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  // If unauthenticated and visiting any protected doctor user area, redirect immediately to /login
  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isAuthPage) {
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      } else {
        router.replace('/login');
      }
    }
  }, [isLoading, isAuthenticated, isAuthPage, router]);

  // Auth pages (login, register, callback)
  if (isAuthPage) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', maxWidth: '100%', overflowX: 'hidden', overflowY: 'auto', backgroundColor: 'var(--color-cream-base, #FAF6EE)' }}>
        {children}
      </div>
    );
  }

  // Full-screen loading while checking authentication credentials (no sidebar, header, or page content)
  if (isLoading) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-cream-base, #FAF6EE)',
          gap: '16px',
        }}
      >
        <ChekupCrossLogo size={44} />
        <div
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '0.95rem',
            fontWeight: 'var(--font-heading-weight, 400)',
            color: 'var(--color-chocolate-base, #2A170F)',
            letterSpacing: '-0.01em',
          }}
        >
          Securing Practice Workspace...
        </div>
      </div>
    );
  }

  // If not authenticated, block all content, sidebar, and headers
  if (!isAuthenticated) {
    return (
      <div
        style={{
          height: '100vh',
          width: '100%',
          maxWidth: '100%',
          overflowX: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--color-cream-base, #FAF6EE)',
        }}
      >
        <div
          style={{
            fontSize: '0.9rem',
            color: 'var(--color-chocolate-base, #2A170F)',
            fontWeight: 500,
          }}
        >
          Redirecting to doctor sign in...
        </div>
      </div>
    );
  }

  // Consultation Room (telehealth video call)
  if (isConsultationRoom) {
    return (
      <div style={{ height: '100vh', width: '100%', maxWidth: '100%', overflow: 'hidden', backgroundColor: 'var(--color-chocolate-dark, #1E100A)' }}>
        {children}
      </div>
    );
  }

  // Authenticated Doctor Workspace
  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--color-cream-base, #FAF6EE)',
      }}
    >
      {/* WCAG 2.1 AA Skip Link */}
      <a href="#clinical-main-content" className="skip-to-content">
        Skip to clinical workspace
      </a>

      {/* Desktop Sidebar (hidden on screens < 900px) */}
      <div className="doctor-desktop-sidebar">
        <CollapsibleSidebar
          collapsed={collapsed}
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
          overflowX: 'hidden',
          overflowY: 'auto',
          backgroundColor: 'var(--color-cream-base, #FAF6EE)',
        }}
      >
        <DoctorHeader onMobileToggle={() => setMobileDrawerOpen(true)} />
        <main
          id="clinical-main-content"
          className="doctor-main-scroll"
          style={{
            flex: 1,
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
          :root {
            --doctor-topbar-h: 76px;
          }
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
          .doctor-main-scroll {
            padding: 32px;
            overflow-x: hidden;
            max-width: 100%;
          }
          @media (max-width: 900px) {
            .doctor-main-scroll {
              padding: 18px 16px 32px;
              overflow-x: hidden;
              max-width: 100%;
            }
          }
        `}</style>
      </head>
      <body style={{ margin: 0, padding: 0, minHeight: '100vh', width: '100%', maxWidth: '100%', overflowX: 'hidden', backgroundColor: 'var(--color-cream-base, #FAF6EE)' }}>
        <DoctorAuthProvider>
          <BrandToaster />
          <DoctorLayoutInner>{children}</DoctorLayoutInner>
        </DoctorAuthProvider>
      </body>
    </html>
  );
}
