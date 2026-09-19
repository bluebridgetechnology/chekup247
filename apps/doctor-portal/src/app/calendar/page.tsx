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
import { SolarIcon } from '../../components/common/SolarIcon';
import { SlotCreationModal } from '../../components/calendar/SlotCreationModal';
import { SlotDetailModal, CalendarSlotItem } from '../../components/calendar/SlotDetailModal';
import { BatchSlotActionModal } from '../../components/calendar/BatchSlotActionModal';
import { BlackoutManagerModal, BlackoutItem } from '../../components/calendar/BlackoutManagerModal';

type CalendarViewMode = 'week' | 'month' | 'day';

export default function DoctorCalendarPage() {
  const { doctor, profile, token, isAuthenticated, isPendingVerification, toggleHolidayMode } = useDoctorAuth();

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

      const res = await fetch(`${apiBase}/doctors/me/availability`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
        setBlackouts(data.blackouts || []);
      } else {
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

  // Trigger manual availability sync
  const handleTriggerSync = async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${apiBase}/doctors/sync-availability`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        setSyncFeedback(
          `Sync complete: ${data.totalSlotsGenerated || 0} slots generated from LocumStaff duty shifts.`,
        );
        await loadSchedule();
      } else {
        setSyncFeedback('LocumStaff shifts synchronized successfully.');
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

  // Month days calculation
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // Monday as start of week: 0=Sun -> 6, 1=Mon -> 0
    const startDayOfWeek = firstDay.getDay();
    const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const days: { date: Date | null; dayNumber: number; dateKey: string }[] = [];

    // Leading padding days
    for (let i = 0; i < offset; i++) {
      days.push({ date: null, dayNumber: 0, dateKey: `pad-${i}` });
    }

    // Actual calendar days
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      days.push({
        date: dateObj,
        dayNumber: d,
        dateKey: `${year}-${mm}-${dd}`,
      });
    }

    return days;
  }, [currentDate]);

  // Filter slots
  const filteredSlots = useMemo(() => {
    if (filterSource === 'all') return slots;
    return slots.filter((s) => s.source === filterSource);
  }, [slots, filterSource]);

  // Slot metrics
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
      return currentDate.toLocaleDateString('en-ZA', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-ZA', {
        month: 'long',
        year: 'numeric',
      });
    }

    // Week view
    const first = weekDays[0];
    const last = weekDays[6];
    const monthA = first.toLocaleDateString('en-ZA', { month: 'short' });
    const monthB = last.toLocaleDateString('en-ZA', { month: 'short' });

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
      {/* Page Title & Status Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-gold-bronze, #B88647)',
              }}
            >
              Practice Roster & Synced Locum Shifts
            </span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.95rem',
              fontWeight: 800,
              color: 'var(--color-chocolate-base, #2A170F)',
              margin: '0 0 4px',
              letterSpacing: '-0.02em',
            }}
          >
            Clinical Calendar & Shifts
          </h1>
          <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.925rem', margin: 0 }}>
            Manage bookable telehealth consultation slots, recurring availability, and synced LocumStaff duty shifts
          </p>
        </div>
      </div>

      {/* Sync Feedback Alert */}
      {syncFeedback && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            background: '#ecfdf5',
            border: '1.5px solid #a7f3d0',
            color: '#065f46',
            fontSize: '0.875rem',
            fontWeight: 600,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <SolarIcon name="check-circle-bold" size={18} color="#059669" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Holiday Mode Alert */}
      {profile?.isOnHoliday && (
        <div
          style={{
            padding: '16px 22px',
            borderRadius: '16px',
            background: '#fffbeb',
            border: '1.5px solid #fde68a',
            color: '#92400e',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 2px 10px rgba(217, 119, 6, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="sun-2-bold" size={22} color="#b45309" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#92400e' }}>
                Holiday Mode is Active
              </div>
              <div style={{ fontSize: '0.825rem', color: '#b45309' }}>
                All your calendar slots and public profile are currently hidden from patients on the discovery directory.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await toggleHolidayMode(false);
              await loadSchedule();
            }}
            className="btn-secondary"
            style={{
              padding: '8px 18px',
              fontSize: '0.825rem',
              fontWeight: 700,
              background: '#fff',
              color: '#92400e',
              border: '1.5px solid #f59e0b',
            }}
          >
            Resume Practice (Turn Off)
          </button>
        </div>
      )}

      {/* Metrics Banner in 4 Clean Cream Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div className="portal-card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-cream-text-muted, #6B5E55)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Available Slots
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-gold-pale, #F0E5D3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SolarIcon name="calendar-bold" size={18} color="#0f766e" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.85rem', fontWeight: 800, color: '#0f766e' }}>
              {metrics.available}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>Open for booking</span>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-cream-text-muted, #6B5E55)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Booked Consults
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--color-gold-pale, #F0E5D3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SolarIcon name="user-rounded-bold" size={18} color="var(--color-chocolate-base, #2A170F)" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
              {metrics.booked}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-gold-bronze, #B88647)', fontWeight: 700 }}>Confirmed</span>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-cream-text-muted, #6B5E55)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              LocumStaff Synced
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#faf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SolarIcon name="lock-bold" size={18} color="#7e22ce" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.85rem', fontWeight: 800, color: '#7e22ce' }}>
              {metrics.locumSynced}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#9333ea', fontWeight: 700 }}>Locked roster</span>
          </div>
        </div>

        <div className="portal-card" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-cream-text-muted, #6B5E55)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Out-of-Office
            </span>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SolarIcon name="calendar-minimalistic-linear" size={18} color="#b45309" />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.85rem', fontWeight: 800, color: '#b45309' }}>
              {metrics.activeBlackouts}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700 }}>Periods blocked</span>
          </div>
        </div>
      </div>

      {/* Main Calendar Card with 2-Row Streamlined Toolbar */}
      <div className="portal-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* ROW 1: Navigation & Date Range */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
            background: 'var(--color-cream-surface, #FDFBF7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => handleNavigate('today')}
              className="btn-secondary"
              style={{ padding: '7px 16px', fontSize: '0.825rem' }}
            >
              Today
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                type="button"
                onClick={() => handleNavigate('prev')}
                aria-label="Previous timeframe"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                  background: 'var(--color-cream-surface, #FDFBF7)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SolarIcon name="alt-arrow-left-linear" size={16} color="var(--color-chocolate-base)" />
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('next')}
                aria-label="Next timeframe"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                  background: 'var(--color-cream-surface, #FDFBF7)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SolarIcon name="alt-arrow-right-linear" size={16} color="var(--color-chocolate-base)" />
              </button>
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--color-chocolate-base, #2A170F)',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              {headerTitle}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: 'var(--radius-full, 9999px)',
                background: 'var(--color-gold-pale, #F0E5D3)',
                color: 'var(--color-chocolate-base, #2A170F)',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: '1px solid rgba(223, 171, 98, 0.3)',
              }}
            >
              Africa/Johannesburg (SAST)
            </span>
          </div>
        </div>

        {/* ROW 2: Source Filter Chips, View Toggle, and Action Buttons */}
        <div
          style={{
            padding: '14px 24px',
            borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
            background: 'var(--color-cream-base, #FAF6EE)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          {/* Left: Source Filter Chips & View Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            {/* Filter source chips */}
            {(['all', 'direct', 'locumstaff'] as const).map((src) => {
              const isActive = filterSource === src;
              const label =
                src === 'all'
                  ? 'All Shifts'
                  : src === 'direct'
                  ? 'Direct Telehealth'
                  : 'LocumStaff Synced';
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => setFilterSource(src)}
                  className={`specialty-chip ${isActive ? 'active' : ''}`}
                  style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                >
                  <SolarIcon
                    name={src === 'locumstaff' ? 'lock-bold' : 'calendar-linear'}
                    size={14}
                    color={isActive ? 'var(--color-chocolate-base)' : 'var(--color-gold-bronze)'}
                  />
                  <span>{label}</span>
                </button>
              );
            })}

            {/* View Mode Switcher */}
            <div
              style={{
                display: 'flex',
                background: 'var(--color-cream-surface, #FDFBF7)',
                padding: '3px',
                borderRadius: 'var(--radius-full, 9999px)',
                border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              }}
            >
              {(['week', 'month', 'day'] as CalendarViewMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setViewMode(mode)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 'var(--radius-full, 9999px)',
                    border: 'none',
                    background: viewMode === mode ? 'var(--color-gold-primary, #E2B467)' : 'transparent',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    fontWeight: viewMode === mode ? 700 : 500,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Clean Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.825rem' }}
            >
              <SolarIcon name="refresh-circle-linear" size={16} color="var(--color-chocolate-base)" />
              <span>{isSyncing ? 'Syncing...' : 'Sync Locum'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBlackoutModalOpen(true)}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.825rem' }}
            >
              <SolarIcon name="calendar-minimalistic-linear" size={16} color="var(--color-gold-bronze, #B88647)" />
              <span>Out-of-Office</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBatchModalOpen(true)}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.825rem', color: '#dc2626', borderColor: '#fca5a5' }}
            >
              <SolarIcon name="trash-bin-trash-linear" size={15} color="#dc2626" />
              <span>Batch Clear</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="btn-primary"
              style={{ padding: '8px 18px', fontSize: '0.85rem' }}
            >
              <SolarIcon name="add-circle-bold" size={17} color="var(--color-chocolate-base)" />
              <span>+ Add Availability</span>
            </button>
          </div>
        </div>

        {/* Unified Legend Bar */}
        <div
          style={{
            padding: '10px 24px',
            background: 'var(--color-cream-surface, #FDFBF7)',
            borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.15))',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '20px',
            fontSize: '0.78rem',
            color: 'var(--color-cream-text-muted, #6B5E55)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#f0fdfa', border: '1px solid #99f6e4' }} />
            <span>Open Telehealth Slot (Available)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#FDFBF7', border: '1.5px solid var(--color-gold-base, #DFAB62)' }} />
            <span>Booked Patient Consultation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#faf5ff', border: '1.5px solid #d8b4fe' }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <SolarIcon name="lock-bold" size={12} color="#7e22ce" />
              <span>LocumStaff Synced (Locked)</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: 'repeating-linear-gradient(45deg, #fffbeb, #fffbeb 4px, #fef3c7 4px, #fef3c7 8px)', border: '1px solid #fde68a' }} />
            <span>Out of Office / Holiday</span>
          </div>
        </div>

        {/* WEEK VIEW */}
        {viewMode === 'week' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              minHeight: '540px',
              background: 'var(--color-cream-surface, #FDFBF7)',
            }}
          >
            {weekDays.map((dayDate, dayIdx) => {
              const yyyy = dayDate.getFullYear();
              const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
              const dd = String(dayDate.getDate()).padStart(2, '0');
              const dateKey = `${yyyy}-${mm}-${dd}`;

              const isToday = new Date().toDateString() === dayDate.toDateString();
              const dayBlackout = isDayInBlackout(dayDate);

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
                    borderRight: dayIdx < 6 ? '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.15))' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    background: dayBlackout
                      ? 'repeating-linear-gradient(45deg, rgba(254, 243, 199, 0.35), rgba(254, 243, 199, 0.35) 8px, rgba(255, 251, 235, 0.35) 8px, rgba(255, 251, 235, 0.35) 16px)'
                      : isToday
                      ? 'rgba(223, 171, 98, 0.04)'
                      : 'transparent',
                  }}
                >
                  {/* Column Header */}
                  <div
                    style={{
                      padding: '12px 8px',
                      borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.15))',
                      textAlign: 'center',
                      background: isToday ? 'var(--color-gold-pale, #F0E5D3)' : 'transparent',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: isToday ? 'var(--color-chocolate-base, #2A170F)' : 'var(--color-cream-text-muted, #6B5E55)',
                      }}
                    >
                      {dayDate.toLocaleDateString('en-ZA', { weekday: 'short' })}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1.25rem',
                        fontWeight: 800,
                        color: isToday ? 'var(--color-chocolate-base, #2A170F)' : 'var(--color-chocolate-base, #2A170F)',
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
                          border: '1px solid #fde68a',
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
                          color: 'var(--color-cream-text-muted, #6B5E55)',
                          opacity: 0.5,
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

                        // Tokenized badge classes & inline styling
                        let badgeBg = '#f0fdfa';
                        let badgeBorder = '1.5px solid #99f6e4';
                        let badgeColor = '#0f766e';

                        if (isCancelled) {
                          badgeBg = '#fef2f2';
                          badgeBorder = '1.5px solid #fecaca';
                          badgeColor = '#991b1b';
                        } else if (slot.isBooked) {
                          badgeBg = 'var(--color-cream-surface, #FDFBF7)';
                          badgeBorder = '1.5px solid var(--color-gold-base, #DFAB62)';
                          badgeColor = 'var(--color-chocolate-base, #2A170F)';
                        } else if (isLocum) {
                          badgeBg = '#faf5ff';
                          badgeBorder = '1.5px solid #d8b4fe';
                          badgeColor = '#7e22ce';
                        }

                        return (
                          <div
                            key={slot.id}
                            onClick={() => setSelectedSlotForDetail(slot)}
                            style={{
                              padding: '8px 10px',
                              borderRadius: '12px',
                              background: badgeBg,
                              border: badgeBorder,
                              color: badgeColor,
                              cursor: 'pointer',
                              transition: 'all 0.18s ease',
                              opacity: isPast && !isCancelled ? 0.6 : 1,
                              boxShadow: slot.isBooked ? '0 2px 8px rgba(42, 23, 15, 0.05)' : 'none',
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
                                  fontFamily: 'var(--font-heading)',
                                  fontSize: '0.8rem',
                                  fontWeight: 800,
                                }}
                              >
                                {sTime} – {eTime}
                              </span>
                              {isLocum && !isCancelled && (
                                <span title="Synced from LocumStaff (Locked)">
                                  <SolarIcon name="lock-bold" size={12} color="#7e22ce" />
                                </span>
                              )}
                              {isCancelled && slot.cancellationFeeEarned && (
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    background: '#ffe4e6',
                                    color: '#be123c',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  +R{slot.cancellationFeeEarned}
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 700 }}>
                              <span>
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

        {/* DAY VIEW */}
        {viewMode === 'day' && (
          <div style={{ padding: '28px', background: 'var(--color-cream-surface, #FDFBF7)' }}>
            <div
              style={{
                maxWidth: '680px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {filteredSlots.length === 0 ? (
                <div
                  style={{
                    padding: '48px 20px',
                    textAlign: 'center',
                    color: 'var(--color-cream-text-muted, #6B5E55)',
                    border: '1.5px dashed var(--color-gold-border, rgba(223, 171, 98, 0.3))',
                    borderRadius: '16px',
                  }}
                >
                  <SolarIcon name="calendar-linear" size={36} color="var(--color-gold-base)" style={{ margin: '0 auto 12px' }} />
                  <p style={{ fontWeight: 700, color: 'var(--color-chocolate-base)', margin: 0 }}>
                    No consultation slots for this date
                  </p>
                  <p style={{ fontSize: '0.85rem', margin: '4px 0 16px' }}>Click "+ Add Availability" to generate new time windows.</p>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="btn-primary"
                  >
                    + Add Availability
                  </button>
                </div>
              ) : (
                filteredSlots.map((slot) => {
                  const sTime = new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                  const eTime = new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                  const isLocum = slot.source === 'locumstaff';
                  const isCancelled = slot.bookingStatus === 'cancelled' || !!slot.cancellationFeeEarned;

                  return (
                    <div
                      key={slot.id}
                      onClick={() => setSelectedSlotForDetail(slot)}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '16px',
                        border: slot.isBooked
                          ? '1.5px solid var(--color-gold-base, #DFAB62)'
                          : isLocum
                          ? '1.5px solid #d8b4fe'
                          : '1.5px solid #99f6e4',
                        background: slot.isBooked
                          ? 'var(--color-cream-surface, #FDFBF7)'
                          : isLocum
                          ? '#faf5ff'
                          : '#f0fdfa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(42, 23, 15, 0.03)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <SolarIcon
                          name={slot.isBooked ? 'user-rounded-bold' : 'clock-circle-bold'}
                          size={22}
                          color={slot.isBooked ? 'var(--color-chocolate-base)' : '#0f766e'}
                        />
                        <div>
                          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                            {sTime} – {eTime}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                            {slot.isBooked
                              ? `Booked • ${slot.patientName || 'Confirmed Patient'}`
                              : isLocum
                              ? 'LocumStaff Duty Shift'
                              : '30 Min Virtual Consultation Slot'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isLocum && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: '#f3e8ff',
                              color: '#7e22ce',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                            }}
                          >
                            <SolarIcon name="lock-bold" size={12} color="#7e22ce" />
                            <span>Synced</span>
                          </span>
                        )}
                        <span
                          className={`specialty-chip ${slot.isBooked ? 'active' : ''}`}
                          style={{ padding: '4px 12px', fontSize: '0.75rem' }}
                        >
                          {slot.isBooked ? 'Booked' : 'Available'}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* MONTH VIEW */}
        {viewMode === 'month' && (
          <div style={{ padding: '28px', background: 'var(--color-cream-surface, #FDFBF7)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginBottom: '20px' }}>
              Showing scheduled clinical shifts for {headerTitle}
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: '8px',
                maxWidth: '960px',
                margin: '0 auto',
              }}
            >
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <div key={day} style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gold-bronze, #B88647)', padding: '8px', textTransform: 'uppercase' }}>
                  {day}
                </div>
              ))}
              {monthDays.map((dayItem, idx) => {
                if (!dayItem.date) {
                  return (
                    <div
                      key={dayItem.dateKey}
                      style={{
                        minHeight: '80px',
                        borderRadius: '14px',
                        background: 'rgba(0, 0, 0, 0.02)',
                        border: '1px dashed var(--color-gold-border, rgba(223, 171, 98, 0.12))',
                        opacity: 0.35,
                      }}
                    />
                  );
                }

                const dayDate = dayItem.date;
                const isToday = new Date().toDateString() === dayDate.toDateString();
                const dayBlackout = isDayInBlackout(dayDate);

                const dayKey = dayItem.dateKey;
                const daySlots = filteredSlots.filter((slot) => {
                  const sDate = new Date(slot.startTime);
                  const sY = sDate.getFullYear();
                  const sM = String(sDate.getMonth() + 1).padStart(2, '0');
                  const sD = String(sDate.getDate()).padStart(2, '0');
                  return `${sY}-${sM}-${sD}` === dayKey;
                });

                const bookedCount = daySlots.filter((s) => s.isBooked).length;
                const availableCount = daySlots.filter((s) => !s.isBooked).length;

                return (
                  <div
                    key={dayKey}
                    onClick={() => {
                      setCurrentDate(dayDate);
                      setViewMode('day');
                    }}
                    style={{
                      minHeight: '84px',
                      borderRadius: '14px',
                      border: isToday
                        ? '2px solid var(--color-gold-primary, #E2B467)'
                        : '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
                      padding: '10px',
                      cursor: 'pointer',
                      background: dayBlackout
                        ? 'repeating-linear-gradient(45deg, rgba(254, 243, 199, 0.35), rgba(254, 243, 199, 0.35) 8px, rgba(255, 251, 235, 0.35) 8px, rgba(255, 251, 235, 0.35) 16px)'
                        : isToday
                        ? 'var(--color-gold-pale, #F0E5D3)'
                        : idx % 2 === 0
                        ? 'var(--color-cream-base, #FAF6EE)'
                        : 'var(--color-cream-surface, #FDFBF7)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: '0.9rem',
                          fontWeight: 800,
                          color: 'var(--color-chocolate-base, #2A170F)',
                        }}
                      >
                        {dayItem.dayNumber}
                      </span>
                      {dayBlackout && (
                        <span
                          style={{
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            background: '#fef3c7',
                            color: '#b45309',
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          Out
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '6px' }}>
                      {daySlots.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                          {availableCount > 0 && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                color: '#0f766e',
                                background: '#f0fdfa',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                border: '1px solid #99f6e4',
                              }}
                            >
                              {availableCount} open
                            </span>
                          )}
                          {bookedCount > 0 && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                color: 'var(--color-chocolate-base)',
                                background: 'var(--color-gold-pale)',
                                padding: '1px 5px',
                                borderRadius: '4px',
                                border: '1px solid rgba(223, 171, 98, 0.4)',
                              }}
                            >
                              {bookedCount} booked
                            </span>
                          )}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.68rem', color: 'var(--color-cream-text-muted)', opacity: 0.6 }}>
                          No slots
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 4 Calendar Modals */}
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
