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
  Video,
  User,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';

export interface CalendarSlotItem {
  id: string;
  startTime: string;
  endTime: string;
  isBooked: boolean;
  isRecurring?: boolean;
  source: 'direct' | 'locumstaff';
  isLocked: boolean;
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

  const formattedDate = startDate.toLocaleDateString('en-US', {
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
          maxWidth: '480px',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: slot.isBooked
                  ? '#eff6ff'
                  : isLocumStaff
                  ? '#fdf4ff'
                  : '#ecfdf5',
                color: slot.isBooked
                  ? '#2563eb'
                  : isLocumStaff
                  ? '#c026d3'
                  : '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
                {slot.isBooked ? 'Booked Consultation' : 'Availability Slot'}
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
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
              color: 'var(--color-slate-400)',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
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

          {/* LocumStaff Synced Badge (DP-404) */}
          {isLocumStaff && (
            <div
              style={{
                padding: '14px 16px',
                borderRadius: '14px',
                background: '#fdf4ff',
                border: '1px solid #f5d0fe',
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
                  background: '#fae8ff',
                  color: '#a21caf',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Lock size={16} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      background: '#e879f9',
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
                <p style={{ fontSize: '0.8rem', color: '#86198f', margin: 0, lineHeight: 1.4 }}>
                  This duty shift is synchronized automatically from the LocumStaff Partner Directory. Direct edits and deletions are locked. To modify your duty roster, please access the LocumStaff Partner Portal.
                </p>
              </div>
            </div>
          )}

          {/* Slot Details Card */}
          <div
            style={{
              background: 'var(--color-slate-50)',
              borderRadius: '16px',
              border: '1px solid var(--color-slate-200)',
              padding: '18px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Calendar size={18} style={{ color: 'var(--color-slate-500)' }} />
              <span style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                {formattedDate}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <Clock size={18} style={{ color: 'var(--color-slate-500)' }} />
              <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-slate-800)' }}>
                {timeRange}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  background: 'var(--color-slate-200)',
                  color: 'var(--color-slate-700)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 600,
                }}
              >
                SAST / Local
              </span>
            </div>

            {/* Status Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>Status:</span>
              {slot.isBooked ? (
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  Booked Consultation
                </span>
              ) : (
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: '#ecfdf5',
                    color: '#047857',
                    border: '1px solid #a7f3d0',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  Available / Open for Booking
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid var(--color-slate-300)',
                background: '#ffffff',
                color: 'var(--color-slate-700)',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>

            {!isLocumStaff && !slot.isBooked && !isPast && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={16} />
                <span>{isDeleting ? 'Deleting...' : 'Delete Slot'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
