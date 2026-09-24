'use client';

import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Calendar,
  Clock,
  Video,
  CreditCard,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Lock,
  Loader2,
  Building,
  UploadCloud,
  FileText,
  X,
  Phone,
  Info,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Stethoscope,
  Check,
  User,
  Mail,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { toastSuccess, toastError } from '../../../lib/toast';
import { Breadcrumbs } from '../../../components/Breadcrumbs';

interface DoctorDetail {
  id: string;
  fullName: string;
  specialty: string;
  hpcsaNumber: string;
  ratePerHour: number;
  photoUrl?: string;
  facilityName?: string;
  facilityAddress?: string;
  slug?: string;
}

interface SlotDetail {
  id: string;
  startTime: string;
  endTime: string;
}

interface AttachedReport {
  file: File;
  name: string;
  size: number;
  type: string;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isAuthenticated, isLoading: isAuthLoading, login, register, verifyEmail } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const doctorIdParam = searchParams.get('doctor') || searchParams.get('doctorId') || '';
  const slotIdParam = searchParams.get('slot') || searchParams.get('slotId');
  const dateParam = searchParams.get('date');
  const startParam = searchParams.get('start');
  const endParam = searchParams.get('end');
  const typeParam = (searchParams.get('type') || 'video') as 'video' | 'in_clinic' | 'audio';

  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [slot, setSlot] = useState<SlotDetail | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWalletCredits, setUseWalletCredits] = useState<boolean>(true);

  // Stepper State: 1 = Clinical Reason & Symptoms, 2 = Medical Reports & Review
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Clinical intake state: paragraph writing, NO PILLS
  const [notes, setNotes] = useState<string>('');
  const [notesError, setNotesError] = useState<boolean>(false);
  const [attachedReports, setAttachedReports] = useState<AttachedReport[]>([]);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string>('Reserving appointment slot...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);

  // Quick In-Page Authentication & Registration Modal State
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authName, setAuthName] = useState<string>('');
  const [authPhone, setAuthPhone] = useState<string>('');
  const [authModalLoading, setAuthModalLoading] = useState<boolean>(false);
  const [authModalError, setAuthModalError] = useState<string | null>(null);

  const rawApiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const API_BASE = rawApiBase.endsWith('/api/v1') ? rawApiBase : `${rawApiBase.replace(/\/+$/, '')}/api/v1`;

  // Restore draft from sessionStorage on mount so patient selections are never lost
  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem('chekup_checkout_draft');
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed && (!parsed.doctorId || parsed.doctorId === doctorIdParam)) {
          if (parsed.notes && !notes) {
            setNotes(parsed.notes);
          }
        }
      }
    } catch (e) {
      console.warn('Could not restore draft:', e);
    }
  }, [doctorIdParam]);

  // Persist notes into sessionStorage on every change
  const handleNotesChange = (val: string) => {
    setNotes(val);
    if (notesError) setNotesError(false);
    try {
      sessionStorage.setItem(
        'chekup_checkout_draft',
        JSON.stringify({
          doctorId: doctorIdParam,
          slotId: slotIdParam,
          date: dateParam,
          type: typeParam,
          notes: val,
          savedAt: Date.now(),
        }),
      );
    } catch {
      // ignore
    }
  };

  // Load doctor, slot, and patient wallet details dynamically
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsDataLoading(true);
        setErrorMessage(null);

        // 1. Fetch or resolve Doctor details
        let loadedDoc: DoctorDetail | null = null;
        if (doctorIdParam) {
          try {
            const docRes = await fetch(`${API_BASE}/doctors/${doctorIdParam}`);
            if (docRes.ok) {
              const docData = await docRes.json();
              loadedDoc = {
                id: docData.id || doctorIdParam,
                fullName: docData.user?.full_name || docData.fullName || 'Dr. Medical Practitioner',
                specialty: docData.specialty || 'General Practitioner',
                hpcsaNumber: docData.hpcsa_number || docData.hpcsaNumber || 'MP 0689432',
                ratePerHour: Number(docData.rate_per_hour || docData.ratePerHour) || 850.0,
                photoUrl: docData.user?.avatar_url || docData.photo_url || docData.photoUrl || '/images/doctor_thabo.jpg',
                facilityName: docData.facility_name || docData.facilityName || 'Medical Consulting Suites',
                facilityAddress: docData.facility_address || docData.facilityAddress || 'South Africa',
                slug: docData.slug || doctorIdParam,
              };
            }
          } catch {
            // API offline
          }

          if (!loadedDoc) {
            throw new Error('Doctor profile could not be loaded. Please return to the directory and try again.');
          }

          if (isMounted) {
            setDoctor(loadedDoc);
          }
        }

        // 2. Resolve Slot Details dynamically
        let resolvedSlot: SlotDetail | null = null;

        if (slotIdParam && slotIdParam.startsWith('slot-')) {
          const match = slotIdParam.match(/^slot-(\d{4}-\d{2}-\d{2})-(\d{1,2}:\d{2})$/);
          if (match) {
            const [, slotDateStr, slotTimeStr] = match;
            const [h, m] = slotTimeStr.split(':').map(Number);
            const start = new Date(`${slotDateStr}T00:00:00`);
            start.setHours(h, m, 0, 0);
            const end = new Date(start.getTime() + 45 * 60 * 1000);

            resolvedSlot = {
              id: slotIdParam,
              startTime: start.toISOString(),
              endTime: end.toISOString(),
            };
          }
        }

        if (!resolvedSlot && startParam) {
          const baseDate = new Date(startParam);
          const endDate = endParam ? new Date(endParam) : new Date(baseDate.getTime() + 45 * 60 * 1000);
          if (Number.isNaN(baseDate.getTime()) || Number.isNaN(endDate.getTime())) {
            throw new Error('The selected appointment time is invalid. Please return to the doctor profile and choose another slot.');
          }
          resolvedSlot = {
            id: slotIdParam || `slot-${baseDate.toISOString()}`,
            startTime: baseDate.toISOString(),
            endTime: endDate.toISOString(),
          };
        }

        if (!resolvedSlot) {
          throw new Error('No published appointment slot was selected. Please return to the doctor profile.');
        }

        if (isMounted) {
          setSlot(resolvedSlot);
        }

        // 3. Fetch Patient Wallet Balance if authenticated
        if (token) {
          try {
            const walletRes = await fetch(`${API_BASE}/payments/wallet/balance`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (walletRes.ok) {
              const walletData = await walletRes.json();
              if (isMounted) {
                setWalletBalance(Number(walletData.total_balance) || 0);
              }
            }
          } catch {
            // non-blocking
          }
        }
      } catch (err) {
        console.error('Error loading checkout data:', err);
      } finally {
        if (isMounted) setIsDataLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [doctorIdParam, slotIdParam, dateParam, token, API_BASE]);

  // Financial calculations
  const consultationPrice = doctor?.ratePerHour || 850.0;
  const maxDeductibleCredits = Math.min(walletBalance, consultationPrice);
  const creditsApplied = useWalletCredits ? maxDeductibleCredits : 0;
  const totalPayable = Math.max(0, consultationPrice - creditsApplied);
  const isFullyCovered = totalPayable === 0;

  // A slot stays bookable while at least the minimum consultation time remains
  // (must match backend SLOT_BOOKING_MIN_REMAINING_MINUTES).
  const isPastSlot = Boolean(
    slot &&
      (slot.endTime
        ? new Date(slot.endTime).getTime() - Date.now() < 15 * 60 * 1000
        : slot.startTime && new Date(slot.startTime).getTime() <= Date.now())
  );

  // Format date and time (en-ZA locale)
  const formattedDate = useMemo(() => {
    if (!slot) return 'Selected Date';
    return new Date(slot.startTime).toLocaleDateString('en-ZA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [slot]);

  const formattedTime = useMemo(() => {
    if (!slot) return '10:00 – 10:45 SAST';
    const start = new Date(slot.startTime).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const end = new Date(slot.endTime).toLocaleTimeString('en-ZA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${start} – ${end} SAST`;
  }, [slot]);

  // Handle local file drop or selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const newReports: AttachedReport[] = files.map((file) => ({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
      }));
      setAttachedReports((prev) => [...prev, ...newReports]);
    }
  };

  const handleRemoveReport = (index: number) => {
    setAttachedReports((prev) => prev.filter((_, i) => i !== index));
  };

  // Upload attached files to S3 via presigned upload URLs
  const uploadReports = async (): Promise<{ name: string; url: string; fileType: string; sizeBytes: number }[]> => {
    if (attachedReports.length === 0 || !token) return [];

    const uploadedList: { name: string; url: string; fileType: string; sizeBytes: number }[] = [];

    for (const report of attachedReports) {
      try {
        const presignRes = await fetch(`${API_BASE}/storage/presigned-upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            filename: report.name,
            contentType: report.type || 'application/pdf',
            category: 'lab_report',
          }),
        });

        if (presignRes.ok) {
          const presignData = await presignRes.json();
          const uploadRes = await fetch(presignData.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': report.type || 'application/pdf',
            },
            body: report.file,
          });

          if (uploadRes.ok) {
            uploadedList.push({
              name: report.name,
              url: presignData.fileUrl,
              fileType: report.type,
              sizeBytes: report.size,
            });
          }
        }
      } catch (err) {
        console.warn('Document pre-upload error:', err);
      }
    }

    return uploadedList;
  };

  // Core Booking Saga & Payment Trigger (supports passing token directly if freshly logged in)
  const executeBookingSaga = async (authToken?: string) => {
    if (isPastSlot) {
      setErrorMessage('This appointment slot no longer has enough time remaining and cannot be booked. Please choose another available slot.');
      return;
    }

    const activeToken = authToken || token;
    if (!activeToken) {
      setShowAuthModal(true);
      return;
    }
    if (!doctor?.id || !slot?.id) {
      setErrorMessage('Doctor and appointment details could not be loaded. Please return to the doctor profile and choose an available slot.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('Uploading medical reports...');
    setErrorMessage(null);

    try {
      // 1. Upload attached test reports to secure S3 storage if any
      const uploadedAttachments = await uploadReports();

      // 2. Trigger Cross-DB Booking Saga (BE-501)
      setProcessingStatus('Reserving consultation slot with doctor...');
      const bookingRes = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          slotId: slot.id,
          doctorId: doctor.id,
          notes: notes.trim(),
          reasonCategory: 'consultation',
          consultationMode: typeParam,
          attachments: uploadedAttachments,
        }),
      });

      const bookingData = await bookingRes.json();

      if (!bookingRes.ok) {
        throw new Error(
          bookingData.message || 'Could not reserve consultation slot. It may have just been booked.',
        );
      }

      const createdBookingId = bookingData.id;

      // 3. Initiate Payment (BE-502)
      setProcessingStatus('Connecting to Paystack secure checkout...');
      const payRes = await fetch(`${API_BASE}/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          bookingId: createdBookingId,
          useWalletCredits,
        }),
      });

      const payData = await payRes.json();

      if (!payRes.ok) {
        throw new Error(payData.message || 'Payment initiation failed. Please try again.');
      }

      // Clear draft on successful booking
      try {
        sessionStorage.removeItem('chekup_checkout_draft');
      } catch {}

      // If fully covered by platform credits, directly redirect to success page
      if (payData.covered_by_credits || payData.amount === 0) {
        toastSuccess('Booking confirmed', 'Covered by your wallet credits.');
        router.push(
          `/bookings/success?bookingId=${createdBookingId}&reference=${payData.reference || 'credits_' + createdBookingId}`,
        );
        return;
      }

      // Paystack Checkout Redirect
      if (payData.authorization_url) {
        toastSuccess('Redirecting to payment', 'Complete your payment to confirm the booking.');
        window.location.href = payData.authorization_url;
      } else {
        throw new Error(
          'Paystack did not provide a payment page. Your booking was not confirmed. Please try again.',
        );
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      const _msg = err instanceof Error && err.message ? err.message : 'An unexpected error occurred during checkout.';
      setErrorMessage(_msg);
      toastError('Booking failed', _msg);
      setIsProcessing(false);
    }
  };

  // Main entry point from CTA button
  const handleProceedToPayment = async () => {
    // 0. CHECK IF SLOT IS IN THE PAST
    if (isPastSlot) {
      setErrorMessage('This appointment time is in the past and cannot be booked. Please select an upcoming date and time.');
      window.scrollTo({ top: 120, behavior: 'smooth' });
      return;
    }

    // 1. ALWAYS VALIDATE REQUIRED CLINICAL FIELDS FIRST!
    if (!notes.trim()) {
      setCurrentStep(1);
      setNotesError(true);
      setErrorMessage('Please provide your primary reason for consultation before proceeding. This information is required for the doctor.');
      window.scrollTo({ top: 180, behavior: 'smooth' });
      return;
    }

    // 2. Persist draft to sessionStorage
    try {
      sessionStorage.setItem(
        'chekup_checkout_draft',
        JSON.stringify({
          doctorId: doctorIdParam,
          slotId: slotIdParam,
          date: dateParam,
          type: typeParam,
          notes: notes.trim(),
          savedAt: Date.now(),
        }),
      );
    } catch {}

    // 3. Check Authentication. If not logged in, show in-page Auth Modal
    if (!isAuthenticated || !token) {
      setShowAuthModal(true);
      return;
    }

    // 4. Authenticated -> execute booking
    await executeBookingSaga();
  };

  // In-Page Auth Modal Submit Handler
  const handleAuthModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthModalError(null);
    setAuthModalLoading(true);

    try {
      let activeToken = token;

      if (authModalTab === 'login') {
        if (!authEmail.trim() || !authPassword) {
          throw new Error('Please enter both your email address and password.');
        }
        const logRes = await login(authEmail.trim(), authPassword);
        activeToken = logRes.accessToken || localStorage.getItem('chekup_token');
      } else {
        if (!authName.trim() || !authEmail.trim() || !authPassword) {
          throw new Error('Please enter your full name, email address, and password.');
        }
        if (authPassword.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
        const regRes = await register({
          full_name: authName.trim(),
          email: authEmail.trim(),
          password: authPassword,
          phone: authPhone.trim() || undefined,
        });

        activeToken = regRes.accessToken || localStorage.getItem('chekup_token');
        if (!activeToken) {
          const logRes = await login(authEmail.trim(), authPassword);
          activeToken = logRes.accessToken || localStorage.getItem('chekup_token');
        }
      }

      setShowAuthModal(false);

      // Now seamlessly continue to booking payment with the acquired session
      await executeBookingSaga(activeToken || undefined);
    } catch (err: any) {
      setAuthModalError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setAuthModalLoading(false);
    }
  };

  // Full-page Loading State while practitioner availability & auth session are initializing
  if (isDataLoading || isAuthLoading) {
    return (
      <div
        style={{
          minHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-cream-base, #FAF6EE)',
          padding: '40px 16px',
        }}
      >
        <div
          style={{
            background: 'var(--color-cream-surface, #FDFBF7)',
            border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
            borderRadius: '24px',
            padding: '40px',
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(42, 23, 15, 0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(223, 171, 98, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-gold-bronze, #B88647)',
            }}
          >
            <Loader2 size={28} className="animate-spin" />
          </div>
          <div>
            <h3
              style={{
                fontSize: '1.2rem',
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                color: 'var(--color-chocolate-base, #2A170F)',
              }}
            >
              Loading Consultation Checkout
            </h3>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-cream-text-muted, #6B5E55)',
                marginTop: '6px',
                lineHeight: 1.5,
              }}
            >
              Verifying practitioner availability & appointment slot...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream-base, #FAF6EE)', paddingBottom: '90px' }}>
      {/* Top Header Navigation Strip */}
      <div
        style={{
          background: 'var(--color-cream-surface, #FDFBF7)',
          borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
          padding: '24px 0',
        }}
      >
        <div className="container" style={{ maxWidth: '1140px' }}>
          <Breadcrumbs
            items={[
              { label: 'Find a Doctor', href: '/doctors' },
              { label: doctor?.fullName || 'Doctor Profile', href: `/doctors/${doctor?.slug || doctorIdParam}` },
              { label: 'Review & Pay' },
            ]}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '14px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: '1.85rem',
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                }}
              >
                Consultation Checkout
              </h1>
              <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.925rem', marginTop: '4px' }}>
                Review appointment details, describe your consultation reason, and pay securely in South African Rand (ZAR)
              </p>
            </div>

            {/* HPCSA Verified Guarantee Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--color-profile-hpcsa-bg, rgba(223, 171, 98, 0.16))',
                color: 'var(--color-profile-hpcsa-text, #8E5A1C)',
                border: '1px solid var(--color-profile-hpcsa-border, rgba(223, 171, 98, 0.35))',
                padding: '7px 16px',
                borderRadius: 'var(--radius-full, 9999px)',
                fontSize: '0.825rem',
                fontWeight: 700,
              }}
            >
              <ShieldCheck size={17} style={{ color: 'var(--color-gold-bronze, #B88647)' }} />
              <span>HPCSA Verified Telehealth Guarantee</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '1140px', marginTop: '32px' }}>
        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '16px 20px',
              borderRadius: '14px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Booking Error</div>
              <div style={{ fontSize: '0.875rem', marginTop: '2px' }}>{errorMessage}</div>
            </div>
          </div>
        )}

        {/* Past Slot Error Alert Banner */}
        {isPastSlot && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '18px 24px',
              borderRadius: '16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: '0 4px 16px rgba(220, 38, 38, 0.08)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <AlertCircle size={24} style={{ flexShrink: 0, color: '#DC2626' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#991b1b' }}>
                  This Appointment Slot Is No Longer Available
                </div>
                <div style={{ fontSize: '0.875rem', marginTop: '3px', color: '#7f1d1d' }}>
                  Too little consultation time remains in this slot. Please choose another available slot on the doctor&apos;s schedule.
                </div>
              </div>
            </div>
            <Link
              href={`/doctors/${doctor?.slug || doctorIdParam}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '9999px',
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '0.875rem',
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
              }}
            >
              <span>Choose Another Slot</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        )}

        {/* 2-COLUMN BALANCED ASYMMETRICAL GRID (62% Left, 38% Right) */}
        <div className="checkout-layout-grid">
          {/* ========================================================= */}
          {/* LEFT COLUMN: Main Stage (Appointment, Stepper, Intake)    */}
          {/* ========================================================= */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* 1. Combined Doctor & Schedule Overview Card */}
            <div
              style={{
                background: 'var(--color-cream-surface, #FDFBF7)',
                borderRadius: '20px',
                border: '1px solid var(--color-profile-border, rgba(42, 23, 15, 0.08))',
                padding: '24px',
                boxShadow: '0 4px 20px rgba(42, 23, 15, 0.04)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '18px',
                }}
              >
                {/* Doctor Bio Snippet */}
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <img
                    src={doctor?.photoUrl || '/images/doctor_thabo.jpg'}
                    alt={doctor?.fullName || 'Doctor'}
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '16px',
                      objectFit: 'cover',
                      border: '2px solid var(--color-gold-base, #DFAB62)',
                      boxShadow: '0 4px 12px rgba(42, 23, 15, 0.08)',
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <h3
                      style={{
                        fontSize: '1.2rem',
                        fontFamily: 'var(--font-heading)',
                        color: 'var(--color-chocolate-base, #2A170F)',
                        fontWeight: 800,
                      }}
                    >
                      {doctor?.fullName || 'Dr. Thabo Molefe'}
                    </h3>
                    <div
                      style={{
                        color: 'var(--color-gold-bronze, #B88647)',
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        marginTop: '2px',
                      }}
                    >
                      {doctor?.specialty || 'General Practitioner & Family Health'}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '4px',
                        fontSize: '0.78rem',
                        color: 'var(--color-cream-text-muted, #6B5E55)',
                      }}
                    >
                      <span>HPCSA: {doctor?.hpcsaNumber || 'MP 0689432'}</span>
                      <span>•</span>
                      <span style={{ color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCircle2 size={13} /> Verified
                      </span>
                    </div>
                  </div>
                </div>

                {/* Consultation Mode Pill */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    background: 'rgba(223, 171, 98, 0.16)',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  {typeParam === 'in_clinic' ? (
                    <>
                      <Building size={14} style={{ color: 'var(--color-gold-bronze, #B88647)' }} />
                      <span>In-Clinic Visit</span>
                    </>
                  ) : typeParam === 'audio' ? (
                    <>
                      <Phone size={14} style={{ color: 'var(--color-gold-bronze, #B88647)' }} />
                      <span>Audio Telehealth</span>
                    </>
                  ) : (
                    <>
                      <Video size={14} style={{ color: 'var(--color-gold-bronze, #B88647)' }} />
                      <span>HD Video Telehealth</span>
                    </>
                  )}
                </div>
              </div>

              {/* Date & Time Strip inside the card */}
              <div
                style={{
                  marginTop: '18px',
                  paddingTop: '16px',
                  borderTop: '1px solid var(--color-profile-border, rgba(42, 23, 15, 0.08))',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'var(--color-cream-base, #FAF6EE)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
                  }}
                >
                  <Calendar size={18} style={{ color: 'var(--color-gold-bronze, #B88647)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gold-bronze, #B88647)', letterSpacing: '0.04em' }}>
                      Date
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)' }}>
                      {formattedDate}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'var(--color-cream-base, #FAF6EE)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
                  }}
                >
                  <Clock size={18} style={{ color: 'var(--color-gold-bronze, #B88647)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-gold-bronze, #B88647)', letterSpacing: '0.04em' }}>
                      Time Window
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)' }}>
                      {formattedTime}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Interactive Stepper Card (Step 1: Clinical Reason, Step 2: Test Reports) */}
            <div
              style={{
                background: 'var(--color-cream-surface, #FDFBF7)',
                borderRadius: '20px',
                border: '1px solid var(--color-profile-border, rgba(42, 23, 15, 0.08))',
                padding: '28px',
                boxShadow: '0 4px 20px rgba(42, 23, 15, 0.04)',
              }}
            >
              {/* Stepper with connecting line */}
              <div
                style={{
                  paddingBottom: '22px',
                  marginBottom: '24px',
                  borderBottom: '1px solid var(--color-profile-border, rgba(42, 23, 15, 0.08))',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    position: 'relative',
                    gap: '12px',
                  }}
                >
                  {/* Step 1: Reason for Visit (Required) */}
                  <button
                    type="button"
                    onClick={() => {
                      setNotesError(false);
                      setCurrentStep(1);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      textAlign: 'left',
                      borderRadius: '10px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        transition: 'all 0.25s ease',
                        background: notes.trim().length > 0
                          ? 'var(--color-chocolate-base, #2A170F)'
                          : currentStep === 1
                          ? 'var(--color-gold-primary, #E2B467)'
                          : 'var(--color-cream-base, #FAF6EE)',
                        color: notes.trim().length > 0
                          ? '#ffffff'
                          : currentStep === 1
                          ? 'var(--color-chocolate-base, #2A170F)'
                          : 'var(--color-cream-text-muted, #6B5E55)',
                        border: notes.trim().length > 0
                          ? '2px solid var(--color-gold-base, #DFAB62)'
                          : currentStep === 1
                          ? '2px solid var(--color-chocolate-base, #2A170F)'
                          : '2px solid rgba(42, 23, 15, 0.18)',
                        boxShadow: currentStep === 1 ? '0 0 0 4px rgba(223, 171, 98, 0.28)' : 'none',
                        flexShrink: 0,
                        zIndex: 2,
                      }}
                    >
                      {notes.trim().length > 0 ? (
                        <Check size={17} strokeWidth={2.8} style={{ color: 'var(--color-gold-primary, #E2B467)' }} />
                      ) : (
                        '1'
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.92rem',
                            fontWeight: 800,
                            fontFamily: 'var(--font-heading)',
                            color: currentStep === 1 ? 'var(--color-chocolate-base, #2A170F)' : 'var(--color-cream-text-muted, #6B5E55)',
                          }}
                        >
                          Reason for Visit
                        </span>
                        <span
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            background: '#fee2e2',
                            color: '#b91c1c',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid #fecaca',
                          }}
                        >
                          Required
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '2px' }}>
                        {notes.trim().length > 0 ? (
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>Completed</span>
                        ) : (
                          'Symptoms & visit purpose'
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Connecting Line with Progress Tracker */}
                  <div
                    style={{
                      flex: 1,
                      height: '2px',
                      margin: '0 8px',
                      background: notes.trim().length > 0
                        ? 'var(--color-gold-base, #DFAB62)'
                        : 'rgba(42, 23, 15, 0.14)',
                      transition: 'background 0.3s ease',
                      position: 'relative',
                      minWidth: '24px',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: notes.trim().length > 0 ? 'var(--color-gold-base, #DFAB62)' : 'rgba(42, 23, 15, 0.22)',
                        transition: 'background 0.3s ease',
                      }}
                    />
                  </div>

                  {/* Step 2: Medical Reports (Optional) */}
                  <button
                    type="button"
                    onClick={() => {
                      if (notes.trim().length === 0) {
                        setNotesError(true);
                        return;
                      }
                      setNotesError(false);
                      setCurrentStep(2);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px 6px',
                      textAlign: 'left',
                      borderRadius: '10px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        transition: 'all 0.25s ease',
                        background: attachedReports.length > 0
                          ? 'var(--color-chocolate-base, #2A170F)'
                          : currentStep === 2
                          ? 'var(--color-gold-primary, #E2B467)'
                          : 'var(--color-cream-base, #FAF6EE)',
                        color: attachedReports.length > 0
                          ? '#ffffff'
                          : currentStep === 2
                          ? 'var(--color-chocolate-base, #2A170F)'
                          : 'var(--color-cream-text-muted, #6B5E55)',
                        border: attachedReports.length > 0
                          ? '2px solid var(--color-gold-base, #DFAB62)'
                          : currentStep === 2
                          ? '2px solid var(--color-chocolate-base, #2A170F)'
                          : '2px solid rgba(42, 23, 15, 0.18)',
                        boxShadow: currentStep === 2 ? '0 0 0 4px rgba(223, 171, 98, 0.28)' : 'none',
                        flexShrink: 0,
                        zIndex: 2,
                      }}
                    >
                      {attachedReports.length > 0 ? (
                        <Check size={17} strokeWidth={2.8} style={{ color: 'var(--color-gold-primary, #E2B467)' }} />
                      ) : (
                        '2'
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.92rem',
                            fontWeight: 800,
                            fontFamily: 'var(--font-heading)',
                            color: currentStep === 2 ? 'var(--color-chocolate-base, #2A170F)' : 'var(--color-cream-text-muted, #6B5E55)',
                          }}
                        >
                          Medical Reports
                        </span>
                        <span
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            background: 'rgba(42, 23, 15, 0.06)',
                            color: 'var(--color-cream-text-muted, #6B5E55)',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            border: '1px solid rgba(42, 23, 15, 0.1)',
                          }}
                        >
                          Optional
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '2px' }}>
                        {attachedReports.length > 0 ? (
                          <span style={{ color: '#16a34a', fontWeight: 600 }}>{attachedReports.length} file(s) attached</span>
                        ) : (
                          'Attach lab tests or skip'
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* STEP 1 BODY: Primary Reason for Consultation (PARAGRAPH FIELD, NO PILLS, REQUIRED) */}
              {currentStep === 1 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Stethoscope size={18} style={{ color: 'var(--color-gold-bronze, #B88647)' }} />
                      <h2
                        style={{
                          fontSize: '1.25rem',
                          fontFamily: 'var(--font-heading)',
                          color: 'var(--color-chocolate-base, #2A170F)',
                          fontWeight: 800,
                        }}
                      >
                        Primary Reason for Consultation <span style={{ color: '#dc2626' }}>*</span>
                      </h2>
                    </div>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: '#b91c1c',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        padding: '2px 8px',
                        borderRadius: '6px',
                      }}
                    >
                      Required for Doctor Intake
                    </span>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginBottom: '18px', lineHeight: 1.5 }}>
                    Please describe what you are experiencing, how long you’ve had symptoms, or what you hope to address during this appointment. Writing this helps {doctor?.fullName || 'the doctor'} prepare thoroughly before joining your call.
                  </p>

                  {/* Required Validation Alert */}
                  {notesError && (
                    <div
                      style={{
                        marginBottom: '14px',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        color: '#991b1b',
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <AlertCircle size={16} style={{ flexShrink: 0 }} />
                      <span>Please describe your reason for consultation before proceeding. This information is required for the doctor.</span>
                    </div>
                  )}

                  {/* Spacious Paragraph Field */}
                  <div style={{ position: 'relative' }}>
                    <textarea
                      rows={5}
                      value={notes}
                      onChange={(e) => handleNotesChange(e.target.value)}
                      placeholder="e.g. For the past 3 days I have had a severe sore throat, dry cough, and mild fever especially in the evenings. Over-the-counter flu meds have not helped. I would like a clinical diagnosis, advice on whether I need antibiotics, and a prescription renewal if required..."
                      style={{
                        width: '100%',
                        padding: '16px',
                        borderRadius: '14px',
                        border: notesError ? '1.5px solid #dc2626' : '1.5px solid rgba(42, 23, 15, 0.16)',
                        background: '#ffffff',
                        fontSize: '0.95rem',
                        color: 'var(--color-chocolate-base, #2A170F)',
                        fontFamily: 'inherit',
                        lineHeight: 1.55,
                        outline: 'none',
                        resize: 'vertical',
                        boxShadow: notesError ? '0 0 0 3px rgba(220, 38, 38, 0.12)' : 'inset 0 1px 3px rgba(0,0,0,0.02)',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      }}
                      onFocus={(e) => (e.currentTarget.style.borderColor = notesError ? '#dc2626' : 'var(--color-gold-base, #DFAB62)')}
                      onBlur={(e) => (e.currentTarget.style.borderColor = notesError ? '#dc2626' : 'rgba(42, 23, 15, 0.16)')}
                    />
                  </div>

                  {/* Helpful Guidance Hint Underneath */}
                  <div
                    style={{
                      marginTop: '10px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '0.8rem',
                      color: 'var(--color-cream-text-muted, #6B5E55)',
                    }}
                  >
                    <Info size={15} style={{ color: 'var(--color-gold-bronze, #B88647)', flexShrink: 0, marginTop: '2px' }} />
                    <span>
                      <strong>Helpful context:</strong> Mention duration of symptoms, any prior medications taken, or whether you need a medical certificate / sick note for work.
                    </span>
                  </div>

                  {/* Step 1 Footer Action */}
                  <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (notes.trim().length === 0) {
                          setNotesError(true);
                          return;
                        }
                        setNotesError(false);
                        setCurrentStep(2);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '13px 24px',
                        borderRadius: '12px',
                        background: 'var(--color-chocolate-base, #2A170F)',
                        color: 'var(--color-gold-pale, #F0E5D3)',
                        border: 'none',
                        fontSize: '0.925rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-heading)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <span>Continue to Medical Documents</span>
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2 BODY: Medical Documents & Triage Attachment (Optional) */}
              {currentStep === 2 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <UploadCloud size={20} style={{ color: 'var(--color-gold-bronze, #B88647)' }} />
                    <h2
                      style={{
                        fontSize: '1.25rem',
                        fontFamily: 'var(--font-heading)',
                        color: 'var(--color-chocolate-base, #2A170F)',
                        fontWeight: 800,
                      }}
                    >
                      Attach Medical Reports or Lab Results (Optional)
                    </h2>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginBottom: '18px', lineHeight: 1.5 }}>
                    If you have recent pathology results (Lancet, Ampath, Pathcare), blood tests, radiology reports, or hospital summaries, you can attach them now.
                  </p>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                  />

                  {/* Dropzone */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '1.5px dashed var(--color-gold-border, rgba(223, 171, 98, 0.45))',
                      borderRadius: '16px',
                      padding: '24px',
                      textAlign: 'center',
                      background: 'var(--color-cream-base, #FAF6EE)',
                      cursor: 'pointer',
                      transition: 'background 0.2s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(223, 171, 98, 0.16)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-cream-base, #FAF6EE)')}
                  >
                    <UploadCloud size={30} style={{ color: 'var(--color-gold-bronze, #B88647)', margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                      Click to upload lab test, blood report, or imaging scan
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '4px' }}>
                      PDF, JPG, PNG up to 15MB. Encrypted via POPIA & HPCSA healthcare protocol.
                    </div>
                  </div>

                  {/* Attached Reports List */}
                  {attachedReports.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)' }}>
                        Attached Documents ({attachedReports.length}):
                      </div>
                      {attachedReports.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            background: '#ffffff',
                            border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
                            fontSize: '0.85rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                            <FileText size={16} style={{ color: 'var(--color-gold-bronze, #B88647)', flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: 'var(--color-chocolate-base, #2A170F)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {item.name}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                              ({(item.size / 1024).toFixed(0)} KB)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveReport(idx)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#991b1b',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                            title="Remove file"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Post-Payment Intake Assurance Box */}
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'rgba(223, 171, 98, 0.12)',
                      border: '1px solid rgba(223, 171, 98, 0.25)',
                      fontSize: '0.825rem',
                      color: 'var(--color-chocolate-base, #2A170F)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <Info size={16} style={{ color: 'var(--color-gold-bronze, #B88647)', flexShrink: 0 }} />
                    <span>
                      Don't have your test reports right now? You can also upload or update documents on your confirmation screen anytime before your call.
                    </span>
                  </div>

                  {/* Medical Emergency Disclaimer Guardrail */}
                  <div
                    style={{
                      marginTop: '20px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '10px',
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      fontSize: '0.78rem',
                      color: '#92400e',
                      lineHeight: 1.45,
                    }}
                  >
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#b45309' }} />
                    <div>
                      <strong>Emergency Disclaimer:</strong> Telehealth consultations are for non-emergency medical care only. If you are experiencing severe chest pain, stroke signs, difficulty breathing, or trauma, please call <strong>10111 / 112</strong> immediately.
                    </div>
                  </div>

                  {/* Stepper Navigation Buttons */}
                  <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '12px 18px',
                        borderRadius: '12px',
                        background: 'none',
                        color: 'var(--color-chocolate-base, #2A170F)',
                        border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.35))',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      <ArrowLeft size={16} />
                      <span>Back to Reason</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleProceedToPayment}
                      disabled={isProcessing || isPastSlot}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '13px 26px',
                        borderRadius: '12px',
                        background: isPastSlot ? '#9CA3AF' : 'var(--color-gold-primary, #E2B467)',
                        color: isPastSlot ? '#FFFFFF' : 'var(--color-chocolate-base, #2A170F)',
                        border: 'none',
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        fontFamily: 'var(--font-heading)',
                        cursor: isProcessing || isPastSlot ? 'not-allowed' : 'pointer',
                        opacity: isProcessing || isPastSlot ? 0.7 : 1,
                        boxShadow: isPastSlot ? 'none' : '0 4px 14px var(--color-gold-cta-shadow, rgba(226, 180, 103, 0.35))',
                      }}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : isPastSlot ? (
                        <span>Slot Expired (Cannot Book)</span>
                      ) : (
                        <>
                          <Lock size={16} />
                          <span>Complete & Pay with Paystack</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT COLUMN: Streamlined, Balanced Fee Summary Card      */}
          {/* ========================================================= */}
          <div
            style={{
              background: 'var(--color-cream-surface, #FDFBF7)',
              borderRadius: '22px',
              border: '1px solid var(--color-profile-border, rgba(42, 23, 15, 0.08))',
              padding: '24px',
              boxShadow: '0 6px 28px rgba(42, 23, 15, 0.05)',
              position: 'sticky',
              top: '90px',
              maxWidth: '380px',
              width: '100%',
            }}
          >
            <div style={{ marginBottom: '16px' }}>
              <h3
                style={{
                  fontSize: '1.2rem',
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontWeight: 800,
                }}
              >
                Fee Summary
              </h3>
            </div>

            {/* Doctor & Appointment Mini Preview */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '12px',
                background: 'var(--color-cream-base, #FAF6EE)',
                marginBottom: '18px',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
              }}
            >
              <img
                src={doctor?.photoUrl || '/images/doctor_thabo.jpg'}
                alt={doctor?.fullName || 'Doctor'}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  objectFit: 'cover',
                  border: '1.5px solid var(--color-gold-base, #DFAB62)',
                  flexShrink: 0,
                }}
              />
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--color-chocolate-base, #2A170F)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {doctor?.fullName || 'Dr. Thabo Molefe'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                  {formattedDate} • {formattedTime.split(' – ')[0]}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                <span>Telehealth Consultation</span>
                <span style={{ fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)' }}>
                  R{consultationPrice.toFixed(2)}
                </span>
              </div>

              {/* Wallet Credits Toggle */}
              <div
                style={{
                  marginTop: '4px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: walletBalance > 0 ? 'rgba(223, 171, 98, 0.12)' : 'var(--color-cream-base, #FAF6EE)',
                  border: `1px solid ${walletBalance > 0 ? 'rgba(223, 171, 98, 0.3)' : 'var(--color-gold-border, rgba(223, 171, 98, 0.2))'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wallet size={16} style={{ color: walletBalance > 0 ? 'var(--color-gold-bronze, #B88647)' : '#94a3b8' }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.825rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                        ChekUp247 Wallet Credits
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                        Balance: R{walletBalance.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {walletBalance > 0 ? (
                    <input
                      type="checkbox"
                      checked={useWalletCredits}
                      onChange={(e) => setUseWalletCredits(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--color-chocolate-base, #2A170F)' }}
                    />
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 600 }}>R0.00</span>
                  )}
                </div>

                {useWalletCredits && creditsApplied > 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '8px',
                      borderTop: '1px dashed rgba(223, 171, 98, 0.4)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.8rem',
                      color: 'var(--color-chocolate-base, #2A170F)',
                      fontWeight: 700,
                    }}
                  >
                    <span>Credit Applied:</span>
                    <span>-R{creditsApplied.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Net Total */}
              <div
                style={{
                  marginTop: '10px',
                  paddingTop: '14px',
                  borderTop: '2px solid rgba(42, 23, 15, 0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span
                  style={{
                    fontSize: '1.05rem',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    color: 'var(--color-chocolate-base, #2A170F)',
                  }}
                >
                  Total Payable:
                </span>
                <span
                  style={{
                    fontSize: '1.65rem',
                    fontWeight: 900,
                    color: 'var(--color-chocolate-base, #2A170F)',
                    fontFamily: 'var(--font-heading)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  R{totalPayable.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Signature Gold CTA Button */}
            <button
              onClick={handleProceedToPayment}
              disabled={isProcessing || isPastSlot}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: isPastSlot ? '#9CA3AF' : 'var(--color-gold-primary, #E2B467)',
                color: isPastSlot ? '#FFFFFF' : 'var(--color-chocolate-base, #2A170F)',
                border: 'none',
                fontSize: '1rem',
                fontWeight: 800,
                fontFamily: 'var(--font-heading)',
                cursor: isProcessing || isPastSlot ? 'not-allowed' : 'pointer',
                opacity: isProcessing || isPastSlot ? 0.75 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isPastSlot ? 'none' : '0 4px 16px var(--color-gold-cta-shadow, rgba(226, 180, 103, 0.35))',
                transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                if (!isProcessing && !isPastSlot) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-hover, #ECC076)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isProcessing && !isPastSlot) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-primary, #E2B467)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Securing Payment...</span>
                </>
              ) : isPastSlot ? (
                <span>Slot Expired (Cannot Book)</span>
              ) : isFullyCovered ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>Confirm Booking (R0.00)</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Pay R{totalPayable.toFixed(2)} with Paystack</span>
                </>
              )}
            </button>

            {/* Security & Payment Badges with light dotted horizontal lines */}
            <div
              style={{
                marginTop: '20px',
                paddingTop: '6px',
                display: 'flex',
                flexDirection: 'column',
                fontSize: '0.76rem',
                color: 'var(--color-cream-text-muted, #6B5E55)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 0' }}>
                <ShieldCheck size={15} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span>Paystack PCI-DSS Level 1 Encrypted</span>
              </div>

              <div style={{ borderTop: '1px dotted rgba(42, 23, 15, 0.16)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 0' }}>
                <CreditCard size={15} style={{ color: 'var(--color-gold-bronze, #B88647)', flexShrink: 0 }} />
                <span>Supports Visa, Mastercard, Instant EFT</span>
              </div>

              <div style={{ borderTop: '1px dotted rgba(42, 23, 15, 0.16)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 0' }}>
                <Clock size={15} style={{ color: 'var(--color-gold-bronze, #B88647)', flexShrink: 0 }} />
                <span>100% full refund if cancelled 24h prior</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. Full-Screen Interactive Payment Processing Overlay     */}
      {/* ========================================================= */}
      {isProcessing && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(42, 23, 15, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--color-cream-surface, #FDFBF7)',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.35))',
              borderRadius: '24px',
              padding: '36px 40px',
              maxWidth: '440px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '18px',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(223, 171, 98, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-gold-bronze, #B88647)',
              }}
            >
              <Loader2 size={32} className="animate-spin" />
            </div>
            <div>
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  color: 'var(--color-chocolate-base, #2A170F)',
                }}
              >
                Securing Your Consultation
              </h3>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontWeight: 600,
                  marginTop: '8px',
                }}
              >
                {processingStatus}
              </p>
              <p
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--color-cream-text-muted, #6B5E55)',
                  marginTop: '6px',
                }}
              >
                Please do not close or refresh this window.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. In-Page Quick Authentication & Registration Modal       */}
      {/* ========================================================= */}
      {showAuthModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: 'rgba(42, 23, 15, 0.7)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: 'var(--color-cream-surface, #FDFBF7)',
              border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.4))',
              borderRadius: '24px',
              padding: '32px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 25px 60px rgba(42, 23, 15, 0.35)',
              position: 'relative',
            }}
          >
            {/* Close Modal Button */}
            <button
              type="button"
              onClick={() => setShowAuthModal(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'rgba(42, 23, 15, 0.06)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--color-chocolate-base, #2A170F)',
              }}
              title="Close"
            >
              <X size={18} />
            </button>

            {/* Header info */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(223, 171, 98, 0.16)',
                  color: 'var(--color-gold-bronze, #B88647)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  marginBottom: '10px',
                }}
              >
                <ShieldCheck size={14} />
                <span>Patient Account Required</span>
              </div>
              <h3
                style={{
                  fontSize: '1.35rem',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 800,
                  color: 'var(--color-chocolate-base, #2A170F)',
                }}
              >
                {authModalTab === 'login' ? 'Sign In to Confirm Booking' : 'Create Patient Account'}
              </h3>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-cream-text-muted, #6B5E55)',
                  marginTop: '4px',
                  lineHeight: 1.45,
                }}
              >
                Your appointment slot and consultation details are saved.
              </p>
            </div>

            {/* Auth Tab Switcher */}
            <div
              style={{
                display: 'flex',
                background: 'var(--color-cream-base, #FAF6EE)',
                padding: '4px',
                borderRadius: '12px',
                marginBottom: '20px',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setAuthModalTab('login');
                  setAuthModalError(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '9px',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: authModalTab === 'login' ? 'var(--color-chocolate-base, #2A170F)' : 'transparent',
                  color: authModalTab === 'login' ? '#ffffff' : 'var(--color-chocolate-base, #2A170F)',
                  transition: 'all 0.2s ease',
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthModalTab('register');
                  setAuthModalError(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '9px',
                  border: 'none',
                  fontSize: '0.88rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  background: authModalTab === 'register' ? 'var(--color-chocolate-base, #2A170F)' : 'transparent',
                  color: authModalTab === 'register' ? '#ffffff' : 'var(--color-chocolate-base, #2A170F)',
                  transition: 'all 0.2s ease',
                }}
              >
                New Patient (Register)
              </button>
            </div>

            {/* Error in modal */}
            {authModalError && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  marginBottom: '16px',
                  fontSize: '0.825rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{authModalError}</span>
              </div>
            )}

            {/* Tab: Login Form */}
            {authModalTab === 'login' && (
              <form onSubmit={handleAuthModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="patient@example.co.za"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(42, 23, 15, 0.2)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)', marginBottom: '6px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(42, 23, 15, 0.2)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={authModalLoading}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '13px',
                    borderRadius: '11px',
                    background: 'var(--color-gold-primary, #E2B467)',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    border: 'none',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-heading)',
                    cursor: authModalLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px var(--color-gold-cta-shadow, rgba(226, 180, 103, 0.35))',
                  }}
                >
                  {authModalLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Signing In...</span>
                    </>
                  ) : (
                    <span>Sign In & Continue Booking</span>
                  )}
                </button>
              </form>
            )}

            {/* Tab: Register Form */}
            {authModalTab === 'register' && (
              <form onSubmit={handleAuthModalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)', marginBottom: '4px' }}>
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g. Sipho Ndlovu"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(42, 23, 15, 0.2)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)', marginBottom: '4px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="sipho@example.co.za"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(42, 23, 15, 0.2)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)', marginBottom: '4px' }}>
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={authPhone}
                    onChange={(e) => setAuthPhone(e.target.value)}
                    placeholder="+27 82 123 4567"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(42, 23, 15, 0.2)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)', marginBottom: '4px' }}>
                    Password (min. 8 characters)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Create a password"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '10px',
                      border: '1px solid rgba(42, 23, 15, 0.2)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={authModalLoading}
                  style={{
                    marginTop: '8px',
                    width: '100%',
                    padding: '13px',
                    borderRadius: '11px',
                    background: 'var(--color-gold-primary, #E2B467)',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    border: 'none',
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-heading)',
                    cursor: authModalLoading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px var(--color-gold-cta-shadow, rgba(226, 180, 103, 0.35))',
                  }}
                >
                  {authModalLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Creating Patient Profile...</span>
                    </>
                  ) : (
                    <span>Create Account & Continue Booking</span>
                  )}
                </button>
              </form>
            )}

            {/* Bottom link to full login page */}
            <div style={{ marginTop: '18px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
              <span>Want to open the full sign in page instead? </span>
              <Link
                href={`/login?redirect=${encodeURIComponent(`/bookings/checkout?doctor=${encodeURIComponent(doctorIdParam)}&slot=${encodeURIComponent(slotIdParam || 'slot')}&date=${encodeURIComponent(dateParam || '')}&start=${encodeURIComponent(startParam || '')}&end=${encodeURIComponent(endParam || '')}&type=${encodeURIComponent(typeParam)}`)}`}
                style={{ color: 'var(--color-chocolate-base, #2A170F)', fontWeight: 700, textDecoration: 'underline' }}
              >
                Go to Sign In
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-cream-base, #FAF6EE)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
            <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-gold-base, #DFAB62)' }} />
            <span style={{ color: 'var(--color-chocolate-base, #2A170F)', fontSize: '0.95rem', fontWeight: 600 }}>Loading Consultation Checkout...</span>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
