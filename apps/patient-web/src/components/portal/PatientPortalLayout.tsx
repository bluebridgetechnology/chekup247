'use client';

import React, { useState } from 'react';
import { PatientPortalHeader } from './PatientPortalHeader';
import { PatientPortalSidebar } from './PatientPortalSidebar';
import { Footer } from '../Footer';

interface PatientPortalLayoutProps {
  children: React.ReactNode;
  activeNavKey?: string;
}

export function PatientPortalLayout({
  children,
  activeNavKey = 'appointments',
}: PatientPortalLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div
      style={{
        height: '100vh',
        backgroundColor: '#F8F4EC', // Warm cream application canvas
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden', // Prevents outer document scroll; allows independent workspace scroll
      }}
      className="patient-portal-app"
    >
      {/* 1. Dedicated Top Application Header (72px, Dark Chocolate) */}
      <PatientPortalHeader
        isMobileSidebarOpen={mobileSidebarOpen}
        onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
      />

      {/* 2. Application Body: Fixed/Stationary Sidebar + Independently Scrollable Workspace */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          width: '100%',
          height: 'calc(100vh - 72px)',
          overflow: 'hidden',
          position: 'relative',
        }}
        className="portal-layout-body"
      >
        {/* Left Application Navigation Sidebar (Stationary / Independent scroll with hidden scrollbar) */}
        <PatientPortalSidebar
          activeNavKey={activeNavKey}
          isMobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
        />

        {/* Main Content Workspace (Independently Scrolls) */}
        <div
          id="main-content"
          tabIndex={-1}
          style={{
            flex: 1,
            outline: 'none',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden',
            minWidth: 0,
            height: '100%',
          }}
          className="portal-main-area"
        >
          {/* Workspace Page Content */}
          <div style={{ flex: 1 }}>
            {children}
          </div>

          {/* 3. Patient Area Compact Footer (Copyright section only, no marketing menus) */}
          <Footer compact />
        </div>
      </div>
    </div>
  );
}
