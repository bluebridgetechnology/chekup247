'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SolarIcon } from '../SolarIcon';
import { SupportContactModal } from '../SupportContactModal';

interface SidebarItem {
  label: string;
  href: string;
  iconName: string;
  key: string;
}

interface SidebarGroup {
  groupTitle?: string;
  items: SidebarItem[];
}

const SIDEBAR_GROUPS: SidebarGroup[] = [
  {
    groupTitle: 'MAIN',
    items: [
      { label: 'My Appointments', href: '/appointments', iconName: 'calendar-linear', key: 'appointments' },
      { label: 'Find a Doctor', href: '/appointments?view=find-doctor', iconName: 'magnifer-linear', key: 'find-doctor' },
      { label: 'My Doctors', href: '/appointments?view=doctors', iconName: 'solar:stethoscope-outline', key: 'my-doctors' },
    ],
  },
  {
    groupTitle: 'MY HEALTH',
    items: [
      { label: 'Prescriptions', href: '/prescriptions', iconName: 'pill-linear', key: 'prescriptions' },
      { label: 'Health Notes', href: '/appointments?view=notes', iconName: 'solar:notes-minimalistic-outline', key: 'health-notes' },
      { label: 'Medical Documents', href: '/appointments?view=documents', iconName: 'document-text-linear', key: 'documents' },
    ],
  },
  {
    groupTitle: 'ACCOUNT',
    items: [
      { label: 'Profile & Settings', href: '/profile', iconName: 'settings-linear', key: 'settings' },
      { label: 'Notifications', href: '/settings/notifications', iconName: 'bell-linear', key: 'notifications' },
    ],
  },
];

interface PatientPortalSidebarProps {
  activeNavKey?: string;
  onSelectNav?: (key: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function PatientPortalSidebar({
  activeNavKey = 'appointments',
  onSelectNav,
  isMobileOpen = false,
  onCloseMobile,
}: PatientPortalSidebarProps) {
  const pathname = usePathname();
  const [currentNavKey, setCurrentNavKey] = useState<string>(activeNavKey);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    let key = activeNavKey;
    if (pathname === '/appointments' || pathname === '/portal') {
      if (typeof window !== 'undefined') {
        const search = new URLSearchParams(window.location.search);
        const viewParam = search.get('view');
        if (viewParam === 'doctors') {
          key = 'my-doctors';
        } else if (viewParam === 'records' || viewParam === 'notes' || viewParam === 'health-notes') {
          key = 'health-notes';
        } else if (viewParam === 'documents') {
          key = 'documents';
        } else if (viewParam === 'find-doctor' || viewParam === 'search') {
          key = 'find-doctor';
        } else {
          key = 'appointments';
        }
      } else {
        key = 'appointments';
      }
    } else if (pathname === '/bookings') {
      key = 'appointments';
    } else if (pathname === '/doctors') {
      key = 'find-doctor';
    } else if (pathname === '/prescriptions') {
      key = 'prescriptions';
    } else if (pathname === '/profile') {
      key = 'settings';
    } else if (pathname === '/settings/notifications') {
      key = 'notifications';
    }
    setCurrentNavKey(key);
  }, [pathname, activeNavKey]);
  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(35, 20, 14, 0.45)',
            backdropFilter: 'blur(3px)',
            zIndex: 49,
          }}
          className="portal-sidebar-backdrop"
          aria-hidden="true"
        />
      )}

      <aside
        style={{
          width: '260px',
          flexShrink: 0,
          backgroundColor: '#FAF6EE', // Warm ivory
          borderRight: '1px solid #EDE4D4',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '20px 14px 18px 14px',
          overflowY: 'auto',
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
          boxSizing: 'border-box',
          position: 'relative',
        }}
        className={`portal-sidebar ${isMobileOpen ? 'open' : ''}`}
      >
        {/* Navigation Groups */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {SIDEBAR_GROUPS.map((group, idx) => (
            <div key={group.groupTitle || idx}>
              {group.groupTitle && (
                <div
                  style={{
                    fontSize: '0.66rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#A08F83',
                    padding: '0 12px',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                  }}
                >
                  {group.groupTitle}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {group.items.map((item) => {
                  const isActive = currentNavKey === item.key;

                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => {
                        setCurrentNavKey(item.key);
                        if (onSelectNav) onSelectNav(item.key);
                        if (onCloseMobile) onCloseMobile();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        fontSize: '0.86rem',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? '#2A170F' : '#4E3C32',
                        backgroundColor: isActive ? '#F4E6D2' : 'transparent',
                        textDecoration: 'none',
                        position: 'relative',
                        minHeight: '44px', // Touch-friendly 44px tap target
                        boxSizing: 'border-box',
                        transition: 'background-color 0.16s ease, color 0.16s ease',
                      }}
                      className={`portal-nav-link ${isActive ? 'active' : ''}`}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <span
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '3.5px',
                            height: '18px',
                            backgroundColor: '#C59550',
                            borderRadius: '0 3px 3px 0',
                          }}
                          aria-hidden="true"
                        />
                      )}

                      <SolarIcon
                        name={item.iconName}
                        size={19}
                        color={isActive ? '#2A170F' : '#6A574C'}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* BOTTOM: Sidebar Support Card with Organic Brand Wave */}
        <div style={{ marginTop: '20px', position: 'relative' }}>
          {/* Subtle Organic Background Vector */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              overflow: 'hidden',
              borderRadius: '14px',
              zIndex: 0,
            }}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 240 140"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                position: 'absolute',
                bottom: '-20px',
                left: '-10px',
                width: '260px',
                opacity: 0.16,
              }}
            >
              <path
                d="M0 80C40 50 100 110 160 70C200 40 230 70 240 80V140H0V80Z"
                fill="#DFAB62"
              />
              <path
                d="M0 100C60 75 120 120 180 85C220 60 235 85 240 90V140H0V100Z"
                fill="#C9944A"
              />
            </svg>
          </div>

          {/* Support Card Box */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              backgroundColor: '#FAF2E4',
              border: '1px solid #EADBCA',
              borderRadius: '14px',
              padding: '14px',
              boxShadow: '0 2px 6px rgba(42, 23, 15, 0.03)',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                backgroundColor: 'rgba(223, 171, 98, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '8px',
                color: '#2A170F',
              }}
            >
              <SolarIcon name="headphones-round-linear" size={17} color="#2A170F" />
            </div>

            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#2A170F',
                marginBottom: '2px',
              }}
            >
              Need help?
            </div>

            <div
              style={{
                fontSize: '0.75rem',
                lineHeight: 1.4,
                color: '#736357',
                marginBottom: '12px',
              }}
            >
              Our support team is here for you 24/7.
            </div>

            <button
              type="button"
              onClick={() => setSupportOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 13px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #D8C3A8',
                borderRadius: '20px',
                fontSize: '0.74rem',
                fontWeight: 600,
                color: '#2A170F',
                textDecoration: 'none',
                minHeight: '36px',
                boxShadow: '0 1px 2px rgba(42, 23, 15, 0.04)',
                transition: 'all 0.16s ease',
                cursor: 'pointer',
              }}
              className="portal-support-btn"
            >
              <span>Contact Support</span>
              <SolarIcon name="arrow-right-linear" size={12} color="#2A170F" />
            </button>
          </div>
        </div>
      </aside>

      <SupportContactModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} />
    </>
  );
}
