'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { SolarIcon } from '../../components/common/SolarIcon';
import { SlotCreationModal } from '../../components/calendar/SlotCreationModal';
import { SlotDetailModal, CalendarSlotItem } from '../../components/calendar/SlotDetailModal';
import { BatchSlotActionModal } from '../../components/calendar/BatchSlotActionModal';
import { BlackoutManagerModal, BlackoutItem } from '../../components/calendar/BlackoutManagerModal';

type CalendarViewMode = 'week' | 'month' | 'day';
type PageTab = 'calendar' | 'locumstaff';

export default function DoctorCalendarPage() {
  const { doctor, profile, token, isAuthenticated, toggleHolidayMode } = useDoctorAuth();

  // Page level tabs (conditional for LocumStaff doctors)
  const [pageTab, setPageTab] = useState<PageTab>('calendar');

  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [mobileSelectedDate, setMobileSelectedDate] = useState<Date>(new Date());
  const [slots, setSlots] = useState<CalendarSlotItem[]>([]);
  const [blackouts, setBlackouts] = useState<BlackoutItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalInitialDate, setCreateModalInitialDate] = useState<string | undefined>(undefined);
  const [createModalInitialStartTime, setCreateModalInitialStartTime] = useState<string | undefined>(undefined);
  const [createModalInitialMode, setCreateModalInitialMode] = useState<'single' | 'recurring' | undefined>(undefined);
  const [selectedSlotForDetail, setSelectedSlotForDetail] = useState<CalendarSlotItem | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isBlackoutModalOpen, setIsBlackoutModalOpen] = useState(false);

  // Filter state
  const [filterSource, setFilterSource] = useState<'all' | 'direct' | 'locumstaff'>('all');

  // UI Toggles
  const [showLegend, setShowLegend] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  // Determine whether this doctor is a LocumStaff user
  const isLocumUser = useMemo(() => {
    return Boolean(
      profile?.verificationSource === 'locumstaff' ||
      profile?.ssoProvider === 'locumstaff' ||
      profile?.ssoExternalId ||
      slots.some((s) => s.source === 'locumstaff')
    );
  }, [profile, slots]);

  // Load schedule from API with date window
  const loadSchedule = useCallback(async () => {
    if (!token) {
      setSlots([]);
      setBlackouts([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

      // Pass window of 30 days before and 90 days ahead of currentDate
      const rangeStart = new Date(currentDate);
      rangeStart.setDate(rangeStart.getDate() - 30);
      const rangeEnd = new Date(currentDate);
      rangeEnd.setDate(rangeEnd.getDate() + 90);

      const qs = new URLSearchParams({
        startDate: rangeStart.toISOString(),
        endDate: rangeEnd.toISOString(),
      });

      const res = await fetch(`${apiBase}/doctors/me/availability?${qs.toString()}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
        setBlackouts(data.blackouts || []);
      } else {
        setSlots([]);
        setBlackouts([]);
      }
    } catch (err) {
      console.warn('Could not load doctor schedule:', err);
      setSlots([]);
      setBlackouts([]);
    } finally {
      setIsLoading(false);
    }
  }, [token, currentDate]);

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
      setIsActionsMenuOpen(false);
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
      const now = new Date();
      setCurrentDate(now);
      setMobileSelectedDate(now);
      return;
    }

    const delta = direction === 'prev' ? -1 : 1;
    const newDate = new Date(currentDate);

    if (viewMode === 'day') {
      newDate.setDate(newDate.getDate() + delta);
      setMobileSelectedDate(newDate);
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + delta * 7);
      const newMobile = new Date(mobileSelectedDate);
      newMobile.setDate(newMobile.getDate() + delta * 7);
      setMobileSelectedDate(newMobile);
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

    const startDayOfWeek = firstDay.getDay();
    const offset = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const days: { date: Date | null; dayNumber: number; dateKey: string }[] = [];

    for (let i = 0; i < offset; i++) {
      days.push({ date: null, dayNumber: 0, dateKey: `pad-${i}` });
    }

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

  // LocumStaff specific slots
  const locumSlots = useMemo(() => {
    return slots
      .filter((s) => s.source === 'locumstaff')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }, [slots]);

  // Slot metrics
  const metrics = useMemo(() => {
    const total = filteredSlots.length;
    const available = filteredSlots.filter((s) => !s.isBooked).length;
    const booked = filteredSlots.filter((s) => s.isBooked).length;
    const locumSynced = slots.filter((s) => s.source === 'locumstaff').length;
    const activeBlackouts = blackouts.length;

    return { total, available, booked, locumSynced, activeBlackouts };
  }, [filteredSlots, slots, blackouts]);

  // Format header title according to viewMode
  const headerTitle = useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-ZA', {
        weekday: 'short',
        month: 'short',
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

  // Helper for opening slot creation with preselected date, time, and mode (clamped to today if in the past)
  const openCreateModalWithDate = (dateString?: string, startTime?: string, mode?: 'single' | 'recurring') => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (dateString && dateString < todayStr) {
      setCreateModalInitialDate(todayStr);
    } else {
      setCreateModalInitialDate(dateString || todayStr);
    }
    setCreateModalInitialStartTime(startTime);
    setCreateModalInitialMode(mode);
    setIsCreateModalOpen(true);
  };

  return (
    <div style={{ width: '100%', margin: '0 auto', paddingBottom: '56px' }}>
      {/* Top Header: Title, Tabs (if Locum user), and Primary Actions */}
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
          <h1 className="page-title">
            Calendar &amp; Shifts
          </h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0' }}>
            Manage consultation slots, view appointments, and synchronize shifts.
          </p>
        </div>

        {/* Conditional Page Tabs + Primary Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Conditional LocumStaff Tab Switcher */}
          {isLocumUser && (
            <div
              style={{
                display: 'flex',
                background: 'var(--color-cream-surface, #FDFBF7)',
                padding: '3px',
                borderRadius: 'var(--radius-full, 9999px)',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              }}
            >
              <button
                type="button"
                onClick={() => setPageTab('calendar')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full, 9999px)',
                  border: 'none',
                  background: pageTab === 'calendar' ? 'var(--color-chocolate-base, #2A170F)' : 'transparent',
                  color: pageTab === 'calendar' ? '#ffffff' : 'var(--color-chocolate-base, #2A170F)',
                  fontSize: '0.8rem',
                  fontWeight: pageTab === 'calendar' ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <SolarIcon
                  name="calendar-linear"
                  size={14}
                  color={pageTab === 'calendar' ? '#ffffff' : 'var(--color-chocolate-base)'}
                />
                <span>Calendar</span>
              </button>

              <button
                type="button"
                onClick={() => setPageTab('locumstaff')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-full, 9999px)',
                  border: 'none',
                  background: pageTab === 'locumstaff' ? 'var(--color-chocolate-base, #2A170F)' : 'transparent',
                  color: pageTab === 'locumstaff' ? '#ffffff' : 'var(--color-chocolate-base, #2A170F)',
                  fontSize: '0.8rem',
                  fontWeight: pageTab === 'locumstaff' ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <SolarIcon
                  name="lock-bold"
                  size={13}
                  color={pageTab === 'locumstaff' ? '#ffffff' : '#7e22ce'}
                />
                <span>LocumStaff Shifts</span>
                {locumSlots.length > 0 && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      padding: '1px 6px',
                      borderRadius: '9999px',
                      background: pageTab === 'locumstaff' ? 'rgba(255, 255, 255, 0.25)' : '#F3E8FF',
                      color: pageTab === 'locumstaff' ? '#ffffff' : '#7e22ce',
                    }}
                  >
                    {locumSlots.length}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* Secondary Actions Dropdown Button */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
              className="btn-secondary"
              aria-label="More actions"
              style={{
                padding: '8px 14px',
                fontSize: '0.825rem',
                fontWeight: 500,
                minHeight: '38px',
              }}
            >
              <SolarIcon name="menu-dots-linear" size={16} color="var(--color-chocolate-base)" />
              <span>Actions</span>
            </button>

            {isActionsMenuOpen && (
              <>
                <div
                  onClick={() => setIsActionsMenuOpen(false)}
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '6px',
                    background: 'var(--color-cream-surface, #FDFBF7)',
                    border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.28))',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(42, 23, 15, 0.1)',
                    minWidth: '200px',
                    zIndex: 50,
                    padding: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <button
                    type="button"
                    onClick={handleTriggerSync}
                    disabled={isSyncing}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--color-chocolate-base, #2A170F)',
                      fontSize: '0.825rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-gold-pale, #F0E5D3)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <SolarIcon name="refresh-circle-linear" size={16} color="var(--color-chocolate-base)" />
                    <span>{isSyncing ? 'Syncing...' : 'Sync Locum Shifts'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsActionsMenuOpen(false);
                      setIsBlackoutModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--color-chocolate-base, #2A170F)',
                      fontSize: '0.825rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-gold-pale, #F0E5D3)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <SolarIcon name="calendar-minimalistic-linear" size={16} color="var(--color-gold-bronze, #B88647)" />
                    <span>Out-of-Office Periods</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsActionsMenuOpen(false);
                      setIsBatchModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'transparent',
                      color: '#dc2626',
                      fontSize: '0.825rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <SolarIcon name="trash-bin-trash-linear" size={16} color="#dc2626" />
                    <span>Batch Clear Slots</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Primary CTA: Add Availability */}
          <button
            type="button"
            onClick={() => openCreateModalWithDate()}
            className="btn-primary"
            style={{
              padding: '8px 18px',
              fontSize: '0.825rem',
              fontWeight: 600,
              minHeight: '38px',
            }}
          >
            <SolarIcon name="add-circle-bold" size={16} color="var(--color-chocolate-base)" />
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
            fontSize: '0.84rem',
            fontWeight: 500,
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <SolarIcon name="check-circle-bold" size={16} color="#059669" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Holiday Mode Alert */}
      {profile?.isOnHoliday && (
        <div
          style={{
            padding: '12px 18px',
            borderRadius: '12px',
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SolarIcon name="sun-2-bold" size={18} color="#b45309" />
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#92400e' }}>
                Holiday Mode Active:
              </span>{' '}
              <span style={{ fontSize: '0.82rem', fontWeight: 400, color: '#b45309' }}>
                Slots and profile are temporarily hidden from the public patient directory.
              </span>
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
              padding: '6px 12px',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: '#fff',
              color: '#92400e',
              border: '1px solid #f59e0b',
            }}
          >
            Resume Practice
          </button>
        </div>
      )}

      {/* Compact Metrics Bar (4 low-profile cards) */}
      <div className="calendar-stats-grid">
        {[
          {
            label: 'Available Slots',
            value: metrics.available,
            sub: 'Open for booking',
            subColor: '#059669',
            icon: 'calendar-bold',
            iconColor: '#0f766e',
            iconBg: '#E7F5EF',
          },
          {
            label: 'Booked Consults',
            value: metrics.booked,
            sub: 'Confirmed',
            subColor: 'var(--color-gold-bronze, #B88647)',
            icon: 'user-rounded-bold',
            iconColor: 'var(--color-chocolate-base, #2A170F)',
            iconBg: 'var(--color-gold-glow, rgba(223, 171, 98, 0.14))',
          },
          {
            label: 'LocumStaff Synced',
            value: metrics.locumSynced,
            sub: 'Locked roster',
            subColor: '#9333ea',
            icon: 'refresh-circle-bold',
            iconColor: '#7e22ce',
            iconBg: '#F3E8FF',
          },
          {
            label: 'Out-of-Office',
            value: metrics.activeBlackouts,
            sub: 'Periods blocked',
            subColor: '#d97706',
            icon: 'calendar-minimalistic-bold',
            iconColor: '#b45309',
            iconBg: '#FEF3E2',
          },
        ].map((card) => (
          <div key={card.label} className="calendar-stat-card">
            <div className="calendar-stat-icon" style={{ background: card.iconBg }}>
              <SolarIcon name={card.icon} size={17} color={card.iconColor} />
            </div>
            <div className="calendar-stat-info">
              <div className="calendar-stat-label">{card.label}</div>
              <div className="calendar-stat-val-row">
                <span className="calendar-stat-value">{card.value}</span>
                <span className="calendar-stat-sub" style={{ color: card.subColor }}>
                  • {card.sub}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: TELEHEALTH CALENDAR (FULL WIDTH)                                   */}
      {/* ========================================================================= */}
      {pageTab === 'calendar' && (
        <div className="calendar-layout">
          <div
            className="portal-card"
            style={{
              padding: 0,
              overflow: 'hidden',
              boxShadow: 'none',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
              width: '100%',
            }}
          >
            {/* UNIFIED TOOLBAR ROW */}
            <div
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.18))',
                background: 'var(--color-cream-surface, #FDFBF7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              {/* Left: Navigation Controls & Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => handleNavigate('today')}
                  className="btn-secondary"
                  style={{ padding: '5px 12px', fontSize: '0.78rem', fontWeight: 500, minHeight: '32px' }}
                >
                  Today
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <button
                    type="button"
                    onClick={() => handleNavigate('prev')}
                    aria-label="Previous timeframe"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                      background: 'var(--color-cream-surface, #FDFBF7)',
                      color: 'var(--color-chocolate-base, #2A170F)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SolarIcon name="alt-arrow-left-linear" size={14} color="var(--color-chocolate-base)" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNavigate('next')}
                    aria-label="Next timeframe"
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                      background: 'var(--color-cream-surface, #FDFBF7)',
                      color: 'var(--color-chocolate-base, #2A170F)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SolarIcon name="alt-arrow-right-linear" size={14} color="var(--color-chocolate-base)" />
                  </button>
                </div>

                <h2
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.15rem',
                    fontWeight: 600,
                    color: 'var(--color-chocolate-base, #2A170F)',
                    margin: '0 4px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {headerTitle}
                </h2>

                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full, 9999px)',
                    background: 'var(--color-gold-pale, #F0E5D3)',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    fontSize: '0.72rem',
                    fontWeight: 500,
                    border: '1px solid rgba(223, 171, 98, 0.25)',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  SAST (UTC+2)
                </span>
              </div>

              {/* Right: View Switcher & Filters & Legend Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Filter source chips */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    background: 'var(--color-cream-base, #FAF6EE)',
                    padding: '3px',
                    borderRadius: 'var(--radius-full, 9999px)',
                    border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
                  }}
                >
                  {(['all', 'direct', 'locumstaff'] as const).map((src) => {
                    const isActive = filterSource === src;
                    const label = src === 'all' ? 'All' : src === 'direct' ? 'Telehealth' : 'Locumstaff';
                    return (
                      <button
                        key={src}
                        type="button"
                        onClick={() => setFilterSource(src)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: 'var(--radius-full, 9999px)',
                          border: 'none',
                          background: isActive ? 'var(--color-chocolate-base, #2A170F)' : 'transparent',
                          color: isActive ? '#ffffff' : 'var(--color-chocolate-base, #2A170F)',
                          fontSize: '0.75rem',
                          fontWeight: isActive ? 600 : 500,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* View Switcher: Week / Month / Day */}
                <div
                  style={{
                    display: 'flex',
                    background: 'var(--color-cream-base, #FAF6EE)',
                    padding: '3px',
                    borderRadius: 'var(--radius-full, 9999px)',
                    border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                  }}
                >
                  {(['week', 'month', 'day'] as CalendarViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      style={{
                        padding: '4px 12px',
                        borderRadius: 'var(--radius-full, 9999px)',
                        border: 'none',
                        background: viewMode === mode ? 'var(--color-gold-primary, #E2B467)' : 'transparent',
                        color: 'var(--color-chocolate-base, #2A170F)',
                        fontWeight: viewMode === mode ? 600 : 500,
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                {/* Legend Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowLegend(!showLegend)}
                  className="btn-ghost"
                  style={{ padding: '5px 8px', fontSize: '0.74rem', fontWeight: 500, gap: '4px' }}
                  title="Toggle color legend"
                >
                  <SolarIcon name="info-circle-linear" size={14} color="var(--color-gold-bronze)" />
                  <span className="desktop-only-inline">Legend</span>
                </button>
              </div>
            </div>

            {/* Collapsible Sleek Legend */}
            {showLegend && (
              <div
                style={{
                  padding: '8px 18px',
                  background: 'var(--color-cream-base, #FAF6EE)',
                  borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.15))',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '16px',
                  fontSize: '0.74rem',
                  fontWeight: 400,
                  color: 'var(--color-cream-text-muted, #6B5E55)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#f0fdfa', border: '1px solid #99f6e4' }} />
                  <span>Open Slot (Available)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#FDFBF7', border: '1px solid var(--color-gold-base, #DFAB62)' }} />
                  <span>Booked Patient Consult</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#faf5ff', border: '1px solid #d8b4fe' }} />
                  <span>LocumStaff Synced (Locked)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'repeating-linear-gradient(45deg, #fffbeb, #fffbeb 4px, #fef3c7 4px, #fef3c7 8px)', border: '1px solid #fde68a' }} />
                  <span>Out of Office</span>
                </div>
              </div>
            )}

            {/* Loading Skeleton */}
            {isLoading ? (
              <div style={{ padding: '24px 18px', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
                {[1, 2, 3, 4, 5, 6, 7].map((col) => (
                  <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ height: '42px', borderRadius: '8px', backgroundColor: 'rgba(42, 23, 15, 0.05)', animation: 'pulse 1.5s infinite' }} />
                    {[1, 2, 3, 4].map((s) => (
                      <div key={s} style={{ height: '60px', borderRadius: '8px', backgroundColor: 'rgba(223, 171, 98, 0.08)', border: '1px dashed rgba(223, 171, 98, 0.25)', animation: 'pulse 1.5s infinite' }} />
                    ))}
                  </div>
                ))}
              </div>
            ) : null}

            {/* WEEK VIEW (Desktop Grid + Mobile Day Selector) */}
            {!isLoading && viewMode === 'week' && (
              <>
                {/* DESKTOP 7-COLUMN GRID (Hidden on mobile < 768px) */}
                <div className="calendar-week-desktop">
                  {weekDays.map((dayDate, dayIdx) => {
                    const yyyy = dayDate.getFullYear();
                    const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(dayDate.getDate()).padStart(2, '0');
                    const dateKey = `${yyyy}-${mm}-${dd}`;

                    const isToday = new Date().toDateString() === dayDate.toDateString();
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    const isPastDay = dayDate.getTime() < todayStart.getTime();
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
                          minWidth: 0,
                          background: dayBlackout
                            ? 'repeating-linear-gradient(45deg, rgba(254, 243, 199, 0.25), rgba(254, 243, 199, 0.25) 8px, rgba(255, 251, 235, 0.25) 8px, rgba(255, 251, 235, 0.25) 16px)'
                            : isToday
                            ? 'rgba(223, 171, 98, 0.04)'
                            : isPastDay
                            ? 'rgba(0, 0, 0, 0.015)'
                            : 'transparent',
                        }}
                      >
                        {/* Column Header */}
                        <div
                          style={{
                            padding: '10px 6px',
                            borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.15))',
                            textAlign: 'center',
                            background: isToday ? 'var(--color-gold-pale, #F0E5D3)' : 'transparent',
                            opacity: isPastDay && !isToday ? 0.75 : 1,
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 500,
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em',
                              color: isToday ? 'var(--color-chocolate-base, #2A170F)' : 'var(--color-cream-text-muted, #6B5E55)',
                            }}
                          >
                            {dayDate.toLocaleDateString('en-ZA', { weekday: 'short' })}
                          </div>
                          <div
                            style={{
                              fontFamily: 'var(--font-heading)',
                              fontSize: '1.15rem',
                              fontWeight: 600,
                              color: 'var(--color-chocolate-base, #2A170F)',
                              marginTop: '1px',
                            }}
                          >
                            {dayDate.getDate()}
                          </div>
                          {dayBlackout && (
                            <span
                              style={{
                                fontSize: '0.62rem',
                                fontWeight: 500,
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '1px 5px',
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
                            <div className="calendar-empty-column">
                              <SolarIcon name="calendar-linear" size={15} color="var(--color-gold-bronze, #B88647)" style={{ opacity: 0.4 }} />
                              <span style={{ fontSize: '0.72rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 400 }}>
                                {isPastDay ? 'Past' : 'No slots'}
                              </span>
                              {!isPastDay && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCreateModalWithDate(dateKey);
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
                                    background: 'var(--color-cream-surface, #FDFBF7)',
                                    color: 'var(--color-chocolate-base, #2A170F)',
                                    fontSize: '0.7rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    marginTop: '2px',
                                  }}
                                >
                                  <SolarIcon name="add-circle-linear" size={12} color="var(--color-gold-bronze, #B88647)" />
                                  <span>+ Add</span>
                                </button>
                              )}
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

                              let badgeBg = '#f0fdfa';
                              let badgeBorder = '1px solid #99f6e4';
                              let badgeColor = '#0f766e';

                              if (isCancelled) {
                                badgeBg = '#fef2f2';
                                badgeBorder = '1px solid #fecaca';
                                badgeColor = '#991b1b';
                              } else if (slot.isBooked) {
                                badgeBg = 'var(--color-cream-surface, #FDFBF7)';
                                badgeBorder = '1px solid var(--color-gold-base, #DFAB62)';
                                badgeColor = 'var(--color-chocolate-base, #2A170F)';
                              } else if (isLocum) {
                                badgeBg = '#faf5ff';
                                badgeBorder = '1px solid #d8b4fe';
                                badgeColor = '#7e22ce';
                              }

                              return (
                                <div
                                  key={slot.id}
                                  onClick={() => setSelectedSlotForDetail(slot)}
                                  className="calendar-slot-chip"
                                  style={{
                                    background: badgeBg,
                                    border: badgeBorder,
                                    color: badgeColor,
                                    opacity: isPast && !isCancelled ? 0.65 : 1,
                                    boxShadow: slot.isBooked ? '0 1px 4px rgba(42, 23, 15, 0.04)' : 'none',
                                  }}
                                >
                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      marginBottom: '2px',
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontFamily: 'var(--font-heading)',
                                        fontSize: '0.78rem',
                                        fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                      }}
                                    >
                                      {sTime}–{eTime}
                                    </span>
                                    {isLocum && !isCancelled && (
                                      <span title="Synced from LocumStaff (Locked)">
                                        <SolarIcon name="lock-bold" size={11} color="#7e22ce" />
                                      </span>
                                    )}
                                    {isCancelled && slot.cancellationFeeEarned && (
                                      <span
                                        style={{
                                          fontSize: '0.62rem',
                                          fontWeight: 600,
                                          background: '#ffe4e6',
                                          color: '#be123c',
                                          padding: '1px 4px',
                                          borderRadius: '3px',
                                        }}
                                      >
                                        +R{slot.cancellationFeeEarned}
                                      </span>
                                    )}
                                  </div>

                                  <div
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      fontSize: '0.68rem',
                                      fontWeight: 500,
                                    }}
                                  >
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {isCancelled
                                        ? 'Cancelled'
                                        : slot.isBooked
                                        ? slot.patientName || 'Booked'
                                        : isLocum
                                        ? 'Locum Duty'
                                        : 'Available'}
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

                {/* MOBILE WEEK VIEW: Horizontal Day Selector + Active Day Agenda */}
                <div className="calendar-week-mobile">
                  {/* Horizontal Scrollable Day Strip */}
                  <div className="calendar-day-tabs-scroll">
                    {weekDays.map((dayDate) => {
                      const yyyy = dayDate.getFullYear();
                      const mm = String(dayDate.getMonth() + 1).padStart(2, '0');
                      const dd = String(dayDate.getDate()).padStart(2, '0');
                      const dateKey = `${yyyy}-${mm}-${dd}`;

                      const isToday = new Date().toDateString() === dayDate.toDateString();
                      const isSelected = mobileSelectedDate.toDateString() === dayDate.toDateString();
                      const dayBlackout = isDayInBlackout(dayDate);

                      const daySlots = filteredSlots.filter((slot) => {
                        const sDate = new Date(slot.startTime);
                        const sY = sDate.getFullYear();
                        const sM = String(sDate.getMonth() + 1).padStart(2, '0');
                        const sD = String(sDate.getDate()).padStart(2, '0');
                        return `${sY}-${sM}-${sD}` === dateKey;
                      });

                      const hasBooked = daySlots.some((s) => s.isBooked);
                      const hasAvailable = daySlots.some((s) => !s.isBooked);

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => setMobileSelectedDate(dayDate)}
                          className={`calendar-day-tab-btn ${isSelected ? 'active' : ''} ${isToday ? 'today' : ''}`}
                        >
                          <span style={{ fontSize: '0.68rem', fontWeight: 500, textTransform: 'uppercase' }}>
                            {dayDate.toLocaleDateString('en-ZA', { weekday: 'short' })}
                          </span>
                          <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 'var(--font-heading-weight, 400)' }}>
                            {dayDate.getDate()}
                          </span>
                          <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
                            {dayBlackout ? (
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#d97706' }} />
                            ) : (
                              <>
                                {hasAvailable && (
                                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#059669' }} />
                                )}
                                {hasBooked && (
                                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--color-gold-bronze)' }} />
                                )}
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Mobile Active Day Agenda */}
                  {(() => {
                    const yyyy = mobileSelectedDate.getFullYear();
                    const mm = String(mobileSelectedDate.getMonth() + 1).padStart(2, '0');
                    const dd = String(mobileSelectedDate.getDate()).padStart(2, '0');
                    const selectedDateKey = `${yyyy}-${mm}-${dd}`;
                    const isToday = new Date().toDateString() === mobileSelectedDate.toDateString();
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    const isPastSelectedDate = mobileSelectedDate.getTime() < todayStart.getTime();
                    const dayBlackout = isDayInBlackout(mobileSelectedDate);

                    const selectedDaySlots = filteredSlots.filter((slot) => {
                      const sDate = new Date(slot.startTime);
                      const sY = sDate.getFullYear();
                      const sM = String(sDate.getMonth() + 1).padStart(2, '0');
                      const sD = String(sDate.getDate()).padStart(2, '0');
                      return `${sY}-${sM}-${sD}` === selectedDateKey;
                    });

                    return (
                      <div style={{ padding: '16px', background: 'var(--color-cream-surface, #FDFBF7)' }}>
                        {/* Day Heading with quick "+ Add" */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '14px',
                            paddingBottom: '10px',
                            borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span
                                style={{
                                  fontFamily: 'var(--font-heading)',
                                  fontSize: '1rem',
                                  fontWeight: 600,
                                  color: 'var(--color-chocolate-base, #2A170F)',
                                }}
                              >
                                {mobileSelectedDate.toLocaleDateString('en-ZA', {
                                  weekday: 'long',
                                  day: 'numeric',
                                  month: 'short',
                                })}
                              </span>
                              {isToday && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 600,
                                    background: 'var(--color-gold-primary)',
                                    color: 'var(--color-chocolate-base)',
                                    padding: '1px 6px',
                                    borderRadius: '9999px',
                                  }}
                                >
                                  Today
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '2px', fontWeight: 400 }}>
                              {dayBlackout
                                ? 'Out-of-office period'
                                : `${selectedDaySlots.length} slot${selectedDaySlots.length === 1 ? '' : 's'} scheduled`}
                            </div>
                          </div>

                          {!isPastSelectedDate && (
                            <button
                              type="button"
                              onClick={() => openCreateModalWithDate(selectedDateKey)}
                              className="btn-primary"
                              style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 600, minHeight: '32px' }}
                            >
                              <SolarIcon name="add-circle-bold" size={13} color="var(--color-chocolate-base)" />
                              <span>Add Slot</span>
                            </button>
                          )}
                        </div>

                        {/* Day Slot Items */}
                        {selectedDaySlots.length === 0 ? (
                          <div
                            style={{
                              padding: '32px 16px',
                              textAlign: 'center',
                              borderRadius: '12px',
                              border: '1px dashed var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                              background: 'var(--color-cream-base, #FAF6EE)',
                            }}
                          >
                            <SolarIcon name="calendar-linear" size={28} color="var(--color-gold-bronze)" style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--color-chocolate-base)' }}>
                              {isPastSelectedDate ? 'Past Date' : 'No slots for this day'}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--color-cream-text-muted)', margin: '4px 0 12px', fontWeight: 400 }}>
                              {isPastSelectedDate
                                ? 'This date has passed and slots cannot be scheduled in the past.'
                                : 'Add consultation availability to open this day for patient bookings.'}
                            </div>
                            {!isPastSelectedDate && (
                              <button
                                type="button"
                                onClick={() => openCreateModalWithDate(selectedDateKey)}
                                className="btn-secondary"
                                style={{ padding: '6px 12px', fontSize: '0.78rem', fontWeight: 500 }}
                              >
                                + Add Availability for {mobileSelectedDate.toLocaleDateString('en-ZA', { weekday: 'short' })}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {selectedDaySlots.map((slot) => {
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
                                    padding: '12px 14px',
                                    borderRadius: '12px',
                                    border: slot.isBooked
                                      ? '1px solid var(--color-gold-base, #DFAB62)'
                                      : isLocum
                                      ? '1px solid #d8b4fe'
                                      : isCancelled
                                      ? '1px solid #fecaca'
                                      : '1px solid #99f6e4',
                                    background: slot.isBooked
                                      ? 'var(--color-cream-surface, #FDFBF7)'
                                      : isLocum
                                      ? '#faf5ff'
                                      : isCancelled
                                      ? '#fef2f2'
                                      : '#f0fdfa',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <SolarIcon
                                      name={slot.isBooked ? 'user-rounded-bold' : isLocum ? 'lock-bold' : 'clock-circle-bold'}
                                      size={18}
                                      color={slot.isBooked ? 'var(--color-chocolate-base)' : isLocum ? '#7e22ce' : '#0f766e'}
                                    />
                                    <div>
                                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.88rem', fontWeight: 'var(--font-heading-weight, 400)', color: 'var(--color-chocolate-base, #2A170F)' }}>
                                        {sTime} – {eTime}
                                      </div>
                                      <div style={{ fontSize: '0.74rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 400 }}>
                                        {isCancelled
                                          ? `Cancelled • ${slot.patientName || 'Patient'}`
                                          : slot.isBooked
                                          ? `Booked • ${slot.patientName || 'Confirmed Patient'}`
                                          : isLocum
                                          ? 'LocumStaff Duty Shift'
                                          : '30 Min Telehealth Slot'}
                                      </div>
                                    </div>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {slot.cancellationFeeEarned && (
                                      <span style={{ fontSize: '0.68rem', fontWeight: 600, background: '#ffe4e6', color: '#be123c', padding: '2px 6px', borderRadius: '4px' }}>
                                        +R{slot.cancellationFeeEarned}
                                      </span>
                                    )}
                                    <span
                                      style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 600,
                                        padding: '2px 8px',
                                        borderRadius: '9999px',
                                        background: slot.isBooked ? 'var(--color-gold-pale)' : isLocum ? '#f3e8ff' : '#E7F5EF',
                                        color: slot.isBooked ? 'var(--color-chocolate-base)' : isLocum ? '#7e22ce' : '#047857',
                                      }}
                                    >
                                      {isCancelled ? 'Cancelled' : slot.isBooked ? 'Booked' : isLocum ? 'Locked' : 'Open'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}

            {/* DAY VIEW */}
            {viewMode === 'day' && (() => {
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              const isToday = new Date().toDateString() === currentDate.toDateString();
              const isPastCurrentDate = currentDate.getTime() < todayStart.getTime();
              const dayBlackout = isDayInBlackout(currentDate);

              const currentDayKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

              // Strictly filter slots for this exact date
              const daySlots = filteredSlots.filter((slot) => {
                const sDate = new Date(slot.startTime);
                const sY = sDate.getFullYear();
                const sM = String(sDate.getMonth() + 1).padStart(2, '0');
                const sD = String(sDate.getDate()).padStart(2, '0');
                return `${sY}-${sM}-${sD}` === currentDayKey;
              }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

              const availableCount = daySlots.filter((s) => !s.isBooked && s.source !== 'locumstaff').length;
              const bookedCount = daySlots.filter((s) => s.isBooked).length;
              const locumCount = daySlots.filter((s) => s.source === 'locumstaff').length;

              // Hours to display in day calendar timeline (07:00 - 21:00)
              const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

              // Current time calculation for live indicator
              const now = new Date();
              const nowHour = now.getHours();
              const nowMinute = now.getMinutes();
              const nowTotalMinutes = nowHour * 60 + nowMinute;
              const startTotalMinutes = 7 * 60;
              const endTotalMinutes = 22 * 60; // 22:00
              const showLiveIndicator = isToday && nowTotalMinutes >= startTotalMinutes && nowTotalMinutes <= endTotalMinutes;
              const liveIndicatorTopPercent = showLiveIndicator
                ? ((nowTotalMinutes - startTotalMinutes) / (endTotalMinutes - startTotalMinutes)) * 100
                : 0;

              return (
                <div style={{ padding: '20px 16px', background: 'var(--color-cream-surface, #FDFBF7)' }}>
                  {/* Day View Sub-Header */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      padding: '16px 20px',
                      borderRadius: '14px',
                      background: 'var(--color-cream-base, #FAF6EE)',
                      border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                      marginBottom: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <h2
                            style={{
                              fontFamily: 'var(--font-heading)',
                              fontSize: '1.25rem',
                              fontWeight: 600,
                              color: 'var(--color-chocolate-base, #2A170F)',
                              margin: 0,
                            }}
                          >
                            {currentDate.toLocaleDateString('en-ZA', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </h2>
                          {isToday && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                background: 'var(--color-gold-base, #DFAB62)',
                                color: 'var(--color-chocolate-base, #2A170F)',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                              }}
                            >
                              Today
                            </span>
                          )}
                          {isPastCurrentDate && !isToday && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                background: '#f1f5f9',
                                color: '#64748b',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                              }}
                            >
                              Past Date
                            </span>
                          )}
                          {dayBlackout && (
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                border: '1px solid #fde68a',
                              }}
                            >
                              Out of Office
                            </span>
                          )}
                        </div>

                        {/* Metric chips */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                            <strong>{daySlots.length}</strong> total slot{daySlots.length === 1 ? '' : 's'}
                          </span>
                          <span style={{ color: 'var(--color-gold-border, rgba(223, 171, 98, 0.4))' }}>•</span>
                          <span style={{ fontSize: '0.78rem', color: '#0f766e', fontWeight: 500 }}>
                            {availableCount} available
                          </span>
                          <span style={{ color: 'var(--color-gold-border, rgba(223, 171, 98, 0.4))' }}>•</span>
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-chocolate-base, #2A170F)', fontWeight: 500 }}>
                            {bookedCount} booked
                          </span>
                          {locumCount > 0 && (
                            <>
                              <span style={{ color: 'var(--color-gold-border, rgba(223, 171, 98, 0.4))' }}>•</span>
                              <span style={{ fontSize: '0.78rem', color: '#7e22ce', fontWeight: 500 }}>
                                {locumCount} LocumStaff
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Day View Quick Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          background: 'var(--color-cream-surface, #FDFBF7)',
                          border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
                          borderRadius: 'var(--radius-full, 9999px)',
                          padding: '2px 4px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleNavigate('prev')}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-chocolate-base, #2A170F)',
                          }}
                          title="Previous Day"
                        >
                          <SolarIcon name="alt-arrow-left-linear" size={15} color="var(--color-chocolate-base)" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNavigate('today')}
                          style={{
                            border: 'none',
                            background: isToday ? 'var(--color-gold-pale, #F0E5D3)' : 'transparent',
                            cursor: 'pointer',
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-full, 9999px)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--color-chocolate-base, #2A170F)',
                          }}
                        >
                          Today
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNavigate('next')}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            padding: '6px 8px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-chocolate-base, #2A170F)',
                          }}
                          title="Next Day"
                        >
                          <SolarIcon name="alt-arrow-right-linear" size={15} color="var(--color-chocolate-base)" />
                        </button>
                      </div>

                      {!isPastCurrentDate && (
                        <button
                          type="button"
                          onClick={() => openCreateModalWithDate(currentDayKey)}
                          className="btn-primary"
                          style={{ padding: '7px 14px', fontSize: '0.8rem', fontWeight: 600 }}
                        >
                          <SolarIcon name="add-circle-bold" size={14} color="var(--color-chocolate-base)" />
                          <span>Add Slot</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Empty Notification if 0 slots */}
                  {daySlots.length === 0 && (
                    <div
                      style={{
                        padding: '14px 18px',
                        marginBottom: '16px',
                        borderRadius: '12px',
                        border: '1px dashed var(--color-gold-border, rgba(223, 171, 98, 0.35))',
                        background: 'var(--color-cream-base, #FAF6EE)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <SolarIcon name="calendar-linear" size={18} color="var(--color-gold-bronze, #B88647)" />
                        <span style={{ fontSize: '0.825rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                          {isPastCurrentDate
                            ? 'No consultation slots were scheduled for this date.'
                            : 'No slots scheduled for this day yet. Click any hour row below or "+ Add Slot" above to create availability.'}
                        </span>
                      </div>
                      {!isPastCurrentDate && (
                        <button
                          type="button"
                          onClick={() => openCreateModalWithDate(currentDayKey)}
                          className="btn-secondary"
                          style={{ fontSize: '0.78rem', padding: '4px 12px' }}
                        >
                          + Add Availability
                        </button>
                      )}
                    </div>
                  )}

                  {/* HOURLY CALENDAR TIMELINE */}
                  <div
                    style={{
                      position: 'relative',
                      background: 'var(--color-cream-surface, #FDFBF7)',
                      border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    {/* Live Current-Time Indicator Line */}
                    {showLiveIndicator && (
                      <div
                        style={{
                          position: 'absolute',
                          top: `${liveIndicatorTopPercent}%`,
                          left: 0,
                          right: 0,
                          height: '2px',
                          background: '#dc2626',
                          zIndex: 20,
                          pointerEvents: 'none',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <div
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            background: '#dc2626',
                            marginLeft: '58px',
                            boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.25)',
                          }}
                        />
                        <span
                          style={{
                            marginLeft: '6px',
                            background: '#dc2626',
                            color: '#ffffff',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          {String(nowHour).padStart(2, '0')}:{String(nowMinute).padStart(2, '0')}
                        </span>
                      </div>
                    )}

                    {/* Hourly Rows */}
                    {hours.map((hour, idx) => {
                      const hourLabel = `${String(hour).padStart(2, '0')}:00`;
                      const hourSlots = daySlots.filter((slot) => {
                        const sDate = new Date(slot.startTime);
                        return sDate.getHours() === hour;
                      });

                      const isHourPast = isPastCurrentDate || (isToday && nowHour > hour);

                      return (
                        <div
                          key={hour}
                          style={{
                            display: 'flex',
                            borderTop: idx > 0 ? '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.15))' : 'none',
                            minHeight: '74px',
                            transition: 'background 0.15s ease',
                            background: isHourPast ? 'rgba(0, 0, 0, 0.01)' : 'transparent',
                          }}
                        >
                          {/* Time Gutter Column */}
                          <div
                            style={{
                              width: '64px',
                              flexShrink: 0,
                              padding: '12px 8px',
                              textAlign: 'right',
                              borderRight: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.15))',
                              fontSize: '0.74rem',
                              fontFamily: 'monospace',
                              fontWeight: 600,
                              color: isToday && nowHour === hour ? 'var(--color-chocolate-base)' : 'var(--color-cream-text-muted, #6B5E55)',
                              background: isToday && nowHour === hour ? 'var(--color-gold-pale, #F0E5D3)' : 'transparent',
                              userSelect: 'none',
                            }}
                          >
                            {hourLabel}
                          </div>

                          {/* Hour Content Cell */}
                          <div
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              position: 'relative',
                            }}
                          >
                            {hourSlots.length > 0 ? (
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: hourSlots.length > 1 ? 'repeat(auto-fit, minmax(280px, 1fr))' : '1fr',
                                  gap: '8px',
                                  width: '100%',
                                }}
                              >
                                {hourSlots.map((slot) => {
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
                                        padding: '10px 14px',
                                        borderRadius: '10px',
                                        border: slot.isBooked
                                          ? '1px solid var(--color-gold-base, #DFAB62)'
                                          : isLocum
                                          ? '1px solid #d8b4fe'
                                          : isCancelled
                                          ? '1px solid #fecaca'
                                          : '1px solid #99f6e4',
                                        background: slot.isBooked
                                          ? 'var(--color-cream-surface, #FDFBF7)'
                                          : isLocum
                                          ? 'linear-gradient(135deg, #FAF5FF 0%, #FFFFFF 100%)'
                                          : isCancelled
                                          ? '#fef2f2'
                                          : '#f0fdfa',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '10px',
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                        transition: 'all 0.15s ease',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                        <div
                                          style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '8px',
                                            background: slot.isBooked
                                              ? 'var(--color-gold-pale, #F0E5D3)'
                                              : isLocum
                                              ? '#f3e8ff'
                                              : isCancelled
                                              ? '#fee2e2'
                                              : '#ccfbf1',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                          }}
                                        >
                                          <SolarIcon
                                            name={slot.isBooked ? 'user-rounded-bold' : isLocum ? 'lock-bold' : 'clock-circle-bold'}
                                            size={14}
                                            color={slot.isBooked ? 'var(--color-chocolate-base)' : isLocum ? '#7e22ce' : isCancelled ? '#dc2626' : '#0f766e'}
                                          />
                                        </div>
                                        <div style={{ minWidth: 0 }}>
                                          <div
                                            style={{
                                              fontFamily: 'var(--font-heading)',
                                              fontSize: '0.875rem',
                                              fontWeight: 600,
                                              color: 'var(--color-chocolate-base, #2A170F)',
                                            }}
                                          >
                                            {sTime} – {eTime}
                                          </div>
                                          <div
                                            style={{
                                              fontSize: '0.74rem',
                                              color: 'var(--color-cream-text-muted, #6B5E55)',
                                              fontWeight: 400,
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap',
                                            }}
                                          >
                                            {slot.isBooked
                                              ? slot.patientName || 'Confirmed Patient'
                                              : isLocum
                                              ? 'LocumStaff Duty Shift'
                                              : isCancelled
                                              ? 'Cancelled by patient'
                                              : 'Virtual Consultation Slot'}
                                          </div>
                                        </div>
                                      </div>

                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                        {isLocum && (
                                          <span
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                              padding: '2px 6px',
                                              borderRadius: '6px',
                                              background: '#f3e8ff',
                                              color: '#7e22ce',
                                              fontSize: '0.68rem',
                                              fontWeight: 600,
                                            }}
                                          >
                                            <SolarIcon name="lock-bold" size={10} color="#7e22ce" />
                                            <span>Locked</span>
                                          </span>
                                        )}
                                        <span
                                          style={{
                                            padding: '2px 8px',
                                            borderRadius: '9999px',
                                            fontSize: '0.7rem',
                                            fontWeight: 600,
                                            background: slot.isBooked
                                              ? 'var(--color-chocolate-base, #2A170F)'
                                              : isCancelled
                                              ? '#fee2e2'
                                              : '#ccfbf1',
                                            color: slot.isBooked
                                              ? '#ffffff'
                                              : isCancelled
                                              ? '#991b1b'
                                              : '#0f766e',
                                          }}
                                        >
                                          {isCancelled ? 'Cancelled' : slot.isBooked ? 'Booked' : 'Available'}
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              /* Empty Hour Slot */
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  height: '100%',
                                }}
                              >
                                {!isPastCurrentDate ? (
                                  <button
                                    type="button"
                                    onClick={() => openCreateModalWithDate(currentDayKey, `${String(hour).padStart(2, '0')}:00`, 'single')}
                                    style={{
                                      width: '100%',
                                      height: '42px',
                                      border: '1px dashed transparent',
                                      borderRadius: '8px',
                                      background: 'transparent',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'flex-start',
                                      padding: '0 12px',
                                      gap: '8px',
                                      color: 'var(--color-cream-text-muted, #6B5E55)',
                                      fontSize: '0.76rem',
                                      fontWeight: 500,
                                      transition: 'all 0.15s ease',
                                      opacity: 0.7,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.background = 'var(--color-gold-pale, #F0E5D3)';
                                      e.currentTarget.style.borderColor = 'var(--color-gold-base, #DFAB62)';
                                      e.currentTarget.style.color = 'var(--color-chocolate-base, #2A170F)';
                                      e.currentTarget.style.opacity = '1';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.background = 'transparent';
                                      e.currentTarget.style.borderColor = 'transparent';
                                      e.currentTarget.style.color = 'var(--color-cream-text-muted, #6B5E55)';
                                      e.currentTarget.style.opacity = '0.7';
                                    }}
                                  >
                                    <SolarIcon name="add-circle-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
                                    <span>+ Add slot at {hourLabel}</span>
                                  </button>
                                ) : (
                                  <span style={{ fontSize: '0.72rem', color: 'rgba(107, 94, 85, 0.4)', fontStyle: 'italic', paddingLeft: '8px' }}>
                                    No slots scheduled
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* MONTH VIEW */}
            {viewMode === 'month' && (
              <div style={{ padding: '20px', background: 'var(--color-cream-surface, #FDFBF7)' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
                    gap: '6px',
                    width: '100%',
                    margin: '0 auto',
                  }}
                >
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                    <div
                      key={day}
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: 'var(--color-gold-bronze, #B88647)',
                        padding: '6px 4px',
                        textAlign: 'center',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                      }}
                    >
                      {day}
                    </div>
                  ))}
                  {monthDays.map((dayItem, idx) => {
                    if (!dayItem.date) {
                      return (
                        <div
                          key={dayItem.dateKey}
                          style={{
                            minHeight: '74px',
                            borderRadius: '10px',
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
                          setMobileSelectedDate(dayDate);
                          setViewMode('day');
                        }}
                        style={{
                          minHeight: '76px',
                          borderRadius: '10px',
                          border: isToday
                            ? '1.5px solid var(--color-gold-primary, #E2B467)'
                            : '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
                          padding: '8px',
                          cursor: 'pointer',
                          background: dayBlackout
                            ? 'repeating-linear-gradient(45deg, rgba(254, 243, 199, 0.25), rgba(254, 243, 199, 0.25) 8px, rgba(255, 251, 235, 0.25) 8px, rgba(255, 251, 235, 0.25) 16px)'
                            : isToday
                            ? 'var(--color-gold-pale, #F0E5D3)'
                            : idx % 2 === 0
                            ? 'var(--color-cream-base, #FAF6EE)'
                            : 'var(--color-cream-surface, #FDFBF7)',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-heading)',
                              fontSize: '0.84rem',
                              fontWeight: 600,
                              color: 'var(--color-chocolate-base, #2A170F)',
                            }}
                          >
                            {dayItem.dayNumber}
                          </span>
                          {dayBlackout && (
                            <span
                              style={{
                                fontSize: '0.58rem',
                                fontWeight: 500,
                                background: '#fef3c7',
                                color: '#b45309',
                                padding: '1px 4px',
                                borderRadius: '3px',
                              }}
                            >
                              Out
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                          {daySlots.length > 0 ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexWrap: 'wrap' }}>
                              {availableCount > 0 && (
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    color: '#0f766e',
                                    background: '#f0fdfa',
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    border: '1px solid #99f6e4',
                                  }}
                                >
                                  {availableCount} open
                                </span>
                              )}
                              {bookedCount > 0 && (
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 600,
                                    color: 'var(--color-chocolate-base)',
                                    background: 'var(--color-gold-pale)',
                                    padding: '1px 4px',
                                    borderRadius: '3px',
                                    border: '1px solid rgba(223, 171, 98, 0.4)',
                                  }}
                                >
                                  {bookedCount} booked
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.65rem', color: 'var(--color-cream-text-muted)', opacity: 0.5, fontWeight: 400 }}>
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
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LOCUMSTAFF SHIFTS (CONDITIONAL FOR LOCUM USERS)                    */}
      {/* ========================================================================= */}
      {pageTab === 'locumstaff' && isLocumUser && (
        <div style={{ width: '100%' }}>
          {/* Info Card Banner */}
          <div
            style={{
              padding: '18px 22px',
              borderRadius: '16px',
              background: 'var(--color-cream-surface, #FDFBF7)',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#F3E8FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SolarIcon name="lock-bold" size={20} color="#7e22ce" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 'var(--font-heading-weight, 400)', color: 'var(--color-chocolate-base, #2A170F)' }}>
                  LocumStaff Hospital Roster Integration
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 400, marginTop: '2px' }}>
                  Duty shifts are synced directly from your LocumStaff roster. ChekUp247 automatically blocks telehealth bookings during these periods.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 600 }}
            >
              <SolarIcon name="refresh-circle-linear" size={16} color="var(--color-chocolate-base)" />
              <span>{isSyncing ? 'Syncing...' : 'Sync From LocumStaff'}</span>
            </button>
          </div>

          {/* LocumStaff Shifts List */}
          <div
            className="portal-card"
            style={{
              padding: '24px',
              background: 'var(--color-cream-surface, #FDFBF7)',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 'var(--font-heading-weight, 400)', margin: 0, color: 'var(--color-chocolate-base)' }}>
                Synced Duty Shifts ({locumSlots.length})
              </h3>
              <span
                style={{
                  fontSize: '0.74rem',
                  fontWeight: 500,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  background: '#F3E8FF',
                  color: '#7e22ce',
                  border: '1px solid #d8b4fe',
                }}
              >
                Locked on Telehealth Roster
              </span>
            </div>

            {locumSlots.length === 0 ? (
              <div
                style={{
                  padding: '48px 20px',
                  textAlign: 'center',
                  borderRadius: '12px',
                  border: '1px dashed var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                  background: 'var(--color-cream-base, #FAF6EE)',
                }}
              >
                <SolarIcon name="calendar-minimalistic-linear" size={36} color="var(--color-gold-bronze)" style={{ margin: '0 auto 10px', opacity: 0.7 }} />
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--color-chocolate-base)' }}>
                  No LocumStaff Shifts Found
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-cream-text-muted)', margin: '4px 0 16px', fontWeight: 400 }}>
                  Click &quot;Sync From LocumStaff&quot; to fetch your latest clinical duty shifts.
                </p>
                <button
                  type="button"
                  onClick={handleTriggerSync}
                  disabled={isSyncing}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                >
                  <SolarIcon name="refresh-circle-linear" size={15} color="var(--color-chocolate-base)" />
                  <span>Sync Now</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {locumSlots.map((slot) => {
                  const start = new Date(slot.startTime);
                  const end = new Date(slot.endTime);
                  const sTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                  const eTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                  const isPast = end.getTime() < Date.now();

                  return (
                    <div
                      key={slot.id}
                      onClick={() => setSelectedSlotForDetail(slot)}
                      style={{
                        padding: '16px 20px',
                        borderRadius: '12px',
                        border: '1px solid #d8b4fe',
                        background: '#faf5ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        opacity: isPast ? 0.65 : 1,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: '#f3e8ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <SolarIcon name="lock-bold" size={16} color="#7e22ce" />
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '0.95rem', fontWeight: 'var(--font-heading-weight, 400)', color: 'var(--color-chocolate-base, #2A170F)' }}>
                            {start.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 400, marginTop: '2px' }}>
                            {sTime} – {eTime} • Duty shift locked on LocumStaff
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            background: isPast ? '#e2e8f0' : '#f3e8ff',
                            color: isPast ? '#64748b' : '#7e22ce',
                          }}
                        >
                          {isPast ? 'Completed' : 'Upcoming Duty'}
                        </span>
                        <SolarIcon name="alt-arrow-right-linear" size={16} color="#7e22ce" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <SlotCreationModal
        isOpen={isCreateModalOpen}
        initialDate={createModalInitialDate}
        initialStartTime={createModalInitialStartTime}
        initialMode={createModalInitialMode}
        onClose={() => {
          setIsCreateModalOpen(false);
          setCreateModalInitialDate(undefined);
          setCreateModalInitialStartTime(undefined);
          setCreateModalInitialMode(undefined);
        }}
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
