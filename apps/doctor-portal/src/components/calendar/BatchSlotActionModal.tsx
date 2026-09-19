'use client';

import React, { useState } from 'react';
import {
  Trash2,
  AlertTriangle,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { SolarIcon } from '../common/SolarIcon';

interface BatchSlotActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCleared: () => void;
  initialDate?: string;
}

export function BatchSlotActionModal({
  isOpen,
  onClose,
  onCleared,
  initialDate,
}: BatchSlotActionModalProps) {
  const { token } = useDoctorAuth();
  const defaultDate = initialDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBatchDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsDeleting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/doctors/availability/batch-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          startDate: `${startDate}T00:00:00.000Z`,
          endDate: `${endDate}T23:59:59.999Z`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to batch delete slots');
      }

      setSuccessMsg(data.message || 'Slots removed successfully');
      setTimeout(() => {
        onCleared();
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsDeleting(false);
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
          maxWidth: '500px',
          overflow: 'hidden',
          background: 'var(--color-cream-surface, #FDFBF7)',
        }}
      >
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
                background: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="trash-bin-trash-bold" size={20} color="#dc2626" />
            </div>
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: 'var(--color-chocolate-base, #2A170F)',
                  margin: 0,
                }}
              >
                Batch Clear Slots
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                Remove multiple unbooked availability slots
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

        <form onSubmit={handleBatchDelete} style={{ padding: '24px 28px' }}>
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

          <div
            style={{
              padding: '14px 16px',
              borderRadius: '14px',
              background: 'var(--color-gold-pale, #F0E5D3)',
              border: '1px solid rgba(223, 171, 98, 0.35)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <SolarIcon name="danger-circle-bold" size={20} color="var(--color-gold-bronze, #B88647)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <p style={{ fontSize: '0.825rem', color: 'var(--color-chocolate-base, #2A170F)', margin: 0, lineHeight: 1.45 }}>
              This will safely remove unbooked direct slots within the selected date span. Booked consultations and LocumStaff-synced duty shifts remain protected and untouched.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '24px' }}>
            <div>
              <label className="portal-label">
                From Date
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
                To Date
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

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '10px 20px', fontSize: '0.875rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isDeleting}
              className="btn-danger"
              style={{ padding: '10px 20px', fontSize: '0.875rem' }}
            >
              <SolarIcon name="trash-bin-trash-linear" size={16} color="#ffffff" />
              <span>{isDeleting ? 'Clearing Slots...' : 'Clear Unbooked Slots'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
