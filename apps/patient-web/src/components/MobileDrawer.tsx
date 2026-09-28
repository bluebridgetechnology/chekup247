'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SolarIcon } from './SolarIcon';
import { ChekupCrossLogo } from './Navbar';
import { useAuth } from '../context/AuthContext';
import { getDoctorLoginUrl } from '../lib/urls';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();

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
          background: 'rgba(10, 5, 2, 0.72)',
          backdropFilter: 'blur(6px)',
        }}
      />

      {/* Drawer Content */}
      <div
        style={{
          position: 'relative',
          width: '84%',
          maxWidth: '320px',
          background: 'var(--color-chocolate-base, #2A170F)',
          height: '100%',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 30px rgba(0, 0, 0, 0.5)',
          zIndex: 101,
          borderRight: '1px solid rgba(223, 171, 98, 0.18)',
          fontFamily: 'var(--font-sans)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Header: Brand & Close Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            paddingBottom: '14px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <Link
            href="/"
            onClick={onClose}
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
                fontSize: '1.25rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              <span style={{ color: '#ffffff' }}>Chekup</span>
              <span style={{ color: 'var(--color-gold-base, #DFAB62)' }}>247</span>
            </span>
          </Link>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-gold-base, #DFAB62)',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close menu"
          >
            <SolarIcon name="close-circle-linear" size={24} color="var(--color-gold-base, #DFAB62)" />
          </button>
        </div>

        {/* If Patient is Logged In: Clean Minimal Identity Header */}
        {isAuthenticated && user && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(223, 171, 98, 0.2)',
              marginBottom: '22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-gold-base, #DFAB62)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user.fullName
                    ? user.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                    : 'P'
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.fullName?.split(' ')[0] || 'My Account'}
                </div>
                <div style={{ color: 'var(--color-gold-base, #DFAB62)', fontSize: '0.7rem' }}>
                  Patient Account
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                logout();
              }}
              style={{
                background: 'rgba(220, 38, 38, 0.15)',
                border: '1px solid rgba(220, 38, 38, 0.35)',
                color: '#FCA5A5',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
              }}
              title="Sign Out"
            >
              <SolarIcon name="logout-2-linear" size={14} color="#F87171" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* Primary Navigation: Clean Text Links */}
        <nav
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '2px' }}>
            Menu
          </div>

          <Link
            href="/"
            onClick={onClose}
            style={{
              color: pathname === '/' ? 'var(--color-gold-base, #DFAB62)' : 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.95rem',
              fontWeight: pathname === '/' ? 600 : 500,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 0',
            }}
          >
            <span>Home</span>
            {pathname === '/' && (
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--color-gold-base, #DFAB62)' }} />
            )}
          </Link>

          <Link
            href="/doctors"
            onClick={onClose}
            style={{
              color: pathname.startsWith('/doctors') ? 'var(--color-gold-base, #DFAB62)' : 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.95rem',
              fontWeight: pathname.startsWith('/doctors') ? 600 : 500,
              textDecoration: 'none',
              padding: '4px 0',
            }}
          >
            Doctor Consultation
          </Link>

          <Link
            href="/how-it-works"
            onClick={onClose}
            style={{
              color: pathname === '/how-it-works' ? 'var(--color-gold-base, #DFAB62)' : 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.95rem',
              fontWeight: pathname === '/how-it-works' ? 600 : 500,
              textDecoration: 'none',
              padding: '4px 0',
            }}
          >
            How It Works
          </Link>

          {isAuthenticated ? (
            <>
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '8px 0' }} />

              <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.4)', marginBottom: '2px' }}>
                My Healthcare
              </div>

              <Link
                href="/appointments"
                onClick={onClose}
                style={{
                  color: pathname === '/appointments' ? 'var(--color-gold-base, #DFAB62)' : 'rgba(255, 255, 255, 0.85)',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  padding: '4px 0',
                }}
              >
                My Appointments
              </Link>
              <Link
                href="/prescriptions"
                onClick={onClose}
                style={{
                  color: pathname === '/prescriptions' ? 'var(--color-gold-base, #DFAB62)' : 'rgba(255, 255, 255, 0.85)',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  padding: '4px 0',
                }}
              >
                My Prescriptions
              </Link>
              <Link
                href="/wallet"
                onClick={onClose}
                style={{
                  color: pathname === '/wallet' ? 'var(--color-gold-base, #DFAB62)' : 'rgba(255, 255, 255, 0.85)',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  padding: '4px 0',
                }}
              >
                My Wallet
              </Link>
              <Link
                href="/profile"
                onClick={onClose}
                style={{
                  color: pathname === '/profile' ? 'var(--color-gold-base, #DFAB62)' : 'rgba(255, 255, 255, 0.85)',
                  fontSize: '0.95rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  padding: '4px 0',
                }}
              >
                Profile &amp; Settings
              </Link>
            </>
          ) : (
            <>
              {/* Divider between navigation and role-based auth sections */}
              <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '8px 0' }} />

              {/* Group 1: I am a Patient (Stacked text links) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-gold-base, #DFAB62)' }}>
                  I am a Patient
                </div>
                <Link
                  href="/login"
                  onClick={onClose}
                  style={{
                    color: 'rgba(255, 255, 255, 0.95)',
                    fontSize: '0.925rem',
                    fontWeight: 500,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '3px 0',
                  }}
                >
                  <SolarIcon name="user-linear" size={15} color="var(--color-gold-base, #DFAB62)" />
                  <span>Patient Sign In</span>
                </Link>
                <Link
                  href="/register"
                  onClick={onClose}
                  style={{
                    color: 'rgba(255, 255, 255, 0.65)',
                    fontSize: '0.85rem',
                    fontWeight: 400,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '1px 0 4px',
                  }}
                >
                  <SolarIcon name="arrow-right-linear" size={13} color="rgba(255, 255, 255, 0.4)" />
                  <span>Create Patient Account</span>
                </Link>
              </div>

              {/* Group 2: I am a Doctor (Stacked text links) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-gold-base, #DFAB62)' }}>
                  I am a Doctor
                </div>
                <Link
                  href="/for-doctors"
                  onClick={onClose}
                  style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '0.925rem',
                    fontWeight: 500,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '3px 0',
                  }}
                >
                  <SolarIcon name="stethoscope-linear" size={15} color="var(--color-gold-base, #DFAB62)" />
                  <span>Provider Information</span>
                </Link>
              </div>
            </>
          )}
        </nav>

        {/* Footer: Prominent Doctor Sign In Button at the bottom */}
        <div style={{ marginTop: 'auto', paddingTop: '24px' }}>
          {isAuthenticated ? (
            <button
              onClick={() => {
                onClose();
                logout();
              }}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '10px',
                backgroundColor: 'rgba(220, 38, 38, 0.15)',
                border: '1.5px solid rgba(220, 38, 38, 0.4)',
                color: '#FCA5A5',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <SolarIcon name="logout-2-linear" size={16} color="#F87171" />
              <span>Sign Out</span>
            </button>
          ) : (
            <a
              href={getDoctorLoginUrl()}
              onClick={onClose}
              style={{
                width: '100%',
                padding: '12px 18px',
                borderRadius: '10px',
                backgroundColor: 'var(--color-gold-base, #DFAB62)',
                color: 'var(--color-chocolate-base, #2A170F)',
                fontSize: '0.9rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                transition: 'all 0.15s ease',
              }}
              title="Doctor Portal Sign In"
            >
              <SolarIcon name="stethoscope-bold" size={16} color="var(--color-chocolate-base, #2A170F)" />
              <span>Doctor Sign In</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
