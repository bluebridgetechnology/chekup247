'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { SolarIcon } from './SolarIcon';
import { useAuth } from '../context/AuthContext';
import { formatClockTime, formatZoneAbbr, getViewerTimeZone, localDateKey } from '../lib/time';
import { OPEN_QUICK_BOOK_EVENT, QUICK_BOOK_PARAM, QUICK_BOOK_SLOT_VALUE } from '../lib/quickBook';
import { DEFAULT_BOOKING_LEAD_MINUTES, isSlotBookable } from '../lib/bookingWindow';
import { holdQuery, releaseHold, requestHold } from '../lib/slotHold';
import { PRICING_BLOCK_MINUTES, formatDuration, formatRand, priceForDuration } from '../lib/pricing';

interface LiveSlot {
  id: string;
  startTime: string; // UTC ISO
  endTime: string; // UTC ISO
  durationMinutes?: number;
  /** Total price for this slot (rate per 30 min x length), computed by the API. */
  price?: number;
  isLocked?: boolean;
}

interface QuickDoctor {
  id: string;
  slug?: string;
  name: string;
  specialty: string;
  /** Price per 30 minutes (null until known). Longer sessions cost in proportion. */
  rate: number | null;
  rating: number;
  reviewsCount?: number;
  duration?: number;
  offersVideo?: boolean;
  offersAudio?: boolean;
  image: string;
}

/** Default MVP doctor; the widget is pinned to this slug (the API derives it from DEFAULT_DOCTOR_NAME). */
const MVP_DOCTOR_SLUG = 'dr-solly-motuba';
/** While true, Quick Book offers only the MVP doctor. Set to false when more doctors/specialities open. */
const PIN_MVP_DOCTOR = true;

const FALLBACK_DOCTOR: QuickDoctor = {
  id: 'doc-1',
  name: 'Dr Solly Motuba',
  specialty: 'General Practitioner',
  rate: null,
  rating: 0,
  reviewsCount: 0,
  duration: 30,
  offersVideo: true,
  offersAudio: true,
  image: '/images/doctor_thabo.jpg',
};

interface SpecialtyOption {
  id: string;
  label: string;
  /** Matched against the doctor's specialty; 'All' means the earliest available GP. */
  specialty: string;
  hint: string;
  icon: string;
  /** MVP gating: only Earliest Available GP is open. Flip the others to true as specialities launch. */
  isMvpVisible: boolean;
}

const SPECIALTY_OPTIONS: SpecialtyOption[] = [
  { id: 'all', label: '⚡ Earliest Available GP (Fastest)', specialty: 'All', hint: 'Matched with the first free verified GP', icon: 'bolt-circle-bold', isMvpVisible: true },
  { id: 'gp', label: '🩺 General Practitioner', specialty: 'General Practitioner', hint: 'Choose your GP', icon: 'stethoscope-bold', isMvpVisible: false },
  { id: 'dentist', label: '🦷 Dentist', specialty: 'Dentist', hint: 'Dental advice and care', icon: 'smile-circle-bold', isMvpVisible: false },
  { id: 'psychologist', label: '🧠 Psychologist', specialty: 'Psychologist', hint: 'Talk therapy and support', icon: 'heart-pulse-bold', isMvpVisible: false },
  { id: 'podiatrist', label: '🦶 Podiatrist', specialty: 'Podiatrist', hint: 'Foot and ankle care', icon: 'shield-check-bold', isMvpVisible: false },
  { id: 'dermatologist', label: '🧴 Dermatologist', specialty: 'Dermatologist', hint: 'Skin, hair and nails', icon: 'waterdrops-bold', isMvpVisible: false },
  { id: 'pediatrician', label: '👶 Paediatrician', specialty: 'Paediatrician', hint: 'Care for children', icon: 'user-bold', isMvpVisible: false },
  { id: 'physician', label: '🩺 Physician', specialty: 'Physician', hint: 'Adult internal medicine', icon: 'stethoscope-bold', isMvpVisible: false },
  { id: 'gynaecology', label: '🌸 Obstetrics & Gynaecology', specialty: 'Obstetrics & Gynaecology', hint: "Women's health", icon: 'heart-bold', isMvpVisible: false },
  { id: 'dietician', label: '🥗 Dietician', specialty: 'Dietician', hint: 'Nutrition and diet plans', icon: 'leaf-bold', isMvpVisible: false },
];

