'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { SolarIcon } from './SolarIcon';
import { useAuth } from '../context/AuthContext';

export interface QuickDoctor {
  id: string;
  name: string;
  specialty: string;
  rate: number;
  rating: number;
  reviewsCount?: number;
  duration?: number;
  offersVideo?: boolean;
  offersAudio?: boolean;
  image: string;
  nextAvailable: string;
}

const RICH_FALLBACK_DOCTORS: QuickDoctor[] = [
  {
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
    nextAvailable: 'Available today in 15 mins',
  },
  {
    id: 'doc-2',
    name: 'Dr. Sarah Van Der Merwe',
    specialty: 'Paediatrician',
    rate: 650,
    rating: 4.98,
    reviewsCount: 52,
    duration: 45,
    offersVideo: true,
    offersAudio: true,
    image: '/images/doctor_sarah.jpg',
    nextAvailable: 'Available today',
  },
  {
    id: 'doc-4',
    name: 'Dr. Lerato Khumalo',
    specialty: 'Dermatologist',
    rate: 580,
    rating: 4.97,
    reviewsCount: 44,
    duration: 30,
    offersVideo: true,
    offersAudio: true,
    image: '/images/doctor_thabo.jpg',
    nextAvailable: 'Available today',
  },
  {
    id: 'doc-6',
    name: 'Dr. Amina Patel',
    specialty: "Obstetrics & Women's Health",
    rate: 520,
    rating: 4.96,
    reviewsCount: 29,
    duration: 45,
    offersVideo: true,
    offersAudio: true,
    image: '/images/doctor_kevin.jpg',
    nextAvailable: 'Available today',
  },
  {
    id: 'doc-3',
    name: 'Dr. Kevin Pillay',
    specialty: 'Family Physician & Sports',
    rate: 420,
    rating: 4.92,
    reviewsCount: 33,
    duration: 30,
    offersVideo: true,
    offersAudio: true,
    image: '/images/doctor_kevin.jpg',
    nextAvailable: 'Available today',
  },
];

const SPECIALTY_OPTIONS = [
  { id: 'all', label: '⚡ Earliest Available GP (Fastest)', specialty: 'All', icon: 'bolt-circle-bold' },
  { id: 'gp', label: '🩺 General Practitioner & Family', specialty: 'General Practitioner', icon: 'stethoscope-bold' },
  { id: 'paediatrics', label: '👶 Paediatrics (Child Health)', specialty: 'Paediatrician', icon: 'heart-pulse-bold' },
  { id: 'dermatology', label: '🧴 Dermatology & Skin Care', specialty: 'Dermatologist', icon: 'shield-check-bold' },
  { id: 'womens', label: "🌸 Women's Health & Gynae", specialty: "Obstetrics & Women's Health", icon: 'user-bold' },
];

const COMMON_REASONS = [
  'Flu, Cold or Cough',
  'Prescription Refill',
  'Skin Rash / Acne',
  'General Wellness Checkup',
  'Stomach / Digestion Issue',
  'Medical Sick Note Consultation',
];

interface ChatStep {
  step: 'specialty' | 'doctor' | 'type' | 'slot' | 'patient_info' | 'ready';
}

