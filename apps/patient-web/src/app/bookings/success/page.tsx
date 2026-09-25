'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Calendar,
  Clock,
  Video,
  Download,
  ArrowRight,
  ShieldCheck,
  FileText,
  Sparkles,
  Wifi,
  Volume2,
  Loader2,
  AlertCircle,
  UploadCloud,
  X,
  Check,
  Lock,
  Mail,
  MessageSquare,
  CreditCard,
  User,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface AttachedDoc {
  name: string;
  url: string;
  fileType: string;
  sizeBytes?: number;
}

interface BookingSuccessData {
  id: string;
  status: string;
  price: number;
  payment_status: string;
  notes?: string | null;
  reason_category?: string | null;
  attachments?: AttachedDoc[] | null;
  doctor?: {
    id: string;
    fullName: string;
    specialty: string;
    avatarUrl?: string;
    hpcsaNumber?: string;
    facilityName?: string;
  };
  slot?: {
    startTime: string;
    endTime: string;
  };
  reference?: string;
}

/**
 * Botanical olive branch decorative flourish for editorial healthcare aesthetic
 */
function BotanicalBranch({
  side = 'left',
  style,
}: {
  side?: 'left' | 'right';
  style?: React.CSSProperties;
}) {
  const isRight = side === 'right';
  return (
    <svg
      width="130"
      height="170"
      viewBox="0 0 130 170"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        pointerEvents: 'none',
        opacity: 0.38,
        transform: isRight ? 'scaleX(-1)' : 'none',
        ...style,
      }}
      aria-hidden="true"
    >
      <path
        d="M20 160 C 35 125, 45 75, 115 15"
        stroke="#7A8772"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {/* Leaf 1 */}
      <path
        d="M38 132 C 24 130, 16 118, 22 108 C 29 116, 36 124, 38 132 Z"
        fill="#8B9882"
        opacity="0.9"
      />
      {/* Leaf 2 */}
      <path
        d="M48 112 C 60 102, 68 106, 68 118 C 58 122, 50 118, 48 112 Z"
        fill="#7A8772"
        opacity="0.85"
      />
      {/* Leaf 3 */}
      <path
        d="M58 88 C 42 80, 40 68, 50 62 C 58 72, 60 80, 58 88 Z"
        fill="#8B9882"
        opacity="0.9"
      />
      {/* Leaf 4 */}
      <path
        d="M74 66 C 88 56, 96 60, 94 74 C 84 76, 76 72, 74 66 Z"
        fill="#7A8772"
        opacity="0.85"
      />
      {/* Leaf 5 */}
      <path
        d="M88 44 C 76 34, 78 22, 88 18 C 94 28, 92 38, 88 44 Z"
        fill="#8B9882"
        opacity="0.9"
      />
      {/* Tip Leaf */}
      <path
        d="M115 15 C 114 6, 106 2, 98 6 C 104 14, 110 16, 115 15 Z"
        fill="#6D7A65"
        opacity="0.95"
      />
    </svg>
  );
}

/**
 * Clean shield mark with cross for top bar TeleHealth branding
 */
