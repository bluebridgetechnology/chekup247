'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import '../styles/globals.css';
import { AdminSidebar } from '../components/AdminSidebar';
import { AdminHeader } from '../components/AdminHeader';
import { AdminAuthProvider, useAdminAuth } from '../context/AdminAuthContext';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { admin } = useAdminAuth();
  const isLoginPage = pathname === '/login';
  const isChangePasswordPage = pathname === '/change-password';

  // Force a password change before anything else is reachable
  useEffect(() => {
    if (admin?.mustChangePassword && !isChangePasswordPage) {
      router.replace('/change-password');
    }
  }, [admin, isChangePasswordPage, router]);

  if (isLoginPage || isChangePasswordPage) {
    return (
      <div
        style={{
          minHeight: '100vh',
          width: '100%',
          maxWidth: '100%',
          backgroundColor: 'var(--color-cream-base, #FAF6EE)',
          overflowY: 'auto',
        }}
      >
        {children}
      </div>
    );
  }

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
      {/* WCAG AA Skip Link */}
      <a href="#admin-main-content" className="skip-to-content">
        Skip to admin governance
      </a>

      {/* Collapsible Sidebar */}
      <AdminSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
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
          backgroundColor: 'var(--color-cream-base, #FAF6EE)',
        }}
      >
        <AdminHeader />
        <main
          id="admin-main-content"
          style={{
            flex: 1,
            padding: '32px',
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

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>ChekUp247 Isolated Admin Console</title>
        <meta
          name="description"
          content="Telehealth Governance, Doctor HPCSA Verification, Financial Ledger and Platform Settings"
        />
      </head>
      <body
        suppressHydrationWarning
        style={{
          margin: 0,
          padding: 0,
          overflow: 'hidden',
          backgroundColor: 'var(--color-cream-base, #FAF6EE)',
        }}
      >
        <AdminAuthProvider>
          <AdminLayoutInner>{children}</AdminLayoutInner>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
