'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home, LifeBuoy } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log structured error
    console.error('[PatientWeb Global Error Boundary]:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: '540px' }}>
        <div
          style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
          }}
        >
          <AlertTriangle size={36} />
        </div>

        <span style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.875rem' }}>
          UNEXPECTED APPLICATION ERROR
        </span>

        <h1
          style={{
            fontSize: 'clamp(1.8rem, 3.5vw, 2.25rem)',
            color: 'var(--color-slate-900)',
            marginTop: '8px',
            marginBottom: '14px',
            fontWeight: 800,
          }}
        >
          Something Went Wrong
        </h1>

        <p
          style={{
            color: 'var(--color-slate-600)',
            fontSize: '1rem',
            lineHeight: 1.6,
            marginBottom: '32px',
          }}
        >
          We encountered an unexpected issue while loading this view. Your health data and consultation records remain safe and unaffected.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button onClick={() => reset()} className="btn-primary touch-target">
            <RotateCcw size={18} />
            <span>Try Again</span>
          </button>
          <Link href="/" className="btn-secondary touch-target">
            <Home size={18} />
            <span>Return Home</span>
          </Link>
          <Link href="/contact" className="btn-secondary touch-target">
            <LifeBuoy size={18} />
            <span>Contact Support</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
