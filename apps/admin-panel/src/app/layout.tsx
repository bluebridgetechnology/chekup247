'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import '../styles/globals.css';
import { AdminSidebar } from '../components/AdminSidebar';
import { AdminHeader } from '../components/AdminHeader';
import { AdminAuthProvider } from '../context/AdminAuthContext';

function AdminLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return (
      <div style={{ minHeight: '100vh', width: '100vw', background: '#090d16', overflowY: 'auto' }}>
        {children}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#0f172a' }}>
      <AdminSidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflowY: 'auto' }}>
        <AdminHeader />
        <main style={{ flex: 1, padding: '32px' }}>
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
    <html lang="en">
      <head>
        <title>ChekUp247 Isolated Admin Console</title>
        <meta
          name="description"
          content="Telehealth Governance, Doctor HPCSA Verification, Financial Ledger and Platform Settings"
        />
      </head>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        <AdminAuthProvider>
          <AdminLayoutInner>{children}</AdminLayoutInner>
        </AdminAuthProvider>
      </body>
    </html>
  );
}
