'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  Clock,
  Repeat,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Sliders,
  ShieldAlert,
} from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';

interface SlotCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialDate?: string;
}

const DAYS_OF_WEEK = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
];

export function SlotCreationModal({
  isOpen,
  onClose,
  onCreated,
  initialDate,
}: SlotCreationModalProps) {
  const { token } = useDoctorAuth();
  const [mode, setMode] = useState<'recurring' | 'single'>('recurring');

  // Single slot state
  const defaultDate = initialDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [singleDate, setSingleDate] = useState(defaultDate);
  const [singleStartTime, setSingleStartTime] = useState('09:00');
  const [singleDuration, setSingleDuration] = useState(30);

  // Recurring schedule state
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [shiftStartTime, setShiftStartTime] = useState('08:30');
  const [shiftEndTime, setShiftEndTime] = useState('16:30');
  const [slotDuration, setSlotDuration] = useState(30);
  const [bufferTime, setBufferTime] = useState(5);

  const defaultEndRecurrence = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const [recurrenceStartDate, setRecurrenceStartDate] = useState(defaultDate);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(defaultEndRecurrence);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live calculation of generated slots for recurring schedule
  const estimatedSlotCount = useMemo(() => {
    if (mode === 'single') return 1;

    try {
      const [startH, startM] = shiftStartTime.split(':').map(Number);
      const [endH, endM] = shiftEndTime.split(':').map(Number);
      const shiftMins = (endH * 60 + endM) - (startH * 60 + startM);

      if (shiftMins <= 0) return 0;

      const slotStep = slotDuration + bufferTime;
      const slotsPerDay = Math.floor(shiftMins / slotStep);

      const start = new Date(recurrenceStartDate);
      const end = new Date(recurrenceEndDate);
      if (start > end) return 0;

      let matchingDays = 0;
      const cur = new Date(start);
      while (cur <= end) {
        if (selectedDays.includes(cur.getDay())) {
          matchingDays++;
        }
        cur.setDate(cur.getDate() + 1);
      }

      return matchingDays * slotsPerDay;
    } catch {
      return 0;
    }
  }, [
    mode,
    shiftStartTime,
    shiftEndTime,
    slotDuration,
    bufferTime,
    selectedDays,
    recurrenceStartDate,
    recurrenceEndDate,
  ]);

  if (!isOpen) return null;

  const toggleDay = (dayValue: number) => {
    if (selectedDays.includes(dayValue)) {
      if (selectedDays.length === 1) return; // keep at least 1 day
      setSelectedDays(selectedDays.filter((d) => d !== dayValue));
    } else {
      setSelectedDays([...selectedDays, dayValue]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

      let body: any;

      if (mode === 'single') {
        const [h, m] = singleStartTime.split(':').map(Number);
        const start = new Date(singleDate);
        start.setHours(h, m, 0, 0);
        const end = new Date(start.getTime() + singleDuration * 60 * 1000);

        body = {
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        };
      } else {
        body = {
          daysOfWeek: selectedDays,
          startTime: shiftStartTime,
          endTime: shiftEndTime,
          slotDurationMinutes: slotDuration,
          bufferMinutes: bufferTime,
          startDate: recurrenceStartDate,
          endDate: recurrenceEndDate,
        };
      }

      const res = await fetch(`${apiBase}/doctors/availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create availability slots');
      }

      setSuccessMsg(data.message || 'Availability slots created successfully!');
      setTimeout(() => {
        onCreated();
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
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
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Modal Header */}
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
                background: 'var(--color-brand-50)',
                color: 'var(--color-brand-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
                Add Doctor Availability
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', margin: 0 }}>
                Configure working hours and discrete appointment slots
              </p>
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
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            padding: '8px 24px 0',
            borderBottom: '1px solid var(--color-slate-200)',
            background: 'var(--color-slate-50)',
            gap: '12px',
          }}
        >
          <button
            type="button"
            onClick={() => setMode('recurring')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: mode === 'recurring' ? '2px solid var(--color-brand-600)' : '2px solid transparent',
              color: mode === 'recurring' ? 'var(--color-brand-700)' : 'var(--color-slate-500)',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Repeat size={16} />
            <span>Recurring Weekly Schedule</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('single')}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              borderBottom: mode === 'single' ? '2px solid var(--color-brand-600)' : '2px solid transparent',
              color: mode === 'single' ? 'var(--color-brand-700)' : 'var(--color-slate-500)',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Clock size={16} />
            <span>Single Time Slot</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
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
              <div>
                <strong>Conflict or Error:</strong> {errorMsg}
              </div>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontSize: '0.85rem',
                marginBottom: '18px',
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'recurring' ? (
            <div>
              {/* Days of Week (DP-402) */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-slate-700)', marginBottom: '8px' }}>
                  Days of the Week
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = selectedDays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        style={{
                          padding: '10px 4px',
                          borderRadius: '10px',
                          border: isSelected ? '2px solid var(--color-brand-600)' : '1px solid var(--color-slate-200)',
                          background: isSelected ? 'var(--color-brand-600)' : '#ffffff',
                          color: isSelected ? '#ffffff' : 'var(--color-slate-700)',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Working Hours */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                    Shift Start Time
                  </label>
                  <input
                    type="time"
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      color: 'var(--color-slate-900)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                    Shift End Time
                  </label>
                  <input
                    type="time"
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      color: 'var(--color-slate-900)',
                    }}
                  />
                </div>
              </div>

              {/* Slot Slicing Engine Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                    Consult Duration
                  </label>
                  <select
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      color: 'var(--color-slate-900)',
                      background: '#ffffff',
                    }}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes (Standard)</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                    Buffer Interval
                  </label>
                  <select
                    value={bufferTime}
                    onChange={(e) => setBufferTime(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      color: 'var(--color-slate-900)',
                      background: '#ffffff',
                    }}
                  >
                    <option value={0}>0 minutes (Back-to-back)</option>
                    <option value={5}>5 minutes (Recommended)</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                  </select>
                </div>
              </div>

              {/* Recurrence Date Range */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={recurrenceStartDate}
                    onChange={(e) => setRecurrenceStartDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      color: 'var(--color-slate-900)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      color: 'var(--color-slate-900)',
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Single Slot Options */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                  Slot Date
                </label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-slate-300)',
                    fontSize: '0.9rem',
                    color: 'var(--color-slate-900)',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={singleStartTime}
                    onChange={(e) => setSingleStartTime(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      color: 'var(--color-slate-900)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 700, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                    Duration
                  </label>
                  <select
                    value={singleDuration}
                    onChange={(e) => setSingleDuration(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      color: 'var(--color-slate-900)',
                      background: '#ffffff',
                    }}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Live Slot Estimate Banner */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              background: 'var(--color-brand-50)',
              border: '1px solid var(--color-brand-100)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} style={{ color: 'var(--color-brand-600)' }} />
              <span style={{ fontSize: '0.85rem', color: 'var(--color-brand-900)', fontWeight: 600 }}>
                Estimated Bookable Slots
              </span>
            </div>
            <span
              style={{
                fontSize: '1.1rem',
                fontWeight: 800,
                color: 'var(--color-brand-700)',
              }}
            >
              {estimatedSlotCount} slots
            </span>
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '11px 18px',
                borderRadius: '10px',
                border: '1px solid var(--color-slate-300)',
                background: '#ffffff',
                color: 'var(--color-slate-700)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || estimatedSlotCount === 0}
              style={{
                padding: '11px 22px',
                borderRadius: '10px',
                border: 'none',
                background: estimatedSlotCount === 0 ? 'var(--color-slate-300)' : 'var(--color-brand-600)',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: estimatedSlotCount === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isLoading ? 'Generating...' : 'Create Availability'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
