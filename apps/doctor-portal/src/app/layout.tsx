'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import '../styles/globals.css';
import { CollapsibleSidebar } from '../components/CollapsibleSidebar';
import { DoctorHeader } from '../components/DoctorHeader';
import { DoctorAuthProvider } from '../context/DoctorAuthContext';

function DoctorLayoutInner({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const isAuthPage =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/callback';

  if (isAuthPage) {
    return (
      <div style={{ minHeight: '100vh', width: '100vw', overflowY: 'auto', background: 'var(--color-slate-50)' }}>
        {children}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: 'var(--color-slate-50)' }}>
      <CollapsibleSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflowY: 'auto' }}>
        <DoctorHeader />
        <main style={{ flex: 1, padding: '32px' }}>
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
      </head>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        <DoctorAuthProvider>
          <DoctorLayoutInner>{children}</DoctorLayoutInner>
        </DoctorAuthProvider>
      </body>
    </html>
  );
}
