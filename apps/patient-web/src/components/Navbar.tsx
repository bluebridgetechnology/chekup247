'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, X, ShieldCheck, Video, User } from 'lucide-react';
import { MobileDrawer } from './MobileDrawer';
import { useAuth } from '../context/AuthContext';
import { NotificationBell } from './NotificationBell';

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
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-slate-200)',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '72px',
          }}
        >
          {/* Brand Logo */}
          <Link
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 800,
              fontSize: '1.35rem',
              color: 'var(--color-brand-600)',
              letterSpacing: '-0.03em',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-700) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 10px rgba(14, 147, 132, 0.3)',
              }}
            >
              <Video size={20} />
            </div>
            <span>
              ChekUp<span style={{ color: 'var(--color-slate-900)' }}>247</span>
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '28px',
            }}
            className="desktop-nav"
          >
            <Link
              href="/doctors"
              style={{
                fontSize: '0.925rem',
                fontWeight: 600,
                color: 'var(--color-brand-600)',
                transition: 'color 0.2s',
              }}
            >
              Find a Doctor
            </Link>
            <Link
              href="/how-it-works"
              style={{
                fontSize: '0.925rem',
                fontWeight: 500,
                color: 'var(--color-slate-700)',
                transition: 'color 0.2s',
              }}
            >
              How It Works
            </Link>

            <Link
              href="/pricing"
              style={{
                fontSize: '0.925rem',
                fontWeight: 500,
                color: 'var(--color-slate-700)',
                transition: 'color 0.2s',
              }}
            >
              Pricing
            </Link>
            <Link
              href="/about"
              style={{
                fontSize: '0.925rem',
                fontWeight: 500,
                color: 'var(--color-slate-700)',
                transition: 'color 0.2s',
              }}
            >
              About
            </Link>
            <Link
              href="/faq"
              style={{
                fontSize: '0.925rem',
                fontWeight: 500,
                color: 'var(--color-slate-700)',
                transition: 'color 0.2s',
              }}
            >
              FAQ
            </Link>
            <Link
              href="/contact"
              style={{
                fontSize: '0.925rem',
                fontWeight: 500,
                color: 'var(--color-slate-700)',
                transition: 'color 0.2s',
              }}
            >
              Contact
            </Link>
          </nav>

          {/* Action CTAs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
            className="desktop-ctas"
          >
            <a
              href="http://localhost:3001"
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-brand-600)',
                padding: '8px 14px',
                borderRadius: '8px',
              }}
            >
              Doctor Portal
            </a>
            {isAuthenticated && user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Link
                  href="/bookings"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--color-slate-700)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    transition: 'color 0.2s',
                  }}
                >
                  My Bookings
                </Link>
                <Link
                  href="/prescriptions"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--color-slate-700)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    transition: 'color 0.2s',
                  }}
                >
                  Prescriptions
                </Link>
                <Link
                  href="/wallet"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--color-slate-700)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    transition: 'color 0.2s',
                  }}
                >
                  Wallet
                </Link>
                <NotificationBell />
                <Link
                  href="/profile"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--color-brand-50)',
                    color: 'var(--color-brand-700)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    border: '1px solid var(--color-brand-200)',
                  }}
                >
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--color-brand-500)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                    }}
                  >
                    {user.fullName ? user.fullName[0].toUpperCase() : 'P'}
                  </div>
                  <span>{user.fullName?.split(' ')[0] || 'My Profile'}</span>
                </Link>
                <button
                  onClick={() => logout()}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-slate-500)',
                    fontSize: '0.85rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: '6px 10px',
                  }}
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link
                  href="/login"
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--color-slate-700)',
                    padding: '8px 14px',
                  }}
                >
                  Sign In
                </Link>
                <Link href="/register" className="btn-primary">
                  <User size={16} />
                  <span>Register</span>
                </Link>
              </div>
            )}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                color: 'var(--color-slate-700)',
              }}
              className="mobile-toggle"
              aria-label="Toggle Navigation"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <style jsx global>{`
        @media (max-width: 768px) {
          .desktop-nav {
            display: none !important;
          }
          .desktop-ctas a {
            display: none !important;
          }
          .mobile-toggle {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
}
