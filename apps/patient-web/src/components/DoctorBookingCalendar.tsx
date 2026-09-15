'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Video,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Globe,
  ArrowRight,
} from 'lucide-react';

export interface AvailabilitySlotDto {
  id: string;
  doctorId: string;
  startTime: string; // UTC ISO string
  endTime: string; // UTC ISO string
  date: string; // YYYY-MM-DD
  durationMinutes: number;
  source?: string;
  isLocked?: boolean;
}

interface DoctorBookingCalendarProps {
  doctor: {
    id: string;
    slug: string;
    rate_per_hour: number | string;
    user?: {
      full_name: string;
    };
  };
  initialSlots?: AvailabilitySlotDto[];
}

export function DoctorBookingCalendar({ doctor, initialSlots = [] }: DoctorBookingCalendarProps) {
  const [slots, setSlots] = useState<AvailabilitySlotDto[]>(initialSlots);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlotDto | null>(null);
  const [userTimeZone, setUserTimeZone] = useState<string>('Africa/Johannesburg');

  // Detect local timezone in browser
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setUserTimeZone(tz);
    } catch (e) {
      // default to SAST
    }
  }, []);

  // Fetch live availability slots from API
  useEffect(() => {
    let isMounted = true;
    async function loadSlots() {
      try {
        setIsLoading(true);
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
        const res = await fetch(`${apiBase}/doctors/${doctor.slug || doctor.id}/availability`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.slots && Array.isArray(data.slots)) {
            setSlots(data.slots);
          }
        }
      } catch (err) {
        console.warn('Could not fetch live slots from API, using fallback data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadSlots();
    return () => {
      isMounted = false;
    };
  }, [doctor.slug, doctor.id]);

  // Generate fallback slots if none exist
  const effectiveSlots = useMemo(() => {
    if (slots && slots.length > 0) return slots;

    // Generate dynamic mock slots for the next 7 days
    const mockList: AvailabilitySlotDto[] = [];
    const now = new Date();

    for (let day = 1; day <= 6; day++) {
      const d = new Date(now);
      d.setDate(now.getDate() + day);
      const dateStr = d.toISOString().split('T')[0];

      const times = ['08:30', '10:00', '11:30', '14:00', '15:30', '16:45'];
      for (const timeStr of times) {
        const [h, m] = timeStr.split(':').map(Number);
        const start = new Date(d);
        start.setHours(h, m, 0, 0);
        const end = new Date(start.getTime() + 30 * 60 * 1000);

        mockList.push({
          id: `slot-fallback-${dateStr}-${timeStr}`,
          doctorId: doctor.id,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          date: dateStr,
          durationMinutes: 30,
          source: 'direct',
        });
      }
    }
    return mockList;
  }, [slots, doctor.id]);

  // Days with available slots map
  const daysWithSlots = useMemo(() => {
    const map = new Map<string, AvailabilitySlotDto[]>();
    for (const slot of effectiveSlots) {
      // Format to local date string YYYY-MM-DD
      const localDate = new Date(slot.startTime);
      const yyyy = localDate.getFullYear();
      const mm = String(localDate.getMonth() + 1).padStart(2, '0');
      const dd = String(localDate.getDate()).padStart(2, '0');
      const key = `${yyyy}-${mm}-${dd}`;

      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(slot);
    }
    return map;
  }, [effectiveSlots]);

  // Week dates slider window
  const [weekOffset, setWeekOffset] = useState(0);

  const displayDays = useMemo(() => {
    const dates = [];
    const base = new Date();
    base.setDate(base.getDate() + 1 + weekOffset * 7); // start tomorrow

    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;

      dates.push({
        dateKey,
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        monthName: d.toLocaleDateString('en-US', { month: 'short' }),
        dayNumber: d.getDate(),
        hasSlots: (daysWithSlots.get(dateKey)?.length || 0) > 0,
        slotCount: daysWithSlots.get(dateKey)?.length || 0,
      });
    }
    return dates;
  }, [weekOffset, daysWithSlots]);

  // Set default selected date
  useEffect(() => {
    if (!selectedDate && displayDays.length > 0) {
      // Select first day that has slots, or first day
      const firstWithSlots = displayDays.find((d) => d.hasSlots);
      if (firstWithSlots) {
        setSelectedDate(firstWithSlots.dateKey);
      } else {
        setSelectedDate(displayDays[0].dateKey);
      }
    }
  }, [displayDays, selectedDate]);

  // Slots for the active selected day
  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    return daysWithSlots.get(selectedDate) || [];
  }, [selectedDate, daysWithSlots]);

  // Select first slot by default when date changes
  useEffect(() => {
    if (slotsForSelectedDay.length > 0) {
      setSelectedSlot(slotsForSelectedDay[0]);
    } else {
      setSelectedSlot(null);
    }
  }, [selectedDate, slotsForSelectedDay]);

  // Helper to format slot time in user local browser time
  const formatSlotTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '09:00';
    }
  };

  // Helper to format date header
  const formatSelectedDateHeading = (dateKey: string) => {
    if (!dateKey) return '';
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  // Group slots by Morning / Afternoon
  const morningSlots = slotsForSelectedDay.filter((s) => {
    const d = new Date(s.startTime);
    return d.getHours() < 12;
  });

  const afternoonSlots = slotsForSelectedDay.filter((s) => {
    const d = new Date(s.startTime);
    return d.getHours() >= 12;
  });

  const fee = Number(doctor.rate_per_hour || 750).toFixed(2);
  const doctorName = doctor.user?.full_name || 'Dr. Practitioner';

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '24px',
        border: '1px solid var(--color-slate-200)',
        padding: '24px',
        boxShadow: '0 12px 36px rgba(15, 23, 42, 0.08)',
      }}
    >
      {/* Header: Pricing */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--color-slate-100)',
          paddingBottom: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-brand-600)',
              display: 'block',
              marginBottom: '2px',
            }}
          >
            Instant Booking
          </span>
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: 'var(--color-slate-800)',
              margin: 0,
            }}
          >
            Video Consultation
          </h3>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: 'var(--color-slate-900)',
              letterSpacing: '-0.02em',
              lineHeight: 1,
            }}
          >
            R{fee}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', fontWeight: 500 }}>
            incl. VAT / 30 mins
          </span>
        </div>
      </div>

      {/* Week Navigator (PA-401) */}
      <div style={{ marginBottom: '18px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px',
          }}
        >
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-slate-800)' }}>
            Select Date
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
              disabled={weekOffset === 0}
              aria-label="Previous week"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                border: '1px solid var(--color-slate-200)',
                background: '#ffffff',
                color: weekOffset === 0 ? 'var(--color-slate-300)' : 'var(--color-slate-700)',
                cursor: weekOffset === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              aria-label="Next week"
              style={{
                width: '28px',
                height: '28px',
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
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Day Pills Carousel */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: '6px',
            marginBottom: '6px',
          }}
        >
          {displayDays.map((day) => {
            const isSelected = selectedDate === day.dateKey;
            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => setSelectedDate(day.dateKey)}
                style={{
                  padding: '8px 2px',
                  borderRadius: '12px',
                  border: isSelected
                    ? '2px solid var(--color-brand-600)'
                    : '1px solid var(--color-slate-200)',
                  background: isSelected
                    ? 'var(--color-brand-50)'
                    : day.hasSlots
                    ? '#ffffff'
                    : 'var(--color-slate-50)',
                  color: isSelected
                    ? 'var(--color-brand-700)'
                    : day.hasSlots
                    ? 'var(--color-slate-800)'
                    : 'var(--color-slate-400)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: isSelected ? 'var(--color-brand-600)' : 'var(--color-slate-400)',
                  }}
                >
                  {day.dayName}
                </div>
                <div
                  style={{
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    marginTop: '2px',
                  }}
                >
                  {day.dayNumber}
                </div>
                {day.hasSlots ? (
                  <div
                    style={{
                      width: '5px',
                      height: '5px',
                      borderRadius: '50%',
                      background: isSelected ? 'var(--color-brand-600)' : '#10b981',
                      margin: '4px auto 0',
                    }}
                  />
                ) : (
                  <div style={{ height: '5px', margin: '4px auto 0' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Timezone Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.725rem',
            color: 'var(--color-slate-500)',
            padding: '4px 2px',
          }}
        >
          <span style={{ fontWeight: 600 }}>{formatSelectedDateHeading(selectedDate)}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <Globe size={12} style={{ color: 'var(--color-slate-400)' }} />
            <span>{userTimeZone.replace('_', ' ')}</span>
          </span>
        </div>
      </div>

      {/* Available Time Chips (PA-401 & PA-402) */}
      <div style={{ marginBottom: '20px' }}>
        {slotsForSelectedDay.length === 0 ? (
          <div
            style={{
              padding: '24px 16px',
              borderRadius: '16px',
              background: 'var(--color-slate-50)',
              border: '1px dashed var(--color-slate-300)',
              textAlign: 'center',
            }}
          >
            <Clock size={24} style={{ color: 'var(--color-slate-400)', margin: '0 auto 8px' }} />
            <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-600)', margin: 0, fontWeight: 500 }}>
              No available consultation slots on this date.
            </p>
            {/* Quick jump to next available */}
            {displayDays.find((d) => d.hasSlots && d.dateKey !== selectedDate) && (
              <button
                type="button"
                onClick={() => {
                  const nextDay = displayDays.find((d) => d.hasSlots);
                  if (nextDay) setSelectedDate(nextDay.dateKey);
                }}
                style={{
                  marginTop: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-brand-600)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Jump to next available date →
              </button>
            )}
          </div>
        ) : (
          <div>
            {morningSlots.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--color-slate-400)',
                    marginBottom: '6px',
                  }}
                >
                  Morning
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {morningSlots.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        style={{
                          padding: '9px 4px',
                          borderRadius: '10px',
                          border: isSelected
                            ? '2px solid var(--color-brand-600)'
                            : '1px solid var(--color-slate-200)',
                          background: isSelected ? 'var(--color-brand-600)' : '#ffffff',
                          color: isSelected ? '#ffffff' : 'var(--color-slate-800)',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Clock size={13} style={{ opacity: isSelected ? 1 : 0.6 }} />
                        <span>{formatSlotTime(slot.startTime)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {afternoonSlots.length > 0 && (
              <div>
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: 'var(--color-slate-400)',
                    marginBottom: '6px',
                  }}
                >
                  Afternoon & Evening
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  {afternoonSlots.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        style={{
                          padding: '9px 4px',
                          borderRadius: '10px',
                          border: isSelected
                            ? '2px solid var(--color-brand-600)'
                            : '1px solid var(--color-slate-200)',
                          background: isSelected ? 'var(--color-brand-600)' : '#ffffff',
                          color: isSelected ? '#ffffff' : 'var(--color-slate-800)',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Clock size={13} style={{ opacity: isSelected ? 1 : 0.6 }} />
                        <span>{formatSlotTime(slot.startTime)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* PA-402: Slot Selection Interaction State & Summary Preview */}
      {selectedSlot ? (
        <div
          style={{
            background: 'var(--color-slate-50)',
            borderRadius: '16px',
            border: '1px solid var(--color-slate-200)',
            padding: '16px',
            marginBottom: '18px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '10px',
            }}
          >
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: 'var(--color-brand-700)',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <CheckCircle2 size={14} style={{ color: 'var(--color-brand-600)' }} />
              Selected Appointment
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 600,
              }}
            >
              30 Min Consult
            </span>
          </div>

          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--color-slate-900)',
              marginBottom: '4px',
            }}
          >
            {formatSelectedDateHeading(selectedDate)} at {formatSlotTime(selectedSlot.startTime)}
          </div>
          <div style={{ fontSize: '0.775rem', color: 'var(--color-slate-500)' }}>
            With {doctorName} • Virtual High-Definition Video Room
          </div>
        </div>
      ) : null}

      {/* CTA Button */}
      <Link
        href={
          selectedSlot
            ? `/bookings/checkout?doctor=${doctor.id}&slot=${selectedSlot.id}`
            : `/doctors/${doctor.slug || doctor.id}`
        }
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
          padding: '14px',
          borderRadius: '14px',
          background: selectedSlot
            ? 'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-700) 100%)'
            : 'var(--color-slate-300)',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: '0.95rem',
          textDecoration: 'none',
          boxShadow: selectedSlot ? '0 4px 14px rgba(13, 148, 136, 0.35)' : 'none',
          cursor: selectedSlot ? 'pointer' : 'not-allowed',
          pointerEvents: selectedSlot ? 'auto' : 'none',
          transition: 'all 0.2s ease',
        }}
      >
        <span>Proceed to Booking</span>
        <ArrowRight size={18} />
      </Link>

      {/* Trust & Guarantee Badges */}
      <div
        style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid var(--color-slate-100)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.775rem', color: 'var(--color-slate-600)' }}>
          <ShieldCheck size={16} style={{ color: '#10b981', flexShrink: 0 }} />
          <span>HPCSA-Verified Practitioner • Protection & POPIA Compliant</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.775rem', color: 'var(--color-slate-600)' }}>
          <Video size={16} style={{ color: 'var(--color-brand-600)', flexShrink: 0 }} />
          <span>Instant video link sent via SMS & Email immediately on booking</span>
        </div>
      </div>
    </div>
  );
}
