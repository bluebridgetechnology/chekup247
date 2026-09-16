'use client';

import React from 'react';
import Link from 'next/link';
import { Video, Home, Search, HelpCircle, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 24px',
        textAlign: 'center',
        background: 'radial-gradient(100% 100% at 50% 0%, #f0fdf4 0%, #ffffff 80%)',
      }}
    >
      <div style={{ maxWidth: '560px' }}>
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '20px',
            background: 'var(--color-brand-50)',
            color: 'var(--color-brand-600)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px auto',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <Video size={40} />
        </div>

        <span
          style={{
            color: 'var(--color-brand-600)',
            fontWeight: 800,
            fontSize: '1rem',
            letterSpacing: '0.05em',
          }}
        >
          404 — PAGE NOT FOUND
        </span>

        <h1
          style={{
            fontSize: 'clamp(2rem, 4vw, 2.5rem)',
            color: 'var(--color-slate-900)',
            marginTop: '8px',
            marginBottom: '16px',
            fontWeight: 800,
          }}
        >
          We Couldn&apos;t Find That Healthcare Page
        </h1>

        <p
          style={{
            color: 'var(--color-slate-600)',
            fontSize: '1.05rem',
            lineHeight: 1.6,
            marginBottom: '36px',
          }}
        >
          The page you requested may have been moved, rescheduled, or does not exist. Let&apos;s get you back on track to your doctor consultation.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/" className="btn-primary touch-target">
            <Home size={18} />
            <span>Return to Homepage</span>
          </Link>
          <Link href="/doctors" className="btn-secondary touch-target">
            <Search size={18} />
            <span>Find a Doctor</span>
          </Link>
          <Link href="/faq" className="btn-secondary touch-target">
            <HelpCircle size={18} />
            <span>Help Center</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
