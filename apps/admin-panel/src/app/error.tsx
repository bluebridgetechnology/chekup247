'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function AdminErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AdminPanel Global Error Boundary]:', error);
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
      <div className="admin-card" style={{ maxWidth: '520px', padding: '36px', background: '#FDFBF7' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'rgba(223, 171, 98, 0.15)',
            border: '1px solid rgba(223, 171, 98, 0.3)',
            color: '#DFAB62',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
          }}
        >
          <AlertTriangle size={32} />
        </div>

        <h1 style={{ fontSize: '1.75rem', color: '#2A170F', marginBottom: '12px', fontWeight: 800 }}>
          Admin Console Error
        </h1>
        <p style={{ color: '#6B7280', marginBottom: '28px', lineHeight: 1.6, fontSize: '0.92rem' }}>
          An unexpected error occurred while executing the requested administrative operation. System audit logs and diagnostics have been preserved.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <button
            onClick={() => reset()}
            className="btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <RotateCcw size={17} />
            <span>Retry Action</span>
          </button>
          <Link
            href="/"
            className="btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              textDecoration: 'none',
            }}
          >
            <Home size={17} />
            <span>Admin Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
