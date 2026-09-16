'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  User,
  Check,
  AlertCircle,
  Calendar,
  Clock,
  ExternalLink,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { useDoctorAuth } from '../context/DoctorAuthContext';
import { io, Socket } from 'socket.io-client';

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

export function DoctorHeader() {
  const { doctor, profile, token, isAuthenticated } = useDoctorAuth();
  const [status, setStatus] = useState<DoctorStatus>('active');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<DoctorNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const statusColors = {
    active: { bg: '#ecfdf5', text: '#059669', dot: '#10b981', label: 'Active & Available' },
    in_consultation: { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b', label: 'In Consultation' },
    offline: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Offline' },
  };

  const current = statusColors[status];

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

    const socketUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace('/api/v1', '');
    try {
      const socket = io(`${socketUrl}/notifications`, {
        transports: ['websocket'],
        reconnection: true,
      });

      socket.on('connect', () => {
        socket.emit('subscribe_user', { userId: doctor.id });
      });

      socket.on('new_notification', (notif: DoctorNotification) => {
        setNotifications((prev) => [notif, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
      };
    } catch (err) {
      console.warn('Doctor WebSocket notification subscription failed:', err);
    }
  }, [isAuthenticated, token, doctor]);

  // Click outside listener for notifications dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
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
      style={{
        height: '72px',
        background: '#ffffff',
        borderBottom: '1px solid var(--color-slate-200)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Left Title */}
      <div>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--color-slate-900)', margin: 0, fontWeight: 800 }}>
          Doctor Practice Dashboard
        </h2>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Status Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: current.bg,
              color: current.text,
              border: `1px solid ${current.dot}40`,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: current.dot,
              }}
            />
            <span>{current.label}</span>
          </button>

          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: '#ffffff',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                width: '180px',
                padding: '6px',
                zIndex: 50,
              }}
            >
              {(['active', 'in_consultation', 'offline'] as DoctorStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatus(st);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: status === st ? 'var(--color-slate-100)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    color: 'var(--color-slate-700)',
                  }}
                >
                  <span>{statusColors[st].label}</span>
                  {status === st && <Check size={14} color="var(--color-brand-600)" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* DP-801: Doctor Notification Center Bell & Dropdown */}
        <div style={{ position: 'relative' }} ref={notifDropdownRef}>
          <button
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              if (!notificationsOpen) fetchNotifications();
            }}
            style={{
              position: 'relative',
              background: notificationsOpen ? 'var(--color-slate-100)' : 'none',
              border: '1px solid var(--color-slate-200)',
              cursor: 'pointer',
              padding: '8px 10px',
              color: 'var(--color-slate-600)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Doctor Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  minWidth: '18px',
                  height: '18px',
                  borderRadius: '999px',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #ffffff',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '380px',
                maxWidth: '90vw',
                background: '#ffffff',
                borderRadius: '18px',
                border: '1px solid var(--color-slate-200)',
                boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
                zIndex: 60,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--color-slate-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-slate-900)' }}>
                    Practice Alerts
                  </span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        background: 'var(--color-brand-100)',
                        color: 'var(--color-brand-700)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                      }}
                    >
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
                      color: 'var(--color-brand-600)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--color-slate-400)' }}>
                    <Bell size={28} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>No new alerts</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const isUnread = !notif.is_read;
                    const isCancellation = notif.template_id?.includes('cancelled');
                    const isLateFee = notif.payload?.deductionAmount && Number(notif.payload.deductionAmount) > 0;

                    return (
                      <div
                        key={notif.id}
                        style={{
                          padding: '14px 18px',
                          borderBottom: '1px solid var(--color-slate-100)',
                          background: isUnread ? '#f0fdfa' : '#ffffff',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '10px',
                            background: isLateFee
                              ? '#ecfdf5'
                              : isCancellation
                              ? '#fef2f2'
                              : 'var(--color-brand-50)',
                            color: isLateFee
                              ? '#059669'
                              : isCancellation
                              ? '#dc2626'
                              : 'var(--color-brand-600)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        >
                          {isLateFee ? (
                            <DollarSign size={16} />
                          ) : isCancellation ? (
                            <AlertTriangle size={16} />
                          ) : (
                            <Calendar size={16} />
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: isUnread ? 700 : 600, fontSize: '0.875rem', color: 'var(--color-slate-900)' }}>
                              {notif.title || 'Practice Update'}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--color-slate-400)' }}>
                              {new Date(notif.created_at).toLocaleDateString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p style={{ margin: '4px 0 6px', fontSize: '0.8rem', color: 'var(--color-slate-600)', lineHeight: 1.4 }}>
                            {notif.payload?.message || 'Appointment update'}
                          </p>

                          {isLateFee && (
                            <div
                              style={{
                                background: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                borderRadius: '8px',
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                color: '#065f46',
                                fontWeight: 700,
                                display: 'inline-block',
                                marginBottom: '6px',
                              }}
                            >
                              +R{Number(notif.payload.deductionAmount).toFixed(2)} Late Fee Earned
                            </div>
                          )}

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {notif.deep_link && (
                              <Link
                                href={notif.deep_link}
                                onClick={() => setNotificationsOpen(false)}
                                style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  color: 'var(--color-brand-600)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <span>View on Calendar</span>
                                <ExternalLink size={12} />
                              </Link>
                            )}

                            {isUnread && (
                              <button
                                onClick={(e) => handleMarkAsRead(notif.id, e)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--color-slate-400)',
                                  fontSize: '0.72rem',
                                  cursor: 'pointer',
                                  padding: 0,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                }}
                              >
                                <Check size={12} />
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

        {/* Doctor Avatar Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingLeft: '12px',
            borderLeft: '1px solid var(--color-slate-200)',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'var(--color-brand-100)',
              color: 'var(--color-brand-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            {doctor?.fullName ? doctor.fullName.substring(0, 2).toUpperCase() : 'DR'}
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
              {doctor?.fullName || 'Dr. Practitioner'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
              HPCSA: {profile?.hpcsaNumber || 'MP 0742198'}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
