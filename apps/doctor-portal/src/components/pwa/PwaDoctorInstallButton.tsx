'use client';

import React from 'react';
import { Download, WifiOff, RefreshCw, X } from 'lucide-react';
import { useDoctorPwa } from '../../context/DoctorPwaContext';
import { ChekupCrossLogo } from '../common/ChekupCrossLogo';

export function DoctorPwaAlerts() {
  const { isOnline, hasUpdate, applyUpdate } = useDoctorPwa();

  // 1. Offline Alert
  if (!isOnline) {
    return (
      <div
        role="alert"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          backgroundColor: '#EF4444',
          color: '#FFFFFF',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <WifiOff size={16} />
        <span>Clinical Workspace is offline. Consultations require active network connection.</span>
      </div>
    );
  }

  // 2. Update Available Alert
  if (hasUpdate) {
    return (
      <div
        role="status"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9998,
          backgroundColor: '#1E100A',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: '14px',
          border: '1px solid #0E9384',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={16} className="animate-spin" color="#0E9384" />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
            Practice update available.
          </span>
        </div>
        <button
          onClick={applyUpdate}
          style={{
            backgroundColor: '#0E9384',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '0.8rem',
            padding: '6px 14px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    );
  }

  return null;
}

export function DoctorPwaInstallPrompt() {
  const { isInstallable, isInstalled, isDismissed, promptInstall, dismissInstall } = useDoctorPwa();

  if (isInstalled || isDismissed || !isInstallable) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 9990,
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(14, 147, 132, 0.3)',
        borderRadius: '16px',
        padding: '14px 18px',
        boxShadow: '0 12px 32px rgba(30, 16, 10, 0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        maxWidth: '380px',
      }}
    >
      <ChekupCrossLogo size={28} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1E100A' }}>
          Install Practice Workspace
        </div>
        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
          Add to desktop or tablet dock for quick clinical access
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={() => promptInstall()}
          style={{
            backgroundColor: '#0E9384',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '0.8rem',
            padding: '6px 12px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <Download size={14} />
          <span>Install</span>
        </button>
        <button
          onClick={dismissInstall}
          aria-label="Dismiss install prompt"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94A3B8',
            cursor: 'pointer',
            padding: '4px',
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
