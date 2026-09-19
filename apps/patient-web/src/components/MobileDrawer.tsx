'use client';

import React from 'react';
import Link from 'next/link';
import { SolarIcon } from './SolarIcon';
import { ChekupCrossLogo } from './Navbar';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--color-drawer-backdrop)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Drawer Content */}
      <div
        style={{
          position: 'relative',
          width: '85%',
          maxWidth: '320px',
          background: 'var(--color-chocolate-base)',
          height: '100%',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px var(--color-drawer-shadow)',
          zIndex: 101,
          borderRight: '1px solid var(--color-gold-border)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '9px',
              textDecoration: 'none',
            }}
          >
            <ChekupCrossLogo size={24} />
            <span
              style={{
                fontFamily: 'var(--font-heading), sans-serif',
                fontSize: '1.2rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              <span style={{ color: 'var(--color-white)' }}>Chekup</span>
              <span style={{ color: 'var(--color-gold-base)' }}>247</span>
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-gold-base)',
              padding: '4px',
            }}
            aria-label="Close menu"
          >
            <SolarIcon name="close-circle-linear" size={24} color="var(--color-gold-base)" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            fontSize: '1rem',
            fontWeight: 500,
            color: 'var(--color-white-85)',
          }}
        >
          <Link
            href="/"
            onClick={onClose}
            style={{
              color: 'var(--color-gold-base)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Home</span>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-gold-base)' }} />
          </Link>
          <Link href="/doctors" onClick={onClose} style={{ color: 'var(--color-white-85)' }}>
            Doctor Consultation
          </Link>
          <Link href="/how-it-works" onClick={onClose} style={{ color: 'var(--color-white-85)' }}>
            How It Works
          </Link>
          <Link href="/for-doctors" onClick={onClose} style={{ color: 'var(--color-white-85)' }}>
            For Providers
          </Link>
          <Link href="/about" onClick={onClose} style={{ color: 'var(--color-white-85)' }}>
            About
          </Link>

          <div
            style={{
              height: '1px',
              background: 'var(--color-white-10)',
              margin: '8px 0',
            }}
          />

          <Link href="/bookings" onClick={onClose} style={{ color: 'var(--color-white-72)', fontSize: '0.9rem' }}>
            My Bookings
          </Link>
          <Link href="/prescriptions" onClick={onClose} style={{ color: 'var(--color-white-72)', fontSize: '0.9rem' }}>
            My Prescriptions
          </Link>
          <Link href="/wallet" onClick={onClose} style={{ color: 'var(--color-white-72)', fontSize: '0.9rem' }}>
            My Wallet
          </Link>
          <Link href="/login" onClick={onClose} style={{ color: 'var(--color-white-85)', fontSize: '0.95rem' }}>
            Patient Sign In
          </Link>
          <a
            href={process.env.NEXT_PUBLIC_DOCTOR_PORTAL_URL || 'http://localhost:3001'}
            onClick={onClose}
            style={{ color: 'var(--color-gold-base)', fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none' }}
          >
            Doctor Portal &rarr;
          </a>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
          <Link
            href="/register"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: 'var(--color-gold-primary)',
              color: 'var(--color-chocolate-base)',
              fontWeight: 600,
              fontSize: '0.9rem',
              padding: '12px 20px',
              borderRadius: '12px',
              textDecoration: 'none',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            <span>Get Started</span>
            <SolarIcon name="arrow-right-linear" size={16} color="var(--color-chocolate-base)" />
          </Link>
        </div>
      </div>
    </div>
  );
}
