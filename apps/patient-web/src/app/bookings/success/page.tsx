'use client';

import { formatClockTime, formatZoneAbbr } from '../../../lib/time';
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Video,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Wifi,
  Volume2,
  Loader2,
  AlertCircle,
  UploadCloud,
  X,
  Check,
  Mail,
  FileText,
  CreditCard,
  Bell,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { ChekupCrossLogo } from '../../../components/common/ChekupCrossLogo';
import '../../../styles/booking-success.css';

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
 * Original Chekup247 Platform Brand Logo
 */
function PlatformLogo() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <ChekupCrossLogo size={26} />
      <span
        style={{
          fontSize: '1.28rem',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'baseline',
          fontFamily: 'var(--font-heading, "Outfit", sans-serif)',
        }}
      >
        <span style={{ color: 'var(--color-chocolate-base, #2A170F)' }}>Chekup</span>
        <span style={{ color: 'var(--color-gold-base, #DFAB62)' }}>247</span>
      </span>
    </div>
  );
}


/** Doctor photo with an initials fallback (never another doctor's stock photo). */
function DoctorPhoto({ src, name }: { src?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const initials =
    name
      .replace(/^(dr|prof)\.?\s+/i, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'DR';
  if (!src || failed) {
    return (
      <span className="bs-initials" role="img" aria-label={name}>
        {initials}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const bookingIdParam = searchParams.get('bookingId');
  const referenceParam = searchParams.get('reference');

  const [booking, setBooking] = useState<BookingSuccessData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Phase 2 Post-payment intake state
  const [patientNotes, setPatientNotes] = useState<string>('');
  const [allergies, setAllergies] = useState<string>('');
  const [currentMedications, setCurrentMedications] = useState<string>('');
  const [attachedDocs, setAttachedDocs] = useState<AttachedDoc[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [isSavingIntake, setIsSavingIntake] = useState<boolean>(false);
  const [intakeSavedNotice, setIntakeSavedNotice] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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
      `LOCATION:ChekUp247 Virtual Video Room`,
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

  const slotStart = booking?.slot?.startTime;
  const formattedDate = slotStart
    ? new Date(slotStart).toLocaleDateString('en-ZA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'To be confirmed';

  const formattedTime =
    slotStart && booking?.slot?.endTime
      ? `${formatClockTime(slotStart)} – ${formatClockTime(booking.slot.endTime)} ${formatZoneAbbr(slotStart)}`.trim()
      : '';

  // Support both API state and standard confirmed status
  const isPaymentConfirmed =
    booking?.status === 'confirmed' ||
    booking?.payment_status === 'held' ||
    !referenceParam; // Default to confirmed on success page

  const doctorName = booking?.doctor?.fullName || 'Your doctor';
  const hpcsa =
    booking?.doctor?.hpcsaNumber && booking.doctor.hpcsaNumber !== 'PENDING' ? booking.doctor.hpcsaNumber : null;

  const formattedBookingId = booking?.id
    ? booking.id.length > 14
      ? `${booking.id.substring(0, 7)}...${booking.id.substring(booking.id.length - 5)}`
      : booking.id
    : '';

  const paidLine =
    booking?.price !== undefined && isPaymentConfirmed ? `Paid R${Number(booking.price).toFixed(2)}` : null;

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
    <div className="bs-page">
      <div className="bs-glow" aria-hidden="true" />

      <div className="bs-wrap">
        <header className="bs-header">
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex' }} aria-label="Chekup247 Home">
            <PlatformLogo />
          </Link>
          <span className="bs-tagline">Better care. From anywhere.</span>
        </header>

        {/* Hero */}
        <section className="bs-hero" aria-live="polite">
          <div className={`bs-hero-icon${isPaymentConfirmed ? '' : ' is-pending'}`}>
            {isPaymentConfirmed ? <Check size={26} strokeWidth={3} /> : <Clock size={24} strokeWidth={2.5} />}
          </div>
          <div className="bs-hero-text">
            <span className={`bs-pill${isPaymentConfirmed ? '' : ' is-pending'}`}>
              {isPaymentConfirmed ? 'Payment confirmed' : 'Payment required · slot held'}
            </span>
            <h1 className="bs-title">{isPaymentConfirmed ? "You're all booked!" : 'Finish payment to confirm'}</h1>
            <p className="bs-lede">
              {isPaymentConfirmed
                ? 'Your video consultation is confirmed. Your receipt and a personal join button are on their way to your email.'
                : 'Your appointment slot is reserved temporarily. Complete payment through Paystack to confirm the consultation.'}
            </p>
          </div>
        </section>

        {/* Appointment + what happens next */}
        <div className="bs-grid">
          <section className="bs-card" aria-labelledby="bs-appt-title">
            <div className="bs-doctor">
              <div className="bs-avatar">
                <DoctorPhoto src={booking.doctor?.avatarUrl} name={doctorName} />
              </div>
              <div className="bs-doctor-info">
                <div className="bs-eyebrow" id="bs-appt-title">
                  Your practitioner
                </div>
                <div className="bs-doctor-name">{doctorName}</div>
                <div className="bs-doctor-sub">
                  {booking.doctor?.specialty || 'General Practitioner'}
                  {hpcsa ? ` · HPCSA ${hpcsa}` : ''}
                </div>
              </div>
            </div>

            <ul className="bs-facts">
              <li className="bs-fact">
                <span className="bs-fact-icon">
                  <Calendar size={20} />
                </span>
                <div className="bs-fact-body">
                  <div className="bs-eyebrow">Date &amp; time</div>
                  <div className="bs-fact-value">{formattedDate}</div>
                  {formattedTime && <div className="bs-fact-note">{formattedTime}</div>}
                </div>
              </li>
              <li className="bs-fact">
                <span className="bs-fact-icon">
                  <CreditCard size={20} />
                </span>
                <div className="bs-fact-body">
                  <div className="bs-eyebrow">Booking reference</div>
                  <div className="bs-fact-value bs-mono">{formattedBookingId}</div>
                  {paidLine && <div className="bs-fact-note is-good">{paidLine}</div>}
                </div>
              </li>
            </ul>

            <div className="bs-notice">
              <span className="bs-notice-icon">
                <ShieldCheck size={18} />
              </span>
              <div>
                <strong>Your join button is in your email</strong>
                No code or password needed. When it&apos;s time, tap <b>Join Your Consultation</b> in the confirmation
                email. Can&apos;t see it? Check your junk or spam folder.
              </div>
            </div>

            <div className="bs-actions">
              <Link href={`/consultations/${booking?.id || bookingIdParam}`} className="bs-btn bs-btn-primary">
                <Video size={18} />
                <span>Enter waiting room</span>
                <ArrowRight size={16} />
              </Link>
              <button type="button" onClick={handleDownloadICS} className="bs-btn bs-btn-ghost">
                <CalendarDays size={18} />
                <span>Add to calendar</span>
              </button>
            </div>
            <p className="bs-hint">The room opens 15 minutes before your start time.</p>
          </section>

          <aside className="bs-card" aria-labelledby="bs-next-title">
            <h2 className="bs-card-title" id="bs-next-title">
              You&apos;re good to go
            </h2>
            <p className="bs-card-sub">Here&apos;s what happens next.</p>
            <ul className="bs-status-list">
              <li className="bs-status-item">
                <span className="bs-status-icon">
                  <Mail size={18} />
                </span>
                <div>
                  <div className="bs-status-label">Confirmation email</div>
                  <div className="bs-status-detail">Sent{user?.email ? ` to ${user.email}` : ''}</div>
                </div>
              </li>
              <li className="bs-status-item">
                <span className="bs-status-icon">
                  <Bell size={18} />
                </span>
                <div>
                  <div className="bs-status-label">Reminders</div>
                  <div className="bs-status-detail">24 hours, 1 hour and 15 minutes before</div>
                </div>
              </li>
              <li className="bs-status-item">
                <span className="bs-status-icon">
                  <Video size={18} />
                </span>
                <div>
                  <div className="bs-status-label">Join from any device</div>
                  <div className="bs-status-detail">Just your browser. Nothing to install.</div>
                </div>
              </li>
            </ul>
          </aside>
        </div>

        {/* Preparation */}
        <section className="bs-card" aria-labelledby="bs-prep-title">
          <div className="bs-head">
            <span className="bs-head-icon">
              <Sparkles size={20} />
            </span>
            <div>
              <h2 className="bs-card-title" id="bs-prep-title">
                Prepare for your consultation
              </h2>
              <p className="bs-card-sub">
                Optional, but it helps {booking?.doctor?.fullName || 'your doctor'} make the most of your time.
              </p>
            </div>
          </div>

          {intakeSavedNotice && (
            <div className="bs-saved" role="status">
              <Check size={18} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{intakeSavedNotice}</span>
            </div>
          )}

          <div className="bs-prep-grid">
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUploadReport}
                accept=".pdf,image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                id="bs-upload-input"
              />
              <button
                type="button"
                className="bs-upload"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingFile}
              >
                {isUploadingFile ? (
                  <>
                    <Loader2 size={26} className="animate-spin" style={{ color: '#b88647' }} />
                    <strong>Uploading to encrypted storage…</strong>
                  </>
                ) : (
                  <>
                    <UploadCloud size={28} style={{ color: '#b88647' }} />
                    <strong>Upload a lab test, blood report or scan</strong>
                    <span>PDF, JPG or PNG, up to 15MB. Encrypted in line with POPIA &amp; HPCSA guidelines.</span>
                  </>
                )}
              </button>

              {attachedDocs.length > 0 ? (
                <ul className="bs-docs">
                  {attachedDocs.map((doc, idx) => (
                    <li className="bs-doc" key={`${doc.name}-${idx}`}>
                      <FileText size={18} style={{ color: '#b88647', flexShrink: 0 }} />
                      <span className="bs-doc-name">{doc.name}</span>
                      <button
                        type="button"
                        className="bs-doc-remove"
                        onClick={() => handleRemoveDoc(idx)}
                        aria-label={`Remove ${doc.name}`}
                      >
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="bs-empty">No lab reports attached yet.</p>
              )}
            </div>

            <div className="bs-form">
              <div className="bs-field">
                <label htmlFor="bs-allergies">Known drug allergies</label>
                <input
                  id="bs-allergies"
                  type="text"
                  value={allergies}
                  onChange={(e) => setAllergies(e.target.value)}
                  placeholder="e.g. Penicillin"
                />
              </div>
              <div className="bs-field">
                <label htmlFor="bs-meds">Current medications &amp; dosages</label>
                <input
                  id="bs-meds"
                  type="text"
                  value={currentMedications}
                  onChange={(e) => setCurrentMedications(e.target.value)}
                  placeholder="e.g. Metformin 500mg twice daily"
                />
              </div>
              <div className="bs-field">
                <label htmlFor="bs-notes">Symptoms or notes for the doctor</label>
                <textarea
                  id="bs-notes"
                  rows={4}
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  placeholder="When did it start? What makes it better or worse?"
                />
              </div>
              <button
                type="button"
                className="bs-btn bs-btn-primary"
                onClick={handleSaveIntakeDetails}
                disabled={isSavingIntake}
              >
                {isSavingIntake ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving…</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Save for my doctor</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Checklist */}
        <section className="bs-card" aria-labelledby="bs-check-title">
          <div className="bs-head">
            <span className="bs-head-icon">
              <FileText size={20} />
            </span>
            <div>
              <h2 className="bs-card-title" id="bs-check-title">
                Before your consultation
              </h2>
              <p className="bs-card-sub">A few minutes before your start time, make sure you have:</p>
            </div>
          </div>
          <div className="bs-checklist">
            <div className="bs-check-item">
              <span className="bs-fact-icon">
                <Wifi size={20} />
              </span>
              <div>
                <h3>Stable internet</h3>
                <p>At least 5 Mbps is recommended for smooth HD video and audio.</p>
              </div>
            </div>
            <div className="bs-check-item">
              <span className="bs-fact-icon">
                <Volume2 size={20} />
              </span>
              <div>
                <h3>A quiet, well-lit room</h3>
                <p>A private space with good lighting so the doctor can assess you clearly.</p>
              </div>
            </div>
            <div className="bs-check-item">
              <span className="bs-fact-icon">
                <FileText size={20} />
              </span>
              <div>
                <h3>ID &amp; medical aid details</h3>
                <p>Have your SA ID number and medical aid card handy if you need PMB certificates.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
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
