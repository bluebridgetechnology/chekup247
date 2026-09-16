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
      <div style={{ maxWidth: '500px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
          }}
        >
          <AlertTriangle size={32} />
        </div>

        <h1 style={{ fontSize: '1.75rem', color: '#0f172a', marginBottom: '12px', fontWeight: 800 }}>
          Admin Console Error
        </h1>
        <p style={{ color: '#64748b', marginBottom: '28px', lineHeight: 1.6 }}>
          An error occurred while executing the requested administrative operation. System audit logs have been recorded.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
          <button
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#0f172a',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={18} />
            <span>Retry Action</span>
          </button>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#f1f5f9',
              color: '#334155',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Home size={18} />
            <span>Admin Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
