'use client';

import React, { useState } from 'react';
import {
  X,
  Clock,
  Calendar,
  Lock,
  Trash2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { SolarIcon } from '../common/SolarIcon';

export interface CalendarSlotItem {
  id: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  isRecurring?: boolean;
  source: 'direct' | 'locumstaff';
  isLocked: boolean;
  bookingStatus?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  cancellationReason?: string;
  cancellationFeeEarned?: number;
  patientName?: string;
}

interface SlotDetailModalProps {
  isOpen: boolean;
  slot: CalendarSlotItem | null;
  onClose: () => void;
  onDeleted: () => void;
}

export function SlotDetailModal({
  isOpen,
  slot,
  onClose,
  onDeleted,
}: SlotDetailModalProps) {
  const { token } = useDoctorAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !slot) return null;

  const startDate = new Date(slot.startTime);
  const endDate = new Date(slot.endTime);

  const formattedDate = startDate.toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const timeRange = `${startDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })} - ${endDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })}`;

  const durationMinutes = Math.round(
    (endDate.getTime() - startDate.getTime()) / (60 * 1000),
  );

  const isPast = endDate.getTime() < Date.now();
  const isLocumStaff = slot.source === 'locumstaff' || slot.isLocked;

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this availability slot?')) {
      return;
    }

    setIsDeleting(true);
    setErrorMsg(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/doctors/availability/${slot.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete availability slot');
      }

      onDeleted();
      onClose();
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
              <SolarIcon
                name={slot.isBooked ? 'user-rounded-bold' : isLocumStaff ? 'lock-bold' : 'clock-circle-bold'}
                size={22}
                color="var(--color-chocolate-base, #2A170F)"
              />
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
                {slot.isBooked ? 'Booked Consultation' : 'Availability Slot'}
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                {durationMinutes} Minute Appointment Window
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

        {/* Content */}
        <div style={{ padding: '24px 28px' }}>
          {errorMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '0.85rem',
                marginBottom: '18px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Cancelled Appointment Banner */}
          {slot.bookingStatus === 'cancelled' && (
            <div
              style={{
                padding: '16px',
                borderRadius: '14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                marginBottom: '18px',
                color: '#991b1b',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>
                <AlertCircle size={18} color="#dc2626" />
                <span>Appointment Cancelled by Patient</span>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#7f1d1d' }}>
                <strong>Reason:</strong> {slot.cancellationReason || 'Patient requested cancellation'}
              </p>
              {slot.cancellationFeeEarned && slot.cancellationFeeEarned > 0 ? (
                <div
                  style={{
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    color: '#065f46',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Late Cancellation Fee Earned: +R{Number(slot.cancellationFeeEarned).toFixed(2)} (Credited to Practice)</span>
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: '#991b1b' }}>
                  Cancelled &gt;24 hours in advance (No late fee). Slot is open for re-booking.
                </div>
              )}
            </div>
          )}

          {/* LocumStaff Synced Notice */}
          {isLocumStaff && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                background: '#faf5ff',
                border: '1.5px solid #d8b4fe',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#f3e8ff',
                  color: '#7e22ce',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SolarIcon name="lock-bold" size={16} color="#7e22ce" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: '#7e22ce',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Synced from LocumStaff
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: '#6b21a8', margin: 0, lineHeight: 1.4 }}>
                  This duty shift is synchronized from the LocumStaff Partner Directory. Direct deletions are locked. Manage duty roster on LocumStaff.
                </p>
              </div>
            </div>
          )}

          {/* Slot Details Card */}
          <div
            style={{
              background: 'var(--color-cream-base, #FAF6EE)',
              borderRadius: '16px',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
              padding: '20px',
              marginBottom: '22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <SolarIcon name="calendar-linear" size={18} color="var(--color-gold-bronze, #B88647)" />
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--color-chocolate-base, #2A170F)',
                }}
              >
                {formattedDate}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <SolarIcon name="clock-circle-linear" size={18} color="var(--color-gold-bronze, #B88647)" />
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  color: 'var(--color-chocolate-base, #2A170F)',
                }}
              >
                {timeRange}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  background: 'var(--color-gold-pale, #F0E5D3)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  border: '1px solid rgba(223, 171, 98, 0.3)',
                }}
              >
                SAST
              </span>
            </div>

            {/* Status Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 600 }}>Status:</span>
              {slot.isBooked ? (
                <span className="badge-gold">
                  Booked Consultation
                </span>
              ) : (
                <span className="badge-success">
                  Available / Open for Booking
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '10px 20px', fontSize: '0.875rem' }}
            >
              Close
            </button>

            {!isLocumStaff && !slot.isBooked && !isPast && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn-danger"
                style={{ padding: '10px 20px', fontSize: '0.875rem' }}
              >
                <SolarIcon name="trash-bin-trash-linear" size={16} color="#ffffff" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Slot'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
