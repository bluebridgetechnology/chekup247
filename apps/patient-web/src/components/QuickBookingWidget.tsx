'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { SolarIcon } from './SolarIcon';
import { useAuth } from '../context/AuthContext';
import { formatClockTime, formatZoneAbbr, getViewerTimeZone, localDateKey } from '../lib/time';
import { OPEN_QUICK_BOOK_EVENT, QUICK_BOOK_PARAM } from '../lib/quickBook';

interface LiveSlot {
  id: string;
  startTime: string; // UTC ISO
  endTime: string; // UTC ISO
  durationMinutes?: number;
  isLocked?: boolean;
}

interface QuickDoctor {
  id: string;
  slug?: string;
  name: string;
  specialty: string;
  rate: number;
  rating: number;
  reviewsCount?: number;
  duration?: number;
  offersVideo?: boolean;
  offersAudio?: boolean;
  image: string;
}

/** Default MVP test doctor (doctor@chekup247.com); the widget is pinned to this slug. */
const MVP_DOCTOR_SLUG = 'dr-thabo-molefe';

const FALLBACK_DOCTOR: QuickDoctor = {
  id: 'doc-1',
  name: 'Dr. Thabo Molefe',
  specialty: 'General Practitioner',
  rate: 450,
  rating: 4.95,
  reviewsCount: 38,
  duration: 30,
  offersVideo: true,
  offersAudio: true,
  image: '/images/doctor_thabo.jpg',
};

const COMMON_REASONS = [
  'Flu, Cold or Cough',
  'Prescription Refill',
  'Skin Rash / Acne',
  'General Wellness Checkup',
  'Stomach / Digestion Issue',
  'Medical Sick Note',
];

type Step = 'consult' | 'slot' | 'details' | 'review';
type ConsultType = 'video' | 'audio';

const STEPS: { id: Step; label: string }[] = [
  { id: 'consult', label: 'Consultation' },
  { id: 'slot', label: 'Choose a time' },
  { id: 'details', label: 'Your details' },
  { id: 'review', label: 'Review & pay' },
];

const DAY_PARTS = [
  { id: 'morning', label: 'Morning', icon: 'sunrise-linear', test: (h: number) => h < 12 },
  { id: 'afternoon', label: 'Afternoon', icon: 'sun-2-linear', test: (h: number) => h >= 12 && h < 17 },
  { id: 'evening', label: 'Evening', icon: 'moon-stars-linear', test: (h: number) => h >= 17 },
] as const;

const MAX_DAYS = 7;

interface QuickBookingWidgetProps {
  /** Show the floating button. Signed-in users get a header button instead, so they use `false`. */
  showTrigger?: boolean;
}

