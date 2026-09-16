'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Home } from 'lucide-react';

export default function AdminNotFound() {
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
            borderRadius: '16px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
          }}
        >
          <Shield size={32} />
        </div>

        <span style={{ color: '#64748b', fontWeight: 800, fontSize: '0.85rem' }}>
          404 — ADMIN RESOURCE NOT FOUND
        </span>

        <h1
          style={{
            fontSize: '1.85rem',
            color: '#0f172a',
            marginTop: '8px',
            marginBottom: '14px',
            fontWeight: 800,
          }}
        >
          Administrative Route Not Found
        </h1>

        <p style={{ color: '#64748b', marginBottom: '28px', lineHeight: 1.6 }}>
          The requested administration console URL, ledger entry, or doctor verification profile was not found.
        </p>

        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#0f172a',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <Home size={18} />
          <span>Admin Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
