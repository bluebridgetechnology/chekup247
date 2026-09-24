'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { SolarIcon } from './SolarIcon';

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
    consultation_duration_minutes?: number;
    offers_video?: boolean;
    offers_audio?: boolean;
    offers_in_clinic?: boolean;
    facility_name?: string;
    facility_address?: string;
    user?: {
      full_name: string;
    };
  };
  initialSlots?: AvailabilitySlotDto[];
}

/**
 * Helper to format duration for badges and pricing subtext
 * Supports 30 min, 45 min, 1 hr, etc., dynamically based on doctor settings
 */
function formatDurationBadge(durationMinutes?: number): string {
  const mins = durationMinutes || 30;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs}h ${rem}m Consult` : `${hrs} Hr Consult`;
  }
  return `${mins} Min Consult`;
}

function formatDurationSubtext(durationMinutes?: number): string {
  const mins = durationMinutes || 30;
  if (mins >= 60) {
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return rem > 0 ? `${hrs} hr ${rem} mins` : `${hrs} hr`;
  }
  return `${mins} mins`;
}

export function DoctorBookingCalendar({ doctor, initialSlots = [] }: DoctorBookingCalendarProps) {
  const [slots, setSlots] = useState<AvailabilitySlotDto[]>(initialSlots);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlotDto | null>(null);
  const [userTimeZone, setUserTimeZone] = useState<string>('Africa/Johannesburg');

  // Consultation modes (Video, In-Clinic, Audio)
  const availableModes = useMemo(() => {
    const modes: { id: 'video' | 'in_clinic' | 'audio'; label: string; icon: string }[] = [];
    if (doctor.offers_video !== false) {
      modes.push({ id: 'video', label: 'Video Call', icon: 'videocamera-record-bold' });
    }
    if (doctor.offers_in_clinic) {
      modes.push({ id: 'in_clinic', label: 'In-Clinic Visit', icon: 'hospital-bold' });
    }
    if (doctor.offers_audio) {
      modes.push({ id: 'audio', label: 'Audio Call', icon: 'phone-calling-bold' });
    }
    return modes;
  }, [doctor.offers_video, doctor.offers_in_clinic, doctor.offers_audio]);

  const [consultationMode, setConsultationMode] = useState<'video' | 'in_clinic' | 'audio'>('video');

  useEffect(() => {
    if (availableModes.length > 0 && !availableModes.some((m) => m.id === consultationMode)) {
      setConsultationMode(availableModes[0].id);
    }
  }, [availableModes, consultationMode]);

  // Detect local timezone
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setUserTimeZone(tz);
    } catch {
      // Default to SAST
    }
  }, []);

  // Fetch live availability slots from API if available
  useEffect(() => {
    let isMounted = true;
    async function loadSlots() {
      try {
        const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const apiBase = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api/v1`;
        const res = await fetch(`${apiBase}/doctors/${doctor.slug || doctor.id}/availability`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.slots && Array.isArray(data.slots)) {
            setSlots(data.slots);
          }
        }
      } catch {
        // Fallback slots used gracefully
      }
    }

    loadSlots();
    return () => {
      isMounted = false;
    };
  }, [doctor.slug, doctor.id]);

  // Doctor configured consultation duration (30 min, 60 min, etc.)
  const defaultDuration = doctor.consultation_duration_minutes || 30;

  // Generate effective slots (live or dynamic deterministic fallback)
  const effectiveSlots = useMemo(() => {
    // Keep slots with at least the minimum bookable time remaining.
    // Must match backend SLOT_BOOKING_MIN_REMAINING_MINUTES (booking.constants.ts):
    // a started slot (e.g. 18:00-18:30 at 18:01) is still bookable.
    const MIN_REMAINING_MS = 15 * 60 * 1000;
    if (slots) {
      const nowMs = Date.now();
      return slots.filter((s) => new Date(s.endTime).getTime() - nowMs >= MIN_REMAINING_MS);
    }

    return [];
  }, [slots]);

  // Map slots by date string YYYY-MM-DD
  const daysWithSlots = useMemo(() => {
    const map = new Map<string, AvailabilitySlotDto[]>();
    for (const slot of effectiveSlots) {
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

  // Week offset pagination
  const [weekOffset, setWeekOffset] = useState(0);

  const displayDays = useMemo(() => {
    const dates = [];
    const base = new Date();
    base.setDate(base.getDate() + weekOffset * 7);

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
      });
    }
    return dates;
  }, [weekOffset, daysWithSlots]);

  // Set default selected date
  useEffect(() => {
    if (!selectedDate && displayDays.length > 0) {
      const firstWithSlots = displayDays.find((d) => d.hasSlots);
      if (firstWithSlots) {
        setSelectedDate(firstWithSlots.dateKey);
      } else {
        setSelectedDate(displayDays[0].dateKey);
      }
    }
  }, [displayDays, selectedDate]);

  // Slots for selected day
  const slotsForSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    return daysWithSlots.get(selectedDate) || [];
  }, [selectedDate, daysWithSlots]);

  // Automatically select first slot of day
  useEffect(() => {
    if (slotsForSelectedDay.length > 0) {
      setSelectedSlot(slotsForSelectedDay[0]);
    } else {
      setSelectedSlot(null);
    }
  }, [selectedDate, slotsForSelectedDay]);

  const formatSlotTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '08:30';
    }
  };

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

  const morningSlots = slotsForSelectedDay.filter((s) => {
    const d = new Date(s.startTime);
    return d.getHours() < 12;
  });

  const afternoonSlots = slotsForSelectedDay.filter((s) => {
    const d = new Date(s.startTime);
    return d.getHours() >= 12 && d.getHours() < 17;
  });

  const eveningSlots = slotsForSelectedDay.filter((s) => {
    const d = new Date(s.startTime);
    return d.getHours() >= 17;
  });

  const fee = Number(doctor.rate_per_hour || 850).toFixed(2);
  const doctorName = doctor.user?.full_name || 'Dr. Thabo Molefe';
  const activeDuration = selectedSlot?.durationMinutes || defaultDuration;

  return (
    <div className="doctor-booking-card">
      {/* Header with Pricing and Availability */}
      <div className="doctor-booking-header">
        <div>
          <div className="doctor-booking-instant-badge">
            <span className="doctor-available-dot" />
            <span>INSTANT BOOKING</span>
          </div>
          <h3 className="doctor-booking-service-title">
            {consultationMode === 'in_clinic'
              ? 'In-Clinic Consultation'
              : consultationMode === 'audio'
                ? 'Audio Consultation'
                : 'Video Consultation'}
          </h3>
        </div>
        <div>
          <div className="doctor-booking-price">R{fee}</div>
          <span className="doctor-booking-price-sub">
            incl. VAT / {formatDurationSubtext(activeDuration)}
          </span>
        </div>
      </div>

      {/* Consultation Mode Segmented Tabs (Video / In-Clinic / Audio) */}
      {availableModes.length === 0 && (
        <div className="doctor-booking-mode-context">
          <div className="doctor-booking-mode-context-info">
            <div className="doctor-booking-mode-context-title">Consultation options not published</div>
            <div className="doctor-booking-mode-context-desc">
              This doctor has not published a video, audio, or in-clinic consultation option yet.
            </div>
          </div>
        </div>
      )}
      {availableModes.length > 0 && (
        <div className="doctor-booking-tab-bar-container">
          <div
            className="doctor-booking-tab-bar"
            role="tablist"
            aria-label="Consultation mode"
            style={{
              gridTemplateColumns: `repeat(${availableModes.length}, 1fr)`,
            }}
          >
            {availableModes.map((mode) => {
              const isSelected = consultationMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setConsultationMode(mode.id)}
                  className={`doctor-booking-tab ${isSelected ? 'active' : ''}`}
                >
                  <SolarIcon
                    name={mode.icon}
                    size={14}
                    color={isSelected ? 'var(--color-chocolate-base)' : 'currentColor'}
                  />
                  <span>{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Mode Context Banner */}
          {consultationMode === 'in_clinic' ? (
            <div className="doctor-booking-mode-context">
              <div className="doctor-booking-mode-context-icon">
                <SolarIcon name="hospital-bold" size={15} color="var(--color-chocolate-base)" />
              </div>
              <div className="doctor-booking-mode-context-info">
                <div className="doctor-booking-mode-context-title">
                  In-Clinic Consultation
                </div>
                {(doctor.facility_name || doctor.facility_address) && (
                  <div className="doctor-booking-mode-context-desc">
                    {doctor.facility_name ? `${doctor.facility_name} — ` : ''}
                    {doctor.facility_address || doctor.facility_name}
                  </div>
                )}
              </div>
            </div>
          ) : consultationMode === 'video' ? (
            <div className="doctor-booking-mode-context">
              <div className="doctor-booking-mode-context-icon">
                <SolarIcon name="videocamera-record-bold" size={15} color="var(--color-chocolate-base)" />
              </div>
              <div className="doctor-booking-mode-context-info">
                <div className="doctor-booking-mode-context-title">
                  Secure Video Consultation
                </div>
                <div className="doctor-booking-mode-context-desc">
                  Join via private browser room or mobile. No download needed.
                </div>
              </div>
            </div>
          ) : (
            <div className="doctor-booking-mode-context">
              <div className="doctor-booking-mode-context-icon">
                <SolarIcon name="phone-calling-bold" size={15} color="var(--color-chocolate-base)" />
              </div>
              <div className="doctor-booking-mode-context-info">
                <div className="doctor-booking-mode-context-title">
                  Direct Phone Call
                </div>
                <div className="doctor-booking-mode-context-desc">
                  Practitioner will call your phone at the scheduled time.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Date Carousel Section */}
      <div className="doctor-booking-date-section">
        <div className="doctor-booking-date-nav-row">
          <span className="doctor-booking-date-label">Select Date</span>
          <div className="doctor-booking-nav-controls">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
              disabled={weekOffset === 0}
              className="doctor-booking-nav-arrow"
              aria-label="Previous week"
            >
              <SolarIcon name="arrow-left-linear" size={14} color="currentColor" />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              className="doctor-booking-nav-arrow"
              aria-label="Next week"
            >
              <SolarIcon name="arrow-right-linear" size={14} color="currentColor" />
            </button>
          </div>
        </div>

        {/* 7 Days Row */}
        <div className="doctor-booking-days-grid">
          {displayDays.map((day) => {
            const isSelected = selectedDate === day.dateKey;
            return (
              <button
                key={day.dateKey}
                type="button"
                onClick={() => setSelectedDate(day.dateKey)}
                className={`doctor-booking-day-btn ${isSelected ? 'active' : ''}`}
              >
                <span className="doctor-booking-day-name">{day.dayName}</span>
                <span className="doctor-booking-day-num">{day.dayNumber}</span>
              </button>
            );
          })}
        </div>

        {/* Timezone and Selected Date Label */}
        <div className="doctor-booking-timezone-row">
          <span style={{ fontWeight: 600 }}>{formatSelectedDateHeading(selectedDate)}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <SolarIcon name="globe-linear" size={13} color="currentColor" />
            <span>{userTimeZone.replace('_', ' ')}</span>
          </span>
        </div>
      </div>

      {/* Consultation Time Slots */}
      <div style={{ marginBottom: '16px' }}>
        {slotsForSelectedDay.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <SolarIcon name="clock-circle-linear" size={24} color="var(--color-cream-text-secondary)" />
            <p className="doctor-service-status" style={{ marginTop: '8px' }}>
              No available slots on this date.
            </p>
          </div>
        ) : (
          <>
            {morningSlots.length > 0 && (
              <div className="doctor-booking-slots-group">
                <span className="doctor-booking-group-label">Morning</span>
                <div className="doctor-booking-slots-grid">
                  {morningSlots.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`doctor-booking-slot-btn ${isSelected ? 'active' : ''}`}
                      >
                        <SolarIcon
                          name={isSelected ? 'clock-circle-bold' : 'clock-circle-linear'}
                          size={13}
                          color="currentColor"
                        />
                        <span>{formatSlotTime(slot.startTime)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {afternoonSlots.length > 0 && (
              <div className="doctor-booking-slots-group">
                <span className="doctor-booking-group-label">Afternoon</span>
                <div className="doctor-booking-slots-grid">
                  {afternoonSlots.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`doctor-booking-slot-btn ${isSelected ? 'active' : ''}`}
                      >
                        <SolarIcon
                          name={isSelected ? 'clock-circle-bold' : 'clock-circle-linear'}
                          size={13}
                          color="currentColor"
                        />
                        <span>{formatSlotTime(slot.startTime)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {eveningSlots.length > 0 && (
              <div className="doctor-booking-slots-group">
                <span className="doctor-booking-group-label">Evening</span>
                <div className="doctor-booking-slots-grid">
                  {eveningSlots.map((slot) => {
                    const isSelected = selectedSlot?.id === slot.id;
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`doctor-booking-slot-btn ${isSelected ? 'active' : ''}`}
                      >
                        <SolarIcon
                          name={isSelected ? 'clock-circle-bold' : 'clock-circle-linear'}
                          size={13}
                          color="currentColor"
                        />
                        <span>{formatSlotTime(slot.startTime)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Selected Appointment Summary Card */}
      {selectedSlot && (
        <div className="doctor-booking-selected-card">
          <div className="doctor-booking-selected-top">
            <span className="doctor-booking-selected-badge">
              <SolarIcon name="check-circle-bold" size={14} color="var(--color-gold-base)" />
              <span>SELECTED APPOINTMENT</span>
            </span>
            <span className="doctor-booking-duration-badge">
              {formatDurationBadge(activeDuration)}
            </span>
          </div>

          <div className="doctor-booking-selected-heading">
            {formatSelectedDateHeading(selectedDate)} at {formatSlotTime(selectedSlot.startTime)}
          </div>
          <div className="doctor-booking-selected-sub">
            {consultationMode === 'in_clinic' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '4px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: 'var(--color-gold-base)' }}>
                  <SolarIcon name="hospital-bold" size={14} color="currentColor" />
                  In-Clinic Consultation with {doctorName}
                </span>
                {(doctor.facility_address || doctor.facility_name) && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--color-cream-text-secondary)', fontSize: '0.82rem' }}>
                    <SolarIcon name="map-point-linear" size={14} color="currentColor" style={{ flexShrink: 0 }} />
                    <span>{doctor.facility_name ? `${doctor.facility_name} — ` : ''}{doctor.facility_address || doctor.facility_name}</span>
                  </span>
                )}
              </div>
            ) : consultationMode === 'audio' ? (
              `With ${doctorName} • Telehealth Voice Call`
            ) : (
              `With ${doctorName} • Virtual High-Definition Video Room`
            )}
          </div>
        </div>
      )}

      {/* Proceed to Booking CTA Button */}
      {availableModes.length > 0 && selectedSlot && new Date(selectedSlot.endTime).getTime() - Date.now() >= 15 * 60 * 1000 ? (
        <Link
          href={`/bookings/checkout?doctor=${encodeURIComponent(doctor.id)}&slot=${encodeURIComponent(selectedSlot.id)}&date=${encodeURIComponent(selectedDate)}&start=${encodeURIComponent(selectedSlot.startTime)}&end=${encodeURIComponent(selectedSlot.endTime)}&type=${encodeURIComponent(consultationMode)}`}
          className="doctor-booking-cta"
        >
          <span>Proceed to Booking ({formatSlotTime(selectedSlot.startTime)})</span>
          <SolarIcon name="arrow-right-linear" size={17} color="currentColor" />
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="doctor-booking-cta disabled"
          aria-disabled="true"
        >
          <span>
            {selectedSlot && new Date(selectedSlot.endTime).getTime() - Date.now() < 15 * 60 * 1000
              ? 'Selected Slot Has Too Little Time Remaining'
              : 'Select a Time Slot to Continue'}
          </span>
          <SolarIcon name="clock-circle-linear" size={16} color="currentColor" />
        </button>
      )}

      {/* Trust Statements */}
      <div className="doctor-booking-trust-list">
        <div className="doctor-booking-trust-item">
          <SolarIcon
            name="shield-check-linear"
            size={16}
            color="var(--color-gold-base)"
            style={{ flexShrink: 0, marginTop: '1px' }}
          />
          <span>HPCSA-Verified Practitioner • Protection & POPIA Compliant</span>
        </div>
        <div className="doctor-booking-trust-item">
          <SolarIcon
            name={consultationMode === 'in_clinic' ? 'map-point-linear' : 'videocamera-linear'}
            size={16}
            color="var(--color-gold-base)"
            style={{ flexShrink: 0, marginTop: '1px' }}
          />
          <span>
            {consultationMode === 'in_clinic'
              ? 'Practice location & appointment confirmation sent via SMS & Email'
              : 'Instant video link sent via SMS & Email immediately on booking'}
          </span>
        </div>
      </div>
    </div>
  );
}