export function QuickBookingWidget() {
  const router = useRouter();
  const { user, isAuthenticated, expressPatient } = useAuth();
  const rawApiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const API_BASE = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase.replace(/\/+$/, '')}/api/v1`;

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<ChatStep['step']>('specialty');

  // Dynamic Doctors State
  const [doctors, setDoctors] = useState<QuickDoctor[]>(RICH_FALLBACK_DOCTORS);
  const [loadingDoctors, setLoadingDoctors] = useState(false);

  // Selected Booking State
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('All');
  const [selectedSpecialtyLabel, setSelectedSpecialtyLabel] = useState<string>('');
  const [selectedDoctor, setSelectedDoctor] = useState<QuickDoctor | null>(null);
  const [consultationType, setConsultationType] = useState<'video' | 'audio'>('video');
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>('10:30');

  // Patient Info State
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [reason, setReason] = useState('General Consultation');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const popoverRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Fetch dynamic doctors from API
  useEffect(() => {
    let isMounted = true;
    async function fetchDoctors() {
      try {
        setLoadingDoctors(true);
        const res = await fetch(`${API_BASE}/doctors`);
        if (res.ok) {
          const data = await res.json();
          const docList = Array.isArray(data) ? data : data.doctors || [];
          if (docList.length > 0 && isMounted) {
            const mapped: QuickDoctor[] = docList.map((d: any) => ({
              id: d.id,
              name: d.user?.full_name || d.name || 'Dr. Medical Practitioner',
              specialty: d.specialty || 'General Practitioner',
              rate: Number(d.rate_per_hour || d.ratePerHour) || 450,
              rating: Number(d.rating_avg || d.rating) || 4.9,
              reviewsCount: Number(d.reviews_count || d.reviewsCount) || 38,
              duration: Number(d.consultation_duration || d.duration) || 30,
              offersVideo: d.offers_video !== false,
              offersAudio: d.offers_audio !== false,
              image: d.user?.avatar_url || d.photo_url || '/images/doctor_thabo.jpg',
              nextAvailable: d.next_available_slot || 'Available today',
            }));
            setDoctors(mapped);
          }
        }
      } catch {
        // Keep fallback doctors
      } finally {
        if (isMounted) setLoadingDoctors(false);
      }
    }
    fetchDoctors();
    return () => {
      isMounted = false;
    };
  }, [API_BASE]);

  // Sync profile details if authenticated
  useEffect(() => {
    if (user) {
      if (user.fullName) setPatientName(user.fullName);
      if (user.email) setPatientEmail(user.email);
      if (user.phone) setPatientPhone(user.phone);
    }
  }, [user]);

  // Auto-scroll chat to bottom when step advances
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [currentStep, isOpen]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        isOpen &&
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        const trigger = document.getElementById('quick-booking-trigger');
        if (trigger && trigger.contains(event.target as Node)) return;
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Compute 3 upcoming dates
  const days = React.useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 3; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-ZA', { weekday: 'short' });
      const dateStr = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
      list.push({ dayName, dateStr, displayDate, dateObj: d });
    }
    return list;
  }, []);

  const timeSlots = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00'];

  // Filter doctors based on conversational selection
  const matchingDoctors = React.useMemo(() => {
    if (selectedSpecialty === 'All') return doctors;
    const filtered = doctors.filter((doc) =>
      doc.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase()),
    );
    return filtered.length > 0 ? filtered : doctors;
  }, [selectedSpecialty, doctors]);

  // Reset conversation to beginning
  const handleReset = () => {
    setCurrentStep('specialty');
    setSelectedSpecialty('All');
    setSelectedSpecialtyLabel('');
    setSelectedDoctor(null);
    setConsultationType('video');
    setFormError(null);
  };

  // Step 1 Selection Handler
  const handleSelectSpecialty = (spec: string, label: string) => {
    setSelectedSpecialty(spec);
    setSelectedSpecialtyLabel(label);
    if (spec === 'All') {
      setSelectedDoctor(doctors[0] || RICH_FALLBACK_DOCTORS[0]);
      setCurrentStep('type');
    } else {
      setCurrentStep('doctor');
    }
  };

  // Step 2 Doctor Selection Handler
  const handleSelectDoctor = (doc: QuickDoctor) => {
    setSelectedDoctor(doc);
    setCurrentStep('type');
  };

  // Step 2.5 Consultation Type Selection Handler
  const handleSelectConsultationType = (type: 'video' | 'audio') => {
    setConsultationType(type);
    setCurrentStep('slot');
  };

  // Step 3 Slot Selection Handler
  const handleConfirmSlot = () => {
    setCurrentStep('patient_info');
  };

  // Step 4 Patient Info Handler
  const handlePatientInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = patientName.trim();
    const email = patientEmail.trim();
    const phone = patientPhone.trim();

    if (!name || !email || !phone) {
      setFormError('Please enter your full name, email address, and phone number.');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setCurrentStep('ready');
  };

  // Step 5 Complete & Pay via Paystack
  const handleFinalCheckout = async () => {
    if (!selectedDoctor) return;
    setIsSubmitting(true);
    setFormError(null);

    try {
      const name = patientName.trim();
      const email = patientEmail.trim();
      const phone = patientPhone.trim();
      const selectedReason = customReason.trim() || reason;

      // 1. Silent Express auto-provision if guest
      if (!isAuthenticated) {
        try {
          await expressPatient({
            full_name: name,
            email,
            phone,
          });
        } catch (err: any) {
          console.warn('Express auto-provisioning note:', err);
        }
      }

      // 2. Compute date, time, and dynamic doctor duration
      const targetDay = days[selectedDayIndex];
      const slotId = `slot-${targetDay.dateStr}-${selectedTimeSlot}`;
      const [h, m] = selectedTimeSlot.split(':').map(Number);
      const startObj = new Date(targetDay.dateObj);
      startObj.setHours(h, m, 0, 0);
      const durationMins = selectedDoctor.duration || 30;
      const endObj = new Date(startObj.getTime() + durationMins * 60 * 1000);

      // 3. Persist checkout draft into sessionStorage
      try {
        sessionStorage.setItem(
          'chekup_checkout_draft',
          JSON.stringify({
            doctorId: selectedDoctor.id,
            slotId,
            date: targetDay.dateStr,
            type: consultationType,
            duration: durationMins,
            notes: selectedReason,
            patientName: name,
            patientEmail: email,
            patientPhone: phone,
            savedAt: Date.now(),
          }),
        );
      } catch {
        // ignore
      }

      // 4. Close popover and navigate to checkout
      setIsOpen(false);
      const checkoutUrl = `/bookings/checkout?doctorId=${encodeURIComponent(
        selectedDoctor.id,
      )}&slotId=${encodeURIComponent(slotId)}&date=${encodeURIComponent(
        targetDay.dateStr,
      )}&start=${encodeURIComponent(startObj.toISOString())}&end=${encodeURIComponent(
        endObj.toISOString(),
      )}&type=${encodeURIComponent(consultationType)}&duration=${encodeURIComponent(durationMins)}`;

      router.push(checkoutUrl);
    } catch (err: any) {
      setFormError(err.message || 'Could not proceed to payment. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* 
        ========================================================================
        FLOATING TRIGGER BUTTON (Light / Inversed Color Palette)
        ========================================================================
      */}
      <button
        id="quick-booking-trigger"
        onClick={() => {
          setIsOpen((prev) => !prev);
          setFormError(null);
        }}
        aria-label={isOpen ? 'Close Quick Booking' : 'Open Conversational Quick Booking'}
        aria-expanded={isOpen}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: '#FFFFFF',
          color: 'var(--color-chocolate-base, #2A170F)',
          border: '1.5px solid var(--color-gold-base, #DFAB62)',
          borderRadius: '9999px',
          padding: isOpen ? '10px 18px' : '9px 18px 9px 12px',
          boxShadow: '0 10px 30px rgba(42, 23, 15, 0.12), 0 2px 8px rgba(223, 171, 98, 0.25)',
          cursor: 'pointer',
          fontFamily: 'var(--font-sans, sans-serif)',
          transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
          lineHeight: 1,
        }}
        className="quick-booking-trigger-btn"
      >
        {isOpen ? (
          <>
            <SolarIcon name="close-circle-bold" size={20} color="var(--color-chocolate-base, #2A170F)" />
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)' }}>
              Close
            </span>
          </>
        ) : (
          <>
            {/* Glowing Gold Icon Circle */}
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-gold-primary, #DFAB62)',
                color: 'var(--color-chocolate-base, #2A170F)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 8px rgba(223, 171, 98, 0.45)',
              }}
              aria-hidden="true"
            >
              <SolarIcon name="bolt-circle-bold" size={20} color="#2A170F" />
            </div>

            {/* Inversed Light Text */}
            <div style={{ textAlign: 'left' }}>
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--color-chocolate-base, #2A170F)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Quick Book</span>
                <span
                  style={{
                    backgroundColor: 'rgba(223, 171, 98, 0.18)',
                    color: '#8C601E',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Instant
                </span>
              </div>
              <div
                style={{
                  fontSize: '0.71875rem',
                  color: 'var(--color-chocolate-muted, #6B5E55)',
                  fontWeight: 500,
                  marginTop: '2px',
                }}
              >
                No sign-up required
              </div>
            </div>
          </>
        )}
      </button>

      {/* 
        ========================================================================
        CONVERSATIONAL BOOKING POPOVER (Light, Airy, Concierge Style)
        ========================================================================
      */}
      {isOpen && (
        <div
          ref={popoverRef}
          role="dialog"
          aria-labelledby="quick-book-dialog-title"
          style={{
            position: 'fixed',
            bottom: '84px',
            right: '24px',
            zIndex: 9999,
            width: '430px',
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: 'min(680px, calc(100vh - 105px))',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid var(--color-gold-base, #DFAB62)',
            borderRadius: '22px',
            boxShadow: '0 24px 60px rgba(42, 23, 15, 0.18), 0 4px 16px rgba(223, 171, 98, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'quickBookPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            fontFamily: 'var(--font-sans, sans-serif)',
          }}
          className="quick-booking-popover"
        >
          {/* Conversational Concierge Header */}
          <div
            style={{
              backgroundColor: '#FAF6EE',
              borderBottom: '1px solid rgba(223, 171, 98, 0.3)',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  position: 'relative',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-gold-pale, #F5ECD8)',
                  border: '1.5px solid var(--color-gold-base, #DFAB62)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  flexShrink: 0,
                }}
              >
                <SolarIcon name="stethoscope-bold" size={18} color="var(--color-chocolate-base, #2A170F)" />
                <span
                  style={{
                    position: 'absolute',
                    bottom: '0px',
                    right: '0px',
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: '#16A34A',
                    border: '1.5px solid #FFFFFF',
                  }}
                  aria-label="Online"
                />
              </div>

              <div>
                <div
                  id="quick-book-dialog-title"
                  style={{
                    fontSize: '0.925rem',
                    fontWeight: 700,
                    color: 'var(--color-chocolate-base, #2A170F)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>ChekUp247 Care Assistant</span>
                </div>
                <div style={{ fontSize: '0.71875rem', color: '#6B5E55' }}>
                  Smart Telehealth Triage • Instant Booking
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {currentStep !== 'specialty' && (
                <button
                  type="button"
                  onClick={handleReset}
                  title="Start Over"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#8C601E',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: '6px',
                  }}
                >
                  Restart
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                style={{
                  background: 'rgba(42, 23, 15, 0.06)',
                  border: 'none',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <SolarIcon name="close-circle-linear" size={18} />
              </button>
            </div>
          </div>

          {/* Chat Stream Body */}
          <div
            style={{
              padding: '16px 18px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              backgroundColor: '#FFFFFF',
            }}
          >
            {formError && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  fontSize: '0.8125rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <SolarIcon name="danger-circle-bold" size={16} color="#DC2626" />
                <span>{formError}</span>
              </div>
            )}

            {/* ========================================================= */}
            {/* MESSAGE 1: ASSISTANT WELCOME & SPECIALTY OPTIONS          */}
            {/* ========================================================= */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-gold-pale, #F5ECD8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '2px',
                }}
              >
                <SolarIcon name="bolt-bold" size={14} color="var(--color-chocolate-base, #2A170F)" />
              </div>
              <div
                style={{
                  backgroundColor: '#F7F3EB',
                  border: '1px solid rgba(223, 171, 98, 0.25)',
                  borderRadius: '14px 14px 14px 2px',
                  padding: '10px 14px',
                  maxWidth: '85%',
                  fontSize: '0.85rem',
                  lineHeight: 1.45,
                  color: 'var(--color-chocolate-base, #2A170F)',
                }}
              >
                Hello! 👋 What kind of care or consultation do you need today?
              </div>
            </div>

            {/* Step 1 Interactive Specialty Buttons */}
            {currentStep === 'specialty' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginLeft: '34px' }}>
                {SPECIALTY_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSpecialty(item.specialty, item.label)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 13px',
                      borderRadius: '10px',
                      border: '1px solid rgba(223, 171, 98, 0.35)',
                      backgroundColor: '#FFFFFF',
                      color: 'var(--color-chocolate-base, #2A170F)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 2px 6px rgba(42, 23, 15, 0.03)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-gold-pale, #F5ECD8)';
                      e.currentTarget.style.borderColor = 'var(--color-gold-base, #DFAB62)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#FFFFFF';
                      e.currentTarget.style.borderColor = 'rgba(223, 171, 98, 0.35)';
                    }}
                  >
                    <span>{item.label}</span>
                    <SolarIcon name="arrow-right-linear" size={14} color="#8C601E" />
                  </button>
                ))}
              </div>
            )}

            {/* User Response 1 (Specialty Chosen) */}
            {currentStep !== 'specialty' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    backgroundColor: 'var(--color-chocolate-base, #2A170F)',
                    color: '#FFFFFF',
                    borderRadius: '14px 14px 2px 14px',
                    padding: '8px 14px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    maxWidth: '80%',
                  }}
                >
                  {selectedSpecialtyLabel || selectedSpecialty}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* MESSAGE 2: ASSISTANT DOCTOR SELECTION                     */}
            {/* ========================================================= */}
            {currentStep !== 'specialty' && (
              <>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-gold-pale, #F5ECD8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <SolarIcon name="user-bold" size={14} color="var(--color-chocolate-base, #2A170F)" />
                  </div>
                  <div
                    style={{
                      backgroundColor: '#F7F3EB',
                      border: '1px solid rgba(223, 171, 98, 0.25)',
                      borderRadius: '14px 14px 14px 2px',
                      padding: '10px 14px',
                      maxWidth: '88%',
                      fontSize: '0.85rem',
                      lineHeight: 1.45,
                      color: 'var(--color-chocolate-base, #2A170F)',
                    }}
                  >
                    {selectedSpecialty === 'All'
                      ? '⚡ Great! I matched you with the earliest available verified GP:'
                      : 'Here are verified HPCSA doctors available for your consultation:'}
                  </div>
                </div>

                {/* Step 2 Interactive Doctor Picker */}
                {currentStep === 'doctor' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '34px' }}>
                    {matchingDoctors.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => handleSelectDoctor(doc)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: '1.5px solid rgba(223, 171, 98, 0.35)',
                          backgroundColor: '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: '0 2px 6px rgba(42, 23, 15, 0.03)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-gold-pale, #F5ECD8)';
                          e.currentTarget.style.borderColor = 'var(--color-gold-base, #DFAB62)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#FFFFFF';
                          e.currentTarget.style.borderColor = 'rgba(223, 171, 98, 0.35)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              position: 'relative',
                              backgroundColor: '#EBE5DA',
                              flexShrink: 0,
                            }}
                          >
                            <Image src={doc.image} alt={doc.name} fill style={{ objectFit: 'cover' }} sizes="42px" />
                          </div>
                          <div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)' }}>
                              {doc.name}
                            </div>
                            <div style={{ fontSize: '0.71875rem', color: '#6B5E55' }}>{doc.specialty}</div>
                            {/* Star Rating, Reviews & Duration */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                              <SolarIcon name="star-bold" size={12} color="#DFAB62" />
                              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                                {doc.rating ? doc.rating.toFixed(1) : '4.9'}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#8C7768' }}>
                                ({doc.reviewsCount || 36})
                              </span>
                              <span style={{ fontSize: '0.7rem', color: '#DFAB62' }}>•</span>
                              <span style={{ fontSize: '0.7rem', color: '#6B5E55', fontWeight: 600 }}>
                                {doc.duration || 30} mins
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                            R{doc.rate}
                          </div>
                          <span
                            style={{
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              color: '#16A34A',
                              backgroundColor: '#DCFCE7',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            {doc.nextAvailable}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* User Response 2 (Doctor Chosen) */}
            {selectedDoctor && currentStep !== 'doctor' && currentStep !== 'specialty' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    backgroundColor: 'var(--color-chocolate-base, #2A170F)',
                    color: '#FFFFFF',
                    borderRadius: '14px 14px 2px 14px',
                    padding: '8px 14px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    maxWidth: '80%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{selectedDoctor.name}</span>
                  <span style={{ color: '#DFAB62' }}>★{selectedDoctor.rating.toFixed(1)}</span>
                  <span>(R{selectedDoctor.rate})</span>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* MESSAGE 2.5: ASSISTANT CONSULTATION TYPE SELECTION         */}
            {/* ========================================================= */}
            {selectedDoctor && currentStep !== 'doctor' && currentStep !== 'specialty' && (
              <>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-gold-pale, #F5ECD8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <SolarIcon name="videocamera-bold" size={14} color="var(--color-chocolate-base, #2A170F)" />
                  </div>
                  <div
                    style={{
                      backgroundColor: '#F7F3EB',
                      border: '1px solid rgba(223, 171, 98, 0.25)',
                      borderRadius: '14px 14px 14px 2px',
                      padding: '10px 14px',
                      maxWidth: '88%',
                      fontSize: '0.85rem',
                      lineHeight: 1.45,
                      color: 'var(--color-chocolate-base, #2A170F)',
                    }}
                  >
                    How would you prefer to consult with <strong>{selectedDoctor.name}</strong>?
                  </div>
                </div>

                {/* Step 2.5 Interactive Consultation Type Picker */}
                {currentStep === 'type' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginLeft: '34px' }}>
                    <button
                      type="button"
                      onClick={() => handleSelectConsultationType('video')}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '12px',
                        border: consultationType === 'video'
                          ? '1.5px solid var(--color-gold-base, #DFAB62)'
                          : '1px solid rgba(42, 23, 15, 0.15)',
                        backgroundColor: '#FFFFFF',
                        color: 'var(--color-chocolate-base, #2A170F)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(42, 23, 15, 0.03)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-gold-pale, #F5ECD8)';
                        e.currentTarget.style.borderColor = 'var(--color-gold-base, #DFAB62)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = consultationType === 'video' ? 'var(--color-gold-base, #DFAB62)' : 'rgba(42, 23, 15, 0.15)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(223, 171, 98, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <SolarIcon name="videocamera-record-bold" size={16} color="var(--color-chocolate-base, #2A170F)" />
                        </div>
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            color: '#8C601E',
                            backgroundColor: 'rgba(223, 171, 98, 0.18)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                          }}
                        >
                          Recommended
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                        Video Call
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#6B5E55', lineHeight: 1.3 }}>
                        HD secure video &amp; audio with live doctor interaction
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectConsultationType('audio')}
                      style={{
                        padding: '12px 10px',
                        borderRadius: '12px',
                        border: consultationType === 'audio'
                          ? '1.5px solid var(--color-gold-base, #DFAB62)'
                          : '1px solid rgba(42, 23, 15, 0.15)',
                        backgroundColor: '#FFFFFF',
                        color: 'var(--color-chocolate-base, #2A170F)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(42, 23, 15, 0.03)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--color-gold-pale, #F5ECD8)';
                        e.currentTarget.style.borderColor = 'var(--color-gold-base, #DFAB62)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#FFFFFF';
                        e.currentTarget.style.borderColor = consultationType === 'audio' ? 'var(--color-gold-base, #DFAB62)' : 'rgba(42, 23, 15, 0.15)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(42, 23, 15, 0.06)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <SolarIcon name="phone-calling-bold" size={16} color="var(--color-chocolate-base, #2A170F)" />
                        </div>
                        <span
                          style={{
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            color: '#16A34A',
                            backgroundColor: '#DCFCE7',
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          Voice Only
                        </span>
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                        Audio Call
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#6B5E55', lineHeight: 1.3 }}>
                        Voice-only consultation, perfect for low data or quick review
                      </div>
                    </button>
                  </div>
                )}
              </>
            )}

            {/* User Response 2.5 (Consultation Type Chosen) */}
            {selectedDoctor && currentStep !== 'type' && currentStep !== 'doctor' && currentStep !== 'specialty' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    backgroundColor: 'var(--color-chocolate-base, #2A170F)',
                    color: '#FFFFFF',
                    borderRadius: '14px 14px 2px 14px',
                    padding: '8px 14px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    maxWidth: '80%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <SolarIcon
                    name={consultationType === 'audio' ? 'phone-calling-bold' : 'videocamera-record-bold'}
                    size={14}
                    color="#DFAB62"
                  />
                  <span>{consultationType === 'audio' ? 'Audio Consultation' : 'Video Consultation'}</span>
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* MESSAGE 3: ASSISTANT SLOT SELECTION                       */}
            {/* ========================================================= */}
            {(currentStep === 'slot' || currentStep === 'patient_info' || currentStep === 'ready') && (
              <>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-gold-pale, #F5ECD8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <SolarIcon name="calendar-date-bold" size={14} color="var(--color-chocolate-base, #2A170F)" />
                  </div>
                  <div
                    style={{
                      backgroundColor: '#F7F3EB',
                      border: '1px solid rgba(223, 171, 98, 0.25)',
                      borderRadius: '14px 14px 14px 2px',
                      padding: '10px 14px',
                      maxWidth: '88%',
                      fontSize: '0.85rem',
                      lineHeight: 1.45,
                      color: 'var(--color-chocolate-base, #2A170F)',
                    }}
                  >
                    When would work best for your {selectedDoctor?.duration || 30}-min {consultationType === 'audio' ? 'audio' : 'video'} consultation?
                  </div>
                </div>

                {/* Step 3 Interactive Day & Slot Picker */}
                {currentStep === 'slot' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginLeft: '34px' }}>
                    {/* Days */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {days.map((item, idx) => {
                        const isSelected = selectedDayIndex === idx;
                        return (
                          <button
                            key={item.dateStr}
                            type="button"
                            onClick={() => setSelectedDayIndex(idx)}
                            style={{
                              padding: '7px 4px',
                              borderRadius: '8px',
                              border: isSelected
                                ? '1.5px solid var(--color-gold-base, #DFAB62)'
                                : '1px solid rgba(42, 23, 15, 0.15)',
                              backgroundColor: isSelected ? 'var(--color-chocolate-base, #2A170F)' : '#FFFFFF',
                              color: isSelected ? '#FFFFFF' : 'var(--color-chocolate-base, #2A170F)',
                              cursor: 'pointer',
                              textAlign: 'center',
                              fontSize: '0.78125rem',
                              fontWeight: 700,
                            }}
                          >
                            <div>{item.dayName}</div>
                            <div style={{ fontSize: '0.6875rem', opacity: 0.8, marginTop: '1px' }}>{item.displayDate}</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Time slots */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {timeSlots.map((time) => {
                        const isSelected = selectedTimeSlot === time;
                        return (
                          <button
                            key={time}
                            type="button"
                            onClick={() => setSelectedTimeSlot(time)}
                            style={{
                              padding: '7px 4px',
                              borderRadius: '8px',
                              border: isSelected
                                ? '1.5px solid var(--color-gold-base, #DFAB62)'
                                : '1px solid rgba(42, 23, 15, 0.12)',
                              backgroundColor: isSelected ? 'var(--color-gold-primary, #DFAB62)' : '#FFFFFF',
                              color: isSelected ? '#2A170F' : 'var(--color-chocolate-base, #2A170F)',
                              fontWeight: isSelected ? 800 : 500,
                              fontSize: '0.8125rem',
                              cursor: 'pointer',
                            }}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      onClick={handleConfirmSlot}
                      style={{
                        padding: '10px',
                        backgroundColor: 'var(--color-chocolate-base, #2A170F)',
                        color: 'var(--color-gold-base, #DFAB62)',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        marginTop: '4px',
                      }}
                    >
                      <span>Continue with {days[selectedDayIndex].dayName} at {selectedTimeSlot}</span>
                      <SolarIcon name="arrow-right-linear" size={16} color="var(--color-gold-base, #DFAB62)" />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* User Response 3 (Slot Chosen) */}
            {(currentStep === 'patient_info' || currentStep === 'ready') && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    backgroundColor: 'var(--color-chocolate-base, #2A170F)',
                    color: '#FFFFFF',
                    borderRadius: '14px 14px 2px 14px',
                    padding: '8px 14px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    maxWidth: '80%',
                  }}
                >
                  {days[selectedDayIndex].dayName}, {days[selectedDayIndex].displayDate} at {selectedTimeSlot}
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* MESSAGE 4: ASSISTANT PATIENT DETAILS FORM                 */}
            {/* ========================================================= */}
            {(currentStep === 'patient_info' || currentStep === 'ready') && (
              <>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-gold-pale, #F5ECD8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <SolarIcon name="document-medicine-bold" size={14} color="var(--color-chocolate-base, #2A170F)" />
                  </div>
                  <div
                    style={{
                      backgroundColor: '#F7F3EB',
                      border: '1px solid rgba(223, 171, 98, 0.25)',
                      borderRadius: '14px 14px 14px 2px',
                      padding: '10px 14px',
                      maxWidth: '88%',
                      fontSize: '0.85rem',
                      lineHeight: 1.45,
                      color: 'var(--color-chocolate-base, #2A170F)',
                    }}
                  >
                    Almost done! Where should we send your private {consultationType === 'audio' ? 'audio consultation' : 'video'} link &amp; receipt? (No password needed):
                  </div>
                </div>

                {/* Step 4 Conversational Patient Info Form */}
                {currentStep === 'patient_info' && (
                  <form
                    onSubmit={handlePatientInfoSubmit}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      marginLeft: '34px',
                      backgroundColor: '#FAF6EE',
                      border: '1px solid rgba(223, 171, 98, 0.3)',
                      borderRadius: '14px',
                      padding: '14px',
                    }}
                  >
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#2A170F', marginBottom: '3px' }}>
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="e.g. Jane Doe"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid #D8D0C2',
                          fontSize: '0.85rem',
                          backgroundColor: '#FFFFFF',
                          color: '#2A170F',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#2A170F', marginBottom: '3px' }}>
                        Email (for {consultationType === 'audio' ? 'audio consultation' : 'video room'} &amp; medical invoice) *
                      </label>
                      <input
                        type="email"
                        required
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        placeholder="jane@example.com"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid #D8D0C2',
                          fontSize: '0.85rem',
                          backgroundColor: '#FFFFFF',
                          color: '#2A170F',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#2A170F', marginBottom: '3px' }}>
                        Mobile Phone (for SMS link) *
                      </label>
                      <input
                        type="tel"
                        required
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        placeholder="082 123 4567"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid #D8D0C2',
                          fontSize: '0.85rem',
                          backgroundColor: '#FFFFFF',
                          color: '#2A170F',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#2A170F', marginBottom: '4px' }}>
                        Brief Reason for Consultation
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                        {COMMON_REASONS.slice(0, 4).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              setReason(r);
                              setCustomReason('');
                            }}
                            style={{
                              fontSize: '0.6875rem',
                              padding: '3px 7px',
                              borderRadius: '6px',
                              border: reason === r && !customReason ? '1px solid #2A170F' : '1px solid #D8D0C2',
                              backgroundColor: reason === r && !customReason ? '#2A170F' : '#FFFFFF',
                              color: reason === r && !customReason ? '#FFFFFF' : '#2A170F',
                              cursor: 'pointer',
                            }}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={customReason}
                        onChange={(e) => {
                          setCustomReason(e.target.value);
                          if (e.target.value) setReason(e.target.value);
                        }}
                        placeholder="Or type specific concern..."
                        style={{
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: '1px solid #D8D0C2',
                          fontSize: '0.8125rem',
                          backgroundColor: '#FFFFFF',
                          color: '#2A170F',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      style={{
                        padding: '10px',
                        backgroundColor: 'var(--color-chocolate-base, #2A170F)',
                        color: 'var(--color-gold-base, #DFAB62)',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        marginTop: '4px',
                      }}
                    >
                      Review Booking &amp; Pay →
                    </button>
                  </form>
                )}
              </>
            )}

            {/* User Response 4 (Patient Submitted) */}
            {currentStep === 'ready' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <div
                  style={{
                    backgroundColor: 'var(--color-chocolate-base, #2A170F)',
                    color: '#FFFFFF',
                    borderRadius: '14px 14px 2px 14px',
                    padding: '8px 14px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    maxWidth: '80%',
                  }}
                >
                  {patientName} ({patientEmail})
                </div>
              </div>
            )}

            {/* ========================================================= */}
            {/* MESSAGE 5: FINAL CONFIRMATION & 1-CLICK PAYSTACK          */}
            {/* ========================================================= */}
            {currentStep === 'ready' && selectedDoctor && (
              <>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-gold-pale, #F5ECD8)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <SolarIcon name="check-circle-bold" size={14} color="#16A34A" />
                  </div>
                  <div
                    style={{
                      backgroundColor: '#F7F3EB',
                      border: '1px solid rgba(223, 171, 98, 0.25)',
                      borderRadius: '14px 14px 14px 2px',
                      padding: '10px 14px',
                      maxWidth: '88%',
                      fontSize: '0.85rem',
                      lineHeight: 1.45,
                      color: 'var(--color-chocolate-base, #2A170F)',
                    }}
                  >
                    🎉 All set! Your slot with <strong>{selectedDoctor.name}</strong> is reserved. Click below to confirm via Paystack:
                  </div>
                </div>

                <div
                  style={{
                    marginLeft: '34px',
                    backgroundColor: '#FAF6EE',
                    border: '1.5px solid var(--color-gold-base, #DFAB62)',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(223, 171, 98, 0.2)', paddingBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#2A170F' }}>{selectedDoctor.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6B5E55' }}>
                        {consultationType === 'audio' ? 'Audio' : 'Video'} Consultation ({selectedDoctor.duration || 30} mins) • {days[selectedDayIndex].dayName}, {days[selectedDayIndex].displayDate} at {selectedTimeSlot}
                      </div>
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2A170F' }}>
                      R{selectedDoctor.rate}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.71875rem', color: '#6B5E55', lineHeight: 1.4 }}>
                    🛡️ <strong>Escrow Guarantee:</strong> Fee held securely until consultation concludes. Official medical aid invoice with HPCSA &amp; ICD-10 diagnostic codes emailed instantly.
                  </div>

                  <button
                    type="button"
                    onClick={handleFinalCheckout}
                    disabled={isSubmitting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      backgroundColor: 'var(--color-gold-primary, #DFAB62)',
                      color: 'var(--color-chocolate-base, #2A170F)',
                      border: 'none',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '0.925rem',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.75 : 1,
                      boxShadow: '0 4px 14px rgba(223, 171, 98, 0.35)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSubmitting ? (
                      <span>Redirecting to Paystack...</span>
                    ) : (
                      <>
                        <SolarIcon name="card-linear" size={18} color="#2A170F" />
                        <span>Pay R{selectedDoctor.rate} with Paystack</span>
                        <SolarIcon name="arrow-right-linear" size={16} color="#2A170F" />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            <div ref={chatBottomRef} />
          </div>
        </div>
      )}
    </>
  );
}
