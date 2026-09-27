'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SolarIcon } from './SolarIcon';
import { MobileDrawer } from './MobileDrawer';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';
import { getDoctorLoginUrl } from '../lib/urls';

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
}

const NAV_LINKS: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Doctor Consultation', href: '/doctors' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'For Providers', href: '/for-doctors' },
];

export function Navbar() {
  const pathname = usePathname() || '';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarMenuRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated, logout } = useAuth();

  // Close the avatar dropdown on outside click.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target as Node)) {
        setAvatarMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initials for the avatar (e.g. "Lerato Khumalo" -> "LK").
  const initials = (user?.fullName || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || 'ME';

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
            {NAV_LINKS.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  style={{
                    position: 'relative',
                    fontSize: '0.875rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? 'var(--color-white)' : 'var(--color-white-80)',
                    textDecoration: 'none',
                    transition: 'color 0.2s ease',
                    padding: '6px 0',
                    display: 'inline-flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    letterSpacing: '-0.01em',
                    whiteSpace: 'nowrap',
                  }}
                  className={`nav-link ${isActive ? 'active' : ''}`}
                >
                  <span>{item.label}</span>
                  {isActive && (
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
              );
            })}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }} className="auth-actions">
                {/* Notifications (self-contained dropdown) */}
                <NotificationBell />

                {/* Avatar + name: clicking navigates to the appointments dashboard;
                    the caret opens a dropdown with the account actions. */}
                <div style={{ position: 'relative' }} ref={avatarMenuRef}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 6px 4px 4px',
                      borderRadius: '9999px',
                      background: 'var(--color-gold-glow)',
                      border: '1px solid var(--color-gold-glow)',
                    }}
                  >
                    <Link
                      href="/appointments"
                      aria-label="Go to my appointments dashboard"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        textDecoration: 'none',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '50%',
                          background: 'var(--color-gold-primary)',
                          color: 'var(--color-chocolate-base)',
                          fontWeight: 800,
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          overflow: 'hidden',
                        }}
                      >
                        {user.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={user.avatarUrl}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          initials
                        )}
                      </span>
                      <span
                        style={{
                          color: 'var(--color-gold-base)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          whiteSpace: 'nowrap',
                          maxWidth: '140px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        className="auth-avatar-name"
                      >
                        {user.fullName?.split(' ')[0] || 'My Account'}
                      </span>
                    </Link>

                    <button
                      onClick={() => setAvatarMenuOpen((v) => !v)}
                      aria-label="Open account menu"
                      aria-expanded={avatarMenuOpen}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '2px',
                        color: 'var(--color-gold-base)',
                      }}
                    >
                      <SolarIcon
                        name={avatarMenuOpen ? 'alt-arrow-up-linear' : 'alt-arrow-down-linear'}
                        size={16}
                        color="var(--color-gold-base)"
                      />
                    </button>
                  </div>

                  {/* Dropdown menu */}
                  {avatarMenuOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 10px)',
                        right: 0,
                        width: '220px',
                        background: '#ffffff',
                        borderRadius: '14px',
                        border: '1px solid var(--color-slate-200, #E5E0D8)',
                        boxShadow: '0 20px 40px -15px rgba(42,23,15,0.25)',
                        overflow: 'hidden',
                        zIndex: 100,
                        animation: 'fadeIn 0.15s ease-out',
                      }}
                    >
                      {/* Signed-in identity header */}
                      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-slate-100, #F0EBE3)' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user.fullName || 'My Account'}
                        </div>
                        {user.email && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-cream-text-muted, #6B5E55)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {user.email}
                          </div>
                        )}
                      </div>

                      <Link
                        href="/appointments"
                        onClick={() => setAvatarMenuOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 16px', color: 'var(--color-chocolate-base, #2A170F)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}
                        className="avatar-menu-item"
                      >
                        <SolarIcon name="calendar-linear" size={16} color="#2A170F" />
                        <span>My Appointments</span>
                      </Link>
                      <Link
                        href="/profile"
                        onClick={() => setAvatarMenuOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 16px', color: 'var(--color-chocolate-base, #2A170F)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}
                        className="avatar-menu-item"
                      >
                        <SolarIcon name="user-linear" size={16} color="#2A170F" />
                        <span>Profile &amp; Settings</span>
                      </Link>
                      <Link
                        href="/settings/notifications"
                        onClick={() => setAvatarMenuOpen(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 16px', color: 'var(--color-chocolate-base, #2A170F)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}
                        className="avatar-menu-item"
                      >
                        <SolarIcon name="bell-linear" size={16} color="#2A170F" />
                        <span>Notification Settings</span>
                      </Link>

                      <button
                        onClick={() => {
                          setAvatarMenuOpen(false);
                          logout();
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '11px 16px', color: '#B91C1C', fontSize: '0.85rem', fontWeight: 700, background: 'transparent', border: 'none', borderTop: '1px solid var(--color-slate-100, #F0EBE3)', cursor: 'pointer', textAlign: 'left' }}
                        className="avatar-menu-item"
                      >
                        <SolarIcon name="logout-2-linear" size={16} color="#B91C1C" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Visible Mobile Quick Sign Out Button */}
                <button
                  onClick={logout}
                  className="nav-mobile-signout-btn"
                  title="Sign Out"
                  aria-label="Sign Out"
                  style={{
                    display: 'none',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(220, 38, 38, 0.15)',
                    border: '1px solid rgba(220, 38, 38, 0.35)',
                    color: '#FCA5A5',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <SolarIcon name="logout-2-linear" size={15} color="#F87171" />
                  <span className="nav-signout-label">Sign Out</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }} className="nav-login-group">
                <Link
                  href="/login"
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--color-white-90, #FDFBF7)',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    whiteSpace: 'nowrap',
                  }}
                  className="nav-link-login"
                >
                  <SolarIcon name="user-linear" size={15} color="var(--color-gold-base)" />
                  <span>Patient Log In</span>
                </Link>

                <a
                  href={getDoctorLoginUrl()}
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--color-chocolate-base)',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--color-gold-base, #DFAB62)',
                    border: '1px solid var(--color-gold-base, #DFAB62)',
                    boxShadow: '0 2px 8px rgba(223, 171, 98, 0.25)',
                    whiteSpace: 'nowrap',
                  }}
                  className="nav-doctor-login-btn"
                  title="Doctor and Healthcare Provider Login"
                >
                  <SolarIcon name="stethoscope-bold" size={15} color="var(--color-chocolate-base)" />
                  <span>Doctor Log In</span>
                </a>
              </div>
            )}

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

