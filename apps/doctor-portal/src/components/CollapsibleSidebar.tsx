'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Calendar,
  Clock,
  Video,
  FileText,
  DollarSign,
  User,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { label: 'Overview', href: '/', icon: LayoutDashboard },
  { label: 'Calendar & Shifts', href: '/calendar', icon: Calendar },
  { label: 'Appointments', href: '/appointments', icon: Clock },
  { label: 'Consultation Room', href: '/consultation', icon: Video },
  { label: 'E-Prescriptions', href: '/prescriptions', icon: FileText },
  { label: 'ICD-10 Coding', href: '/icd10', icon: Stethoscope },
  { label: 'Earnings & Payouts', href: '/earnings', icon: DollarSign },
  { label: 'Doctor Profile', href: '/profile', icon: User },
];


export function CollapsibleSidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: collapsed ? '72px' : '260px',
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        background: '#ffffff',
        borderRight: '1px solid var(--color-slate-200)',
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
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0' : '0 20px',
          borderBottom: '1px solid var(--color-slate-200)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
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
              flexShrink: 0,
            }}
          >
            <Video size={18} />
          </div>
          {!collapsed && (
            <div style={{ whiteSpace: 'nowrap' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-slate-900)' }}>
                ChekUp<span style={{ color: 'var(--color-brand-600)' }}>247</span>
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-slate-400)', fontWeight: 600 }}>
                DOCTOR PORTAL
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-slate-400)',
              padding: '6px',
            }}
            title="Collapse sidebar"
          >
            <ChevronLeft size={20} />
          </button>
        )}
      </div>

      {/* Nav List */}
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
        {navItems.map((item) => {
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
                padding: collapsed ? '12px 0' : '10px 14px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 'var(--radius-md)',
                color: isActive ? 'var(--color-brand-700)' : 'var(--color-slate-600)',
                background: isActive ? 'var(--color-brand-50)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.9rem',
                transition: 'all 0.15s ease-in-out',
                border: isActive ? '1px solid var(--color-brand-200)' : '1px solid transparent',
              }}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={20} color={isActive ? 'var(--color-brand-600)' : 'currentColor'} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Controls */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid var(--color-slate-200)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
        }}
      >
        {collapsed ? (
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-slate-400)',
            }}
            title="Expand sidebar"
          >
            <ChevronRight size={20} />
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--color-brand-700)' }}>
            <ShieldCheck size={16} />
            <span>HPCSA Verified Active</span>
          </div>
        )}
      </div>
    </aside>
  );
}
