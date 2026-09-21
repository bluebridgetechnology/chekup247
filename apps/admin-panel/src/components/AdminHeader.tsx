'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Clock, LogOut, Shield, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Executive Analytics',
  '/bookings': 'Consultations & Bookings',
  '/consultations/live': 'Live Telehealth Sessions',
  '/transactions': 'Financial Ledger',
  '/payouts': 'Doctor Payout Batches',
  '/disputes': 'Dispute Resolution',
  '/disputes/cases': 'Dispute Case Files',
  '/doctors/verification': 'HPCSA Verification Queue',
  '/doctors': 'Doctor Registry',
  '/users/patients': 'Patient Directory',
  '/admins': 'Admin User Accounts',
  '/notifications': 'Notifications Console',
  '/reviews': 'Review Moderation',
  '/audit-logs': 'POPIA Compliance Audit Trail',
  '/security': 'Platform Security & Policies',
  '/settings': 'System Platform Settings',
};

export function AdminHeader() {
  const pathname = usePathname();
  const { admin, logout } = useAdminAuth();
  const [sessionSecondsRemaining, setSessionSecondsRemaining] = useState(1776); // 29:36 format default

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const pageLabel = ROUTE_LABELS[pathname] || 'Governance Console';

  const initials = admin?.fullName
    ? admin.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'CM';

  const isSuperAdmin = admin?.adminSubRole !== 'support';

  return (
    <header
      style={{
        height: 'var(--admin-topbar-h, 64px)',
        minHeight: 'var(--admin-topbar-h, 64px)',
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E9E0D5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Left: Dynamic Breadcrumb & Subtle Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.72rem',
              color: '#766C64',
              fontWeight: 500,
            }}
          >
            <span>Governance</span>
            <span style={{ color: '#DFA34F' }}>/</span>
            <span style={{ color: '#B98232' }}>{pageLabel}</span>
          </div>
          <h2
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#201712',
              lineHeight: 1.2,
              margin: '2px 0 0 0',
            }}
          >
            {pageLabel}
          </h2>
        </div>
      </div>

      {/* Right Controls: Session Timer, Admin Identity & Logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

        {/* Session Expiry Indicator (Visually Secondary) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.78rem',
            color: '#766C64',
            fontWeight: 500,
          }}
        >
          <Clock size={14} color="#766C64" />
          <span>Session: <strong style={{ color: '#201712', fontWeight: 600 }}>{formatTime(sessionSecondsRemaining)}</strong></span>
        </div>

        {/* Admin Identity Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingLeft: '14px',
            borderLeft: '1px solid #E9E0D5',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              background: '#2B170F',
              border: '1px solid #DFA34F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#DFA34F',
              fontWeight: 700,
              fontSize: '0.8rem',
              letterSpacing: '-0.02em',
            }}
          >
            {initials}
          </div>
          <div>
            <div
              style={{
                fontSize: '0.825rem',
                fontWeight: 700,
                color: '#201712',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              {admin?.fullName || 'ChekUp247 Master Administrator'}
            </div>
            <div
              style={{
                fontSize: '0.65rem',
                color: isSuperAdmin ? '#B98232' : '#766C64',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {isSuperAdmin ? 'Super Admin' : 'Support Admin'}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => logout()}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: '1px solid #E9E0D5',
            background: '#FFFFFF',
            color: '#766C64',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Sign out of Admin Session"
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#2B170F';
            e.currentTarget.style.color = '#201712';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E9E0D5';
            e.currentTarget.style.color = '#766C64';
          }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
