'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Layers,
  FileSpreadsheet,
  Scale,
  CheckCircle,
  Users,
  Stethoscope,
  UserCog,
  Activity,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Bell,
  MessageSquare,
  Shield,
  Coins,
  AlertCircle,
  Archive,
} from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ChekupCrossLogo } from './ChekupCrossLogo';

interface AdminSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  superAdminOnly?: boolean;
  isLive?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Executive Analytics', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Clinical Operations',
    items: [
      { label: 'Consultations & Bookings', href: '/bookings', icon: Layers },
      { label: 'Live Telehealth Sessions', href: '/consultations/live', icon: Activity, isLive: true },
      { label: 'HPCSA Verification Queue', href: '/doctors/verification', icon: CheckCircle },
      { label: 'Dispute Resolution', href: '/disputes', icon: Scale },
      { label: 'Dispute Cases', href: '/disputes/cases', icon: AlertCircle },
    ],
  },
  {
    title: 'Financial Oversight',
    items: [
      { label: 'Financial Ledger', href: '/transactions', icon: FileSpreadsheet },
      { label: 'Doctor Payouts', href: '/payouts', icon: Coins },
    ],
  },
  {
    title: 'User Directories',
    items: [
      { label: 'Doctors Directory', href: '/doctors', icon: Stethoscope },
      { label: 'Patient Directory', href: '/users/patients', icon: Users },
      { label: 'Deleted Records (POPIA)', href: '/users/deleted', icon: Archive },
      { label: 'Admin Accounts', href: '/admins', icon: UserCog, superAdminOnly: true },
    ],
  },
  {
    title: 'Governance & Security',
    items: [
      { label: 'Audit Logs (POPIA)', href: '/audit-logs', icon: Shield },
      { label: 'Platform Security', href: '/security', icon: ShieldCheck },
      { label: 'Review Moderation', href: '/reviews', icon: MessageSquare },
      { label: 'Notifications Console', href: '/notifications', icon: Bell },
      { label: 'System Settings', href: '/settings', icon: Settings, superAdminOnly: true },
    ],
  },
];

function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: collapsed ? '9px 0' : '7px 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: '7px',
        color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.75)',
        backgroundColor: isActive ? 'rgba(223, 163, 79, 0.16)' : 'transparent',
        fontWeight: isActive ? 600 : 500,
        fontSize: '0.8rem',
        transition: 'all 0.15s ease',
        borderLeft: isActive && !collapsed ? '3px solid #DFA34F' : '3px solid transparent',
        textDecoration: 'none',
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.color = '#FFFFFF';
        }
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
        }
      }}
    >
      <Icon
        size={16}
        color={isActive ? '#DFA34F' : 'rgba(255, 255, 255, 0.65)'}
        style={{ flexShrink: 0 }}
      />
      {!collapsed && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.label}
          </span>
          {item.isLive && (
            <span
              style={{
                fontSize: '0.6rem',
                fontWeight: 700,
                color: '#18A875',
                backgroundColor: 'rgba(24, 168, 117, 0.16)',
                border: '1px solid rgba(24, 168, 117, 0.3)',
                padding: '1px 5px',
                borderRadius: '999px',
                letterSpacing: '0.04em',
                flexShrink: 0,
                marginLeft: '6px',
              }}
            >
              LIVE
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

export function AdminSidebar({ collapsed = false, onToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const { admin } = useAdminAuth();
  const isSupportOnly = admin?.adminSubRole === 'support';

  return (
    <aside
      style={{
        width: collapsed ? '64px' : '230px',
        minWidth: collapsed ? '64px' : '230px',
        transition: 'width 0.2s ease, min-width 0.2s ease',
        backgroundColor: '#2B170F',
        borderRight: '1px solid rgba(223, 163, 79, 0.16)',
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
          height: 'var(--admin-topbar-h, 64px)',
          minHeight: 'var(--admin-topbar-h, 64px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0' : '0 16px',
          borderBottom: '1px solid rgba(223, 163, 79, 0.12)',
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
          title="ChekUp247 Admin Governance Console"
        >
          <ChekupCrossLogo size={26} />
          {!collapsed && (
            <div style={{ whiteSpace: 'nowrap' }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  display: 'flex',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ color: '#FFFFFF' }}>Chekup</span>
                <span style={{ color: '#DFA34F' }}>247</span>
              </div>
              <div
                style={{
                  fontSize: '0.6rem',
                  color: '#DFA34F',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: '2px',
                  opacity: 0.9,
                }}
              >
                Governance Console
              </div>
            </div>
          )}
        </Link>

        {!collapsed && onToggle && (
          <button
            onClick={onToggle}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#DFA34F',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.8,
              transition: 'opacity 0.2s ease',
            }}
            title="Collapse sidebar"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Grouped Nav Items */}
      <nav
        className="no-scrollbar"
        style={{
          flex: 1,
          padding: collapsed ? '10px 6px' : '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          overflowY: 'auto',
        }}
      >
        {navSections.map((section, idx) => {
          const visibleItems = section.items.filter(
            (item) => !(item.superAdminOnly && isSupportOnly)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.title} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {!collapsed ? (
                <div
                  style={{
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: 'rgba(223, 163, 79, 0.72)',
                    padding: idx === 0 ? '2px 10px 4px 10px' : '6px 10px 4px 10px',
                    userSelect: 'none',
                  }}
                >
                  {section.title}
                </div>
              ) : (
                idx > 0 && (
                  <div
                    style={{
                      height: '1px',
                      backgroundColor: 'rgba(223, 163, 79, 0.12)',
                      margin: '4px 6px',
                    }}
                  />
                )
              )}

              {visibleItems.map((item) => {
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={isActive}
                    collapsed={collapsed}
                  />
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Collapsed expand toggle button */}
      {collapsed && onToggle && (
        <div style={{ padding: '8px', borderTop: '1px solid rgba(223, 163, 79, 0.12)' }}>
          <button
            onClick={onToggle}
            style={{
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(223, 163, 79, 0.2)',
              borderRadius: '8px',
              padding: '6px 0',
              cursor: 'pointer',
              color: '#DFA34F',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
            title="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Security Footer Notice */}
      {!collapsed && (
        <div
          style={{
            padding: '10px 14px',
            borderTop: '1px solid rgba(223, 163, 79, 0.12)',
            background: 'rgba(0, 0, 0, 0.18)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.68rem',
            color: '#DFA34F',
          }}
        >
          <Shield size={13} color="#DFA34F" style={{ flexShrink: 0 }} />
          <span style={{ letterSpacing: '0.02em', opacity: 0.85 }}>POPIA SEC 19 • ISOLATED</span>
        </div>
      )}
    </aside>
  );
}
