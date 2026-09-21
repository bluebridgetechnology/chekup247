'use client';

import React from 'react';
import Link from 'next/link';
import { Stethoscope, Home, Calendar } from 'lucide-react';

export default function DoctorNotFound() {
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
      <div style={{ maxWidth: '520px' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'var(--color-brand-50, #e6f7f5)',
            color: 'var(--color-brand-600, #0e9384)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
          }}
        >
          <Stethoscope size={32} />
        </div>

        <span style={{ color: '#0e9384', fontWeight: 800, fontSize: '0.9rem' }}>
          404 — PORTAL VIEW NOT FOUND
        </span>

        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '2rem',
            color: '#0f172a',
            marginTop: '8px',
            marginBottom: '14px',
            fontWeight: 'var(--font-heading-weight, 400)',
          }}
        >
          Clinical Resource Not Found
        </h1>

        <p
          style={{
            color: '#64748b',
            fontSize: '1rem',
            lineHeight: 1.6,
            marginBottom: '32px',
          }}
        >
          The doctor portal page or appointment record you are trying to access does not exist or has moved.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: '#0e9384',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <Home size={18} />
            <span>Doctor Dashboard</span>
          </Link>
          <Link
            href="/calendar"
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
            <Calendar size={18} />
            <span>Manage Calendar</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