export function QuickBookingWidget({ showTrigger = true }: QuickBookingWidgetProps = {}) {
  const router = useRouter();
  const { user, isAuthenticated, expressPatient } = useAuth();
  const rawApiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const API_BASE = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase.replace(/\/+$/, '')}/api/v1`;

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>('consult');

  const [doctors, setDoctors] = useState<QuickDoctor[]>([FALLBACK_DOCTOR]);
  const doctor = doctors[0] ?? FALLBACK_DOCTOR;
  const [consultationType, setConsultationType] = useState<ConsultType>('video');

  const [slots, setSlots] = useState<LiveSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<LiveSlot | null>(null);
  const [viewerTz, setViewerTz] = useState<string>('Africa/Johannesburg');

  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [reason, setReason] = useState(COMMON_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  // ---------------------------------------------------------------- data
  useEffect(() => {
    setViewerTz(getViewerTimeZone());
  }, []);

  // MVP: Quick Book is pinned to one doctor (by slug, since several "Molefe" profiles exist)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/doctors`);
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.doctors || [];
        const mapped: QuickDoctor[] = list.map((d: any) => ({
          id: d.id,
          slug: d.slug,
          name: d.user?.full_name || d.name || FALLBACK_DOCTOR.name,
          specialty: d.specialty || 'General Practitioner',
          rate: Number(d.rate_per_hour || d.ratePerHour) || FALLBACK_DOCTOR.rate,
          rating: Number(d.rating_avg || d.rating) || FALLBACK_DOCTOR.rating,
          reviewsCount: Number(d.reviews_count || d.reviewsCount) || undefined,
          duration: Number(d.consultation_duration || d.duration) || FALLBACK_DOCTOR.duration,
          offersVideo: d.offers_video !== false,
          offersAudio: d.offers_audio !== false,
          image: d.user?.avatar_url || d.photo_url || FALLBACK_DOCTOR.image,
        }));
        const pick =
          mapped.find((d) => d.slug === MVP_DOCTOR_SLUG) ||
          mapped.find((d) => d.name.toLowerCase().includes('molefe') || d.id === 'doc-1' || d.specialty === 'General Practitioner');
        if (alive && pick) setDoctors([pick]);
      } catch {
        // keep the fallback doctor
      }
    })();
    return () => {
      alive = false;
    };
  }, [API_BASE]);

  // Prefill from the signed-in profile
  useEffect(() => {
    if (!user) return;
    if (user.fullName) setPatientName(user.fullName);
    if (user.email) setPatientEmail(user.email);
    if (user.phone) setPatientPhone(user.phone);
  }, [user]);

  // Live availability (UTC slots). Fetched when the widget opens so the time step is instant.
  useEffect(() => {
    if (!isOpen) return;
    let alive = true;
    setSlotsLoading(true);
    fetch(`${API_BASE}/doctors/${encodeURIComponent(doctor.id)}/availability`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data && Array.isArray(data.slots)) setSlots(data.slots);
      })
      .catch(() => {})
      .finally(() => alive && setSlotsLoading(false));
    return () => {
      alive = false;
    };
  }, [isOpen, doctor.id, API_BASE]);

  // Bookable slots only (same 15-minute rule as the API), grouped by the viewer's local date
  const slotsByDay = useMemo(() => {
    const MIN_REMAINING_MS = 15 * 60 * 1000;
    const now = Date.now();
    const map = new Map<string, LiveSlot[]>();
    for (const sl of slots) {
      if (sl.isLocked || new Date(sl.endTime).getTime() - now < MIN_REMAINING_MS) continue;
      const key = localDateKey(new Date(sl.startTime));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(sl);
    }
    map.forEach((list) => list.sort((x, y) => +new Date(x.startTime) - +new Date(y.startTime)));
    return map;
  }, [slots]);

  const days = useMemo(() => {
    const todayKey = localDateKey(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = localDateKey(tomorrow);
    return Array.from(slotsByDay.keys())
      .sort()
      .slice(0, MAX_DAYS)
      .map((key) => {
        const [y, m, d] = key.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return {
          key,
          label: key === todayKey ? 'Today' : key === tomorrowKey ? 'Tomorrow' : date.toLocaleDateString('en-ZA', { weekday: 'short' }),
          date: date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }),
          long: date.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' }),
          count: slotsByDay.get(key)!.length,
        };
      });
  }, [slotsByDay]);

  // Keep a valid day / slot selected as availability loads or changes
  useEffect(() => {
    if (days.length === 0) {
      setSelectedDayKey('');
      setSelectedSlot(null);
      return;
    }
    if (!days.some((d) => d.key === selectedDayKey)) setSelectedDayKey(days[0].key);
  }, [days, selectedDayKey]);

  useEffect(() => {
    if (selectedSlot && !slots.some((s) => s.id === selectedSlot.id)) setSelectedSlot(null);
  }, [slots, selectedSlot]);

  const daySlots = slotsByDay.get(selectedDayKey) || [];
  const groups = DAY_PARTS.map((part) => ({
    ...part,
    slots: daySlots.filter((s) => part.test(new Date(s.startTime).getHours())),
  })).filter((g) => g.slots.length > 0);

  const nextAvailable = days.length > 0 ? slotsByDay.get(days[0].key)![0] : null;
  const selectedDay = days.find((d) => d.key === localDateKey(new Date(selectedSlot?.startTime || ''))) || null;

  // ---------------------------------------------------------------- open / close
  useEffect(() => {
    const open = () => {
      setIsOpen(true);
      setFormError(null);
    };
    window.addEventListener(OPEN_QUICK_BOOK_EVENT, open);
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get(QUICK_BOOK_PARAM)) {
        open();
        url.searchParams.delete(QUICK_BOOK_PARAM);
        window.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
      }
    } catch {
      // ignore
    }
    return () => window.removeEventListener(OPEN_QUICK_BOOK_EVENT, open);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function onDown(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        const trigger = document.getElementById('quick-booking-trigger');
        if (trigger && trigger.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen]);

  // New step: scroll to top and move focus into the step for keyboard / screen-reader users
  useEffect(() => {
    if (!isOpen) return;
    bodyRef.current?.scrollTo({ top: 0 });
    bodyRef.current?.focus({ preventScroll: true });
  }, [step, isOpen]);

  // ---------------------------------------------------------------- navigation
  const goTo = (next: Step) => {
    setFormError(null);
    setStep(next);
  };

  const goBack = () => {
    if (stepIndex > 0) goTo(STEPS[stepIndex - 1].id);
  };

  const handleRestart = () => {
    setSelectedSlot(null);
    setConsultationType('video');
    goTo('consult');
  };

  const handleDetailsContinue = () => {
    setFormError(null);
    const name = patientName.trim();
    const email = patientEmail.trim();
    const phoneDigits = patientPhone.replace(/\D/g, '');
    if (!name) return setFormError('Please enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setFormError('Please enter a valid email address.');
    if (phoneDigits.length < 7) return setFormError('Please enter a mobile number we can SMS the video link to.');
    goTo('review');
  };

  const handlePay = async () => {
    if (!selectedSlot) {
      setFormError('Please choose an available time first.');
      return goTo('slot');
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const name = patientName.trim();
      const email = patientEmail.trim();
      const phone = patientPhone.trim();
      const notes = customReason.trim() || reason;

      // Silent express account for guests
      if (!isAuthenticated) {
        try {
          await expressPatient({ full_name: name, email, phone });
        } catch (err: any) {
          console.warn('Express auto-provisioning note:', err);
        }
      }

      const slotId = selectedSlot.id;
      const startObj = new Date(selectedSlot.startTime);
      const endObj = new Date(selectedSlot.endTime);
      const durationMins = selectedSlot.durationMinutes || doctor.duration || 30;
      const dateStr = localDateKey(startObj);

      try {
        sessionStorage.setItem(
          'chekup_checkout_draft',
          JSON.stringify({
            doctorId: doctor.id,
            slotId,
            date: dateStr,
            type: consultationType,
            duration: durationMins,
            notes,
            patientName: name,
            patientEmail: email,
            patientPhone: phone,
            savedAt: Date.now(),
          }),
        );
      } catch {
        // ignore
      }

      setIsOpen(false);
      router.push(
        `/bookings/checkout?doctorId=${encodeURIComponent(doctor.id)}&slotId=${encodeURIComponent(slotId)}&date=${encodeURIComponent(
          dateStr,
        )}&start=${encodeURIComponent(startObj.toISOString())}&end=${encodeURIComponent(endObj.toISOString())}&type=${encodeURIComponent(
          consultationType,
        )}&duration=${encodeURIComponent(durationMins)}`,
      );
    } catch (err: any) {
      setFormError(err.message || 'Could not proceed to payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------- derived labels
  const zoneAbbr = formatZoneAbbr(selectedSlot?.startTime || nextAvailable?.startTime);
  const zoneLabel = `${viewerTz.split('/').pop()?.replace(/_/g, ' ')}${zoneAbbr ? `, ${zoneAbbr}` : ''}`;
  const durationMins = selectedSlot?.durationMinutes || doctor.duration || 30;
  const canVideo = doctor.offersVideo !== false;
  const canAudio = doctor.offersAudio !== false;
  const selectedSlotLabel = selectedSlot
    ? `${new Date(selectedSlot.startTime).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })} · ${formatClockTime(
        selectedSlot.startTime,
      )}`
    : '';
  const reasonShown = customReason.trim() || reason;

  const primary = (() => {
    switch (step) {
      case 'consult':
        return { label: 'Choose a time', onClick: () => goTo('slot'), disabled: false };
      case 'slot':
        return { label: 'Continue', onClick: () => goTo('details'), disabled: !selectedSlot };
      case 'details':
        return { label: 'Review booking', onClick: handleDetailsContinue, disabled: false };
      default:
        return { label: isSubmitting ? 'Opening secure payment…' : `Pay R${doctor.rate} securely`, onClick: handlePay, disabled: isSubmitting };
    }
  })();

  return (
    <>
      {showTrigger && (
        <button
          id="quick-booking-trigger"
          onClick={() => {
            setIsOpen((prev) => !prev);
            setFormError(null);
          }}
          aria-label={isOpen ? 'Close Quick Booking' : 'Open Quick Booking'}
          aria-expanded={isOpen}
          className="quick-booking-trigger-btn qb-trigger"
        >
          {isOpen ? (
            <>
              <SolarIcon name="close-circle-bold" size={20} color="var(--color-chocolate-base, #2A170F)" />
              <span className="qb-trigger-close">Close</span>
            </>
          ) : (
            <>
              <span className="qb-trigger-icon" aria-hidden="true">
                <SolarIcon name="bolt-circle-bold" size={20} color="#2A170F" />
              </span>
              <span className="qb-trigger-text">
                <span className="qb-trigger-title">
                  Quick Book <span className="qb-trigger-badge">Instant</span>
                </span>
                <span className="qb-trigger-sub">No sign-up required</span>
              </span>
            </>
          )}
        </button>
      )}

      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-labelledby="qb-title"
          className="quick-booking-popover qb"
          data-qb-step={step}
        >
          {/* Header */}
          <div className="qb-header">
            {stepIndex > 0 ? (
              <button type="button" className="qb-icon-btn" onClick={goBack} aria-label="Back">
                <SolarIcon name="alt-arrow-left-linear" size={18} />
              </button>
            ) : (
              <span className="qb-brand" aria-hidden="true">
                <SolarIcon name="bolt-circle-bold" size={20} color="#2A170F" />
              </span>
            )}
            <div className="qb-titles">
              <div id="qb-title" className="qb-title">
                Book a consultation
              </div>
              <div className="qb-sub">
                Step {stepIndex + 1} of {STEPS.length} · {STEPS[stepIndex].label}
              </div>
            </div>
            {stepIndex > 0 && (
              <button type="button" className="qb-link-btn" onClick={handleRestart}>
                Restart
              </button>
            )}
            <button type="button" className="qb-icon-btn" onClick={() => setIsOpen(false)} aria-label="Close">
              <SolarIcon name="close-circle-linear" size={18} />
            </button>
          </div>

          {/* Progress */}
          <div className="qb-progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={stepIndex + 1}>
            {STEPS.map((s, i) => (
              <span key={s.id} className={`qb-progress-seg${i <= stepIndex ? ' is-done' : ''}`} />
            ))}
          </div>

          {/* Body */}
          <div className="qb-body quick-booking-body" ref={bodyRef} tabIndex={-1}>
            {formError && (
              <div className="qb-error" role="alert">
                <SolarIcon name="danger-circle-bold" size={16} color="#DC2626" />
                <span>{formError}</span>
              </div>
            )}

            {/* ---------------- Step 1: consultation ---------------- */}
            {step === 'consult' && (
              <div className="qb-stack">
                <div className="qb-doctor">
                  <div className="qb-avatar">
                    <Image src={doctor.image} alt={doctor.name} fill style={{ objectFit: 'cover' }} sizes="56px" />
                  </div>
                  <div className="qb-doctor-info">
                    <div className="qb-doctor-name">{doctor.name}</div>
                    <div className="qb-muted">{doctor.specialty}</div>
                    <div className="qb-doctor-meta">
                      <span className="qb-rating">
                        <SolarIcon name="star-bold" size={13} color="#DFAB62" /> {doctor.rating.toFixed(1)}
                        {doctor.reviewsCount ? <span className="qb-muted"> ({doctor.reviewsCount})</span> : null}
                      </span>
                      <span className="qb-verified">
                        <SolarIcon name="verified-check-bold" size={13} color="#15803D" /> HPCSA verified
                      </span>
                    </div>
                  </div>
                  <div className="qb-fee">
                    <strong>R{doctor.rate}</strong>
                    <span className="qb-muted">/ session</span>
                  </div>
                </div>

                <div className="qb-section-title">How would you like to consult?</div>
                <div className="qb-options" role="radiogroup" aria-label="Consultation type">
                  {canVideo && (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={consultationType === 'video'}
                      className={`qb-option${consultationType === 'video' ? ' is-selected' : ''}`}
                      onClick={() => setConsultationType('video')}
                    >
                      <SolarIcon name="videocamera-record-bold" size={22} />
                      <span className="qb-option-title">Video call</span>
                      <span className="qb-muted">Face to face, from any device</span>
                    </button>
                  )}
                  {canAudio && (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={consultationType === 'audio'}
                      className={`qb-option${consultationType === 'audio' ? ' is-selected' : ''}`}
                      onClick={() => setConsultationType('audio')}
                    >
                      <SolarIcon name="phone-calling-bold" size={22} />
                      <span className="qb-option-title">Audio call</span>
                      <span className="qb-muted">Voice only, low data</span>
                    </button>
                  )}
                </div>

                <ul className="qb-assure">
                  <li>
                    <SolarIcon name="check-circle-bold" size={15} color="#15803D" /> {doctor.duration || 30}-minute private consultation
                  </li>
                  <li>
                    <SolarIcon name="check-circle-bold" size={15} color="#15803D" /> No account needed. Your link arrives by email and SMS
                  </li>
                </ul>
              </div>
            )}

            {/* ---------------- Step 2: time ---------------- */}
            {step === 'slot' && (
              <div className="qb-stack">
                {slotsLoading && slots.length === 0 ? (
                  <div className="qb-empty">Checking {doctor.name}&apos;s availability…</div>
                ) : days.length === 0 ? (
                  <div className="qb-empty">
                    <SolarIcon name="calendar-linear" size={26} color="#B88647" />
                    <strong>No open times right now</strong>
                    <span className="qb-muted">New times are added regularly. Please check back soon.</span>
                  </div>
                ) : (
                  <>
                    {nextAvailable && (
                      <button
                        type="button"
                        className={`qb-next${selectedSlot?.id === nextAvailable.id ? ' is-selected' : ''}`}
                        onClick={() => {
                          setSelectedDayKey(localDateKey(new Date(nextAvailable.startTime)));
                          setSelectedSlot(nextAvailable);
                        }}
                      >
                        <SolarIcon name="bolt-circle-bold" size={20} color="#8C601E" />
                        <span>
                          <span className="qb-next-label">Next available</span>
                          <strong>
                            {days[0].label}, {formatClockTime(nextAvailable.startTime)}
                          </strong>
                        </span>
                        <span className="qb-next-cta">{selectedSlot?.id === nextAvailable.id ? 'Selected' : 'Select'}</span>
                      </button>
                    )}

                    <div className="qb-days" role="tablist" aria-label="Choose a day">
                      {days.map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          role="tab"
                          aria-selected={selectedDayKey === d.key}
                          className={`qb-day${selectedDayKey === d.key ? ' is-selected' : ''}`}
                          onClick={() => setSelectedDayKey(d.key)}
                        >
                          <span className="qb-day-label">{d.label}</span>
                          <span className="qb-day-date">{d.date}</span>
                          <span className="qb-day-count">{d.count} open</span>
                        </button>
                      ))}
                    </div>

                    {groups.map((g) => (
                      <section key={g.id} className="qb-group" aria-label={`${g.label} times`}>
                        <div className="qb-group-title">
                          <SolarIcon name={g.icon} size={16} color="#8C601E" />
                          <span>{g.label}</span>
                          <span className="qb-muted">{g.slots.length} open</span>
                        </div>
                        <div className="qb-times">
                          {g.slots.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              aria-pressed={selectedSlot?.id === s.id}
                              className={`qb-time${selectedSlot?.id === s.id ? ' is-selected' : ''}`}
                              onClick={() => setSelectedSlot(s)}
                            >
                              {formatClockTime(s.startTime)}
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}

                    <div className="qb-tz">
                      <SolarIcon name="globe-linear" size={14} color="currentColor" /> Times shown in your local time ({zoneLabel})
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ---------------- Step 3: details ---------------- */}
            {step === 'details' && (
              <form
                className="qb-stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleDetailsContinue();
                }}
                noValidate
              >
                <div className="qb-field">
                  <label htmlFor="qb-name">Full name</label>
                  <input
                    id="qb-name"
                    autoComplete="name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                  />
                </div>
                <div className="qb-field">
                  <label htmlFor="qb-email">Email</label>
                  <input
                    id="qb-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    placeholder="jane@example.com"
                  />
                  <span className="qb-hint">Your video link and receipt are sent here.</span>
                </div>
                <div className="qb-field">
                  <label htmlFor="qb-phone">Mobile number</label>
                  <input
                    id="qb-phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="e.g. +234 801 234 5678"
                  />
                  <span className="qb-hint">We SMS a reminder and your link.</span>
                </div>

                <div className="qb-field">
                  <span className="qb-label">What is the visit about?</span>
                  <div className="qb-chips">
                    {COMMON_REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        aria-pressed={!customReason.trim() && reason === r}
                        className={`qb-chip${!customReason.trim() && reason === r ? ' is-selected' : ''}`}
                        onClick={() => {
                          setReason(r);
                          setCustomReason('');
                        }}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <input
                    aria-label="Other concern"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Or describe it in a few words"
                  />
                </div>
                <button type="submit" className="qb-hidden-submit" tabIndex={-1} aria-hidden="true" />
              </form>
            )}

            {/* ---------------- Step 4: review ---------------- */}
            {step === 'review' && (
              <div className="qb-stack">
                <div className="qb-summary">
                  <SummaryRow label="Doctor" value={`${doctor.name} · ${doctor.specialty}`} onEdit={() => goTo('consult')} />
                  <SummaryRow label="Type" value={consultationType === 'audio' ? 'Audio call' : 'Video call'} onEdit={() => goTo('consult')} />
                  <SummaryRow
                    label="When"
                    value={`${selectedDay?.long || ''} · ${selectedSlot ? formatClockTime(selectedSlot.startTime) : ''} (${zoneLabel})`}
                    onEdit={() => goTo('slot')}
                  />
                  <SummaryRow label="Length" value={`${durationMins} minutes`} />
                  <SummaryRow label="Visit about" value={reasonShown} onEdit={() => goTo('details')} />
                  <SummaryRow label="Patient" value={`${patientName.trim()} · ${patientEmail.trim()}`} onEdit={() => goTo('details')} />
                </div>
                <div className="qb-total">
                  <span>Total</span>
                  <strong>R{doctor.rate}</strong>
                </div>
                <div className="qb-secure">
                  <SolarIcon name="lock-keyhole-linear" size={15} color="currentColor" /> Secure payment with Paystack on the next screen. Nothing is charged until you confirm there.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="qb-footer">
            {step === 'slot' && selectedSlot && (
              <div className="qb-footer-note">
                <SolarIcon name="calendar-linear" size={15} color="#8C601E" />
                <span>{selectedSlotLabel}</span>
              </div>
            )}
            <button type="button" className="qb-primary" onClick={primary.onClick} disabled={primary.disabled}>
              {step === 'review' && <SolarIcon name="lock-keyhole-linear" size={16} color="currentColor" />}
              <span>{primary.label}</span>
              {step !== 'review' && <SolarIcon name="arrow-right-linear" size={16} color="currentColor" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryRow({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="qb-summary-row">
      <span className="qb-summary-label">{label}</span>
      <span className="qb-summary-value">{value}</span>
      {onEdit && (
        <button type="button" className="qb-link-btn" onClick={onEdit} aria-label={`Edit ${label}`}>
          Edit
        </button>
      )}
    </div>
  );
}
