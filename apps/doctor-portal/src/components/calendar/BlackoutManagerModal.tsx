'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  AlertTriangle,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { SolarIcon } from '../common/SolarIcon';

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

      setSuccessMsg(data.message || 'Out-of-office period created successfully');
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
      className="portal-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="portal-modal-surface"
        style={{
          width: '100%',
          maxWidth: '580px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--color-cream-surface, #FDFBF7)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '22px 28px',
            borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-cream-surface, #FDFBF7)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--color-gold-pale, #F0E5D3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="calendar-minimalistic-linear" size={20} color="var(--color-gold-bronze, #B88647)" />
            </div>
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: 'var(--color-chocolate-base, #2A170F)',
                  margin: 0,
                }}
              >
                Out-of-Office & Blackout Periods
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                Block clinical dates and prevent patient consultation bookings
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
              color: 'var(--color-cream-text-muted, #6B5E55)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SolarIcon name="close-circle-linear" size={24} color="var(--color-gold-base, #DFAB62)" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
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
              background: 'var(--color-cream-base, #FAF6EE)',
              borderRadius: '18px',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1rem',
                fontWeight: 800,
                color: 'var(--color-chocolate-base, #2A170F)',
                marginBottom: '14px',
              }}
            >
              Schedule New Out-of-Office Period
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label className="portal-label">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="portal-input"
                />
              </div>
              <div>
                <label className="portal-label">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="portal-input"
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="portal-label">
                Reason / Clinical Note
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="portal-select"
              >
                <option value="Annual Leave">Annual Leave</option>
                <option value="Medical Conference">Medical Conference / CPD / CME</option>
                <option value="Sick Leave">Personal / Medical Leave</option>
                <option value="Public Holiday">Public Holiday</option>
                <option value="Out of Office">Out of Office / Personal Shift</option>
              </select>
            </div>

            {/* Warning Callout */}
            <div
              style={{
                background: 'var(--color-gold-pale, #F0E5D3)',
                borderRadius: '12px',
                padding: '12px 14px',
                border: '1px solid rgba(223, 171, 98, 0.35)',
                fontSize: '0.78rem',
                color: 'var(--color-chocolate-base, #2A170F)',
                lineHeight: 1.45,
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <SolarIcon name="danger-circle-bold" size={16} color="var(--color-gold-bronze, #B88647)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>
                <strong>Notice:</strong> All unbooked availability slots within this window will be blocked automatically, preventing new patient telehealth bookings.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{ width: '100%', padding: '11px', fontSize: '0.875rem' }}
            >
              <SolarIcon name="add-circle-bold" size={17} color="var(--color-chocolate-base)" />
              <span>{isSubmitting ? 'Saving Period...' : 'Confirm & Block Out-of-Office'}</span>
            </button>
          </form>

          {/* Active Blackouts List */}
          <div>
            <h3
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1rem',
                fontWeight: 800,
                color: 'var(--color-chocolate-base, #2A170F)',
                marginBottom: '12px',
              }}
            >
              Current & Scheduled Out-of-Office Periods
            </h3>

            {blackouts.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  borderRadius: '14px',
                  border: '1.5px dashed var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                  textAlign: 'center',
                  color: 'var(--color-cream-text-muted, #6B5E55)',
                  fontSize: '0.85rem',
                }}
              >
                No active out-of-office periods scheduled.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {blackouts.map((b) => {
                  const s = new Date(b.startTime).toLocaleDateString('en-ZA', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });
                  const e = new Date(b.endTime).toLocaleDateString('en-ZA', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={b.id}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '14px',
                        border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
                        background: 'var(--color-cream-surface, #FDFBF7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge-gold">
                            {b.reason}
                          </span>
                          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)' }}>
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
                          color: '#dc2626',
                          cursor: 'pointer',
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <SolarIcon name="trash-bin-trash-linear" size={17} color="#dc2626" />
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
            padding: '16px 28px',
            borderTop: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.15))',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'var(--color-cream-surface, #FDFBF7)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '8px 20px', fontSize: '0.85rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
