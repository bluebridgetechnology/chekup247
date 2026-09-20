'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SolarIcon } from './common/SolarIcon';
import { useDoctorAuth } from '../context/DoctorAuthContext';
import type { Socket } from 'socket.io-client';

export type DoctorStatus = 'active' | 'in_consultation' | 'offline';

export interface DoctorNotification {
  id: string;
  recipient_id: string;
  channel: string;
  template_id: string;
  title: string | null;
  deep_link: string | null;
  payload: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

interface DoctorHeaderProps {
  onMobileToggle?: () => void;
}

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Clinical Overview',
  '/calendar': 'Calendar & Shifts',
  '/appointments': 'Appointments Queue',
  '/consultation': 'Consultation Room',
  '/prescriptions': 'E-Prescriptions Management',
  '/icd10': 'ICD-10 Diagnostic Coding',
  '/earnings': 'Earnings & Payouts',
  '/profile': 'Doctor Practice Profile',
};

export function DoctorHeader({ onMobileToggle }: DoctorHeaderProps) {
  const pathname = usePathname();
  const { doctor, profile, token, isAuthenticated, logout, updatePresenceStatus } = useDoctorAuth();
  const [status, setStatus] = useState<DoctorStatus>('active');
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<DoctorNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  // Determine current page label
  const pageLabel = ROUTE_LABELS[pathname] || (pathname.startsWith('/consultations/') ? 'Consultation Room' : 'Practice Portal');

  const statusColors = {
    active: { bg: '#ecfdf5', text: '#065f46', dot: '#10b981', label: 'Active & Available' },
    in_consultation: { bg: '#fffbeb', text: '#92400e', dot: '#f59e0b', label: 'In Consultation' },
    offline: { bg: 'var(--color-cream-surface, #FDFBF7)', text: 'var(--color-cream-text-muted, #6B5E55)', dot: '#94a3b8', label: 'Offline' },
  };

  const current = statusColors[status];

  // Anything the doctor should notice: unread alerts or a pending HPCSA verification
  const isPendingVerification = profile?.verificationStatus === 'pending';
  const hasImportant = unreadCount > 0 || isPendingVerification;

  // Sync the pill with the doctor's real persisted presence status
  useEffect(() => {
    const ps = profile?.presenceStatus;
    if (ps === 'active' || ps === 'in_consultation' || ps === 'offline') {
      setStatus(ps as DoctorStatus);
    }
  }, [profile?.presenceStatus]);

  // Persist a presence change to the backend (optimistic)
  const handleStatusChange = async (next: DoctorStatus) => {
    const prev = status;
    setStatus(next);
    setStatusMenuOpen(false);
    setStatusSaving(true);
    try {
      await updatePresenceStatus(next);
    } catch (err) {
      console.warn('Failed to update presence status:', err);
      setStatus(prev); // revert on failure
    } finally {
      setStatusSaving(false);
    }
  };

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!token || !doctor) return;
    try {
      const res = await fetch(`${API_BASE}/notifications?limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Could not fetch doctor notifications:', err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !token || !doctor) return;
    fetchNotifications();

    let activeSocket: Socket | null = null;
    let isCancelled = false;
    const socketUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace('/api/v1', '');

    import('socket.io-client')
      .then(({ io }) => {
        if (isCancelled) return;
        const socket = io(`${socketUrl}/notifications`, {
          transports: ['websocket'],
          reconnection: true,
        });

        socket.on('connect', () => {
          socket.emit('subscribe_user', { userId: doctor.id });
        });

        socket.on('new_notification', (notif: DoctorNotification) => {
          setNotifications((prev) => {
            if (prev.some((n) => n.id === notif.id)) return prev;
            return [notif, ...prev];
          });
          setUnreadCount((prev) => prev + 1);
        });

        activeSocket = socket;
        socketRef.current = socket;
      })
      .catch((err) => {
        console.warn('Doctor WebSocket notification subscription failed:', err);
      });

    // Fallback: poll every 60s in case the WebSocket drops silently,
    // and refresh whenever the tab regains focus.
    const pollId = setInterval(() => {
      if (!document.hidden) fetchNotifications();
    }, 60000);
    const onFocus = () => fetchNotifications();
    window.addEventListener('focus', onFocus);

    return () => {
      isCancelled = true;
      clearInterval(pollId);
      window.removeEventListener('focus', onFocus);
      if (activeSocket) activeSocket.disconnect();
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [isAuthenticated, token, doctor]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  return (
    <header
      className="doctor-topbar"
      style={{
        height: 'var(--doctor-topbar-h, 76px)',
        minHeight: 'var(--doctor-topbar-h, 76px)',
        backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
        borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        boxShadow: '0 1px 0 rgba(42, 23, 15, 0.02)',
      }}
    >
      {/* Left: Mobile Toggle & Dynamic Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {onMobileToggle && (
          <button
            onClick={onMobileToggle}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-chocolate-base, #2A170F)',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            className="mobile-toggle"
            aria-label="Toggle navigation"
          >
            <SolarIcon name="hamburger-menu-linear" size={24} color="var(--color-chocolate-base, #2A170F)" />
          </button>
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 600 }}>
            <span>Practice</span>
            <span>/</span>
            <span style={{ color: 'var(--color-gold-bronze, #B88647)' }}>{pageLabel}</span>
          </div>
          <h2
            style={{
              fontSize: '1.2rem',
              color: 'var(--color-chocolate-base, #2A170F)',
              margin: 0,
              fontWeight: 700,
              fontFamily: 'var(--font-heading), sans-serif',
              letterSpacing: '-0.02em',
            }}
          >
            {pageLabel}
          </h2>
        </div>
      </div>

      {/* Right Controls */}
      <div className="doctor-topbar-controls" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Status Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setStatusMenuOpen(!statusMenuOpen)}
            className="doctor-status-pill"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full, 9999px)',
              backgroundColor: current.bg,
              color: current.text,
              border: `1.5px solid ${current.dot}40`,
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'all 0.18s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: current.dot,
                boxShadow: `0 0 0 2px ${current.dot}33`,
                flexShrink: 0,
              }}
            />
            <span className="doctor-status-label">{current.label}</span>
            <SolarIcon name="alt-arrow-down-linear" size={14} className="doctor-status-caret" />
          </button>

          {statusMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                borderRadius: '16px',
                boxShadow: '0 14px 36px var(--color-chocolate-shadow, rgba(42, 23, 15, 0.15))',
                width: '190px',
                padding: '6px',
                zIndex: 50,
              }}
            >
              {(['active', 'in_consultation', 'offline'] as DoctorStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => handleStatusChange(st)}
                  disabled={statusSaving}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: status === st ? 'var(--color-gold-pale, #F0E5D3)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    fontWeight: status === st ? 700 : 500,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: statusColors[st].dot }} />
                    <span>{statusColors[st].label}</span>
                  </div>
                  {status === st && <SolarIcon name="check-circle-linear" size={14} color="var(--color-chocolate-base, #2A170F)" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Practice Alerts Bell */}
        <div style={{ position: 'relative' }} ref={notifDropdownRef}>
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              if (!notificationsOpen) fetchNotifications();
            }}
            style={{
              position: 'relative',
              backgroundColor: notificationsOpen ? 'var(--color-gold-pale, #F0E5D3)' : 'var(--color-cream-surface, #FDFBF7)',
              border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              cursor: 'pointer',
              padding: '8px 10px',
              color: 'var(--color-chocolate-base, #2A170F)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.18s ease',
            }}
            title="Practice Notifications"
          >
            <SolarIcon name="bell-linear" size={20} color="var(--color-chocolate-base, #2A170F)" />
            {hasImportant && (
              <span className="notif-pulse-dot" aria-hidden="true" />
            )}
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '999px',
                  backgroundColor: 'var(--color-gold-primary, #E2B467)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid var(--color-cream-surface, #FDFBF7)',
                  boxShadow: '0 2px 6px var(--color-gold-cta-shadow)',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Popover */}
          {notificationsOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '380px',
                maxWidth: '90vw',
                backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
                borderRadius: '18px',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                boxShadow: '0 20px 40px -15px var(--color-chocolate-shadow, rgba(42, 23, 15, 0.2))',
                zIndex: 60,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.15))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--color-cream-base, #FAF6EE)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                    Practice Alerts
                  </span>
                  {unreadCount > 0 && (
                    <span className="badge-gold">
                      {unreadCount} new
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-gold-bronze, #B88647)',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {isPendingVerification && (
                  <Link
                    href="/profile"
                    onClick={() => setNotificationsOpen(false)}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      padding: '14px 18px',
                      borderBottom: '1px solid rgba(223, 171, 98, 0.1)',
                      backgroundColor: '#FEF3E2',
                      textDecoration: 'none',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        backgroundColor: '#FDE0B8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      <SolarIcon name="shield-warning-bold" size={16} color="#B45309" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 800, fontSize: '0.875rem', color: '#92400E' }}>
                        HPCSA verification pending
                      </span>
                      <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#B45309', lineHeight: 1.4 }}>
                        Your credentials are under review. Bookings stay paused until you&apos;re verified.
                      </p>
                    </div>
                  </Link>
                )}

                {notifications.length === 0 && !isPendingVerification ? (
                  <div style={{ padding: '36px 20px', textAlign: 'center', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                    <SolarIcon name="bell-linear" size={32} color="var(--color-gold-bronze, #B88647)" style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>No new practice alerts</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isUnread = !notif.is_read;
                    return (
                      <div
                        key={notif.id}
                        style={{
                          padding: '14px 18px',
                          borderBottom: '1px solid rgba(223, 171, 98, 0.1)',
                          backgroundColor: isUnread ? 'rgba(223, 171, 98, 0.08)' : 'transparent',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: isUnread ? 'var(--color-gold-pale, #F0E5D3)' : 'rgba(0,0,0,0.04)',
                            color: isUnread ? 'var(--color-gold-bronze, #B88647)' : 'var(--color-cream-text-muted, #6B5E55)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        >
                          <SolarIcon name="calendar-linear" size={16} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: isUnread ? 800 : 600, fontSize: '0.875rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                              {notif.title || 'Practice Update'}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                              {new Date(notif.created_at).toLocaleDateString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p style={{ margin: '4px 0 6px', fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', lineHeight: 1.4 }}>
                            {notif.payload?.message || 'Appointment update'}
                          </p>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {notif.deep_link && (
                              <Link
                                href={notif.deep_link}
                                onClick={() => setNotificationsOpen(false)}
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: 'var(--color-chocolate-base, #2A170F)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span>View on Calendar</span>
                                <SolarIcon name="arrow-right-up-linear" size={12} />
                              </Link>
                            )}

                            {isUnread && (
                              <button
                                onClick={(e) => handleMarkAsRead(notif.id, e)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--color-gold-bronze, #B88647)',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  padding: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                              >
                                <SolarIcon name="check-circle-linear" size={12} />
                                <span>Mark read</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Doctor User Profile Menu with Clickable Avatar or Sign In */}
        <div style={{ position: 'relative' }} ref={profileDropdownRef}>
          {!doctor ? (
            <Link
              href="/login"
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 16px',
                fontSize: '0.825rem',
                fontWeight: 600,
                textDecoration: 'none',
                borderRadius: 'var(--radius-full, 9999px)',
              }}
            >
              <SolarIcon name="login-2-linear" size={15} color="var(--color-chocolate-base)" />
              <span>Sign In</span>
            </Link>
          ) : (
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="doctor-avatar-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '4px 10px 4px 4px',
                borderRadius: 'var(--radius-full, 9999px)',
                border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                backgroundColor: profileMenuOpen ? 'var(--color-gold-pale, #F0E5D3)' : 'var(--color-cream-surface, #FDFBF7)',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-gold-pale, #F0E5D3)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  border: '1.5px solid rgba(223, 171, 98, 0.35)',
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {doctor?.avatarUrl ? (
                  <img
                    src={doctor.avatarUrl}
                    alt={doctor?.fullName || 'Doctor avatar'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  doctor?.fullName ? doctor.fullName.substring(0, 2).toUpperCase() : 'DR'
                )}
              </div>
              <div style={{ textAlign: 'left', display: 'none' }} className="desktop-doctor-info">
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)', lineHeight: 1.2 }}>
                  {doctor?.fullName?.split(' ')[0] || 'Doctor'}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-gold-bronze, #B88647)', fontWeight: 600 }}>
                  HPCSA Active
                </div>
              </div>
              <SolarIcon name="alt-arrow-down-linear" size={14} className="doctor-avatar-caret" style={{ color: 'var(--color-chocolate-base, #2A170F)' }} />
            </button>
          )}

          {profileMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '220px',
                backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
                borderRadius: '16px',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                boxShadow: '0 16px 36px var(--color-chocolate-shadow, rgba(42, 23, 15, 0.15))',
                padding: '8px',
                zIndex: 60,
              }}
            >
              <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid rgba(223, 171, 98, 0.15)' }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                  {doctor?.fullName || 'Dr. Practitioner'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                  {doctor?.email}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-gold-bronze, #B88647)', fontWeight: 500, marginTop: '2px' }}>
                  HPCSA: {profile?.hpcsaNumber || 'MP Verified'}
                </div>
              </div>

              <div style={{ padding: '6px 0' }}>
                <Link
                  href="/profile"
                  onClick={() => setProfileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.backgroundColor = 'var(--color-gold-pale, #F0E5D3)')}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <SolarIcon name="user-linear" size={16} color="var(--color-chocolate-base, #2A170F)" />
                  <span>Practice Settings</span>
                </Link>

                <Link
                  href="/earnings"
                  onClick={() => setProfileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    fontWeight: 500,
                    textDecoration: 'none',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.backgroundColor = 'var(--color-gold-pale, #F0E5D3)')}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <SolarIcon name="wallet-money-linear" size={16} color="var(--color-chocolate-base, #2A170F)" />
                  <span>Payouts & Statements</span>
                </Link>
              </div>

              <div style={{ borderTop: '1px solid rgba(223, 171, 98, 0.15)', paddingTop: '6px' }}>
                <button
                  onClick={() => {
                    setProfileMenuOpen(false);
                    logout();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'none',
                    fontSize: '0.85rem',
                    color: '#dc2626',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <SolarIcon name="logout-2-linear" size={16} color="#dc2626" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
