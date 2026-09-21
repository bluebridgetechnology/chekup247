'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { WifiOff, RefreshCw, PhoneCall, Calendar, FileText, ArrowLeft } from 'lucide-react';
import { ChekupCrossLogo } from '../../components/common/ChekupCrossLogo';

export default function PatientOfflinePage() {
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
          maxWidth: '520px',
          width: '100%',
          backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
          borderRadius: '24px',
          border: '1px solid rgba(223, 171, 98, 0.25)',
          padding: '40px 24px',
          boxShadow: '0 12px 36px rgba(42, 23, 15, 0.08)',
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
            {isOnline ? 'Connection Restored!' : 'You Are Currently Offline'}
          </h1>
          <p
            style={{
              fontSize: '0.95rem',
              color: 'var(--color-cream-text-muted, #6B5E55)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {isOnline
              ? 'Your internet connection is back. Tap below to reload your consultation workspace.'
              : 'It seems your internet connection was lost. ChekUp247 will automatically reconnect as soon as signal returns.'}
          </p>
        </div>

        <button
          onClick={handleRetry}
          disabled={isRetrying}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--color-gold-primary, #E2B467)',
            color: 'var(--color-chocolate-base, #2A170F)',
            fontWeight: 600,
            fontSize: '0.95rem',
            padding: '12px 28px',
            borderRadius: '12px',
            border: 'none',
            cursor: isRetrying ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(226, 180, 103, 0.35)',
            transition: 'all 0.2s ease',
          }}
        >
          <RefreshCw size={18} className={isRetrying ? 'animate-spin' : ''} />
          {isRetrying ? 'Checking Network...' : 'Retry Connection'}
        </button>

        {/* Emergency Medical Care Warning Banner */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
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
              backgroundColor: '#EF4444',
              borderRadius: '8px',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <PhoneCall size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#991B1B', marginBottom: '2px' }}>
              Medical Emergency Notice
            </div>
            <div style={{ fontSize: '0.825rem', color: '#B91C1C', lineHeight: 1.4 }}>
              If you or someone nearby requires immediate urgent medical intervention, dial <strong>112</strong> (national emergency) or <strong>082 911</strong> (Netcare) directly from your phone.
            </div>
          </div>
        </div>

        {/* Quick links to cached views */}
        <div style={{ width: '100%', borderTop: '1px solid rgba(42, 23, 15, 0.08)', paddingTop: '20px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-cream-text-secondary, #7A6A60)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
            Available Cached Views
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Link
              href="/appointments"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(223, 171, 98, 0.12)',
                color: 'var(--color-chocolate-base, #2A170F)',
                fontSize: '0.85rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              <Calendar size={16} color="var(--color-gold-dark, #C9944A)" />
              <span>Appointments</span>
            </Link>
            <Link
              href="/prescriptions"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(223, 171, 98, 0.12)',
                color: 'var(--color-chocolate-base, #2A170F)',
                fontSize: '0.85rem',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              <FileText size={16} color="var(--color-gold-dark, #C9944A)" />
              <span>Prescriptions</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
