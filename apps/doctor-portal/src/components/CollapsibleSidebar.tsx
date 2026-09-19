'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { SolarIcon } from './common/SolarIcon';
import { ChekupCrossLogo } from './common/ChekupCrossLogo';
import { useDoctorAuth } from '../context/DoctorAuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { label: 'Overview', href: '/', icon: 'widget-linear' },
  { label: 'Calendar & Shifts', href: '/calendar', icon: 'calendar-linear' },
  { label: 'Appointments Queue', href: '/appointments', icon: 'clock-circle-linear' },
  { label: 'E-Prescriptions', href: '/prescriptions', icon: 'document-text-linear' },
  { label: 'ICD-10 Coding', href: '/icd10', icon: 'stethoscope-linear' },
  { label: 'Earnings & Payouts', href: '/earnings', icon: 'wallet-money-linear' },
  { label: 'Doctor Profile', href: '/profile', icon: 'user-circle-linear' },
];

export function CollapsibleSidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { doctor, profile, logout } = useDoctorAuth();

  return (
    <aside
      style={{
        width: collapsed ? '74px' : '264px',
        transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        backgroundColor: 'var(--color-chocolate-base, #2A170F)',
        borderRight: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.18))',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 40,
        flexShrink: 0,
        boxShadow: '4px 0 24px rgba(42, 23, 15, 0.15)',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: '74px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0' : '0 20px',
          borderBottom: '1px solid rgba(223, 171, 98, 0.12)',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            overflow: 'hidden',
          }}
          title="ChekUp247 Doctor Practice"
        >
          <ChekupCrossLogo size={28} />
          {!collapsed && (
            <div style={{ whiteSpace: 'nowrap' }}>
              <div
                style={{
                  fontFamily: 'var(--font-heading), sans-serif',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ color: '#ffffff' }}>Chekup</span>
                <span style={{ color: 'var(--color-gold-base, #DFAB62)' }}>247</span>
              </div>
              <div
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--color-gold-base, #DFAB62)',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginTop: '3px',
                }}
              >
                Practice Suite
              </div>
            </div>
          )}
        </Link>

        {!collapsed && (
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-gold-base, #DFAB62)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.8,
              transition: 'opacity 0.2s ease',
            }}
            title="Collapse navigation"
          >
            <ChevronLeft size={18} />
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav
        style={{
          flex: 1,
          padding: '20px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          overflowY: 'auto',
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: collapsed ? '12px 0' : '10px 14px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: '12px',
                color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.72)',
                backgroundColor: isActive ? 'rgba(223, 171, 98, 0.16)' : 'transparent',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.88rem',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                border: isActive
                  ? '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))'
                  : '1px solid transparent',
                position: 'relative',
                textDecoration: 'none',
              }}
              title={collapsed ? item.label : undefined}
            >
              {/* Left active gold bar */}
              {isActive && !collapsed && (
                <span
                  style={{
                    position: 'absolute',
                    left: '0',
                    top: '20%',
                    bottom: '20%',
                    width: '3px',
                    backgroundColor: 'var(--color-gold-primary, #E2B467)',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
              <SolarIcon
                name={item.icon}
                size={20}
                color={isActive ? 'var(--color-gold-base, #DFAB62)' : 'rgba(255, 255, 255, 0.7)'}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Practice & Profile Area */}
      <div
        style={{
          padding: collapsed ? '16px 8px' : '16px 14px',
          borderTop: '1px solid rgba(223, 171, 98, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {collapsed ? (
          <button
            onClick={onToggle}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '10px',
              padding: '8px 0',
              cursor: 'pointer',
              color: 'var(--color-gold-base, #DFAB62)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
            title="Expand sidebar"
          >
            <ChevronRight size={18} />
          </button>
        ) : (
          <>
            <Link
              href="/profile"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(223, 171, 98, 0.2)',
                textDecoration: 'none',
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: 'var(--color-gold-pale, #F0E5D3)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  flexShrink: 0,
                }}
              >
                {doctor?.fullName ? doctor.fullName.substring(0, 2).toUpperCase() : 'DR'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.825rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {doctor?.fullName || 'Dr. Practitioner'}
                </div>
                <div
                  style={{
                    color: 'var(--color-gold-base, #DFAB62)',
                    fontSize: '0.7rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <ShieldCheck size={11} />
                  <span>HPCSA Active</span>
                </div>
              </div>
            </Link>

            <button
              onClick={() => logout()}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '6px',
                transition: 'color 0.18s ease',
              }}
              title="Sign out of practice suite"
            >
              <LogOut size={13} />
              <span>Sign Out Practice</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
