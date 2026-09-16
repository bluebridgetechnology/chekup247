'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  FileText,
  Clock,
  ExternalLink,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';

export interface AppNotification {
  id: string;
  recipient_id: string;
  channel: string;
  template_id: string;
  title: string | null;
  deep_link: string | null;
  payload: Record<string, any>;
  is_read: boolean;
  sent_at: string | null;
  created_at: string;
}

export function NotificationBell() {
  const { user, token, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  // Fetch notifications and unread count
  const fetchNotifications = async () => {
    if (!token || !user) return;
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
      console.warn('Could not fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !token || !user) return;

    fetchNotifications();

    // Setup WebSocket connection to /notifications namespace
    const socketUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace('/api/v1', '');
    try {
      const socket = io(`${socketUrl}/notifications`, {
        transports: ['websocket'],
        reconnection: true,
      });

      socket.on('connect', () => {
        socket.emit('subscribe_user', { userId: user.id });
      });

      socket.on('new_notification', (notif: AppNotification) => {
        setNotifications((prev) => [notif, ...prev]);
        setUnreadCount((prev) => prev + 1);
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
      };
    } catch (err) {
      console.warn('WebSocket notification subscription failed:', err);
    }
  }, [isAuthenticated, token, user]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
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

  if (!isAuthenticated) return null;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        style={{
          position: 'relative',
          background: isOpen ? 'var(--color-slate-100)' : 'transparent',
          border: '1px solid var(--color-slate-200)',
          borderRadius: '12px',
          padding: '8px 10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-slate-700)',
          transition: 'all 0.2s ease',
        }}
        title="Notifications"
        aria-label="View notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              background: '#ef4444',
              color: '#ffffff',
              fontSize: '0.7rem',
              fontWeight: 700,
              minWidth: '18px',
              height: '18px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
              border: '2px solid #ffffff',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '380px',
            maxWidth: '90vw',
            background: '#ffffff',
            borderRadius: '18px',
            border: '1px solid var(--color-slate-200)',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
            zIndex: 100,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: '#ffffff',
              borderBottom: '1px solid var(--color-slate-100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 800, fontSize: '0.975rem', color: 'var(--color-slate-900)' }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: 'var(--color-brand-100)',
                    color: 'var(--color-brand-700)',
                    fontSize: '0.75rem',
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
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List of Notifications */}
          <div
            style={{
              maxHeight: '400px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  color: 'var(--color-slate-400)',
                  fontSize: '0.875rem',
                }}
              >
                <Bell size={28} style={{ opacity: 0.3, marginBottom: '8px' }} />
                <p style={{ margin: 0 }}>You're all caught up!</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
                  No new notifications at this time.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.is_read;
                const formattedTime = new Date(notif.created_at).toLocaleDateString('en-ZA', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

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
                      transition: 'background 0.15s',
                      position: 'relative',
                    }}
                  >
                    {/* Channel / Type Icon */}
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '10px',
                        background: isUnread ? 'var(--color-brand-500)' : 'var(--color-slate-100)',
                        color: isUnread ? '#ffffff' : 'var(--color-slate-600)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}
                    >
                      {notif.template_id?.includes('cancelled') ? (
                        <AlertTriangle size={16} />
                      ) : notif.template_id?.includes('reminder') ? (
                        <Clock size={16} />
                      ) : notif.template_id?.includes('prescription') ? (
                        <FileText size={16} />
                      ) : (
                        <Calendar size={16} />
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <span
                          style={{
                            fontWeight: isUnread ? 700 : 600,
                            fontSize: '0.875rem',
                            color: 'var(--color-slate-900)',
                          }}
                        >
                          {notif.title || 'ChekUp247 Notice'}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-slate-400)', whiteSpace: 'nowrap' }}>
                          {formattedTime}
                        </span>
                      </div>

                      <p
                        style={{
                          margin: '4px 0 6px',
                          fontSize: '0.8rem',
                          color: 'var(--color-slate-600)',
                          lineHeight: 1.4,
                        }}
                      >
                        {notif.payload?.message ||
                          (notif.payload?.doctorName
                            ? `Consultation with Dr. ${notif.payload.doctorName}`
                            : 'Update on your appointment.')}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {notif.deep_link && (
                          <Link
                            href={notif.deep_link}
                            onClick={() => setIsOpen(false)}
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              color: 'var(--color-brand-600)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>View Details</span>
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
                              gap: '3px',
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

          {/* Footer Settings Link */}
          <div
            style={{
              padding: '12px 18px',
              background: 'var(--color-slate-50)',
              borderTop: '1px solid var(--color-slate-100)',
              textAlign: 'center',
            }}
          >
            <Link
              href="/settings/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: '0.8rem',
                color: 'var(--color-slate-600)',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Notification Channel Preferences →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