const COMMON_REASONS = [
  'Flu, Cold or Cough',
  'Prescription Refill',
  'Skin Rash / Acne',
  'General Wellness Checkup',
  'Stomach / Digestion Issue',
  'Medical Sick Note',
];

type Step = 'specialty' | 'consult' | 'slot' | 'details' | 'review';
type ConsultType = 'video' | 'audio';

const STEPS: { id: Step; label: string }[] = [
  { id: 'specialty', label: 'Type of care' },
  { id: 'consult', label: 'Your consultation' },
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
  const [step, setStep] = useState<Step>('specialty');

  // Directory of bookable doctors. While the MVP pins one doctor this holds just that doctor;
  // once other specialities open up it holds everyone and the specialty filter narrows it.
  const [doctors, setDoctors] = useState<QuickDoctor[]>([FALLBACK_DOCTOR]);
  const [specialty, setSpecialty] = useState<SpecialtyOption | null>(null);
  const [chosenDoctorId, setChosenDoctorId] = useState<string | null>(null);

  const matchingDoctors = useMemo(() => {
    if (!specialty || specialty.specialty === 'All') return doctors;
    // spelling-tolerant (Paediatrician / Pediatrician, Gynaecology / Gynecology)
    const norm = (v: string) => v.toLowerCase().replace(/ae/g, 'e');
    return doctors.filter((d) => norm(d.specialty).includes(norm(specialty.specialty)));
  }, [doctors, specialty]);
  // 'Earliest available' auto-picks the first doctor; other specialities let the patient choose
  const doctor =
    matchingDoctors.find((d) => d.id === chosenDoctorId) ??
    (!specialty || specialty.specialty === 'All' || matchingDoctors.length === 1 ? matchingDoctors[0] : undefined) ??
    doctors[0] ??
    FALLBACK_DOCTOR;
  const needsDoctorChoice = !!specialty && specialty.specialty !== 'All' && matchingDoctors.length > 1;
  const noDoctors = !!specialty && specialty.specialty !== 'All' && matchingDoctors.length === 0;
  const doctorChosen = !noDoctors && (!needsDoctorChoice || matchingDoctors.some((d) => d.id === chosenDoctorId));
  const [consultationType, setConsultationType] = useState<ConsultType>('video');

  const [slots, setSlots] = useState<LiveSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [apiRate, setApiRate] = useState<number | null>(null);
  const [minBillable, setMinBillable] = useState<number | undefined>(undefined);
  // Slots close for booking this many minutes before they start (admin Platform Setting)
  const [leadMinutes, setLeadMinutes] = useState(DEFAULT_BOOKING_LEAD_MINUTES);
  // Ticks while the widget is open so expired times drop off without a reload
  const [nowTick, setNowTick] = useState(() => Date.now());
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
          // per 30 minutes: the admin's platform rate for LocumStaff doctors, the doctor's own rate otherwise
          rate: Number(d.consultation_rate || d.rate_per_hour || d.ratePerHour) || null,
          rating: Number(d.rating_avg || d.rating) || 0,
          reviewsCount: Number(d.reviews_count || d.reviewsCount) || undefined,
          duration: Number(d.consultation_duration || d.duration) || FALLBACK_DOCTOR.duration,
          offersVideo: d.offers_video !== false,
          offersAudio: d.offers_audio !== false,
          image: d.user?.avatar_url || d.photo_url || FALLBACK_DOCTOR.image,
        }));
        if (!alive || mapped.length === 0) return;
        if (PIN_MVP_DOCTOR) {
          const pick =
            mapped.find((d) => d.slug === MVP_DOCTOR_SLUG) ||
            mapped.find((d) => d.name.toLowerCase().includes('motuba') || d.id === 'doc-1' || d.specialty === 'General Practitioner');
          if (pick) setDoctors([pick]);
        } else {
          setDoctors(mapped);
        }
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
    fetch(`${API_BASE}/doctors/${encodeURIComponent(doctor.id)}/availability${holdQuery()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data) return;
        if (Array.isArray(data.slots)) setSlots(data.slots);
        if (Number(data.consultationRate) > 0) setApiRate(Number(data.consultationRate));
        if (data.minimumBillableMinutes != null) setMinBillable(Number(data.minimumBillableMinutes));
        if (data.bookingLeadMinutes != null) setLeadMinutes(Number(data.bookingLeadMinutes));
        setNowTick(Date.now());
      })
      .catch(() => {})
      .finally(() => alive && setSlotsLoading(false));
    return () => {
      alive = false;
    };
  }, [isOpen, doctor.id, API_BASE]);

  // Re-check the clock every 20 seconds while open, and re-fetch availability when the patient
  // reaches the review step, so they never find out at payment that a time is gone.
  useEffect(() => {
    if (!isOpen) return;
    setNowTick(Date.now());
    const t = window.setInterval(() => setNowTick(Date.now()), 20000);
    return () => window.clearInterval(t);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || step !== 'review') return;
    let alive = true;
    fetch(`${API_BASE}/doctors/${encodeURIComponent(doctor.id)}/availability${holdQuery()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data || !Array.isArray(data.slots)) return;
        setSlots(data.slots);
        if (data.bookingLeadMinutes != null) setLeadMinutes(Number(data.bookingLeadMinutes));
        setNowTick(Date.now());
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [isOpen, step, doctor.id, API_BASE]);

  // Bookable slots only (same lead-time rule as the API), grouped by the viewer's local date
  const slotsByDay = useMemo(() => {
    const map = new Map<string, LiveSlot[]>();
    for (const sl of slots) {
      if (sl.isLocked || !isSlotBookable(sl.startTime, leadMinutes, nowTick)) continue;
      const key = localDateKey(new Date(sl.startTime));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(sl);
    }
    map.forEach((list) => list.sort((x, y) => +new Date(x.startTime) - +new Date(y.startTime)));
    return map;
  }, [slots, leadMinutes, nowTick]);

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

  // A chosen time that closes (or is taken) while the patient fills in details sends them back now,
  // with a clear message, instead of failing at payment.
  useEffect(() => {
    if (!selectedSlot) return;
    if (!isSlotBookable(selectedSlot.startTime, leadMinutes, nowTick)) setSelectedSlot(null);
  }, [selectedSlot, leadMinutes, nowTick]);

  useEffect(() => {
    if (!isOpen || selectedSlot || (step !== 'details' && step !== 'review')) return;
    setStep('slot');
    setFormError('That time is no longer available. Please pick another time.');
  }, [isOpen, selectedSlot, step]);

  const daySlots = slotsByDay.get(selectedDayKey) || [];
  const groups = DAY_PARTS.map((part) => ({
    ...part,
    slots: daySlots.filter((s) => part.test(new Date(s.startTime).getHours())),
  })).filter((g) => g.slots.length > 0);

  const nextAvailable = days.length > 0 ? slotsByDay.get(days[0].key)![0] : null;

  // Session lengths come from the doctor's slots, so they can differ (30 min, 1 hr, ...)
  const slotLength = (sl: LiveSlot) => sl.durationMinutes || Math.round((+new Date(sl.endTime) - +new Date(sl.startTime)) / 60000);
  const lengths = useMemo(() => {
    const set = new Set<number>();
    slotsByDay.forEach((list) => list.forEach((sl) => set.add(slotLength(sl))));
    return Array.from(set).sort((a, b) => a - b);
  }, [slotsByDay]);
  const mixedLengths = lengths.length > 1;
  // rate per 30 minutes (the API's value wins over the directory's)
  const rate = apiRate ?? doctor.rate;
  const slotPrice = (sl: LiveSlot) => sl.price ?? (rate ? priceForDuration(rate, slotLength(sl), minBillable) : null);
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
      const qb = url.searchParams.get(QUICK_BOOK_PARAM);
      if (qb) {
        open();
        if (qb === QUICK_BOOK_SLOT_VALUE) {
          // jump to the time step: earliest-available GP, same consultation type as before
          setSpecialty(SPECIALTY_OPTIONS[0]);
          setChosenDoctorId(null);
          if (url.searchParams.get('type') === 'audio') setConsultationType('audio');
          setStep('slot');
          url.searchParams.delete('type');
        }
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
    setSpecialty(null);
    setChosenDoctorId(null);
    setConsultationType('video');
    goTo('specialty');
  };

  const handleSelectSpecialty = (opt: SpecialtyOption) => {
    setSpecialty(opt);
    setChosenDoctorId(null);
    setSelectedSlot(null);
    goTo('consult');
  };

  const handleDetailsContinue = () => {
    setFormError(null);
    const name = patientName.trim();
    const email = patientEmail.trim();
    const phoneDigits = patientPhone.replace(/\D/g, '');
    if (!name) return setFormError('Please enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setFormError('Please enter a valid email address.');
    if (phoneDigits.length < 7) return setFormError('Please enter a mobile number the doctor can reach you on.');
    goTo('review');
  };

  const handlePay = async () => {
    if (!selectedSlot) {
      setFormError('Please choose an available time first.');
      return goTo('slot');
    }
    if (!isSlotBookable(selectedSlot.startTime, leadMinutes)) {
      setSelectedSlot(null);
      return;
    }
    setIsSubmitting(true);
    setFormError(null);
    try {
      const name = patientName.trim();
      const email = patientEmail.trim();
      const phone = patientPhone.trim();
      const notes = customReason.trim() || reason;

      const slotId = selectedSlot.id;

      // Reserve the time first, so it can't close or be taken while the patient pays. This happens
      // before the guest account is created: creating it signs the patient in, which re-mounts the
      // page shell and would close this panel if the time had just been taken.
      const held = await requestHold(API_BASE, slotId);
      if (held.status === 'rejected') {
        setSelectedSlot(null);
        setIsSubmitting(false);
        setStep('slot');
        setFormError(held.message);
        return;
      }

      // Silent express account for guests
      if (!isAuthenticated) {
        try {
          // A refusal here (e.g. the email belongs to a doctor account) must reach the patient
          await expressPatient({ full_name: name, email, phone });
        } catch (err) {
          await releaseHold(API_BASE, slotId);
          throw err;
        }
      }

      const startObj = new Date(selectedSlot.startTime);
      const endObj = new Date(selectedSlot.endTime);
      const durationMins = slotLength(selectedSlot);
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
  const durationMins = selectedSlot ? slotLength(selectedSlot) : lengths[0] || doctor.duration || PRICING_BLOCK_MINUTES;
  const totalPrice = selectedSlot ? slotPrice(selectedSlot) : null;
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
        return { label: 'Choose a time', onClick: () => goTo('slot'), disabled: !doctorChosen };
      case 'slot':
        return { label: 'Continue', onClick: () => goTo('details'), disabled: !selectedSlot };
      case 'details':
        return { label: 'Review booking', onClick: handleDetailsContinue, disabled: false };
      default:
        return { label: isSubmitting ? 'Opening secure payment…' : totalPrice ? `Pay ${formatRand(totalPrice)} securely` : 'Continue to secure payment', onClick: handlePay, disabled: isSubmitting };
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

            {/* ---------------- Step 1: type of care ---------------- */}
            {step === 'specialty' && (
              <div className="qb-stack">
                <div className="qb-welcome">
                  <strong>Hello! 👋 What kind of care do you need today?</strong>
                  <span className="qb-muted">Pick one and we&apos;ll take care of the rest. It takes about a minute.</span>
                </div>
                <div className="qb-care">
                  {SPECIALTY_OPTIONS.filter((o) => o.isMvpVisible).map((o, i) => (
                    <button
                      key={o.id}
                      type="button"
                      className={`qb-care-option${i === 0 ? ' is-primary' : ''}`}
                      onClick={() => handleSelectSpecialty(o)}
                    >
                      <span className="qb-care-icon" aria-hidden="true">
                        <SolarIcon name={o.icon} size={20} color="#2A170F" />
                      </span>
                      <span className="qb-care-text">
                        <span className="qb-care-label">{o.label}</span>
                        <span className="qb-muted">{o.hint}</span>
                      </span>
                      <SolarIcon name="arrow-right-linear" size={16} color="#8C601E" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ---------------- Step 2: your consultation ---------------- */}
            {step === 'consult' && (
              <div className="qb-stack">
                {specialty && (
                  <div className="qb-chosen">
                    <span>{specialty.label}</span>
                    <button type="button" className="qb-link-btn" onClick={() => goTo('specialty')}>
                      Change
                    </button>
                  </div>
                )}

                {noDoctors ? (
                  <div className="qb-empty">
                    <strong>No doctors available for this speciality yet</strong>
                    <span className="qb-muted">Please choose another type of care.</span>
                  </div>
                ) : needsDoctorChoice ? (
                  <>
                    <div className="qb-section-title">Choose your doctor</div>
                    <div className="qb-doctor-list" role="radiogroup" aria-label="Doctor">
                      {matchingDoctors.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          role="radio"
                          aria-checked={chosenDoctorId === d.id}
                          className={`qb-doctor qb-doctor-pick${chosenDoctorId === d.id ? ' is-selected' : ''}`}
                          onClick={() => setChosenDoctorId(d.id)}
                        >
                          <div className="qb-avatar">
                            <Image src={d.image} alt={d.name} fill style={{ objectFit: 'cover' }} sizes="56px" />
                          </div>
                          <div className="qb-doctor-info">
                            <div className="qb-doctor-name">{d.name}</div>
                            <div className="qb-muted">{d.specialty}</div>
                            <div className="qb-doctor-meta">
                              {d.rating > 0 ? (
                                <span className="qb-rating">
                                  <SolarIcon name="star-bold" size={13} color="#DFAB62" /> {d.rating.toFixed(1)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="qb-fee">
                            {d.rate ? (
                              <>
                                <strong>{formatRand(d.rate)}</strong>
                                <span className="qb-muted">/ {PRICING_BLOCK_MINUTES} min</span>
                              </>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="qb-doctor">
                    <div className="qb-avatar">
                      <Image src={doctor.image} alt={doctor.name} fill style={{ objectFit: 'cover' }} sizes="56px" />
                    </div>
                    <div className="qb-doctor-info">
                      <div className="qb-doctor-name">{doctor.name}</div>
                      <div className="qb-muted">{doctor.specialty}</div>
                      <div className="qb-doctor-meta">
                        {doctor.rating > 0 ? (
                          <span className="qb-rating">
                            <SolarIcon name="star-bold" size={13} color="#DFAB62" /> {doctor.rating.toFixed(1)}
                            {doctor.reviewsCount ? <span className="qb-muted"> ({doctor.reviewsCount})</span> : null}
                          </span>
                        ) : null}
                        <span className="qb-verified">
                          <SolarIcon name="verified-check-bold" size={13} color="#15803D" /> HPCSA verified
                        </span>
                      </div>
                    </div>
                    <div className="qb-fee">
                      {rate ? (
                        <>
                          <strong>{formatRand(rate)}</strong>
                          <span className="qb-muted">/ {PRICING_BLOCK_MINUTES} min</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                )}

                {!noDoctors && (
                  <>
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
                        <SolarIcon name="check-circle-bold" size={15} color="#15803D" />{' '}
                        {lengths.length === 0
                          ? 'Private one-to-one consultation'
                          : mixedLengths
                            ? `Private consultation, ${lengths[0]}–${lengths[lengths.length - 1]} minutes depending on the time you pick`
                            : `${lengths[0]}-minute private consultation`}
                      </li>
                      {rate && (
                        <li>
                          <SolarIcon name="check-circle-bold" size={15} color="#15803D" /> {formatRand(rate)} per {PRICING_BLOCK_MINUTES} minutes
                          {lengths.some((l) => l > PRICING_BLOCK_MINUTES) ? ': longer sessions cost in proportion' : ''}
                        </li>
                      )}
                      {rate && minBillable != null && minBillable > 0 && lengths.some((l) => l < minBillable) && (
                        <li>
                          <SolarIcon name="check-circle-bold" size={15} color="#15803D" /> Shorter slots are charged as {formatDuration(minBillable)}
                        </li>
                      )}
                      <li>
                        <SolarIcon name="check-circle-bold" size={15} color="#15803D" /> No account needed. Your join button arrives by email
                      </li>
                    </ul>
                  </>
                )}
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
                              {mixedLengths && (
                                <span className="qb-time-meta">
                                  {formatDuration(slotLength(s))}
                                  {slotPrice(s) ? ` · ${formatRand(slotPrice(s) as number)}` : ''}
                                </span>
                              )}
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
                  <span className="qb-hint">For appointment updates. Your join button is sent to your email.</span>
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
                  {specialty && <SummaryRow label="Care" value={specialty.label} onEdit={() => goTo('specialty')} />}
                  <SummaryRow label="Doctor" value={`${doctor.name} · ${doctor.specialty}`} onEdit={() => goTo('consult')} />
                  <SummaryRow label="Type" value={consultationType === 'audio' ? 'Audio call' : 'Video call'} onEdit={() => goTo('consult')} />
                  <SummaryRow
                    label="When"
                    value={`${selectedDay?.long || ''} · ${selectedSlot ? formatClockTime(selectedSlot.startTime) : ''} (${zoneLabel})`}
                    onEdit={() => goTo('slot')}
                  />
                  <SummaryRow label="Length" value={formatDuration(durationMins)} />
                  <SummaryRow label="Visit about" value={reasonShown} onEdit={() => goTo('details')} />
                  <SummaryRow label="Patient" value={`${patientName.trim()} · ${patientEmail.trim()}`} onEdit={() => goTo('details')} />
                </div>
                <div className="qb-total">
                  <span>Total</span>
                  <strong>{totalPrice ? formatRand(totalPrice) : 'Shown at checkout'}</strong>
                </div>
                <div className="qb-secure">
                  <SolarIcon name="lock-keyhole-linear" size={15} color="currentColor" /> Secure payment with Paystack on the next screen. Nothing is charged until you confirm there.
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          {step !== 'specialty' && (
          <div className="qb-footer">
            {step === 'slot' && selectedSlot && (
              <div className="qb-footer-note">
                <SolarIcon name="calendar-linear" size={15} color="#8C601E" />
                <span>
                  {selectedSlotLabel} · {formatDuration(durationMins)}
                  {totalPrice ? ` · ${formatRand(totalPrice)}` : ''}
                </span>
              </div>
            )}
            <button type="button" className="qb-primary" onClick={primary.onClick} disabled={primary.disabled}>
              {step === 'review' && <SolarIcon name="lock-keyhole-linear" size={16} color="currentColor" />}
              <span>{primary.label}</span>
              {step !== 'review' && <SolarIcon name="arrow-right-linear" size={16} color="currentColor" />}
            </button>
          </div>
          )}
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
