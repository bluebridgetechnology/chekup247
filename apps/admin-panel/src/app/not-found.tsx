'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, Home } from 'lucide-react';
import ChekupCrossLogo from '../components/ChekupCrossLogo';

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
      <div className="admin-card" style={{ maxWidth: '520px', padding: '36px', background: '#FDFBF7' }}>
        <div style={{ margin: '0 auto 20px auto', display: 'flex', justifyContent: 'center' }}>
          <ChekupCrossLogo size={56} />
        </div>

        <span style={{ color: '#DFAB62', fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          404 — Administrative Route Not Found
        </span>

        <h1
          style={{
            fontSize: '1.75rem',
            color: '#2A170F',
            marginTop: '8px',
            marginBottom: '14px',
            fontWeight: 800,
          }}
        >
          Console Resource Missing
        </h1>

        <p style={{ color: '#6B7280', marginBottom: '28px', lineHeight: 1.6, fontSize: '0.92rem' }}>
          The requested administration console URL, ledger entry, or doctor verification profile was not found or has been relocated.
        </p>

        <Link
          href="/"
          className="btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
          }}
        >
          <Home size={17} />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
