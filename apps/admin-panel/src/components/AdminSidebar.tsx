'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  Users,
  CheckCircle,
  FileSpreadsheet,
  Settings,
  Activity,
  Lock,
  Layers,
} from 'lucide-react';

const adminNav = [
  { label: 'Verification Queue', href: '/doctors/verification', icon: CheckCircle },
  { label: 'Doctor Directory', href: '/doctors', icon: Users },
  { label: 'Consultations & Bookings', href: '/consultations', icon: Layers },
  { label: 'Financial Ledger & Payouts', href: '/ledger', icon: FileSpreadsheet },
  { label: 'Audit Logs (POPIA)', href: '/audit-logs', icon: Activity },
  { label: 'Platform Settings', href: '/settings', icon: Settings },
];


export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: '260px',
        background: '#090d16',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        zIndex: 40,
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: '72px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 20px',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)',
          }}
        >
          <Lock size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#ffffff' }}>
            ChekUp<span style={{ color: 'var(--color-brand-400)' }}>247</span>
          </div>
          <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700, letterSpacing: '0.05em' }}>
            ISOLATED ADMIN
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav
        style={{
          flex: 1,
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          overflowY: 'auto',
        }}
      >
        {adminNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                color: isActive ? '#ffffff' : '#94a3b8',
                background: isActive ? '#1e293b' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
                transition: 'all 0.15s ease-in-out',
                border: isActive ? '1px solid #334155' : '1px solid transparent',
              }}
            >
              <Icon size={18} color={isActive ? 'var(--color-brand-400)' : 'currentColor'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Security Footer Notice */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid #1e293b',
          background: 'rgba(239, 68, 68, 0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.75rem',
          color: '#f87171',
        }}
      >
        <ShieldAlert size={16} />
        <span>Strict Zero-Trust Perimeter</span>
      </div>
    </aside>
  );
}
