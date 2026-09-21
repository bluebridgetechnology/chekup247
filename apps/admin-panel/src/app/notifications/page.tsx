'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Send,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Radio,
  Mail,
  MessageSquare,
  Smartphone,
  Clock,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface NotificationRow {
  id: string;
  recipientId: string;
  recipientName: string;
  channel: string;
  templateId: string;
  title: string | null;
  status: 'queued' | 'sent' | 'failed';
  isRead: boolean;
  sentAt: string | null;
  createdAt: string;
}

interface NotificationSummary {
  total: number;
  sentCount: number;
  queuedCount: number;
  failedCount: number;
}

export default function NotificationsConsolePage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading } = useAdminAuth();

  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [summary, setSummary] = useState<NotificationSummary>({
    total: 0,
    sentCount: 0,
    queuedCount: 0,
    failedCount: 0,
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<'patient' | 'doctor' | 'all'>('patient');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchNotifications = useCallback(async () => {
    const tokenToUse = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!tokenToUse) {
      if (!isLoading) setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`${API_BASE}/admin/notifications?${params.toString()}`, {
        headers: { Authorization: `Bearer ${tokenToUse}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.summary) {
          setSummary(data.summary);
        } else {
          setSummary({
            total: data.total || 0,
            sentCount: (data.notifications || []).filter((n: any) => n.status === 'sent').length,
            queuedCount: (data.notifications || []).filter((n: any) => n.status === 'queued').length,
            failedCount: (data.notifications || []).filter((n: any) => n.status === 'failed').length,
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, isLoading]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleResend = async (id: string) => {
    const tokenToUse = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!tokenToUse) return;

    setBusyId(id);
    try {
      const res = await fetch(`${API_BASE}/admin/notifications/${id}/resend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenToUse}` },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resend notification');
      setFeedback({ type: 'success', message: 'Notification re-dispatched.' });
      fetchNotifications();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const handleBroadcast = async () => {
    const tokenToUse = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!tokenToUse) {
      setFeedback({ type: 'error', message: 'Authentication required.' });
      return;
    }

    if (!title.trim() || !message.trim()) {
      setFeedback({ type: 'error', message: 'Title and message are required.' });
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`${API_BASE}/admin/notifications/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenToUse}` },
        credentials: 'include',
        body: JSON.stringify({ targetRole, title, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send broadcast');
      setFeedback({ type: 'success', message: data.message || 'Broadcast successfully dispatched.' });
      setBroadcastOpen(false);
      setTitle('');
      setMessage('');
      fetchNotifications();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSending(false);
    }
  };

  const renderStatusBadge = (status: NotificationRow['status']) => {
    switch (status) {
      case 'sent':
        return <span className="badge-status-completed">Sent</span>;
      case 'failed':
        return <span className="badge-status-danger">Failed</span>;
      case 'queued':
      default:
        return <span className="badge-status-pending">Queued</span>;
    }
  };

  const getChannelIcon = (channel: string) => {
    const ch = (channel || '').toLowerCase();
    if (ch.includes('sms')) return <Smartphone size={12} />;
    if (ch.includes('mail') || ch.includes('brevo')) return <Mail size={12} />;
    if (ch.includes('whatsapp')) return <MessageSquare size={12} />;
    return <Bell size={12} />;
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', color: '#201712' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#F7EFE3',
                color: '#B98232',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bell size={20} />
            </div>
            Notifications Console
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Omni-channel delivery ledger (SMS, WhatsApp, In-App, Brevo Email), dispatch diagnostics, and platform broadcasts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setBroadcastOpen(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Send size={15} />
            <span>New Broadcast</span>
          </button>
          <button
            onClick={() => fetchNotifications()}
            disabled={loading}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Ribbon - 4 Cards Single Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '16px',
        }}
      >
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Total Dispatched</span>
            <Bell size={18} color="#B98232" />
          </div>
          <div className="stat-number">{summary.total.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            All outbound notifications
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Delivered Successfully</span>
            <CheckCircle2 size={18} color="#0F8F72" />
          </div>
          <div className="stat-number" style={{ color: '#0F8F72' }}>
            {summary.sentCount.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Confirmed delivery to recipient
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Queued / In Transit</span>
            <Clock size={18} color="#B98232" />
          </div>
          <div className="stat-number" style={{ color: '#B98232' }}>
            {summary.queuedCount.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Awaiting provider dispatch
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Failed Dispatches</span>
            <AlertCircle size={18} color="#B91C1C" />
          </div>
          <div className="stat-number" style={{ color: '#B91C1C' }}>
            {summary.failedCount.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Eligible for diagnostic retry
          </div>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: feedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${feedback.type === 'success' ? '#86EFAC' : '#FECACA'}`,
            color: feedback.type === 'success' ? '#166534' : '#991B1B',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Filter Tabs Toolbar */}
      <div
        className="admin-card"
        style={{
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase', marginRight: '4px' }}>
          Filter Status:
        </span>
        {[
          { id: 'all', label: 'All Notifications' },
          { id: 'sent', label: 'Sent' },
          { id: 'queued', label: 'Queued' },
          { id: 'failed', label: 'Failed Dispatch' },
        ].map((s) => {
          const isActive = statusFilter === s.id;
          return (
            <button
              key={s.id}
              onClick={() => {
                setStatusFilter(s.id);
                setPage(1);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: isActive ? '1px solid #DFA34F' : '1px solid #E9E0D5',
                background: isActive ? '#2B170F' : '#FFFFFF',
                color: isActive ? '#ECC27E' : '#766C64',
                transition: 'all 0.15s ease',
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Notifications Table */}
      <div className="admin-table-container">
        {loading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#766C64' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
            <div>Loading notifications queue…</div>
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#766C64' }}>
            <Radio size={36} color="#B98232" style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
            <div style={{ fontWeight: 600, color: '#201712', marginBottom: '4px' }}>No notifications found</div>
            <div style={{ fontSize: '0.85rem' }}>No outbound notifications match this filter.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Title / Template</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Sent Timestamp</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#201712' }}>{n.recipientName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#766C64', fontFamily: 'monospace' }}>
                        {n.recipientId ? `${n.recipientId.slice(0, 8)}…` : 'Encrypted ID'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#201712' }}>{n.title || n.templateId}</div>
                      <div style={{ color: '#766C64', fontSize: '0.75rem', fontFamily: 'monospace' }}>{n.templateId}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          textTransform: 'uppercase',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: '#F8F5EF',
                          color: '#201712',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #E9E0D5',
                        }}
                      >
                        {getChannelIcon(n.channel)}
                        <span>{n.channel}</span>
                      </span>
                    </td>
                    <td>{renderStatusBadge(n.status)}</td>
                    <td style={{ fontSize: '0.8rem', color: '#766C64', whiteSpace: 'nowrap' }}>
                      {n.sentAt ? new Date(n.sentAt).toLocaleString('en-ZA') : 'Pending'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {n.status === 'failed' && (
                        <button
                          onClick={() => handleResend(n.id)}
                          disabled={busyId === n.id}
                          className="btn-secondary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '4px 10px' }}
                        >
                          <RotateCcw size={12} />
                          <span>{busyId === n.id ? 'Resending...' : 'Resend'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
            style={{ padding: '6px 12px' }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ color: '#766C64', fontSize: '0.85rem', fontWeight: 600 }}>
            Page {page} of {totalPages} ({total} entries)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary"
            style={{ padding: '6px 12px' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Broadcast Modal */}
      {broadcastOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(32, 23, 18, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <div
            className="admin-card"
            style={{
              background: '#FFFFFF',
              width: '100%',
              maxWidth: '500px',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #E9E0D5',
              boxShadow: '0 20px 40px rgba(32, 23, 18, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#F7EFE3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#B98232',
                  }}
                >
                  <Send size={18} />
                </div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#201712', margin: 0 }}>
                  New Platform Broadcast
                </h2>
              </div>
              <button
                onClick={() => setBroadcastOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#766C64', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#201712', marginBottom: '6px' }}>
                Audience Group
              </label>
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as any)}
                className="admin-select"
                style={{ width: '100%' }}
              >
                <option value="patient">All Patients</option>
                <option value="doctor">All Doctors</option>
                <option value="all">Everyone (All Registered Users)</option>
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#201712', marginBottom: '6px' }}>
                Broadcast Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Scheduled platform maintenance notice"
                className="admin-input"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#201712', marginBottom: '6px' }}>
                Announcement Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Write the announcement message dispatched to users' inboxes..."
                className="admin-input"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setBroadcastOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBroadcast}
                disabled={sending}
                className="btn-primary"
              >
                {sending ? 'Sending Broadcast...' : 'Send Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
