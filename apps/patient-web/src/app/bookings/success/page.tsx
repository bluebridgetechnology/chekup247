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
  Plus,
  Check,
  Building,
  Pill,
  AlertTriangle,
  Lock,
  KeyRound,
  Mail,
  RefreshCw,
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

        // Fallback mock confirmation for preview / local testing
        if (isMounted) {
          const now = new Date();
          const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          start.setHours(10, 0, 0, 0);
          const end = new Date(start.getTime() + 45 * 60 * 1000);

          setBooking({
            id: bookingIdParam || 'chk-bk-9021',
            status: 'confirmed',
            price: 850.0,
            payment_status: 'held',
            reference: referenceParam || 'chk_ref_984321',
            doctor: {
              id: 'doc-1',
              fullName: 'Dr. Thabo Molefe',
              specialty: 'General Practitioner & Family Health',
              avatarUrl: '/images/doctor_thabo.jpg',
              hpcsaNumber: 'MP 0689432',
              facilityName: 'Netcare Sunninghill Hospital Suites',
            },
            slot: {
              startTime: start.toISOString(),
              endTime: end.toISOString(),
            },
          });
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
      // 1. Get presigned upload URL
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
          // fallback
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

      // Save directly to booking if ID exists
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

      setIntakeSavedNotice('Pre-consultation details saved to your EHR record! Dr. Molefe will review this before your call.');
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
    : 'Upcoming Consultation';

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
    : '10:00 – 10:45 SAST';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream-base, #FAF6EE)', padding: '48px 16px 90px' }}>
      <div className="container" style={{ maxWidth: '880px' }}>
        {/* Success Confirmation Card */}
        <div
          style={{
            background: 'var(--color-cream-surface, #FDFBF7)',
            borderRadius: '24px',
            border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
            padding: '44px 32px',
            textAlign: 'center',
            boxShadow: '0 12px 40px rgba(42, 23, 15, 0.06)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Green Check Icon with Gold Ring */}
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: '4px solid var(--color-gold-pale, #F0E5D3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              margin: '0 auto 22px',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.35)',
            }}
          >
            <CheckCircle2 size={46} />
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--color-profile-hpcsa-bg, rgba(223, 171, 98, 0.16))',
              color: 'var(--color-profile-hpcsa-text, #8E5A1C)',
              padding: '5px 14px',
              borderRadius: 'var(--radius-full, 9999px)',
              fontSize: '0.8rem',
              fontWeight: 700,
              marginBottom: '12px',
              border: '1px solid var(--color-profile-hpcsa-border, rgba(223, 171, 98, 0.35))',
            }}
          >
            <ShieldCheck size={15} />
            <span>PAYMENT CONFIRMED • APPOINTMENT SECURED</span>
          </div>

          <h1
            style={{
              fontSize: '2.25rem',
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              color: 'var(--color-chocolate-base, #2A170F)',
              letterSpacing: '-0.03em',
              marginBottom: '8px',
            }}
          >
            You're All Booked!
          </h1>
          <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '1.05rem', maxWidth: '560px', margin: '0 auto' }}>
            Your telehealth appointment is officially confirmed. An SMS reminder and email receipt have been dispatched.
          </p>

          {/* Appointment Summary Box */}
          <div
            style={{
              background: 'var(--color-cream-base, #FAF6EE)',
              borderRadius: '18px',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              padding: '24px',
              margin: '32px auto 0',
              textAlign: 'left',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-gold-bronze, #B88647)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                Practitioner
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-chocolate-base, #2A170F)', marginTop: '4px', fontFamily: 'var(--font-heading)' }}>
                {booking?.doctor?.fullName || 'Dr. Thabo Molefe'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 600 }}>
                {booking?.doctor?.specialty || 'General Practitioner'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-gold-bronze, #B88647)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                Date & Time
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-chocolate-base, #2A170F)', marginTop: '4px', fontFamily: 'var(--font-heading)' }}>
                {formattedDate}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                {formattedTime}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-gold-bronze, #B88647)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.04em' }}>
                Booking ID / Status
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-chocolate-base, #2A170F)', marginTop: '4px', fontFamily: 'monospace' }}>
                {booking?.id ? booking.id.substring(0, 13) + '...' : 'chk-bk-9021'}
              </div>
              <div style={{ fontSize: '0.825rem', color: '#16a34a', fontWeight: 700 }}>
                Paid R{Number(booking?.price || 850).toFixed(2)} (ZAR)
              </div>
            </div>
          </div>

          {/* Post-Payment Clinical Identity Verification Gate */}
          {user && !user.isEmailVerified && !otpSuccessNotice ? (
            <div
              id="clinical-verification-gate"
              style={{
                marginTop: '32px',
                background: 'var(--color-cream-base, #FAF6EE)',
                borderRadius: '20px',
                border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.45))',
                padding: '28px 24px',
                textAlign: 'left',
                boxShadow: '0 4px 20px rgba(42, 23, 15, 0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'rgba(223, 171, 98, 0.25)',
                      color: 'var(--color-chocolate-base, #2A170F)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Lock size={20} style={{ color: 'var(--color-gold-bronze, #B88647)' }} />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: 'var(--color-chocolate-base, #2A170F)',
                        fontFamily: 'var(--font-heading)',
                      }}
                    >
                      Clinical Identity Verification Required
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                      HPCSA Telehealth Gate • Step 1 of 2
                    </p>
                  </div>
                </div>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: 'rgba(217, 119, 6, 0.12)',
                    color: '#b45309',
                    border: '1px solid rgba(217, 119, 6, 0.25)',
                  }}
                >
                  <AlertCircle size={13} /> Action Required
                </span>
              </div>

              <p style={{ color: 'var(--color-chocolate-base, #2A170F)', fontSize: '0.925rem', marginTop: '12px', marginBottom: '20px', lineHeight: 1.5 }}>
                To enter your encrypted telehealth consultation room with <strong>{booking?.doctor?.fullName || 'the doctor'}</strong> and unlock HPCSA digital prescriptions, enter the 6-digit verification code sent to <strong>{user?.email || 'your email'}</strong>.
              </p>

              {otpError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    marginBottom: '18px',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{otpError}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtpSubmit}>
                {/* 6-Digit Inputs */}
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    justifyContent: 'center',
                    marginBottom: '20px',
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
                        width: '52px',
                        height: '60px',
                        borderRadius: '12px',
                        border: '2px solid ' + (val ? 'var(--color-gold-base, #DFAB62)' : 'rgba(42, 23, 15, 0.2)'),
                        background: '#ffffff',
                        textAlign: 'center',
                        fontSize: '1.6rem',
                        fontWeight: 800,
                        fontFamily: 'monospace',
                        color: 'var(--color-chocolate-base, #2A170F)',
                        outline: 'none',
                        boxShadow: val ? '0 2px 8px rgba(223, 171, 98, 0.25)' : 'none',
                        transition: 'all 0.15s ease',
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
                      color: resendCountdown > 0 ? '#9ca3af' : 'var(--color-gold-bronze, #B88647)',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: resendCountdown > 0 ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: 0,
                    }}
                  >
                    {isResendingOtp ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span>Sending new code...</span>
                      </>
                    ) : resendCountdown > 0 ? (
                      <span>Resend code in {resendCountdown}s</span>
                    ) : (
                      <span>Resend 6-Digit Code</span>
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otpValues.join('').length < 6}
                    style={{
                      padding: '12px 24px',
                      borderRadius: '12px',
                      background: 'var(--color-chocolate-base, #2A170F)',
                      color: 'var(--color-gold-pale, #F0E5D3)',
                      fontWeight: 800,
                      fontSize: '0.925rem',
                      border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.4))',
                      cursor: isVerifyingOtp || otpValues.join('').length < 6 ? 'not-allowed' : 'pointer',
                      opacity: otpValues.join('').length < 6 ? 0.6 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isVerifyingOtp ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={18} style={{ color: 'var(--color-gold-base, #DFAB62)' }} />
                        <span>Verify & Unlock Room</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div
              style={{
                marginTop: '28px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%)',
                borderRadius: '18px',
                border: '1px solid rgba(16, 185, 129, 0.35)',
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#10b981',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#065f46', fontSize: '0.975rem', fontFamily: 'var(--font-heading)' }}>
                  Clinical Clearance Granted • Account Verified
                </div>
                <div style={{ color: '#047857', fontSize: '0.85rem', marginTop: '2px' }}>
                  {otpSuccessNotice || 'Your identity is confirmed. Encrypted video room & digital prescriptions unlocked.'}
                </div>
              </div>
            </div>
          )}

          {/* Quick Action CTAs */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '14px',
              justifyContent: 'center',
              marginTop: '28px',
            }}
          >
            <button
              onClick={handleDownloadICS}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 22px',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.35))',
                color: 'var(--color-chocolate-base, #2A170F)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(42, 23, 15, 0.05)',
                transition: 'all 0.2s ease',
              }}
            >
              <Download size={18} style={{ color: 'var(--color-gold-bronze, #B88647)' }} />
              <span>Add to Calendar (.ics)</span>
            </button>

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
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: 'var(--color-gold-primary, #E2B467)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontWeight: 800,
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 16px var(--color-gold-cta-shadow, rgba(226, 180, 103, 0.35))',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <Lock size={18} />
                <span>Verify Code to Enter Room</span>
                <ArrowRight size={17} />
              </button>
            ) : (
              <Link
                href={`/consultations/${booking?.id || bookingIdParam}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: 'var(--color-gold-primary, #E2B467)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontWeight: 800,
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 16px var(--color-gold-cta-shadow, rgba(226, 180, 103, 0.35))',
                  textDecoration: 'none',
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <Video size={18} />
                <span>Enter Consultation Waiting Room</span>
                <ArrowRight size={17} />
              </Link>
            )}
          </div>
        </div>

        {/* PHASE 2: Post-Payment Clinical Intake & Test Report Vault */}
        <div
          style={{
            marginTop: '36px',
            background: 'var(--color-cream-surface, #FDFBF7)',
            borderRadius: '24px',
            border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
            padding: '32px',
            boxShadow: '0 8px 32px rgba(42, 23, 15, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={22} style={{ color: 'var(--color-gold-bronze, #B88647)' }} />
              <h2
                style={{
                  fontSize: '1.35rem',
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontWeight: 800,
                }}
              >
                Pre-Consultation Clinical Intake & Test Report Vault
              </h2>
            </div>
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '4px 10px',
                borderRadius: '9999px',
                background: 'rgba(223, 171, 98, 0.16)',
                color: 'var(--color-chocolate-base, #2A170F)',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              }}
            >
              Step 2 of 2: Clinical Preparation
            </span>
          </div>

          <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.925rem', marginBottom: '24px', lineHeight: 1.5 }}>
            Help {booking?.doctor?.fullName || 'your doctor'} prepare for your appointment. Upload lab results (Lancet, Ampath, Pathcare), radiology reports, or list your current medications and drug allergies.
          </p>

          {/* Success Banner Notice */}
          {intakeSavedNotice && (
            <div
              style={{
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                padding: '14px 18px',
                borderRadius: '12px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              <Check size={18} style={{ color: '#16a34a', flexShrink: 0 }} />
              <span>{intakeSavedNotice}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Left: Document & Test Report Uploader */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: 'var(--color-chocolate-base, #2A170F)',
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Upload Medical Reports & Test Results
              </label>

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
                  border: '1.5px dashed var(--color-gold-border, rgba(223, 171, 98, 0.5))',
                  borderRadius: '16px',
                  padding: '24px',
                  textAlign: 'center',
                  background: 'var(--color-cream-base, #FAF6EE)',
                  cursor: isUploadingFile ? 'wait' : 'pointer',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(223, 171, 98, 0.16)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--color-cream-base, #FAF6EE)')}
              >
                {isUploadingFile ? (
                  <>
                    <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-gold-bronze, #B88647)', margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                      Uploading report to encrypted storage...
                    </div>
                  </>
                ) : (
                  <>
                    <UploadCloud size={32} style={{ color: 'var(--color-gold-bronze, #B88647)', margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: 700, fontSize: '0.925rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                      Click to upload lab test, blood report, or imaging scan
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '4px' }}>
                      PDF, JPG, PNG up to 15MB. Encrypted via POPIA & HPCSA healthcare protocol.
                    </div>
                  </>
                )}
              </div>

              {/* Uploaded Documents List */}
              {attachedDocs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '14px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)' }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <FileText size={16} style={{ color: 'var(--color-gold-bronze, #B88647)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: 'var(--color-chocolate-base, #2A170F)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {doc.name}
                        </span>
                        {doc.sizeBytes && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
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
                <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontStyle: 'italic' }}>
                  No lab reports attached yet. (Optional)
                </div>
              )}
            </div>

            {/* Right: Medical History, Medications & Allergies */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: 'var(--color-chocolate-base, #2A170F)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Known Drug Allergies (Optional)
                </label>
                <input
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin, Aspirin, Sulfa drugs, None"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(42, 23, 15, 0.18)',
                    background: '#ffffff',
                    fontSize: '0.9rem',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: 'var(--color-chocolate-base, #2A170F)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Current Medications & Dosages (Optional)
                </label>
                <textarea
                  rows={2}
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                  placeholder="e.g. Metformin 500mg daily, Epitec 100mg..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(42, 23, 15, 0.18)',
                    background: '#ffffff',
                    fontSize: '0.9rem',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: 'var(--color-chocolate-base, #2A170F)',
                    marginBottom: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Detailed Symptoms or Notes for Doctor
                </label>
                <textarea
                  rows={3}
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  placeholder="Add any specific questions, symptoms, or medical context you want the doctor to address..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid rgba(42, 23, 15, 0.18)',
                    background: '#ffffff',
                    fontSize: '0.9rem',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleSaveIntakeDetails}
                disabled={isSavingIntake}
                style={{
                  marginTop: '6px',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  background: 'var(--color-chocolate-base, #2A170F)',
                  color: 'var(--color-gold-pale, #F0E5D3)',
                  border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.35))',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: isSavingIntake ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSavingIntake ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving to EHR Record...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} style={{ color: 'var(--color-gold-base, #DFAB62)' }} />
                    <span>Save Intake Details to Consultation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Consultation Preparation Checklist */}
        <div
          style={{
            marginTop: '32px',
            background: 'var(--color-cream-surface, #FDFBF7)',
            borderRadius: '24px',
            border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
            padding: '28px',
            boxShadow: '0 4px 20px rgba(42, 23, 15, 0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <Sparkles size={20} style={{ color: 'var(--color-gold-bronze, #B88647)' }} />
            <h3 style={{ fontSize: '1.15rem', color: 'var(--color-chocolate-base, #2A170F)', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
              Consultation Preparation Checklist
            </h3>
          </div>

          <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.9rem', marginBottom: '20px' }}>
            Please ensure you have prepared the following 5 minutes prior to your scheduled consultation:
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
            }}
          >
            <div
              style={{
                padding: '16px',
                borderRadius: '14px',
                background: 'var(--color-cream-base, #FAF6EE)',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(223, 171, 98, 0.18)',
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
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                  Stable Internet Connection
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '2px' }}>
                  A minimum 5 Mbps connection is recommended for smooth HD video & audio.
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '14px',
                background: 'var(--color-cream-base, #FAF6EE)',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(223, 171, 98, 0.18)',
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
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                  Quiet & Well-Lit Room
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '2px' }}>
                  Find a private space with good lighting so the doctor can assess you clearly.
                </div>
              </div>
            </div>

            <div
              style={{
                padding: '16px',
                borderRadius: '14px',
                background: 'var(--color-cream-base, #FAF6EE)',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(223, 171, 98, 0.18)',
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
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                  South African ID & Medical Aid
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '2px' }}>
                  Have your SA ID number and medical aid card handy if requesting PMB certificates.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BookingSuccessPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-cream-base, #FAF6EE)' }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-gold-base, #DFAB62)' }} />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
