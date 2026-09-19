'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SolarIcon } from './SolarIcon';
import { MobileDrawer } from './MobileDrawer';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';

/**
 * Precision Chekup247 Brand Medical Cross Mark
 * Diagonal seam and light reflection glint matching the design reference
 */
export function ChekupCrossLogo({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="crossGoldGrad" x1="3" y1="2" x2="25" y2="26" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-gold-light)" />
          <stop offset="50%" stopColor="var(--color-gold-base)" />
          <stop offset="100%" stopColor="var(--color-gold-dark)" />
        </linearGradient>
        <clipPath id="crossClipShape">
          <rect x="9.5" y="1.5" width="9" height="25" rx="4.5" />
          <rect x="1.5" y="9.5" width="25" height="9" rx="4.5" />
        </clipPath>
      </defs>

      <g clipPath="url(#crossClipShape)">
        <rect x="0" y="0" width="28" height="28" fill="url(#crossGoldGrad)" />
        {/* Diagonal split seam */}
        <line
          x1="5"
          y1="23"
          x2="23"
          y2="5"
          stroke="var(--color-chocolate-base)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* Reflection highlight along the diagonal seam */}
        <path
          d="M8.5 21L21 8.5"
          stroke="var(--color-white)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />
        {/* Soft specular reflection */}
        <ellipse cx="17.5" cy="12" rx="3.5" ry="1.8" transform="rotate(-45 17.5 12)" fill="var(--color-white)" fillOpacity="0.3" />
      </g>
    </svg>
  );
}

interface NavItem {
  label: string;
  href: string;
  isActive?: boolean;
}

const NAV_LINKS: NavItem[] = [
  { label: 'Home', href: '/', isActive: true },
  { label: 'Doctor Consultation', href: '/doctors' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'For Providers', href: '/for-doctors' },
  { label: 'About', href: '/about' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'var(--color-chocolate-base)',
          width: '100%',
          borderBottom: 'none',
        }}
      >
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            padding: '0 32px',
            height: '74px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'nowrap',
          }}
          className="header-inner"
        >
          {/* LEFT SIDE: Brand Logo */}
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              flexShrink: 0,
            }}
            aria-label="Chekup247 Home"
          >
            <ChekupCrossLogo size={26} />
            <span
              style={{
                fontSize: '1.28rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1,
                display: 'inline-flex',
                alignItems: 'baseline',
                fontFamily: 'var(--font-heading), sans-serif',
              }}
            >
              <span style={{ color: 'var(--color-white)' }}>Chekup</span>
              <span style={{ color: 'var(--color-gold-base)' }}>247</span>
            </span>
          </Link>

          {/* CENTER: Navigation Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '32px',
            }}
            className="desktop-nav"
            aria-label="Primary Navigation"
          >
            {NAV_LINKS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  position: 'relative',
                  fontSize: '0.875rem',
                  fontWeight: item.isActive ? 600 : 500,
                  color: item.isActive ? 'var(--color-white)' : 'var(--color-white-80)',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                  padding: '6px 0',
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                }}
                className={`nav-link ${item.isActive ? 'active' : ''}`}
              >
                <span>{item.label}</span>
                {item.isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '-2px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '28px',
                      height: '2px',
                      backgroundColor: 'var(--color-gold-base)',
                      borderRadius: '1px',
                    }}
                    aria-hidden="true"
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* RIGHT SIDE: Log In & Primary CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              flexShrink: 0,
            }}
            className="header-actions"
          >
            {isAuthenticated && user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }} className="auth-actions">
                <Link
                  href="/appointments"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: 'var(--color-white-85)',
                    textDecoration: 'none',
                  }}
                  className="auth-link"
                >
                  My Appointments
                </Link>
                <NotificationBell />
                <Link
                  href="/appointments"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '5px 12px',
                    borderRadius: '10px',
                    background: 'var(--color-gold-glow)',
                    color: 'var(--color-gold-base)',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    textDecoration: 'none',
                    border: '1px solid var(--color-gold-glow)',
                  }}
                >
                  <span>{user.fullName?.split(' ')[0] || 'Portal'}</span>
                </Link>
                <button
                  onClick={() => logout()}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-white-65)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '4px 6px',
                  }}
                  className="auth-signout"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: 'var(--color-white-85)',
                  textDecoration: 'none',
                  transition: 'color 0.2s ease',
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                }}
                className="nav-link-login"
              >
                Patient Log In
              </Link>
            )}

            {/* Primary Navigation CTA */}
            <Link
              href="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--color-gold-primary)',
                color: 'var(--color-chocolate-base)',
                fontWeight: 600,
                fontSize: '0.875rem',
                padding: '8px 20px',
                borderRadius: '10px',
                textDecoration: 'none',
                lineHeight: 1,
                height: '38px',
                boxSizing: 'border-box',
                transition: 'all 0.2s ease',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
              className="nav-btn-get-started"
            >
              <span>Get Started</span>
              <SolarIcon name="arrow-right-linear" size={16} color="var(--color-chocolate-base)" />
            </Link>

            {/* Compact Mobile Menu Trigger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                color: 'var(--color-gold-base)',
                marginLeft: '4px',
              }}
              className="mobile-toggle"
              aria-label="Toggle Navigation"
            >
              {mobileOpen ? (
                <SolarIcon name="close-circle-linear" size={24} color="var(--color-gold-base)" />
              ) : (
                <SolarIcon name="hamburger-menu-linear" size={24} color="var(--color-gold-base)" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileDrawer isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}

