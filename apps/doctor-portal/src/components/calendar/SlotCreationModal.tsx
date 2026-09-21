'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { toastSuccess, toastError, errorMessage } from '../../lib/toast';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { SolarIcon } from '../common/SolarIcon';

interface SlotCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialDate?: string;
  initialStartTime?: string;
  initialMode?: 'single' | 'recurring';
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

const getLocalTodayDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalCurrentTime = () => {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
};

const getNextSensibleStartTime = () => {
  const d = new Date();
  const minutes = d.getMinutes();
  const nextMin = minutes < 30 ? 30 : 0;
  if (minutes >= 30) {
    d.setHours(d.getHours() + 1);
  }
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(nextMin).padStart(2, '0');
  return `${h}:${m}`;
};

export function SlotCreationModal({
  isOpen,
  onClose,
  onCreated,
  initialDate,
  initialStartTime,
  initialMode,
}: SlotCreationModalProps) {
  const { token } = useDoctorAuth();
  const [mode, setMode] = useState<'recurring' | 'single'>('recurring');

  const todayStr = useMemo(() => getLocalTodayDate(), [isOpen]);

  // Single slot state
  const defaultDate = initialDate && initialDate >= getLocalTodayDate()
    ? initialDate
    : getLocalTodayDate();
  const [singleDate, setSingleDate] = useState(defaultDate);
  const [singleStartTime, setSingleStartTime] = useState(initialStartTime || getNextSensibleStartTime());
  const [singleDuration, setSingleDuration] = useState(30);

  // Recurring schedule state
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [shiftStartTime, setShiftStartTime] = useState('08:30');
  const [shiftEndTime, setShiftEndTime] = useState('16:30');
  const [slotDuration, setSlotDuration] = useState(30);
  const [bufferTime, setBufferTime] = useState(5);

  const defaultEndRecurrence = () => {
    const d = new Date();
    d.setDate(d.getDate() + 28);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [recurrenceStartDate, setRecurrenceStartDate] = useState(defaultDate);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(defaultEndRecurrence());

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state when modal opens or initialDate changes
  useEffect(() => {
    if (isOpen) {
      if (initialMode) {
        setMode(initialMode);
      }
      const today = getLocalTodayDate();
      const validDate = initialDate && initialDate >= today ? initialDate : today;
      setSingleDate(validDate);
      setRecurrenceStartDate(validDate);
      if (initialStartTime) {
        setSingleStartTime(initialStartTime);
      } else if (validDate === today) {
        setSingleStartTime(getNextSensibleStartTime());
      }
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, initialDate, initialStartTime, initialMode]);

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

      const [sy, sm, sd] = recurrenceStartDate.split('-').map(Number);
      const [ey, em, ed] = recurrenceEndDate.split('-').map(Number);
      const start = new Date(sy, sm - 1, sd);
      const end = new Date(ey, em - 1, ed);
      if (start > end) return 0;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let matchingDays = 0;
      let partialTodaySlots = 0;
      const cur = new Date(start);

      while (cur <= end) {
        if (cur.getTime() < today.getTime()) {
          cur.setDate(cur.getDate() + 1);
          continue;
        }

        if (selectedDays.includes(cur.getDay())) {
          if (cur.getTime() === today.getTime()) {
            const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
            let t = startH * 60 + startM;
            while (t + slotDuration <= endH * 60 + endM) {
              if (t > nowMins) {
                partialTodaySlots++;
              }
              t += slotStep;
            }
          } else {
            matchingDays++;
          }
        }
        cur.setDate(cur.getDate() + 1);
      }

      return matchingDays * slotsPerDay + partialTodaySlots;
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

    const today = getLocalTodayDate();

    if (!token) {
      setErrorMsg('You are not currently signed in. Please sign in to your doctor account to publish availability.');
      return;
    }

    // Client-side past date and time validation
    if (mode === 'single') {
      if (singleDate < today) {
        setErrorMsg('Cannot create availability slots in the past. Please select a future date.');
        return;
      }

      const [y, mon, d] = singleDate.split('-').map(Number);
      const [h, m] = singleStartTime.split(':').map(Number);
      const start = new Date(y, mon - 1, d, h, m, 0, 0);

      if (start.getTime() <= Date.now()) {
        setErrorMsg('Cannot create availability slots in the past. Please select a future time.');
        return;
      }
    } else {
      if (recurrenceStartDate < today) {
        setErrorMsg('Start date cannot be in the past.');
        return;
      }
      if (recurrenceEndDate < recurrenceStartDate) {
        setErrorMsg('End date cannot be before start date.');
        return;
      }

      const [startH, startM] = shiftStartTime.split(':').map(Number);
      const [endH, endM] = shiftEndTime.split(':').map(Number);
      if (endH * 60 + endM <= startH * 60 + startM) {
        setErrorMsg('Shift end time must be after shift start time.');
        return;
      }

      if (recurrenceStartDate === today && recurrenceEndDate === today) {
        const [y, mon, d] = today.split('-').map(Number);
        const shiftEndToday = new Date(y, mon - 1, d, endH, endM, 0, 0);
        if (shiftEndToday.getTime() <= Date.now()) {
          setErrorMsg('The selected shift hours for today have already passed. Please select a future time or date.');
          return;
        }
      }
    }

    setIsLoading(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

      let body: any;

      if (mode === 'single') {
        const [y, mon, d] = singleDate.split('-').map(Number);
        const [h, m] = singleStartTime.split(':').map(Number);
        const start = new Date(y, mon - 1, d, h, m, 0, 0);
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
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create availability slots');
      }

      setSuccessMsg(data.message || 'Availability slots generated successfully!');
      toastSuccess('Availability added', 'Your new slots are live.');
      setTimeout(() => {
        onCreated();
        onClose();
      }, 900);
    } catch (err: any) {
      const msg = errorMessage(err, 'Failed to create availability slots');
      setErrorMsg(msg);
      toastError('Could not add availability', msg);
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
      style={{
        padding: '16px',
      }}
    >
      <div
        className="portal-modal-surface"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: 'min(90vh, 700px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--color-cream-surface, #FDFBF7)',
          borderRadius: '16px',
          border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
          boxShadow: '0 20px 50px rgba(42, 23, 15, 0.16)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.18))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-cream-surface, #FDFBF7)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--color-gold-pale, #F0E5D3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <SolarIcon name="calendar-bold" size={18} color="var(--color-chocolate-base, #2A170F)" />
            </div>
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.125rem',
                  fontWeight: 'var(--font-heading-weight, 400)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  margin: 0,
                  letterSpacing: '-0.01em',
                }}
              >
                Add Availability
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', margin: 0, fontWeight: 400 }}>
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
              borderRadius: '6px',
            }}
          >
            <SolarIcon name="close-circle-linear" size={22} color="var(--color-gold-base, #DFAB62)" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: 'flex',
            padding: '8px 20px 0',
            borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.18))',
            background: 'var(--color-cream-base, #FAF6EE)',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={() => setMode('recurring')}
            className={`specialty-chip ${mode === 'recurring' ? 'active' : ''}`}
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: mode === 'recurring' ? 600 : 500,
              borderRadius: '10px 10px 0 0',
              borderBottom: 'none',
            }}
          >
            <SolarIcon
              name="refresh-circle-linear"
              size={14}
              color={mode === 'recurring' ? 'var(--color-chocolate-base)' : 'var(--color-gold-bronze)'}
            />
            <span>Recurring Schedule</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`specialty-chip ${mode === 'single' ? 'active' : ''}`}
            style={{
              padding: '6px 14px',
              fontSize: '0.78rem',
              fontWeight: mode === 'single' ? 600 : 500,
              borderRadius: '10px 10px 0 0',
              borderBottom: 'none',
            }}
          >
            <SolarIcon
              name="clock-circle-linear"
              size={14}
              color={mode === 'single' ? 'var(--color-chocolate-base)' : 'var(--color-gold-bronze)'}
            />
            <span>Single Slot</span>
          </button>
        </div>

        {/* Form Body (Scrollable with smooth scrolling) */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '18px 20px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          {errorMsg && (() => {
            const isAuthError =
              errorMsg.toLowerCase().includes('token') ||
              errorMsg.toLowerCase().includes('auth') ||
              errorMsg.toLowerCase().includes('sign in') ||
              errorMsg.toLowerCase().includes('credentials');

            return (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#b91c1c',
                  fontSize: '0.825rem',
                  fontWeight: 400,
                }}
              >
                <SolarIcon name="danger-circle-linear" size={16} color="#b91c1c" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <strong style={{ fontWeight: 600 }}>
                    {isAuthError ? 'Authentication Required:' : 'Schedule Conflict:'}
                  </strong>{' '}
                  {errorMsg}
                  {isAuthError && (
                    <div style={{ marginTop: '6px' }}>
                      <a
                        href="/login"
                        style={{
                          color: '#991b1b',
                          fontWeight: 600,
                          textDecoration: 'underline',
                          fontSize: '0.8rem',
                        }}
                      >
                        Click here to sign in &rarr;
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {successMsg && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '10px',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                fontSize: '0.825rem',
                fontWeight: 500,
              }}
            >
              <SolarIcon name="check-circle-linear" size={16} color="#065f46" style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'recurring' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Days of Week */}
              <div>
                <label className="portal-label" style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '5px' }}>
                  Days of the Week
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {DAYS_OF_WEEK.map((d) => {
                    const isSelected = selectedDays.includes(d.value);
                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        style={{
                          padding: '8px 2px',
                          borderRadius: '8px',
                          border: isSelected
                            ? '1.5px solid var(--color-gold-base, #DFAB62)'
                            : '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
                          background: isSelected ? 'var(--color-gold-primary, #E2B467)' : 'var(--color-cream-surface, #FDFBF7)',
                          color: 'var(--color-chocolate-base, #2A170F)',
                          fontWeight: isSelected ? 600 : 500,
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          textAlign: 'center',
                        }}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Working Hours */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                <div>
                  <label className="portal-label" style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '5px' }}>
                    Shift Start
                  </label>
                  <input
                    type="time"
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    required
                    className="portal-input"
                    style={{ fontSize: '0.875rem', padding: '8px 10px' }}
                  />
                </div>
                <div>
                  <label className="portal-label" style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '5px' }}>
                    Shift End
                  </label>
                  <input
                    type="time"
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    required
                    className="portal-input"
                    style={{ fontSize: '0.875rem', padding: '8px 10px' }}
                  />
                </div>
              </div>

              {/* Slot Slicing Settings */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                <div>
                  <label className="portal-label" style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '5px' }}>
                    Consult Duration
                  </label>
                  <select
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(Number(e.target.value))}
                    className="portal-select"
                    style={{ fontSize: '0.85rem', padding: '8px 10px' }}
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={45}>45 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
                <div>
                  <label className="portal-label" style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '5px' }}>
                    Buffer Interval
                  </label>
                  <select
                    value={bufferTime}
                    onChange={(e) => setBufferTime(Number(e.target.value))}
                    className="portal-select"
                    style={{ fontSize: '0.85rem', padding: '8px 10px' }}
                  >
                    <option value={0}>None (0 min)</option>
                    <option value={5}>5 min (Recommended)</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                  </select>
                </div>
              </div>

              {/* Recurrence Date Range */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                <div>
                  <label className="portal-label" style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '5px' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={recurrenceStartDate}
                    min={todayStr}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRecurrenceStartDate(val);
                      if (recurrenceEndDate < val) {
                        setRecurrenceEndDate(val);
                      }
                    }}
                    required
                    className="portal-input"
                    style={{ fontSize: '0.85rem', padding: '8px 10px' }}
                  />
                </div>
                <div>
                  <label className="portal-label" style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '5px' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={recurrenceEndDate}
                    min={recurrenceStartDate || todayStr}
                    onChange={(e) => setRecurrenceEndDate(e.target.value)}
                    required
                    className="portal-input"
                    style={{ fontSize: '0.85rem', padding: '8px 10px' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Single Slot Options */}
              <div>
                <label className="portal-label" style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '5px' }}>
                  Slot Date
                </label>
                <input
                  type="date"
                  value={singleDate}
                  min={todayStr}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSingleDate(val);
                    if (val === todayStr && singleStartTime < getLocalCurrentTime()) {
                      setSingleStartTime(getNextSensibleStartTime());
                    }
                  }}
                  required
                  className="portal-input"
                  style={{ fontSize: '0.85rem', padding: '8px 10px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                <div>
                  <label className="portal-label" style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '5px' }}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={singleStartTime}
                    min={singleDate === todayStr ? getLocalCurrentTime() : undefined}
                    onChange={(e) => setSingleStartTime(e.target.value)}
                    required
                    className="portal-input"
                    style={{ fontSize: '0.85rem', padding: '8px 10px' }}
                  />
                </div>
                <div>
                  <label className="portal-label" style={{ fontSize: '0.8rem', fontWeight: 500, marginBottom: '5px' }}>
                    Duration
                  </label>
                  <select
                    value={singleDuration}
                    onChange={(e) => setSingleDuration(Number(e.target.value))}
                    className="portal-select"
                    style={{ fontSize: '0.85rem', padding: '8px 10px' }}
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
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'var(--color-cream-base, #FAF6EE)',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <SolarIcon name="bolt-circle-bold" size={16} color="var(--color-gold-bronze, #B88647)" />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-chocolate-base, #2A170F)', fontWeight: 500 }}>
                Estimated Slots
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.05rem',
                fontWeight: 'var(--font-heading-weight, 400)',
                color: 'var(--color-chocolate-base, #2A170F)',
              }}
            >
              {estimatedSlotCount} slots
            </span>
          </div>

          {/* Form Actions Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.15))',
              marginTop: 'auto',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.825rem', fontWeight: 500, minHeight: '36px' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || estimatedSlotCount === 0}
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.825rem', fontWeight: 600, minHeight: '36px' }}
            >
              <SolarIcon name="add-circle-bold" size={15} color="var(--color-chocolate-base)" />
              <span>{isLoading ? 'Generating Slots...' : 'Publish Availability'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
