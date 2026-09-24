'use client';

import React, { useState, useEffect } from 'react';
import { toastSuccess, toastError, errorMessage } from '../lib/toast';
import {
  Calendar as CalendarIcon,
  Clock,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
} from 'lucide-react';

interface AvailableSlot {
  id: string;
  doctor_id: string;
  start_time: string;
  end_time: string;
  is_booked: boolean;
  is_locked: boolean;
}

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  doctorId: string;
  doctorName?: string;
  currentSlotTime?: string;
  token?: string | null;
  onRescheduleSuccess: (updatedBooking: any) => void;
}

export function RescheduleModal({
  isOpen,
  onClose,
  bookingId,
  doctorId,
  doctorName = 'Doctor',
  currentSlotTime,
  token,
  onRescheduleSuccess,
}: RescheduleModalProps) {
  const [slots, setSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  useEffect(() => {
    if (!isOpen || !doctorId) return;

    async function loadDoctorSlots() {
      setIsLoadingSlots(true);
      setErrorMsg(null);
      setSelectedSlot(null);

      try {
        const res = await fetch(`${API_BASE}/doctors/${doctorId}/availability`);
        if (res.ok) {
          const data = await res.json();
          const openSlots = (data.slots || []).filter(
            // Keep slots with at least the minimum bookable time remaining
            // (must match backend SLOT_BOOKING_MIN_REMAINING_MINUTES).
            (s: AvailableSlot) =>
              !s.is_booked &&
              !s.is_locked &&
              new Date(s.end_time).getTime() - Date.now() >= 15 * 60 * 1000,
          );
          setSlots(openSlots);
          if (openSlots.length > 0) {
            const firstDate = new Date(openSlots[0].start_time).toDateString();
            setSelectedDateKey(firstDate);
          }
        } else {
          generateMockSlots();
        }
      } catch (e) {
        generateMockSlots();
      } finally {
        setIsLoadingSlots(false);
      }
    }

    function generateMockSlots() {
      const mockList: AvailableSlot[] = [];
      const now = new Date();
      for (let dayOffset = 1; dayOffset <= 4; dayOffset++) {
        const d = new Date(now);
        d.setDate(now.getDate() + dayOffset);
        ['09:00', '10:30', '14:00', '15:30'].forEach((timeStr, idx) => {
          const [hh, mm] = timeStr.split(':').map(Number);
          const start = new Date(d);
          start.setHours(hh, mm, 0, 0);
          const end = new Date(start);
          end.setMinutes(start.getMinutes() + 30);
          mockList.push({
            id: `slot-reschedule-mock-${dayOffset}-${idx}`,
            doctor_id: doctorId,
            start_time: start.toISOString(),
            end_time: end.toISOString(),
            is_booked: false,
            is_locked: false,
          });
        });
      }
      setSlots(mockList);
      if (mockList.length > 0) {
        setSelectedDateKey(new Date(mockList[0].start_time).toDateString());
      }
    }

    loadDoctorSlots();
  }, [isOpen, doctorId, API_BASE]);

  // Group slots by date
  const groupedSlots = slots.reduce<Record<string, AvailableSlot[]>>((acc, slot) => {
    const dStr = new Date(slot.start_time).toDateString();
    if (!acc[dStr]) acc[dStr] = [];
    acc[dStr].push(slot);
    return acc;
  }, {});

  const dates = Object.keys(groupedSlots);

  const handleConfirmReschedule = async () => {
    if (!selectedSlot) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          newSlotId: selectedSlot.id,
          reason: 'Patient rescheduled appointment via portal',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Rescheduling failed. Please select another slot.');
      }

      const updated = await res.json();
      onRescheduleSuccess(updated);
      onClose();
      toastSuccess('Appointment rescheduled', 'Your new time is confirmed.');
    } catch (err: any) {
      const msg = errorMessage(err, 'Failed to reschedule. Please try again.');
      setErrorMsg(msg);
      toastError('Reschedule failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '32px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-brand-600)', marginBottom: '4px' }}>
              <CalendarIcon size={18} />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reschedule Consultation
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
              Select a Replacement Slot
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--color-slate-500)' }}>
              Consulting Doctor: <strong>{doctorName}</strong> (No extra payment required)
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: 'var(--color-slate-100)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-slate-600)',
              cursor: 'pointer',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Area */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
          {isLoadingSlots ? (
            <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--color-slate-400)' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px' }} />
              <p>Loading available slots for {doctorName}...</p>
            </div>
          ) : dates.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', color: 'var(--color-slate-500)', background: 'var(--color-slate-50)', borderRadius: '16px' }}>
              <Clock size={32} style={{ opacity: 0.4, margin: '0 auto 8px' }} />
              <p style={{ fontWeight: 600, color: 'var(--color-slate-700)' }}>No other open slots found</p>
              <p style={{ fontSize: '0.85rem', margin: '4px 0 0' }}>
                Dr. {doctorName} has no other open slots in the near future. You can cancel and receive a refund or credit.
              </p>
            </div>
          ) : (
            <div>
              {/* Date Tabs */}
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
                {dates.map((dateStr) => {
                  const isSelected = selectedDateKey === dateStr;
                  const dateObj = new Date(dateStr);
                  const dayName = dateObj.toLocaleDateString('en-ZA', { weekday: 'short' });
                  const dayNum = dateObj.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDateKey(dateStr)}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '14px',
                        border: isSelected ? '2px solid var(--color-brand-600)' : '1px solid var(--color-slate-200)',
                        background: isSelected ? 'var(--color-brand-50)' : '#ffffff',
                        color: isSelected ? 'var(--color-brand-700)' : 'var(--color-slate-700)',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: '80px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>{dayName}</span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>{dayNum}</span>
                    </button>
                  );
                })}
              </div>

              {/* Time Chips for Selected Date */}
              {selectedDateKey && (
                <div>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-slate-600)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Available Time Windows
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
                    {groupedSlots[selectedDateKey]?.map((slot) => {
                      const isChosen = selectedSlot?.id === slot.id;
                      const timeStr = new Date(slot.start_time).toLocaleTimeString('en-ZA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <button
                          key={slot.id}
                          onClick={() => setSelectedSlot(slot)}
                          style={{
                            padding: '12px 8px',
                            borderRadius: '12px',
                            border: isChosen ? '2px solid var(--color-brand-600)' : '1px solid var(--color-slate-200)',
                            background: isChosen ? 'var(--color-brand-600)' : '#ffffff',
                            color: isChosen ? '#ffffff' : 'var(--color-slate-800)',
                            fontWeight: isChosen ? 700 : 600,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.15s',
                          }}
                        >
                          <Clock size={14} />
                          <span>{timeStr}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            marginTop: '24px',
            paddingTop: '20px',
            borderTop: '1px solid var(--color-slate-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ fontSize: '0.825rem', color: 'var(--color-slate-500)' }}>
            {selectedSlot ? (
              <span>
                New Time:{' '}
                <strong style={{ color: 'var(--color-slate-900)' }}>
                  {new Date(selectedSlot.start_time).toLocaleDateString('en-ZA', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  at{' '}
                  {new Date(selectedSlot.start_time).toLocaleTimeString('en-ZA', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </strong>
              </span>
            ) : (
              <span>Please pick an available time slot</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '10px 18px',
                borderRadius: '12px',
                border: '1px solid var(--color-slate-300)',
                background: '#ffffff',
                color: 'var(--color-slate-700)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmReschedule}
              disabled={!selectedSlot || isSubmitting}
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                border: 'none',
                background: selectedSlot && !isSubmitting ? 'var(--color-brand-600)' : 'var(--color-slate-300)',
                color: '#ffffff',
                fontWeight: 700,
                cursor: selectedSlot && !isSubmitting ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Rescheduling...</span>
                </>
              ) : (
                <>
                  <span>Confirm Swap</span>
                  <ChevronRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
