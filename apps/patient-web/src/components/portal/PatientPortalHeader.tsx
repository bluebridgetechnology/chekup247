'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SolarIcon } from '../SolarIcon';
import { useAuth } from '../../context/AuthContext';
import { ChekupCrossLogo } from '../Navbar';
import { NotificationBell } from '../NotificationBell';

interface PatientPortalHeaderProps {
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

export function PatientPortalHeader({
  onToggleMobileSidebar,
  isMobileSidebarOpen,
}: PatientPortalHeaderProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Display user name and initials
  const displayName = user?.fullName || user?.email?.split('@')[0] || 'Patient';
  const initials =
    (user?.fullName || '')
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ||
    (user?.email ? user.email.slice(0, 2).toUpperCase() : 'PT');

  const handleSignOut = async () => {
    setDropdownOpen(false);
    await logout();
    router.push('/login');
  };

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: '72px',
        backgroundColor: '#23150D', // Deep chocolate brown
        borderBottom: '1px solid rgba(223, 171, 98, 0.12)',
        width: '100%',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* LEFT: Chekup247 Brand Logo & Patient Portal Identifier */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Mobile hamburger button with min 44x44 tap target */}
          <button
            onClick={onToggleMobileSidebar}
            style={{
              display: 'none',
              background: 'transparent',
              border: 'none',
              color: '#DFAB62',
              cursor: 'pointer',
              padding: '10px',
              minWidth: '44px',
              minHeight: '44px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="portal-mobile-menu-btn"
            aria-label="Toggle navigation menu"
          >
            {isMobileSidebarOpen ? (
              <SolarIcon name="close-circle-linear" size={22} color="#DFAB62" />
            ) : (
              <SolarIcon name="hamburger-menu-linear" size={22} color="#DFAB62" />
            )}
          </button>

          <Link
            href="/appointments"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
            }}
            aria-label="Chekup247 Patient Portal Home"
          >
            <ChekupCrossLogo size={28} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span
                style={{
                  fontSize: '1.3rem',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  fontFamily: 'var(--font-heading), sans-serif',
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ color: '#FAF6EE' }}>Chekup</span>
                <span style={{ color: '#DFAB62' }}>247</span>
              </span>

              {/* Patient Portal Badge/Label */}
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  color: '#C5A880',
                  opacity: 0.92,
                  whiteSpace: 'nowrap',
                }}
              >
                Patient Portal
              </span>
            </div>
          </Link>
        </div>

        {/* RIGHT: Notifications & Patient Account Control */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Live Notification Bell with API & WebSocket subscription */}
          <NotificationBell variant="portal" />

          {/* Account Control */}
          {user ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px 4px 4px',
                  borderRadius: '24px',
                  minHeight: '44px',
                  transition: 'background-color 0.2s ease',
                }}
                className="portal-account-trigger"
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
              >
                {/* Initials Badge */}
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: '#EAD2B2',
                    color: '#2A170F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.18)',
                  }}
                >
                  {initials}
                </div>

                {/* Patient Name & Dropdown Arrow */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }} className="portal-account-name-block">
                  <span
                    style={{
                      color: '#FAF6EE',
                      fontSize: '0.86rem',
                      fontWeight: 500,
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {displayName}
                  </span>
                  <SolarIcon name="alt-arrow-down-linear" size={13} color="#C5A880" />
                </div>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    width: '210px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '14px',
                    boxShadow: '0 10px 28px rgba(42, 23, 15, 0.14)',
                    border: '1px solid #EDE4D4',
                    padding: '6px',
                    zIndex: 60,
                  }}
                >
                  <div
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #F4EBE1',
                      marginBottom: '4px',
                    }}
                  >
                    <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#2A170F' }}>{displayName}</div>
                    {user.email && (
                      <div style={{ fontSize: '0.74rem', color: '#7A6A60', marginTop: '1px' }}>
                        {user.email}
                      </div>
                    )}
                  </div>

                  <Link
                    href="/appointments"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      color: '#2A170F',
                      fontSize: '0.84rem',
                      fontWeight: 500,
                      textDecoration: 'none',
                      minHeight: '40px',
                      transition: 'background-color 0.15s ease',
                    }}
                    className="portal-dropdown-item"
                  >
                    <SolarIcon name="calendar-linear" size={17} color="#7A6A60" />
                    <span>My Appointments</span>
                  </Link>

                  <Link
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      color: '#2A170F',
                      fontSize: '0.84rem',
                      fontWeight: 500,
                      textDecoration: 'none',
                      minHeight: '40px',
                      transition: 'background-color 0.15s ease',
                    }}
                    className="portal-dropdown-item"
                  >
                    <SolarIcon name="user-linear" size={17} color="#7A6A60" />
                    <span>Profile Details</span>
                  </Link>

                  <Link
                    href="/settings/notifications"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      color: '#2A170F',
                      fontSize: '0.84rem',
                      fontWeight: 500,
                      textDecoration: 'none',
                      minHeight: '40px',
                      transition: 'background-color 0.15s ease',
                    }}
                    className="portal-dropdown-item"
                  >
                    <SolarIcon name="settings-linear" size={17} color="#7A6A60" />
                    <span>Notification Settings</span>
                  </Link>

                  <div style={{ height: '1px', backgroundColor: '#F4EBE1', margin: '4px 0' }} />

                  <button
                    onClick={handleSignOut}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      color: '#DC2626',
                      fontSize: '0.84rem',
                      fontWeight: 500,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      minHeight: '40px',
                      transition: 'background-color 0.15s ease',
                    }}
                    className="portal-dropdown-item"
                  >
                    <SolarIcon name="logout-2-linear" size={17} color="#DC2626" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#EDD5B3',
                color: '#2A170F',
                fontSize: '0.84rem',
                fontWeight: 600,
                padding: '8px 16px',
                borderRadius: '20px',
                textDecoration: 'none',
                minHeight: '38px',
                transition: 'background-color 0.15s ease',
              }}
            >
              <SolarIcon name="user-linear" size={15} color="#2A170F" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
