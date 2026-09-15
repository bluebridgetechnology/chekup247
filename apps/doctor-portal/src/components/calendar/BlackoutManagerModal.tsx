'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';

export interface BlackoutItem {
  id: string;
  startTime: string;
  endTime: string;
  reason: string;
}

interface BlackoutManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function BlackoutManagerModal({
  isOpen,
  onClose,
  onUpdated,
}: BlackoutManagerModalProps) {
  const { token } = useDoctorAuth();

  const [blackouts, setBlackouts] = useState<BlackoutItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // New blackout form
  const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const nextWeekStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(tomorrowStr);
  const [endDate, setEndDate] = useState(nextWeekStr);
  const [reason, setReason] = useState('Annual Leave');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Fetch blackouts
  const loadBlackouts = async () => {
    try {
      setIsLoading(true);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/doctors/me/blackouts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBlackouts(
          data.map((b: any) => ({
            id: b.id,
            startTime: b.start_time || b.startTime,
            endTime: b.end_time || b.endTime,
            reason: b.reason,
          })),
        );
      }
    } catch (err) {
      console.error('Error fetching blackouts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadBlackouts();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateBlackout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/doctors/me/blackouts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startTime: `${startDate}T00:00:00.000Z`,
          endTime: `${endDate}T23:59:59.999Z`,
          reason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create blackout range');
      }

      setSuccessMsg(data.message || 'Out of office period created successfully');
      await loadBlackouts();
      onUpdated();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBlackout = async (blackoutId: string) => {
    if (!confirm('Are you sure you want to remove this out-of-office period?')) return;

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/doctors/me/blackouts/${blackoutId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to remove blackout');
      }

      await loadBlackouts();
      onUpdated();
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--color-slate-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
                Out-of-Office & Blackout Manager (DP-405)
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
                Block holidays and prevent consultation bookings
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-slate-400)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Container */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.85rem',
                marginBottom: '16px',
              }}
            >
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontSize: '0.85rem',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* New Blackout Form */}
          <form
            onSubmit={handleCreateBlackout}
            style={{
              background: 'var(--color-slate-50)',
              borderRadius: '16px',
              border: '1px solid var(--color-slate-200)',
              padding: '18px',
              marginBottom: '24px',
            }}
          >
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-slate-900)', marginBottom: '14px' }}>
              Schedule New Out-of-Office Period
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '4px' }}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-slate-300)',
                    fontSize: '0.875rem',
                    background: '#ffffff',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '4px' }}>
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--color-slate-300)',
                    fontSize: '0.875rem',
                    background: '#ffffff',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '4px' }}>
                Reason / Note
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-slate-300)',
                  fontSize: '0.875rem',
                  background: '#ffffff',
                }}
              >
                <option value="Annual Leave">Annual Leave</option>
                <option value="Medical Conference">Medical Conference / CME</option>
                <option value="Sick Leave">Personal / Medical Leave</option>
                <option value="Public Holiday">Public Holiday</option>
                <option value="Out of Office">Out of Office</option>
              </select>
            </div>

            {/* Warning Callout */}
            <div
              style={{
                background: '#fffbeb',
                borderRadius: '10px',
                padding: '10px 12px',
                border: '1px solid #fde68a',
                fontSize: '0.775rem',
                color: '#92400e',
                lineHeight: 1.4,
                marginBottom: '14px',
              }}
            >
              ⚠️ <strong>Auto-cancellation:</strong> All unbooked availability slots within this window will be cancelled automatically, and no third-party shifts will slice during this period.
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                border: 'none',
                background: 'var(--color-brand-600)',
                color: '#ffffff',
                fontSize: '0.875rem',
                fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Plus size={16} />
              <span>{isSubmitting ? 'Saving...' : 'Confirm & Block Out-of-Office'}</span>
            </button>
          </form>

          {/* Active Blackouts List */}
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-slate-900)', marginBottom: '12px' }}>
              Current & Upcoming Out-of-Office Periods
            </h3>

            {blackouts.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  borderRadius: '12px',
                  border: '1px dashed var(--color-slate-200)',
                  textAlign: 'center',
                  color: 'var(--color-slate-400)',
                  fontSize: '0.85rem',
                }}
              >
                No active out-of-office periods scheduled.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {blackouts.map((b) => {
                  const s = new Date(b.startTime).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const e = new Date(b.endTime).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={b.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid var(--color-slate-200)',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: '#fef3c7',
                              color: '#b45309',
                            }}
                          >
                            {b.reason}
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-slate-800)' }}>
                            {s} — {e}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteBlackout(b.id)}
                        aria-label="Remove blackout"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--color-slate-100)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--color-slate-300)',
              background: '#ffffff',
              color: 'var(--color-slate-700)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
