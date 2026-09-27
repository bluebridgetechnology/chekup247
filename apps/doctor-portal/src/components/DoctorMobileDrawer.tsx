'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SolarIcon } from './common/SolarIcon';
import { ChekupCrossLogo } from './common/ChekupCrossLogo';
import { useDoctorAuth } from '../context/DoctorAuthContext';

interface DoctorMobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { label: 'Overview', href: '/', icon: 'widget-linear' },
  { label: 'Calendar & Shifts', href: '/calendar', icon: 'calendar-linear' },
  { label: 'Appointments Queue', href: '/appointments', icon: 'clock-circle-linear' },
  { label: 'E-Prescriptions', href: '/prescriptions', icon: 'document-text-linear' },
  { label: 'ICD-10 Coding', href: '/icd10', icon: 'stethoscope-linear' },
  { label: 'Earnings & Payouts', href: '/earnings', icon: 'wallet-money-linear' },
  { label: 'My Profile', href: '/profile', icon: 'user-circle-linear' },
];

export function DoctorMobileDrawer({ isOpen, onClose }: DoctorMobileDrawerProps) {
  const pathname = usePathname();
  const { doctor, profile, logout } = useDoctorAuth();

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
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Drawer Content */}
      <div
        style={{
          position: 'relative',
          width: '85%',
          maxWidth: '320px',
          background: 'var(--color-chocolate-base, #2A170F)',
          height: '100%',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          zIndex: 101,
          borderRight: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
          fontFamily: 'var(--font-sans)',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Brand & Close */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ChekupCrossLogo size={26} />
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-heading), sans-serif',
                  fontSize: '1.15rem',
                  fontWeight: 'var(--font-heading-weight, 400)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                <span style={{ color: '#ffffff' }}>Chekup</span>
                <span style={{ color: 'var(--color-gold-base, #DFAB62)' }}>247</span>
              </div>
              <div
                style={{
                  fontSize: '0.68rem',
                  color: 'var(--color-gold-base, #DFAB62)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: '2px',
                }}
              >
                Doctor Practice
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-gold-base, #DFAB62)',
              padding: '4px',
            }}
            aria-label="Close menu"
          >
            <SolarIcon name="close-circle-linear" size={24} color="var(--color-gold-base, #DFAB62)" />
          </button>
        </div>

        {/* If Doctor is Logged In: Dedicated Top Profile Card & Instant Sign Out */}
        {doctor && (
          <div
            style={{
              padding: '14px',
              borderRadius: '14px',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              marginBottom: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'var(--color-gold-pale, #F0E5D3)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  border: '1.5px solid rgba(223, 171, 98, 0.35)',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {(profile?.photoUrl || doctor?.avatarUrl || (profile as any)?.photo_url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile?.photoUrl || doctor?.avatarUrl || (profile as any)?.photo_url || undefined}
                    alt={doctor?.fullName || 'Doctor'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  (doctor?.fullName || 'Doctor')
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doctor?.fullName || 'Dr. Practitioner'}
                </div>
                <div style={{ color: 'var(--color-gold-base, #DFAB62)', fontSize: '0.72rem', fontWeight: 600 }}>
                  HPCSA: {profile?.hpcsaNumber || 'MP Verified'}
                </div>
              </div>
            </div>

            {/* Direct High-Contrast Sign Out Button */}
            <button
              onClick={() => {
                onClose();
                logout();
              }}
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: '10px',
                backgroundColor: 'rgba(220, 38, 38, 0.18)',
                border: '1.5px solid rgba(220, 38, 38, 0.45)',
                color: '#FCA5A5',
                fontSize: '0.85rem',
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
              <span>Sign Out Practice</span>
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flex: 1,
            overflowY: 'auto',
          }}
        >
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.8)',
                  background: isActive ? 'rgba(223, 171, 98, 0.16)' : 'transparent',
                  border: isActive ? '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))' : '1px solid transparent',
                  transition: 'all 0.18s ease',
                  textDecoration: 'none',
                }}
              >
                <SolarIcon
                  name={item.icon}
                  size={18}
                  color={isActive ? 'var(--color-gold-base, #DFAB62)' : 'rgba(255, 255, 255, 0.7)'}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Doctor Info & Sign Out Footer */}
        <div
          style={{
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            marginTop: 'auto',
          }}
        >
        {!doctor ? (
          <Link
            href="/login"
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px 18px',
              borderRadius: 'var(--radius-full, 9999px)',
              background: 'var(--color-gold-base, #DFAB62)',
              color: 'var(--color-chocolate-base, #2A170F)',
              fontSize: '0.9rem',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
          >
            <span>Sign In to Practice Suite</span>
          </Link>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'var(--color-gold-pale, #F0E5D3)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  border: '1.5px solid rgba(223, 171, 98, 0.35)',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {(profile?.photoUrl || doctor?.avatarUrl || (profile as any)?.photo_url) ? (
                  <img
                    src={profile?.photoUrl || doctor?.avatarUrl || (profile as any)?.photo_url || undefined}
                    alt={doctor?.fullName || 'Doctor'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  (doctor?.fullName || 'Doctor')
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join('')
                    .toUpperCase()
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doctor?.fullName || 'Dr. Practitioner'}
                </div>
                <div style={{ color: 'var(--color-gold-base, #DFAB62)', fontSize: '0.72rem' }}>
                  HPCSA: {profile?.hpcsaNumber || 'MP Verified'}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                onClose();
                logout();
              }}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '12px',
                backgroundColor: 'rgba(220, 38, 38, 0.18)',
                border: '1.5px solid rgba(220, 38, 38, 0.45)',
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
              <span>Sign Out Practice</span>
            </button>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