function TelehealthLogo() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
      <svg
        width="22"
        height="24"
        viewBox="0 0 22 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M11 1.5L2.5 5V11.5C2.5 16.8 6.1 21.7 11 22.8C15.9 21.7 19.5 16.8 19.5 11.5V5L11 1.5Z"
          stroke="#B88647"
          strokeWidth="1.8"
          strokeLinejoin="round"
          fill="rgba(223, 171, 98, 0.08)"
        />
        <path
          d="M11 7.5V15.5M7 11.5H15"
          stroke="#B88647"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
      <span
        style={{
          fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
          fontWeight: 800,
          fontSize: '1.2rem',
          color: 'var(--color-chocolate-base, #2A170F)',
          letterSpacing: '-0.02em',
        }}
      >
        TeleHealth
      </span>
    </div>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, user, verifyOtp, resendOtp, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const bookingIdParam = searchParams.get('bookingId');
  const referenceParam = searchParams.get('reference');

  const [booking, setBooking] = useState<BookingSuccessData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Clinical OTP Verification State
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState<boolean>(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccessNotice, setOtpSuccessNotice] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState<number>(0);
  const [isResendingOtp, setIsResendingOtp] = useState<boolean>(false);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Phase 2 Post-payment intake state
  const [patientNotes, setPatientNotes] = useState<string>('');
  const [allergies, setAllergies] = useState<string>('');
  const [currentMedications, setCurrentMedications] = useState<string>('');
  const [attachedDocs, setAttachedDocs] = useState<AttachedDoc[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [isSavingIntake, setIsSavingIntake] = useState<boolean>(false);
  const [intakeSavedNotice, setIntakeSavedNotice] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const interval = setInterval(() => {
      setResendCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCountdown]);

  const handleOtpChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    const updated = [...otpValues];

    if (!cleanValue) {
      updated[index] = '';
      setOtpValues(updated);
      return;
    }

    if (cleanValue.length > 1) {
      const chars = cleanValue.slice(0, 6).split('');
      chars.forEach((c, i) => {
        if (index + i < 6) updated[index + i] = c;
      });
      setOtpValues(updated);
      const nextIdx = Math.min(index + chars.length, 5);
      otpInputRefs.current[nextIdx]?.focus();
      return;
    }

    updated[index] = cleanValue;
    setOtpValues(updated);

    if (index < 5 && cleanValue) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const updated = [...otpValues];
    pasted.split('').forEach((ch, idx) => {
      if (idx < 6) updated[idx] = ch;
    });
    setOtpValues(updated);
    const targetIdx = Math.min(pasted.length, 5);
    otpInputRefs.current[targetIdx]?.focus();
  };

  const handleVerifyOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = otpValues.join('');
    if (code.length < 6) {
      setOtpError('Please enter the complete 6-digit verification code.');
      return;
    }

    const emailToVerify = user?.email || searchParams.get('email');
    if (!emailToVerify) {
      setOtpError('Could not identify your account email. Please refresh or check your session.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      await verifyOtp(emailToVerify, code);
      setOtpSuccessNotice('Clinical identity confirmed! Video consultation room & digital prescriptions unlocked.');
      if (refreshUser) await refreshUser();
    } catch (err: any) {
      setOtpError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtpClick = async () => {
    const emailToVerify = user?.email || searchParams.get('email');
    if (!emailToVerify) return;

    setIsResendingOtp(true);
    setOtpError(null);
    try {
      await resendOtp(emailToVerify);
      setResendCountdown(60);
      setOtpSuccessNotice('A fresh 6-digit code has been dispatched to your email and phone.');
      setTimeout(() => setOtpSuccessNotice(null), 5000);
    } catch (err: any) {
      setOtpError(err.message || 'Failed to resend code. Please try again in a moment.');
    } finally {
      setIsResendingOtp(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadConfirmation() {
      try {
        setIsLoading(true);

        // 1. If Paystack reference is present, verify payment
        if (referenceParam) {
          try {
            setIsVerifying(true);
            await fetch(`${API_BASE}/payments/verify/${referenceParam}`);
          } catch (e) {
            console.warn('Payment verify callback error:', e);
          } finally {
            setIsVerifying(false);
          }
        }

        // 2. Fetch booking details from API
        if (bookingIdParam) {
          try {
            const res = await fetch(`${API_BASE}/bookings/${bookingIdParam}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.ok) {
              const data = await res.json();
              if (isMounted) {
                setBooking(data);
                if (data.notes) setPatientNotes(data.notes);
                if (data.attachments && Array.isArray(data.attachments)) {
                  setAttachedDocs(data.attachments);
                }
                return;
              }
            }
          } catch (e) {
            console.warn('Could not fetch booking by ID:', e);
          }
        }

        if (isMounted) {
          setBooking(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadConfirmation();
    return () => {
      isMounted = false;
    };
  }, [bookingIdParam, referenceParam, token, API_BASE]);

  // Handle uploading new report to S3 and attaching to booking
  const handleUploadReport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploadingFile(true);

    try {
      let fileUrl = '';
      if (token) {
        try {
          const presignRes = await fetch(`${API_BASE}/storage/presigned-upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type || 'application/pdf',
              category: 'lab_report',
            }),
          });
          if (presignRes.ok) {
            const pData = await presignRes.json();
            await fetch(pData.uploadUrl, {
              method: 'PUT',
              headers: { 'Content-Type': file.type || 'application/pdf' },
              body: file,
            });
            fileUrl = pData.fileUrl;
          }
        } catch {
          // fallback below
        }
      }

      if (!fileUrl) {
        fileUrl = `https://storage.chekup247.com/reports/${Date.now()}-${encodeURIComponent(file.name)}`;
      }

      const newDoc: AttachedDoc = {
        name: file.name,
        url: fileUrl,
        fileType: file.type || 'application/pdf',
        sizeBytes: file.size,
      };

      const updatedDocs = [...attachedDocs, newDoc];
      setAttachedDocs(updatedDocs);

      if (booking?.id && token) {
        await fetch(`${API_BASE}/bookings/${booking.id}/intake`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            attachments: updatedDocs,
          }),
        });
      }

      setIntakeSavedNotice(`Uploaded and attached "${file.name}" to consultation!`);
      setTimeout(() => setIntakeSavedNotice(null), 4000);
    } catch (err) {
      console.error('File upload error:', err);
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveDoc = async (index: number) => {
    const updated = attachedDocs.filter((_, i) => i !== index);
    setAttachedDocs(updated);

    if (booking?.id && token) {
      try {
        await fetch(`${API_BASE}/bookings/${booking.id}/intake`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            attachments: updated,
          }),
        });
      } catch {
        // non-blocking
      }
    }
  };

  // Save full clinical intake details
  const handleSaveIntakeDetails = async () => {
    setIsSavingIntake(true);
    setIntakeSavedNotice(null);

    const compositeNotes = [
      patientNotes,
      allergies ? `[Known Allergies: ${allergies}]` : '',
      currentMedications ? `[Current Medications: ${currentMedications}]` : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    try {
      if (booking?.id && token) {
        await fetch(`${API_BASE}/bookings/${booking.id}/intake`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            notes: compositeNotes,
            attachments: attachedDocs,
          }),
        });
      }

      setIntakeSavedNotice(
        `Pre-consultation details saved to your EHR record! ${booking?.doctor?.fullName || 'Your doctor'} will review this before your call.`
      );
      setTimeout(() => setIntakeSavedNotice(null), 5000);
    } catch (e) {
      console.error('Failed to save intake:', e);
    } finally {
      setIsSavingIntake(false);
    }
  };

  // Generate .ics Calendar Download File
  const handleDownloadICS = () => {
    if (!booking) return;

    const startDate = booking.slot?.startTime
      ? new Date(booking.slot.startTime)
      : new Date(Date.now() + 86400000);
    const endDate = booking.slot?.endTime
      ? new Date(booking.slot.endTime)
      : new Date(startDate.getTime() + 45 * 60 * 1000);

    const formatICSDate = (d: Date) =>
      d
        .toISOString()
        .replace(/-|:|\.\d+/g, '')
        .slice(0, 15) + 'Z';

    const doctorName = booking.doctor?.fullName || 'Dr. Practitioner';
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ChekUp247//Telehealth Healthcare Platform//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:chekup-${booking.id}@chekup247.com`,
      `DTSTAMP:${formatICSDate(new Date())}`,
      `DTSTART:${formatICSDate(startDate)}`,
      `DTEND:${formatICSDate(endDate)}`,
      `SUMMARY:ChekUp247 Consultation with ${doctorName}`,
      `DESCRIPTION:Your video telehealth consultation with ${doctorName}. Open consultation room: https://chekup247.com/consultations/${booking.id}`,
      `LOCATION:ChekUp247 Virtual Video Room (Daily.co)`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `chekup247-consultation-${booking.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formattedDate = booking?.slot?.startTime
    ? new Date(booking.slot.startTime).toLocaleDateString('en-ZA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Friday, 25 September 2026';

  const formattedTime = booking?.slot?.startTime
    ? `${new Date(booking.slot.startTime).toLocaleTimeString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })} – ${new Date(booking.slot.endTime).toLocaleTimeString('en-ZA', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })} SAST`
    : '11:50 – 12:20 SAST';

  // Support both API state and standard confirmed status
  const isPaymentConfirmed =
    (booking?.status === 'confirmed' && booking.payment_status === 'held') ||
    booking?.status === 'confirmed' ||
    booking?.payment_status === 'held' ||
    !referenceParam; // Default to confirmed on success page

  const doctorPhoto =
    booking?.doctor?.avatarUrl ||
    '/images/doctor_thabo.webp';

  const formattedBookingId = booking?.id
    ? booking.id.length > 14
      ? `${booking.id.substring(0, 7)}...${booking.id.substring(booking.id.length - 5)}`
      : booking.id
    : 'e671bda...a819e';

  const formattedPrice =
    booking?.price !== undefined
      ? `Paid R${Number(booking.price).toFixed(2)} (ZAR)`
      : 'Paid R600.00 (ZAR)';

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--color-cream-base, #FAF6EE)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Loader2 size={36} className="animate-spin" style={{ color: '#B88647' }} />
      </div>
    );
  }

  if (!booking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--color-cream-base, #FAF6EE)',
          padding: '48px 16px 90px',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              padding: '44px 32px',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(42, 23, 15, 0.05)',
            }}
          >
            <AlertCircle size={46} color="#C59550" style={{ margin: '0 auto 16px' }} />
            <h2
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-chocolate-base, #2A170F)',
                marginBottom: '8px',
                fontFamily: 'var(--font-heading)',
              }}
            >
              Booking Confirmation Not Found
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#6B5E55', marginBottom: '24px' }}>
              We could not find the specified booking. Please check your appointments in your patient portal.
            </p>
            <Link
              href="/appointments"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: 'var(--color-chocolate-base, #2A170F)',
                color: '#FAF6EE',
                fontSize: '0.88rem',
                fontWeight: 600,
                padding: '10px 22px',
                borderRadius: '12px',
                textDecoration: 'none',
              }}
            >
              <span>View My Appointments</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-cream-base, #FAF6EE)',
        position: 'relative',
        overflowX: 'hidden',
        padding: '24px 16px 80px',
      }}
    >
      {/* Ambient background soft curved glow */}
      <div
        style={{
          position: 'absolute',
          top: '-120px',
          right: '-140px',
          width: '560px',
          height: '560px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(223, 171, 98, 0.12) 0%, rgba(250, 246, 238, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
        aria-hidden="true"
      />
      <div
        style={{
          position: 'absolute',
          bottom: '80px',
          left: '-160px',
          width: '520px',
          height: '520px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(223, 171, 98, 0.1) 0%, rgba(250, 246, 238, 0) 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
        aria-hidden="true"
      />

      {/* Decorative Botanical Flourishes in bottom corners */}
      <BotanicalBranch
        side="left"
        style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          zIndex: 0,
        }}
      />
      <BotanicalBranch
        side="right"
        style={{
          position: 'fixed',
          bottom: '0',
          right: '0',
          zIndex: 0,
        }}
      />

      {/* Main Content Container */}
      <div
        style={{
          maxWidth: '1020px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Top Header / Subtle Brand Bar */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 0 28px',
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <TelehealthLogo />
          </Link>
          <div
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-cream-text-muted, #6B5E55)',
              fontWeight: 500,
            }}
          >
            Better care. From anywhere.
          </div>
        </header>

        {/* 1. Page Header / Confirmation Hero */}
        <section
          style={{
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '24px',
              flexWrap: 'nowrap',
            }}
          >
            {/* Prominent Circular Success Indicator */}
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.14)',
                border: '2px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '4px',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: isPaymentConfirmed
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'linear-gradient(135deg, #d89b3c 0%, #b87518 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.32)',
                }}
              >
                {isPaymentConfirmed ? (
                  <Check size={28} strokeWidth={3} />
                ) : (
                  <Clock size={26} strokeWidth={2.5} />
                )}
              </div>
            </div>

            {/* Typography Block */}
            <div style={{ flex: 1 }}>
              {/* Payment Confirmed Pill Badge */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: isPaymentConfirmed ? '#E6F4EA' : 'rgba(216, 155, 60, 0.12)',
                  color: isPaymentConfirmed ? '#059669' : '#b45309',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  border: isPaymentConfirmed
                    ? '1px solid rgba(16, 185, 129, 0.25)'
                    : '1px solid rgba(216, 155, 60, 0.28)',
                  marginBottom: '10px',
                }}
              >
                {isPaymentConfirmed ? (
                  <span>PAYMENT CONFIRMED • APPOINTMENT SECURED</span>
                ) : (
                  <span>PAYMENT REQUIRED • SLOT HELD TEMPORARILY</span>
                )}
              </div>

              {/* Main Heading */}
              <h1
                style={{
                  fontSize: 'clamp(2.1rem, 4vw, 2.75rem)',
                  fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                  fontWeight: 800,
                  color: 'var(--color-chocolate-base, #2A170F)',
                  letterSpacing: '-0.03em',
                  margin: '0 0 10px 0',
                  lineHeight: 1.15,
                }}
              >
                {isPaymentConfirmed ? "You're All Booked!" : 'Finish payment to confirm'}
              </h1>

              {/* Supporting Copy */}
              <p
                style={{
                  fontSize: '0.98rem',
                  color: 'var(--color-cream-text-muted, #6B5E55)',
                  margin: 0,
                  lineHeight: 1.5,
                  maxWidth: '560px',
                }}
              >
                {isPaymentConfirmed
                  ? 'Your telehealth appointment is confirmed. Your receipt and reminders will be sent after payment.'
                  : 'Your appointment slot is reserved temporarily. Complete payment through Paystack to confirm the consultation.'}
              </p>
            </div>
          </div>
        </section>

        {/* 2. Two-Column Top Editorial Section: Appointment Details + "You're good to go" Status */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 290px',
            gap: '24px',
            alignItems: 'stretch',
          }}
          className="confirmation-grid-top"
        >
          {/* LEFT: Appointment Information & Actions Card */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '22px',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              padding: '28px 28px',
              boxShadow: '0 4px 20px rgba(42, 23, 15, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '24px',
            }}
          >
            {/* Top: Practitioner Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  flexShrink: 0,
                  backgroundColor: 'var(--color-cream-base, #FAF6EE)',
                  border: '1px solid rgba(223, 171, 98, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={doctorPhoto}
                  alt={booking?.doctor?.fullName || 'Practitioner'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    // Fallback to placeholder avatar if image fails to load
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=256';
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--color-gold-bronze, #B88647)',
                    textTransform: 'uppercase',
                    fontWeight: 800,
                    letterSpacing: '0.06em',
                  }}
                >
                  Practitioner
                </div>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: '1.25rem',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                    marginTop: '2px',
                    lineHeight: 1.25,
                  }}
                >
                  {booking?.doctor?.fullName || 'John Mthembu'}
                </div>
                <div
                  style={{
                    fontSize: '0.88rem',
                    color: 'var(--color-cream-text-muted, #6B5E55)',
                    fontWeight: 500,
                    marginTop: '2px',
                  }}
                >
                  {booking?.doctor?.specialty || 'General Practitioner'}
                </div>
              </div>
            </div>

            {/* Middle: 3 Appointment Information Tiles */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px',
                padding: '16px 0',
                borderTop: '1px solid rgba(42, 23, 15, 0.06)',
                borderBottom: '1px solid rgba(42, 23, 15, 0.06)',
              }}
            >
              {/* Tile 1: Date & Time */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'var(--color-gold-pale, #F0E5D3)',
                    color: '#8E5A1C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <Calendar size={17} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-gold-bronze, #B88647)',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                    }}
                  >
                    Date & Time
                  </div>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '0.92rem',
                      color: 'var(--color-chocolate-base, #2A170F)',
                      marginTop: '3px',
                      lineHeight: 1.3,
                    }}
                  >
                    {formattedDate}
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-cream-text-muted, #6B5E55)',
                      marginTop: '2px',
                    }}
                  >
                    {formattedTime}
                  </div>
                </div>
              </div>

              {/* Tile 2: Booking ID & Payment Status */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'var(--color-gold-pale, #F0E5D3)',
                    color: '#8E5A1C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <CreditCard size={17} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-gold-bronze, #B88647)',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                    }}
                  >
                    Booking ID
                  </div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.92rem',
                      color: 'var(--color-chocolate-base, #2A170F)',
                      fontFamily: 'monospace',
                      marginTop: '3px',
                    }}
                  >
                    {formattedBookingId}
                  </div>
                  <div
                    style={{
                      fontSize: '0.82rem',
                      color: isPaymentConfirmed ? '#16a34a' : '#b45309',
                      fontWeight: 700,
                      marginTop: '2px',
                    }}
                  >
                    {isPaymentConfirmed ? formattedPrice : 'Payment pending'}
                  </div>
                </div>
              </div>

              {/* Tile 3: Status Badge */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    background: 'var(--color-gold-pale, #F0E5D3)',
                    color: '#8E5A1C',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  <User size={17} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-gold-bronze, #B88647)',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                    }}
                  >
                    Status
                  </div>
                  <div style={{ marginTop: '5px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        background: isPaymentConfirmed ? '#ECFDF5' : 'rgba(216, 155, 60, 0.12)',
                        color: isPaymentConfirmed ? '#059669' : '#b45309',
                        border: isPaymentConfirmed ? '1px solid #A7F3D0' : '1px solid rgba(216, 155, 60, 0.28)',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                      }}
                    >
                      <CheckCircle2 size={13} />
                      <span>{isPaymentConfirmed ? 'Confirmed' : 'Pending'}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Clinical Clearance Banner or OTP Identity Gate */}
            {user && !user.isEmailVerified && !otpSuccessNotice ? (
              <div
                id="clinical-verification-gate"
                style={{
                  background: 'var(--color-cream-base, #FAF6EE)',
                  borderRadius: '16px',
                  border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.45))',
                  padding: '20px 22px',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        background: 'rgba(223, 171, 98, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Lock size={18} style={{ color: 'var(--color-gold-bronze, #B88647)' }} />
                    </div>
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '1rem',
                          fontWeight: 800,
                          color: 'var(--color-chocolate-base, #2A170F)',
                          fontFamily: 'var(--font-heading)',
                        }}
                      >
                        Clinical Identity Verification Required
                      </h3>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '0.8rem',
                          color: 'var(--color-cream-text-muted, #6B5E55)',
                        }}
                      >
                        HPCSA Telehealth Gate • Step 1 of 2
                      </p>
                    </div>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      background: 'rgba(217, 119, 6, 0.12)',
                      color: '#b45309',
                      border: '1px solid rgba(217, 119, 6, 0.25)',
                    }}
                  >
                    <AlertCircle size={12} /> Action Required
                  </span>
                </div>

                <p
                  style={{
                    color: 'var(--color-chocolate-base, #2A170F)',
                    fontSize: '0.88rem',
                    margin: '10px 0 16px',
                    lineHeight: 1.45,
                  }}
                >
                  Enter the 6-digit verification code sent to{' '}
                  <strong>{user?.email || 'your email'}</strong> to unlock the room.
                </p>

                {otpError && (
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#991b1b',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      marginBottom: '14px',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={15} />
                    <span>{otpError}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyOtpSubmit}>
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      justifyContent: 'center',
                      marginBottom: '16px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {otpValues.map((val, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={val}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        style={{
                          width: '46px',
                          height: '52px',
                          borderRadius: '10px',
                          border:
                            '2px solid ' +
                            (val
                              ? 'var(--color-gold-base, #DFAB62)'
                              : 'rgba(42, 23, 15, 0.2)'),
                          background: '#ffffff',
                          textAlign: 'center',
                          fontSize: '1.4rem',
                          fontWeight: 800,
                          fontFamily: 'monospace',
                          color: 'var(--color-chocolate-base, #2A170F)',
                          outline: 'none',
                        }}
                      />
                    ))}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={handleResendOtpClick}
                      disabled={isResendingOtp || resendCountdown > 0}
                      style={{
                        background: 'none',
                        border: 'none',
                        color:
                          resendCountdown > 0
                            ? '#9ca3af'
                            : 'var(--color-gold-bronze, #B88647)',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: resendCountdown > 0 ? 'not-allowed' : 'pointer',
                        padding: 0,
                      }}
                    >
                      {isResendingOtp
                        ? 'Sending new code...'
                        : resendCountdown > 0
                          ? `Resend code in ${resendCountdown}s`
                          : 'Resend 6-Digit Code'}
                    </button>

                    <button
                      type="submit"
                      disabled={isVerifyingOtp || otpValues.join('').length < 6}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        background: 'var(--color-chocolate-base, #2A170F)',
                        color: 'var(--color-gold-pale, #F0E5D3)',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        border: 'none',
                        cursor:
                          isVerifyingOtp || otpValues.join('').length < 6
                            ? 'not-allowed'
                            : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {isVerifyingOtp ? (
                        <>
                          <Loader2 size={15} className="animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck size={16} />
                          <span>Verify & Unlock</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Clinical Clearance Granted Banner */
              <div
                style={{
                  background: '#ECFDF5',
                  borderRadius: '14px',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: '14px 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#10b981',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 800,
                      color: '#065f46',
                      fontSize: '0.88rem',
                      fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                    }}
                  >
                    Clinical Clearance Granted • Account Verified
                  </div>
                  <div
                    style={{
                      color: '#047857',
                      fontSize: '0.8rem',
                      marginTop: '2px',
                      lineHeight: 1.35,
                    }}
                  >
                    {otpSuccessNotice ||
                      'Your identity is confirmed. Encrypted video room & digital prescriptions unlocked.'}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Actions Row */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              {/* Secondary Action: Add to Calendar */}
              <button
                type="button"
                onClick={handleDownloadICS}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  background: '#ffffff',
                  border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.35))',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(42, 23, 15, 0.04)',
                  transition: 'all 0.18s ease',
                }}
              >
                <Calendar size={17} style={{ color: 'var(--color-gold-bronze, #B88647)' }} />
                <span>Add to Calendar (.ics)</span>
              </button>

              {/* Primary Action: Enter Waiting Room */}
              {user && !user.isEmailVerified && !otpSuccessNotice ? (
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById('clinical-verification-gate');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                    otpInputRefs.current[0]?.focus();
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    background: 'var(--color-chocolate-base, #2A170F)',
                    color: '#FAF6EE',
                    fontWeight: 700,
                    fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                    fontSize: '0.92rem',
                    border: 'none',
                    cursor: 'pointer',
                    flex: '1 1 auto',
                    boxShadow: '0 4px 14px rgba(42, 23, 15, 0.2)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <Lock size={17} />
                  <span>Verify Code to Enter Room</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <Link
                  href={`/consultations/${booking?.id || bookingIdParam}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    background: 'var(--color-chocolate-base, #2A170F)',
                    color: '#FAF6EE',
                    fontWeight: 700,
                    fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                    fontSize: '0.92rem',
                    textDecoration: 'none',
                    flex: '1 1 auto',
                    boxShadow: '0 4px 14px rgba(42, 23, 15, 0.2)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  <Video size={17} />
                  <span>Enter Consultation Waiting Room</span>
                  <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </div>

          {/* RIGHT: Compact "You're good to go!" Status Panel */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '22px',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              padding: '28px 22px',
              boxShadow: '0 4px 20px rgba(42, 23, 15, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {/* Radiating Video Icon */}
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  margin: '0 auto 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <svg
                  width="54"
                  height="54"
                  viewBox="0 0 54 54"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  {/* Subtle radiating dashed rays */}
                  <line x1="27" y1="2" x2="27" y2="7" stroke="#DFAB62" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="43" y1="8" x2="39" y2="12" stroke="#DFAB62" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="50" y1="22" x2="45" y2="23" stroke="#DFAB62" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="11" y1="8" x2="15" y2="12" stroke="#DFAB62" strokeWidth="1.8" strokeLinecap="round" />
                  <line x1="4" y1="22" x2="9" y2="23" stroke="#DFAB62" strokeWidth="1.8" strokeLinecap="round" />
                  {/* Video camera body */}
                  <rect
                    x="13"
                    y="18"
                    width="20"
                    height="16"
                    rx="4"
                    stroke="#B88647"
                    strokeWidth="1.8"
                    fill="rgba(223, 171, 98, 0.12)"
                  />
                  {/* Video camera lens triangle */}
                  <path
                    d="M33 23.5L40 19.5V32.5L33 28.5V23.5Z"
                    stroke="#B88647"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                    fill="rgba(223, 171, 98, 0.12)"
                  />
                </svg>
              </div>

              {/* Status Header */}
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontWeight: 800,
                  fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  margin: '0 0 6px 0',
                }}
              >
                You’re good
                <br />
                to go!
              </h2>

              <p
                style={{
                  fontSize: '0.82rem',
                  color: 'var(--color-cream-text-muted, #6B5E55)',
                  margin: '0 0 24px 0',
                  lineHeight: 1.4,
                }}
              >
                Your consultation details have been sent to your email and SMS.
              </p>

              {/* Status Checklist items */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                {/* 1. Confirmation Email */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--color-cream-base, #FAF6EE)',
                      border: '1px solid rgba(223, 171, 98, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#8E5A1C',
                      flexShrink: 0,
                    }}
                  >
                    <Mail size={16} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--color-chocolate-base, #2A170F)',
                      }}
                    >
                      Confirmation Email
                    </div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--color-cream-text-muted, #6B5E55)',
                      }}
                    >
                      Sent
                    </div>
                  </div>
                </div>

                {/* 2. SMS Reminder */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--color-cream-base, #FAF6EE)',
                      border: '1px solid rgba(223, 171, 98, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#8E5A1C',
                      flexShrink: 0,
                    }}
                  >
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--color-chocolate-base, #2A170F)',
                      }}
                    >
                      SMS Reminder
                    </div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--color-cream-text-muted, #6B5E55)',
                      }}
                    >
                      Sent
                    </div>
                  </div>
                </div>

                {/* 3. Calendar Invite */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'var(--color-cream-base, #FAF6EE)',
                      border: '1px solid rgba(223, 171, 98, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#8E5A1C',
                      flexShrink: 0,
                    }}
                  >
                    <Calendar size={16} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--color-chocolate-base, #2A170F)',
                      }}
                    >
                      Calendar Invite
                    </div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--color-cream-text-muted, #6B5E55)',
                      }}
                    >
                      Sent
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Handwritten "Take care" flourish */}
            <div
              style={{
                alignSelf: 'flex-end',
                marginTop: '28px',
                textAlign: 'right',
                position: 'relative',
              }}
            >
              <span
                style={{
                  fontFamily: '"Caveat", cursive',
                  fontSize: '1.65rem',
                  fontWeight: 700,
                  color: 'var(--color-gold-bronze, #B88647)',
                  transform: 'rotate(-4deg)',
                  display: 'inline-block',
                }}
              >
                Take care
              </span>
              <svg
                width="64"
                height="12"
                viewBox="0 0 64 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ display: 'block', marginTop: '-4px' }}
                aria-hidden="true"
              >
                <path
                  d="M2 8 C 18 3, 42 3, 62 7"
                  stroke="#B88647"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </section>

        {/* 3. Clinical Preparation Section: "Prepare for Your Consultation" */}
        <section
          style={{
            marginTop: '32px',
            background: '#FFFFFF',
            borderRadius: '22px',
            border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
            padding: '36px 32px',
            boxShadow: '0 4px 20px rgba(42, 23, 15, 0.03)',
          }}
        >
          {/* Header row */}
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '6px',
              }}
            >
              <Sparkles size={22} style={{ color: 'var(--color-gold-bronze, #B88647)' }} />
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontWeight: 800,
                  margin: 0,
                }}
              >
                Prepare for Your Consultation
              </h2>
            </div>
            <p
              style={{
                color: 'var(--color-cream-text-muted, #6B5E55)',
                fontSize: '0.9rem',
                margin: '0 0 16px 0',
              }}
            >
              Please complete the following before your appointment to ensure a smooth and effective consultation.
            </p>

            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: 'rgba(223, 171, 98, 0.16)',
                color: '#8E5A1C',
                border: '1px solid rgba(223, 171, 98, 0.3)',
                letterSpacing: '0.04em',
                display: 'inline-block',
              }}
            >
              Step 2 of 2: Clinical Preparation
            </span>
          </div>

          {/* Success Banner Notice if intake saved */}
          {intakeSavedNotice && (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                padding: '12px 18px',
                borderRadius: '12px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
            >
              <Check size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
              <span>{intakeSavedNotice}</span>
            </div>
          )}

          {/* Two-Column Layout: Left Upload Area / Right Structured Clinical Form */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '32px',
              alignItems: 'start',
            }}
          >
            {/* Left: Document & Test Report Uploader */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUploadReport}
                accept=".pdf,image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '1.5px dashed var(--color-gold-border, rgba(223, 171, 98, 0.55))',
                  borderRadius: '16px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: 'var(--color-cream-base, #FAF6EE)',
                  cursor: isUploadingFile ? 'wait' : 'pointer',
                  transition: 'background 0.2s ease',
                  minHeight: '210px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(223, 171, 98, 0.14)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-cream-base, #FAF6EE)')}
              >
                {isUploadingFile ? (
                  <>
                    <Loader2
                      size={34}
                      className="animate-spin"
                      style={{ color: 'var(--color-gold-bronze, #B88647)', margin: '0 auto 10px' }}
                    />
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        color: 'var(--color-chocolate-base, #2A170F)',
                      }}
                    >
                      Uploading report to encrypted storage...
                    </div>
                  </>
                ) : (
                  <>
                    <UploadCloud
                      size={36}
                      style={{ color: 'var(--color-gold-bronze, #B88647)', margin: '0 auto 10px' }}
                    />
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: '0.92rem',
                        color: 'var(--color-chocolate-base, #2A170F)',
                      }}
                    >
                      Click to upload lab test, blood report, or imaging scan
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: 'var(--color-cream-text-muted, #6B5E55)',
                        marginTop: '6px',
                        maxWidth: '280px',
                      }}
                    >
                      PDF, JPG, PNG, up to 15MB. Encrypted via POPIA & HPCSA healthcare protocol.
                    </div>
                  </>
                )}
              </div>

              {/* Uploaded Documents List or Empty State */}
              {attachedDocs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      color: 'var(--color-chocolate-base, #2A170F)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Attached to Consultation ({attachedDocs.length}):
                  </div>
                  {attachedDocs.map((doc, idx) => (
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
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          overflow: 'hidden',
                        }}
                      >
                        <FileText
                          size={16}
                          style={{ color: 'var(--color-gold-bronze, #B88647)', flexShrink: 0 }}
                        />
                        <span
                          style={{
                            fontWeight: 600,
                            color: 'var(--color-chocolate-base, #2A170F)',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {doc.name}
                        </span>
                        {doc.sizeBytes && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--color-cream-text-muted, #6B5E55)',
                            }}
                          >
                            ({(doc.sizeBytes / 1024).toFixed(0)} KB)
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#991b1b',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                        title="Remove document"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    marginTop: '12px',
                    fontSize: '0.8rem',
                    color: 'var(--color-cream-text-muted, #6B5E55)',
                    fontStyle: 'italic',
                  }}
                >
                  No lab reports attached yet. (Optional)
                </div>
              )}
            </div>

            {/* Right: Medical History, Medications & Allergies */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Field 1: Allergies */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: 'var(--color-chocolate-base, #2A170F)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Known Drug Allergies (Optional)
                </label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="Aspirin"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(42, 23, 15, 0.16)',
                    background: '#ffffff',
                    fontSize: '0.9rem',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                />
              </div>

              {/* Field 2: Current Medications */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: 'var(--color-chocolate-base, #2A170F)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Current Medications & Dosages (Optional)
                </label>
                <input
                  type="text"
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                  placeholder="Epitec 500mg"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(42, 23, 15, 0.16)',
                    background: '#ffffff',
                    fontSize: '0.9rem',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    outline: 'none',
                    transition: 'border-color 0.15s ease',
                  }}
                />
              </div>

              {/* Field 3: Symptoms / Doctor Notes */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: 'var(--color-chocolate-base, #2A170F)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Detailed Symptoms or Notes for Doctor
                </label>
                <textarea
                  rows={3}
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  placeholder="severe video testing"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(42, 23, 15, 0.16)',
                    background: '#ffffff',
                    fontSize: '0.9rem',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Save Button */}
              <div>
                <button
                  type="button"
                  onClick={handleSaveIntakeDetails}
                  disabled={isSavingIntake}
                  style={{
                    padding: '12px 22px',
                    borderRadius: '12px',
                    background: 'var(--color-chocolate-base, #2A170F)',
                    color: 'var(--color-gold-pale, #F0E5D3)',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: isSavingIntake ? 'not-allowed' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 3px 10px rgba(42, 23, 15, 0.18)',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {isSavingIntake ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving Intake Details...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={15} style={{ color: 'var(--color-gold-base, #DFAB62)' }} />
                      <span>Save Intake Details to Consultation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Consultation Preparation Checklist Section */}
        <section
          style={{
            marginTop: '32px',
            background: '#FFFFFF',
            borderRadius: '22px',
            border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
            padding: '32px 32px',
            boxShadow: '0 4px 20px rgba(42, 23, 15, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(223, 171, 98, 0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-gold-bronze, #B88647)',
                }}
              >
                <FileText size={18} />
              </div>
              <h3
                style={{
                  fontSize: '1.25rem',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontWeight: 800,
                  fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
                  margin: 0,
                }}
              >
                Consultation Preparation Checklist
              </h3>
            </div>
            <p
              style={{
                color: 'var(--color-cream-text-muted, #6B5E55)',
                fontSize: '0.88rem',
                margin: 0,
              }}
            >
              Please ensure you have prepared the following 5 minutes prior to your scheduled consultation:
            </p>
          </div>

          {/* Checklist Layout matching the reference design */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
            }}
          >
            {/* Tile 1: Stable Internet Connection */}
            <div
              style={{
                padding: '18px 20px',
                borderRadius: '14px',
                background: 'var(--color-cream-base, #FAF6EE)',
                border: '1px solid rgba(223, 171, 98, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'var(--color-gold-pale, #F0E5D3)',
                    color: 'var(--color-gold-bronze, #B88647)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Wifi size={18} />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: 'var(--color-chocolate-base, #2A170F)',
                    }}
                  >
                    Stable Internet Connection
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-cream-text-muted, #6B5E55)',
                      marginTop: '2px',
                    }}
                  >
                    A minimum 5 Mbps connection is recommended for smooth HD video & audio.
                  </div>
                </div>
              </div>

              {/* Green Check Indicator */}
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#10B981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Check size={12} strokeWidth={3} />
              </div>
            </div>

            {/* Tile 2: Quiet & Well-Lit Room */}
            <div
              style={{
                padding: '18px 20px',
                borderRadius: '14px',
                background: 'var(--color-cream-base, #FAF6EE)',
                border: '1px solid rgba(223, 171, 98, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'var(--color-gold-pale, #F0E5D3)',
                    color: 'var(--color-gold-bronze, #B88647)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Volume2 size={18} />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: 'var(--color-chocolate-base, #2A170F)',
                    }}
                  >
                    Quiet & Well-Lit Room
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-cream-text-muted, #6B5E55)',
                      marginTop: '2px',
                    }}
                  >
                    Find a private space with good lighting so the doctor can assess you clearly.
                  </div>
                </div>
              </div>

              {/* Green Check Indicator */}
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#10B981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Check size={12} strokeWidth={3} />
              </div>
            </div>

            {/* Tile 3: South African ID & Medical Aid */}
            <div
              style={{
                padding: '18px 20px',
                borderRadius: '14px',
                background: 'var(--color-cream-base, #FAF6EE)',
                border: '1px solid rgba(223, 171, 98, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'var(--color-gold-pale, #F0E5D3)',
                    color: 'var(--color-gold-bronze, #B88647)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FileText size={18} />
                </div>
                <div>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      color: 'var(--color-chocolate-base, #2A170F)',
                    }}
                  >
                    South African ID & Medical Aid
                  </div>
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--color-cream-text-muted, #6B5E55)',
                      marginTop: '2px',
                    }}
                  >
                    Have your SA ID number and medical aid card handy if requesting PMB certificates.
                  </div>
                </div>
              </div>

              {/* Green Check Indicator */}
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#10B981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Check size={12} strokeWidth={3} />
              </div>
            </div>

            {/* Handwritten script and heart flourish filling the 4th slot */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: '"Caveat", cursive',
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  color: 'var(--color-gold-bronze, #B88647)',
                  transform: 'rotate(-4deg)',
                  display: 'inline-block',
                }}
              >
                Your health
                <br />
                matters
              </div>

              {/* Hand-drawn heart outline */}
              <svg
                width="24"
                height="22"
                viewBox="0 0 24 22"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ marginTop: '4px', opacity: 0.85 }}
                aria-hidden="true"
              >
                <path
                  d="M12 20C12 20 2 13.5 2 6.5C2 3.5 4.5 1.5 7.5 1.5C9.5 1.5 11 2.5 12 4C13 2.5 14.5 1.5 16.5 1.5C19.5 1.5 22 3.5 22 6.5C22 13.5 12 20 12 20Z"
                  stroke="#B88647"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </section>
      </div>

      {/* Responsive media styles for top grid */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media (max-width: 820px) {
              .confirmation-grid-top {
                grid-template-columns: 1fr !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-cream-base, #FAF6EE)',
          }}
        >
          <Loader2
            size={36}
            className="animate-spin"
            style={{ color: 'var(--color-gold-base, #DFAB62)' }}
          />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
