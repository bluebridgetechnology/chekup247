'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { WifiOff, RefreshCw, AlertTriangle, Calendar, ClipboardList } from 'lucide-react';
import { ChekupCrossLogo } from '../../components/common/ChekupCrossLogo';

export default function DoctorOfflinePage() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      if (navigator.onLine) {
        window.location.reload();
      } else {
        setIsRetrying(false);
      }
    }, 1200);
  };

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        backgroundColor: 'var(--color-cream-base, #FAF6EE)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: '540px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          border: '1px solid rgba(14, 147, 132, 0.2)',
          padding: '40px 24px',
          boxShadow: '0 12px 36px rgba(30, 16, 10, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ChekupCrossLogo size={36} />
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#EF4444',
            }}
          >
            <WifiOff size={24} />
          </div>
        </div>

        <div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.75rem',
              fontWeight: 600,
              color: 'var(--color-chocolate-base, #2A170F)',
              margin: '0 0 8px',
              letterSpacing: '-0.02em',
            }}
          >
            {isOnline ? 'Network Restored!' : 'Clinical Workspace Offline'}
          </h1>
          <p
            style={{
              fontSize: '0.95rem',
              color: '#64748B',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {isOnline
              ? 'Your connection has been restored. Reload to continue patient care and charting.'
              : 'The practice portal lost its connection to ChekUp247 services. Consultations and live data sync are temporarily paused.'}
          </p>
        </div>

        <button
          onClick={handleRetry}
          disabled={isRetrying}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#0E9384',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '0.95rem',
            padding: '12px 28px',
            borderRadius: '12px',
            border: 'none',
            cursor: isRetrying ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(14, 147, 132, 0.35)',
            transition: 'all 0.2s ease',
          }}
        >
          <RefreshCw size={18} className={isRetrying ? 'animate-spin' : ''} />
          {isRetrying ? 'Reconnecting to Practice...' : 'Reconnect Now'}
        </button>

        {/* Clinical Safety Alert */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '16px',
            padding: '16px',
            textAlign: 'left',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              padding: '6px',
              backgroundColor: '#F59E0B',
              borderRadius: '8px',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AlertTriangle size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#92400E', marginBottom: '2px' }}>
              Clinical Continuity Notice
            </div>
            <div style={{ fontSize: '0.825rem', color: '#B45309', lineHeight: 1.4 }}>
              Active video calls (Daily.co) and electronic prescription signing (ICD-10) require an active encrypted connection. If you are mid-consultation, please switch to mobile hotspot or notify your patient via SMS.
            </div>
          </div>
        </div>

        {/* Cached views */}
        <div style={{ width: '100%', borderTop: '1px solid #E2E8F0', paddingTop: '20px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Cached Practice Data
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Link
              href="/calendar"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: '#F1F5F9',
                color: '#1E293B',
                fontSize: '0.85rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              <Calendar size={16} color="#0E9384" />
              <span>Schedule</span>
            </Link>
            <Link
              href="/appointments"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: '#F1F5F9',
                color: '#1E293B',
                fontSize: '0.85rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              <ClipboardList size={16} color="#0E9384" />
              <span>Appointments</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
