'use client';

import React from 'react';
import Link from 'next/link';
import { SolarIcon } from './SolarIcon';
import { ChekupCrossLogo } from './Navbar';
import { useAuth } from '../context/AuthContext';
import { getDoctorLoginUrl, getDoctorRegisterUrl } from '../lib/urls';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { user, isAuthenticated, logout } = useAuth();
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
          {!isAuthenticated && (
            <Link href="/login" onClick={onClose} style={{ color: 'var(--color-white-85)', fontSize: '0.95rem' }}>
              Patient Sign In
            </Link>
          )}

          {/* Doctor Portal Quick Access Card */}
          <div
            style={{
              marginTop: '10px',
              padding: '14px',
              borderRadius: '12px',
              backgroundColor: 'rgba(223, 171, 98, 0.08)',
              border: '1px solid rgba(223, 171, 98, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SolarIcon name="user-linear" size={15} color="var(--color-gold-base)" />
              <span style={{ color: 'var(--color-gold-base)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Doctor Portal
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <a
                href={getDoctorLoginUrl()}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--color-gold-base)',
                  color: 'var(--color-chocolate-base)',
                  fontWeight: 700,
                  fontSize: '0.825rem',
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                Doctor Sign In
              </a>
              <a
                href={getDoctorRegisterUrl()}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '9px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  border: '1.5px solid var(--color-gold-base)',
                  color: 'var(--color-gold-base)',
                  fontWeight: 600,
                  fontSize: '0.825rem',
                  textDecoration: 'none',
                  textAlign: 'center',
                }}
              >
                Register
              </a>
            </div>
          </div>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {isAuthenticated ? (
            <>
              <Link
                href="/appointments"
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
                <SolarIcon name="calendar-linear" size={16} color="var(--color-chocolate-base)" />
                <span>My Appointments{user?.fullName ? ` — ${user.fullName.split(' ')[0]}` : ''}</span>
              </Link>
              <button
                onClick={() => {
                  onClose();
                  logout();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'transparent',
                  color: 'var(--color-white-72)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  padding: '10px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-white-20, rgba(255,255,255,0.2))',
                  width: '100%',
                  boxSizing: 'border-box',
                  cursor: 'pointer',
                }}
              >
                <SolarIcon name="logout-2-linear" size={16} color="var(--color-white-72)" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
