'use client';

import React from 'react';
import Link from 'next/link';
import { X, Video, User, ShieldCheck } from 'lucide-react';

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
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Drawer Content */}
      <div
        style={{
          position: 'relative',
          width: '80%',
          maxWidth: '320px',
          background: '#ffffff',
          height: '100%',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-xl)',
          zIndex: 101,
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
              gap: '8px',
              fontWeight: 800,
              fontSize: '1.2rem',
              color: 'var(--color-brand-600)',
            }}
          >
            <Video size={20} />
            <span>ChekUp247</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-slate-500)',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Links */}
        <nav
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            fontSize: '1.05rem',
            fontWeight: 500,
            color: 'var(--color-slate-800)',
          }}
        >
          <Link
            href="/doctors"
            onClick={onClose}
            style={{
              color: 'var(--color-brand-600)',
              fontWeight: 700,
            }}
          >
            Find a Doctor
          </Link>
          <Link href="/bookings" onClick={onClose} style={{ fontWeight: 600 }}>
            My Bookings
          </Link>
          <Link href="/wallet" onClick={onClose} style={{ fontWeight: 600 }}>
            My Wallet
          </Link>
          <Link href="/how-it-works" onClick={onClose}>
            How It Works
          </Link>

          <Link href="/pricing" onClick={onClose}>
            Pricing
          </Link>
          <Link href="/about" onClick={onClose}>
            About Us
          </Link>
          <Link href="/faq" onClick={onClose}>
            FAQ
          </Link>
          <Link href="/contact" onClick={onClose}>
            Contact Support
          </Link>
          <div
            style={{
              height: '1px',
              background: 'var(--color-slate-200)',
              margin: '8px 0',
            }}
          />
          <a
            href="http://localhost:3001"
            style={{
              color: 'var(--color-brand-600)',
              fontWeight: 600,
            }}
          >
            Doctor Portal
          </a>
          <a
            href="http://localhost:3002"
            style={{
              color: 'var(--color-slate-600)',
              fontSize: '0.9rem',
            }}
          >
            Admin Panel
          </a>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={onClose}
          >
            <User size={16} />
            <span>Sign In / Register</span>
          </button>
        </div>
      </div>
    </div>
  );
}
