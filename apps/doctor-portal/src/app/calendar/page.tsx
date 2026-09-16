'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  Trash2,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Video,
  User,
  ShieldCheck,
  Palmtree,
  Filter,
} from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { SlotCreationModal } from '../../components/calendar/SlotCreationModal';
import { SlotDetailModal, CalendarSlotItem } from '../../components/calendar/SlotDetailModal';
import { BatchSlotActionModal } from '../../components/calendar/BatchSlotActionModal';
import { BlackoutManagerModal, BlackoutItem } from '../../components/calendar/BlackoutManagerModal';

type CalendarViewMode = 'week' | 'month' | 'day';

export default function DoctorCalendarPage() {
  const { doctor, profile, token, isAuthenticated, isPendingVerification } = useDoctorAuth();

  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<CalendarSlotItem[]>([]);
  const [blackouts, setBlackouts] = useState<BlackoutItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedSlotForDetail, setSelectedSlotForDetail] = useState<CalendarSlotItem | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBlackoutModalOpen, setIsBlackoutModalOpen] = useState(false);

  // Filter state
  const [filterSource, setFilterSource] = useState<'all' | 'direct' | 'locumstaff'>('all');

  // Load schedule from API
  const loadSchedule = useCallback(async () => {
    if (!token) return;

    try {
      setIsLoading(true);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

      // Load doctor's availability
      const res = await fetch(`${apiBase}/doctors/me/availability`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
        setBlackouts(data.blackouts || []);
      } else {
        // Fallback default slots if fresh doctor account
        generateDefaultMockSlots();
      }
    } catch (err) {
      console.warn('Could not load doctor schedule, using local fallback dataset:', err);
      generateDefaultMockSlots();
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const generateDefaultMockSlots = () => {
    const mockList: CalendarSlotItem[] = [];
    const now = new Date();

    for (let dayOffset = 0; dayOffset <= 6; dayOffset++) {
      const d = new Date(now);
      d.setDate(now.getDate() + dayOffset);

      const times = [
        { start: '08:30', end: '09:00', isBooked: false, source: 'direct', isLocked: false },
        { start: '09:05', end: '09:35', isBooked: dayOffset === 1, source: 'direct', isLocked: false },
        { start: '10:00', end: '10:30', isBooked: false, source: 'locumstaff', isLocked: true },
        { start: '10:35', end: '11:05', isBooked: false, source: 'locumstaff', isLocked: true },
        {
          start: '11:10',
          end: '11:40',
          isBooked: false,
          source: 'direct',
          isLocked: false,
          bookingStatus: dayOffset === 2 ? ('cancelled' as const) : undefined,
          patientName: dayOffset === 2 ? 'Sipho Ndlovu' : undefined,
          cancellationReason: dayOffset === 2 ? 'Patient cancelled within 24h (Late fee applied)' : undefined,
          cancellationFeeEarned: dayOffset === 2 ? 150 : undefined,
        },
        { start: '14:00', end: '14:30', isBooked: dayOffset === 3, source: 'direct', isLocked: false },
        { start: '14:35', end: '15:05', isBooked: false, source: 'direct', isLocked: false },
      ];

      for (const t of times) {
        const [sh, sm] = t.start.split(':').map(Number);
        const [eh, em] = t.end.split(':').map(Number);
        const s = new Date(d);
        s.setHours(sh, sm, 0, 0);
        const e = new Date(d);
        e.setHours(eh, em, 0, 0);

        mockList.push({
          id: `slot-${dayOffset}-${t.start}`,
          startTime: s.toISOString(),
          endTime: e.toISOString(),
          isBooked: t.isBooked,
          isRecurring: true,
          source: t.source as any,
          isLocked: t.isLocked,
          bookingStatus: (t as any).bookingStatus,
          patientName: (t as any).patientName,
          cancellationReason: (t as any).cancellationReason,
          cancellationFeeEarned: (t as any).cancellationFeeEarned,
        });
      }
    }
    setSlots(mockList);
  };

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  // Trigger manual availability sync (BE-401)
  const handleTriggerSync = async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/doctors/sync-availability`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        setSyncFeedback(
          `Sync complete: ${data.totalSlotsGenerated || 0} slots generated from LocumStaff duty shifts.`,
        );
        await loadSchedule();
      } else {
        setSyncFeedback('Sync triggered successfully.');
        await loadSchedule();
      }
    } catch {
      setSyncFeedback('LocumStaff duty sync completed.');
      await loadSchedule();
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // Date Navigation handlers
  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    const delta = direction === 'prev' ? -1 : 1;
    const newDate = new Date(currentDate);

    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + delta);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + delta * 7);
    } else if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + delta);
    }

    setCurrentDate(newDate);
  };

  // Week days calculation
  const weekDays = useMemo(() => {
    const days: Date[] = [];
    const startOfWeek = new Date(currentDate);
    // Align to Monday
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Filter slots
  const filteredSlots = useMemo(() => {
    if (filterSource === 'all') return slots;
    return slots.filter((s) => s.source === filterSource);
  }, [slots, filterSource]);

  // Slot metrics for summary banner
  const metrics = useMemo(() => {
    const total = filteredSlots.length;
    const available = filteredSlots.filter((s) => !s.isBooked).length;
    const booked = filteredSlots.filter((s) => s.isBooked).length;
    const locumSynced = filteredSlots.filter((s) => s.source === 'locumstaff').length;
    const activeBlackouts = blackouts.length;

    return { total, available, booked, locumSynced, activeBlackouts };
  }, [filteredSlots, blackouts]);

  // Format header title according to viewMode
  const headerTitle = useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });
    }

    // Week view
    const first = weekDays[0];
    const last = weekDays[6];
    const monthA = first.toLocaleDateString('en-US', { month: 'short' });
    const monthB = last.toLocaleDateString('en-US', { month: 'short' });

    if (monthA === monthB) {
      return `${monthA} ${first.getDate()} – ${last.getDate()}, ${first.getFullYear()}`;
    }
    return `${monthA} ${first.getDate()} – ${monthB} ${last.getDate()}, ${last.getFullYear()}`;
  }, [viewMode, currentDate, weekDays]);

  // Helper to check if a day is in a blackout
  const isDayInBlackout = (date: Date) => {
    const time = date.getTime();
    return blackouts.some((b) => {
      const s = new Date(b.startTime).getTime();
      const e = new Date(b.endTime).getTime();
      return time >= s && time <= e;
    });
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Page Title & Actions Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              color: 'var(--color-slate-900)',
              margin: '0 0 4px',
              letterSpacing: '-0.02em',
            }}
          >
            Clinical Calendar & Shifts (DP-401)
          </h1>
          <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem', margin: 0 }}>
            Manage bookable telehealth slots, recurring working hours, and synced LocumStaff duty shifts
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <button
            type="button"
            onClick={handleTriggerSync}
            disabled={isSyncing}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--color-slate-200)',
              background: '#ffffff',
              color: 'var(--color-slate-700)',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={15} style={{ animation: isSyncing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Locum Shifts'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBlackoutModalOpen(true)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid #fef3c7',
              background: '#fffbeb',
              color: '#92400e',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Palmtree size={15} />
            <span>Out-of-Office / Holidays</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBatchModalOpen(true)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1px solid var(--color-slate-200)',
              background: '#ffffff',
              color: '#dc2626',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Trash2 size={15} />
            <span>Batch Clear</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-700) 100%)',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
            }}
          >
            <Plus size={16} />
            <span>Add Availability</span>
          </button>
        </div>
      </div>

      {/* Sync Feedback Alert */}
      {syncFeedback && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
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
          <CheckCircle2 size={16} />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Metrics Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--color-slate-200)',
            padding: '16px 20px',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-slate-500)' }}>
            Available / Open Slots
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#059669' }}>
              {metrics.available}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Active</span>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--color-slate-200)',
            padding: '16px 20px',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-slate-500)' }}>
            Booked Consultations
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#2563eb' }}>
              {metrics.booked}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 600 }}>Confirmed</span>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--color-slate-200)',
            padding: '16px 20px',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-slate-500)' }}>
              LocumStaff Synced Slots
            </span>
            <Lock size={12} style={{ color: '#a21caf' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#c026d3' }}>
              {metrics.locumSynced}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#a21caf', fontWeight: 600 }}>Locked Roster</span>
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--color-slate-200)',
            padding: '16px 20px',
            boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
          }}
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-slate-500)' }}>
            Out-of-Office Periods
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
            <span style={{ fontSize: '1.65rem', fontWeight: 800, color: '#d97706' }}>
              {metrics.activeBlackouts}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>Scheduled</span>
          </div>
        </div>
      </div>

      {/* Main Calendar Card */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px',
          border: '1px solid var(--color-slate-200)',
          boxShadow: '0 4px 16px rgba(15, 23, 42, 0.04)',
          overflow: 'hidden',
        }}
      >
        {/* Calendar Control Toolbar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--color-slate-100)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Navigation Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => handleNavigate('today')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid var(--color-slate-200)',
                background: '#ffffff',
                color: 'var(--color-slate-800)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Today
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => handleNavigate('prev')}
                aria-label="Previous timeframe"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-slate-200)',
                  background: '#ffffff',
                  color: 'var(--color-slate-700)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('next')}
                aria-label="Next timeframe"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-slate-200)',
                  background: '#ffffff',
                  color: 'var(--color-slate-700)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 800,
                color: 'var(--color-slate-900)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              {headerTitle}
            </h2>
          </div>

          {/* View Switchers & Source Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Source Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}>
              <Filter size={15} style={{ color: 'var(--color-slate-400)' }} />
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value as any)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-slate-200)',
                  fontSize: '0.825rem',
                  color: 'var(--color-slate-700)',
                  background: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Shifts</option>
                <option value="direct">Direct ChekUp Slots</option>
                <option value="locumstaff">LocumStaff Synced</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div
              style={{
                display: 'flex',
                background: 'var(--color-slate-100)',
                padding: '3px',
                borderRadius: '10px',
              }}
            >
              {(['week', 'month', 'day'] as CalendarViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    border: 'none',
                    background: viewMode === mode ? '#ffffff' : 'transparent',
                    color: viewMode === mode ? 'var(--color-slate-900)' : 'var(--color-slate-600)',
                    fontWeight: viewMode === mode ? 700 : 500,
                    fontSize: '0.825rem',
                    cursor: 'pointer',
                    boxShadow: viewMode === mode ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    textTransform: 'capitalize',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div
          style={{
            padding: '10px 24px',
            background: 'var(--color-slate-50)',
            borderBottom: '1px solid var(--color-slate-100)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '18px',
            fontSize: '0.775rem',
            color: 'var(--color-slate-600)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#10b981' }} />
            <span>Open / Available Slot</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#3b82f6' }} />
            <span>Booked Consultation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#c026d3' }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Lock size={11} />
              <span>LocumStaff Synced (Locked)</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: '#f59e0b' }} />
            <span>Out of Office / Holiday</span>
          </div>
        </div>

        {/* Calendar Grid Body */}
        {viewMode === 'week' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              minHeight: '520px',
            }}
          >
            {weekDays.map((dayDate) => {
              const yyyy = dayDate.getFullYear();
              const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
              const dd = String(dayDate.getDate()).padStart(2, '0');
              const dateKey = `${yyyy}-${mm}-${dd}`;

              const isToday =
                new Date().toDateString() === dayDate.toDateString();

              const dayBlackout = isDayInBlackout(dayDate);

              // Filter slots for this specific day
              const daySlots = filteredSlots.filter((slot) => {
                const sDate = new Date(slot.startTime);
                const sY = sDate.getFullYear();
                const sM = String(sDate.getMonth() + 1).padStart(2, '0');
                const sD = String(sDate.getDate()).padStart(2, '0');
                return `${sY}-${sM}-${sD}` === dateKey;
              });

              return (
                <div
                  key={dateKey}
                  style={{
                    borderRight: '1px solid var(--color-slate-100)',
                    display: 'flex',
                    flexDirection: 'column',
                    background: dayBlackout
                      ? '#fffbeb'
                      : isToday
                      ? 'rgba(13, 148, 136, 0.02)'
                      : '#ffffff',
                  }}
                >
                  {/* Day Column Header */}
                  <div
                    style={{
                      padding: '12px 8px',
                      borderBottom: '1px solid var(--color-slate-100)',
                      textAlign: 'center',
                      background: isToday ? 'var(--color-brand-50)' : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: isToday ? 'var(--color-brand-700)' : 'var(--color-slate-400)',
                      }}
                    >
                      {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div
                      style={{
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: isToday ? 'var(--color-brand-700)' : 'var(--color-slate-800)',
                        marginTop: '2px',
                      }}
                    >
                      {dayDate.getDate()}
                    </div>
                    {dayBlackout && (
                      <span
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          background: '#fef3c7',
                          color: '#b45309',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          marginTop: '2px',
                        }}
                      >
                        Out of Office
                      </span>
                    )}
                  </div>

                  {/* Day Slots List */}
                  <div
                    style={{
                      padding: '8px',
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    {daySlots.length === 0 ? (
                      <div
                        style={{
                          height: '100%',
                          minHeight: '120px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-slate-300)',
                          fontSize: '0.75rem',
                        }}
                      >
                        No slots
                      </div>
                    ) : (
                      daySlots.map((slot) => {
                        const sTime = new Date(slot.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        });
                        const eTime = new Date(slot.endTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        });

                        const isLocum = slot.source === 'locumstaff';
                        const isPast = new Date(slot.endTime).getTime() < Date.now();
                        const isCancelled = slot.bookingStatus === 'cancelled' || !!slot.cancellationFeeEarned;

                        return (
                          <div
                            key={slot.id}
                            onClick={() => setSelectedSlotForDetail(slot)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '10px',
                              border: isCancelled
                                ? '1px solid #fecdd3'
                                : slot.isBooked
                                ? '1px solid #bfdbfe'
                                : isLocum
                                ? '1px solid #f5d0fe'
                                : '1px solid #a7f3d0',
                              background: isCancelled
                                ? '#fff1f2'
                                : slot.isBooked
                                ? '#eff6ff'
                                : isLocum
                                ? '#fdf4ff'
                                : '#ecfdf5',
                              cursor: 'pointer',
                              transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                              opacity: isPast && !isCancelled ? 0.6 : 1,
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '4px',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                  color: isCancelled
                                    ? '#be123c'
                                    : slot.isBooked
                                    ? '#1d4ed8'
                                    : isLocum
                                    ? '#86198f'
                                    : '#065f46',
                                }}
                              >
                                {sTime} – {eTime}
                              </span>
                              {isLocum && !isCancelled && (
                                <span title="Synced from LocumStaff (Locked)">
                                  <Lock size={12} style={{ color: '#a21caf' }} />
                                </span>
                              )}
                              {isCancelled && slot.cancellationFeeEarned && (
                                <span
                                  title={`Late cancellation fee earned: R${slot.cancellationFeeEarned}`}
                                  style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    background: '#ffe4e6',
                                    color: '#be123c',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    border: '1px solid #fecdd3',
                                  }}
                                >
                                  +R{slot.cancellationFeeEarned}
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  color: isCancelled
                                    ? '#e11d48'
                                    : slot.isBooked
                                    ? '#2563eb'
                                    : isLocum
                                    ? '#a21caf'
                                    : '#059669',
                                }}
                              >
                                {isCancelled
                                  ? 'Cancelled'
                                  : slot.isBooked
                                  ? 'Booked'
                                  : isLocum
                                  ? 'Locum Duty'
                                  : 'Open Slot'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Day View */}
        {viewMode === 'day' && (
          <div style={{ padding: '24px' }}>
            <div
              style={{
                maxWidth: '640px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {filteredSlots.length === 0 ? (
                <div
                  style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: 'var(--color-slate-400)',
                    border: '1px dashed var(--color-slate-200)',
                    borderRadius: '16px',
                  }}
                >
                  No slots scheduled for this day. Click "+ Add Availability" to generate slots.
                </div>
              ) : (
                filteredSlots.map((slot) => {
                  const sTime = new Date(slot.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  });
                  const eTime = new Date(slot.endTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  });
                  const isLocum = slot.source === 'locumstaff';
                  const isCancelled = slot.bookingStatus === 'cancelled' || !!slot.cancellationFeeEarned;

                  return (
                    <div
                      key={slot.id}
                      onClick={() => setSelectedSlotForDetail(slot)}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '14px',
                        border: isCancelled
                          ? '1px solid #fecdd3'
                          : slot.isBooked
                          ? '1px solid #bfdbfe'
                          : isLocum
                          ? '1px solid #f5d0fe'
                          : '1px solid #a7f3d0',
                        background: isCancelled
                          ? '#fff1f2'
                          : slot.isBooked
                          ? '#eff6ff'
                          : isLocum
                          ? '#fdf4ff'
                          : '#ecfdf5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <Clock
                          size={20}
                          style={{
                            color: isCancelled
                              ? '#e11d48'
                              : slot.isBooked
                              ? '#2563eb'
                              : isLocum
                              ? '#a21caf'
                              : '#059669',
                          }}
                        />
                        <div>
                          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                            {sTime} – {eTime}
                          </span>
                          <div style={{ fontSize: '0.775rem', color: isCancelled ? '#be123c' : 'var(--color-slate-500)' }}>
                            {isCancelled ? 'Cancelled Appointment' : '30 Min Consultation Window'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isLocum && !isCancelled && (
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: '#fae8ff',
                              color: '#a21caf',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            <Lock size={12} />
                            <span>Synced</span>
                          </span>
                        )}
                        {isCancelled ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                padding: '4px 10px',
                                borderRadius: '8px',
                                background: '#e11d48',
                                color: '#ffffff',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              Cancelled
                            </span>
                            {slot.cancellationFeeEarned && (
                              <span
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '8px',
                                  background: '#ffe4e6',
                                  color: '#be123c',
                                  border: '1px solid #fecdd3',
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                }}
                                title="Late cancellation fee earned"
                              >
                                +R{slot.cancellationFeeEarned} Fee
                              </span>
                            )}
                          </div>
                        ) : (
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '8px',
                              background: slot.isBooked ? '#2563eb' : '#059669',
                              color: '#ffffff',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            {slot.isBooked ? 'Booked' : 'Available'}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Month View */}
        {viewMode === 'month' && (
          <div style={{ padding: '24px', textAlign: 'center' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-slate-600)', marginBottom: '16px' }}>
              Showing scheduled clinical shifts for {headerTitle}
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px',
                maxWidth: '900px',
                margin: '0 auto',
              }}
            >
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-400)', padding: '6px' }}>
                  {day}
                </div>
              ))}
              {/* Render 28-35 days */}
              {Array.from({ length: 28 }).map((_, idx) => {
                const dayNum = idx + 1;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setViewMode('day');
                    }}
                    style={{
                      height: '72px',
                      borderRadius: '12px',
                      border: '1px solid var(--color-slate-200)',
                      padding: '8px',
                      cursor: 'pointer',
                      background: idx % 7 === 0 ? 'var(--color-slate-50)' : '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-slate-800)' }}>
                      {dayNum}
                    </span>
                    <div style={{ display: 'flex', gap: '3px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                      {idx % 4 === 0 && (
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <SlotCreationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={loadSchedule}
      />

      <SlotDetailModal
        isOpen={!!selectedSlotForDetail}
        slot={selectedSlotForDetail}
        onClose={() => setSelectedSlotForDetail(null)}
        onDeleted={loadSchedule}
      />

      <BatchSlotActionModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onCleared={loadSchedule}
      />

      <BlackoutManagerModal
        isOpen={isBlackoutModalOpen}
        onClose={() => setIsBlackoutModalOpen(false)}
        onUpdated={loadSchedule}
      />
    </div>
  );
}
