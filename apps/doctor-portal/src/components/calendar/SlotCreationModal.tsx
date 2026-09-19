'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Repeat,
  Sparkles,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { SolarIcon } from '../common/SolarIcon';

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

      setSuccessMsg(data.message || 'Availability slots generated successfully!');
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
          overflow: 'hidden',
          background: 'var(--color-cream-surface, #FDFBF7)',
        }}
      >
        {/* Modal Header */}
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
              <SolarIcon name="calendar-bold" size={22} color="var(--color-chocolate-base, #2A170F)" />
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
                Add Doctor Availability
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', margin: 0 }}>
                Configure clinical hours and discrete telehealth slots
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

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            padding: '12px 28px 0',
            borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
            background: 'var(--color-cream-base, #FAF6EE)',
            gap: '10px',
          }}
        >
          <button
            type="button"
            onClick={() => setMode('recurring')}
            className={`specialty-chip ${mode === 'recurring' ? 'active' : ''}`}
            style={{ borderRadius: '12px 12px 0 0', borderBottom: 'none' }}
          >
            <SolarIcon
              name="refresh-circle-linear"
              size={16}
              color={mode === 'recurring' ? 'var(--color-chocolate-base)' : 'var(--color-gold-bronze)'}
            />
            <span>Recurring Weekly Schedule</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`specialty-chip ${mode === 'single' ? 'active' : ''}`}
            style={{ borderRadius: '12px 12px 0 0', borderBottom: 'none' }}
          >
            <SolarIcon
              name="clock-circle-linear"
              size={16}
              color={mode === 'single' ? 'var(--color-chocolate-base)' : 'var(--color-gold-bronze)'}
            />
            <span>Single Time Slot</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
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
                <strong>Schedule Conflict:</strong> {errorMsg}
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
              {/* Days of Week */}
              <div style={{ marginBottom: '18px' }}>
                <label className="portal-label">
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
                          borderRadius: '12px',
                          border: isSelected
                            ? '1.5px solid var(--color-gold-base, #DFAB62)'
                            : '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
                          background: isSelected ? 'var(--color-gold-primary, #E2B467)' : 'var(--color-cream-surface, #FDFBF7)',
                          color: 'var(--color-chocolate-base, #2A170F)',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 2px 8px var(--color-gold-cta-shadow)' : 'none',
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                <div>
                  <label className="portal-label">
                    Shift Start Time
                  </label>
                  <input
                    type="time"
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    required
                    className="portal-input"
                  />
                </div>
                <div>
                  <label className="portal-label">
                    Shift End Time
                  </label>
                  <input
                    type="time"
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    required
                    className="portal-input"
                  />
                </div>
              </div>

              {/* Slot Slicing Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
                <div>
                  <label className="portal-label">
                    Consult Duration
                  </label>
                  <select
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(Number(e.target.value))}
                    className="portal-select"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes (Standard)</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="portal-label">
                    Buffer Interval
                  </label>
                  <select
                    value={bufferTime}
                    onChange={(e) => setBufferTime(Number(e.target.value))}
                    className="portal-select"
                  >
                    <option value={0}>0 minutes (Back-to-back)</option>
                    <option value={5}>5 minutes (Recommended)</option>
                    <option value={10}>10 minutes</option>
                    <option value={15}>15 minutes</option>
                  </select>
                </div>
              </div>

              {/* Recurrence Date Range */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label className="portal-label">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={recurrenceStartDate}
                    onChange={(e) => setRecurrenceStartDate(e.target.value)}
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
                    value={recurrenceEndDate}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    required
                    className="portal-input"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              {/* Single Slot Options */}
              <div style={{ marginBottom: '16px' }}>
                <label className="portal-label">
                  Slot Date
                </label>
                <input
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  required
                  className="portal-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label className="portal-label">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={singleStartTime}
                    onChange={(e) => setSingleStartTime(e.target.value)}
                    required
                    className="portal-input"
                  />
                </div>
                <div>
                  <label className="portal-label">
                    Duration
                  </label>
                  <select
                    value={singleDuration}
                    onChange={(e) => setSingleDuration(Number(e.target.value))}
                    className="portal-select"
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
              padding: '14px 18px',
              borderRadius: '16px',
              background: 'var(--color-gold-pale, #F0E5D3)',
              border: '1.5px solid rgba(223, 171, 98, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SolarIcon name="bolt-circle-bold" size={20} color="var(--color-gold-bronze, #B88647)" />
              <span style={{ fontSize: '0.875rem', color: 'var(--color-chocolate-base, #2A170F)', fontWeight: 600 }}>
                Estimated Bookable Slots Generated
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--color-chocolate-base, #2A170F)',
              }}
            >
              {estimatedSlotCount} slots
            </span>
          </div>

          {/* Form Actions */}
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
              disabled={isLoading || estimatedSlotCount === 0}
              className="btn-primary"
              style={{ padding: '10px 24px', fontSize: '0.875rem' }}
            >
              <SolarIcon name="add-circle-bold" size={17} color="var(--color-chocolate-base)" />
              <span>{isLoading ? 'Generating Slots...' : 'Publish Availability'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
