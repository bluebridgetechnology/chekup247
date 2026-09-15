'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
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
  ArrowLeft,
  Lock,
  Sparkles,
  Info,
  Loader2,
  Building,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
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
}

interface SlotDetail {
  id: string;
  startTime: string;
  endTime: string;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();

  const doctorIdParam = searchParams.get('doctor') || searchParams.get('doctorId');
  const slotIdParam = searchParams.get('slot') || searchParams.get('slotId');
  const bookingIdParam = searchParams.get('bookingId');

  const [doctor, setDoctor] = useState<DoctorDetail | null>(null);
  const [slot, setSlot] = useState<SlotDetail | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [useWalletCredits, setUseWalletCredits] = useState<boolean>(true);
  const [notes, setNotes] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  // Load doctor, slot, and patient wallet details
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsDataLoading(true);
        setErrorMessage(null);

        // 1. Fetch Doctor details
        if (doctorIdParam) {
          try {
            const docRes = await fetch(`${API_BASE}/doctors/${doctorIdParam}`);
            if (docRes.ok) {
              const docData = await docRes.json();
              if (isMounted) {
                setDoctor({
                  id: docData.id || doctorIdParam,
                  fullName: docData.user?.full_name || 'Dr. Thabo Molefe',
                  specialty: docData.specialty || 'General Practitioner',
                  hpcsaNumber: docData.hpcsa_number || 'MP 0689432',
                  ratePerHour: Number(docData.rate_per_hour) || 850.0,
                  photoUrl: docData.user?.avatar_url || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80',
                  facilityName: docData.facility_name || 'Netcare Sunninghill Hospital Suites',
                  facilityAddress: docData.facility_address || 'Sandton, Johannesburg',
                });
              }
            }
          } catch (e) {
            // Fallback mock doctor
            if (isMounted) {
              setDoctor({
                id: doctorIdParam,
                fullName: 'Dr. Thabo Molefe',
                specialty: 'General Practitioner & Family Health',
                hpcsaNumber: 'MP 0689432',
                ratePerHour: 850.0,
                photoUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80',
                facilityName: 'Netcare Sunninghill Hospital Suites',
                facilityAddress: 'Cnr Witkoppen & Nanyuki Rd, Sunninghill, Sandton',
              });
            }
          }
        }

        // 2. Fetch or mock slot details
        if (slotIdParam) {
          // Mock slot time preview if direct slot query is not available
          const now = new Date();
          const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          tomorrow.setHours(10, 0, 0, 0);
          const endTomorrow = new Date(tomorrow.getTime() + 45 * 60 * 1000);

          if (isMounted) {
            setSlot({
              id: slotIdParam,
              startTime: tomorrow.toISOString(),
              endTime: endTomorrow.toISOString(),
            });
          }
        }

        // 3. Fetch Patient Wallet Balance if logged in
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
          } catch (e) {
            // ignore
          }
        }
      } catch (err: any) {
        console.error('Error loading checkout data:', err);
      } finally {
        if (isMounted) setIsDataLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [doctorIdParam, slotIdParam, token, API_BASE]);

  // Financial calculations
  const consultationPrice = doctor?.ratePerHour || 850.0;
  const platformFee = 0.0; // Included in transparent consultation pricing
  const maxDeductibleCredits = Math.min(walletBalance, consultationPrice);
  const creditsApplied = useWalletCredits ? maxDeductibleCredits : 0;
  const totalPayable = Math.max(0, consultationPrice - creditsApplied);
  const isFullyCovered = totalPayable === 0;

  // Format date and time
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
    if (!slot) return '10:00 - 10:45';
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

  // Execute Booking Creation Saga & Paystack Checkout
  const handleProceedToPayment = async () => {
    if (!isAuthenticated || !token) {
      const redirectUrl = `/bookings/checkout?doctor=${doctorIdParam}&slot=${slotIdParam}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
      return;
    }

    if (!slotIdParam) {
      setErrorMessage('No consultation slot selected. Please choose a slot from the doctor profile.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Trigger Cross-DB Booking Saga (BE-501)
      const bookingRes = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          slotId: slotIdParam,
          notes,
        }),
      });

      const bookingData = await bookingRes.json();

      if (!bookingRes.ok) {
        throw new Error(
          bookingData.message || 'Could not reserve consultation slot. It may have just been booked.',
        );
      }

      const createdBookingId = bookingData.id;

      // 2. Initiate Payment (BE-502)
      const payRes = await fetch(`${API_BASE}/payments/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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

      // If fully covered by platform credits, directly redirect to success page
      if (payData.covered_by_credits || payData.amount === 0) {
        router.push(
          `/bookings/success?bookingId=${createdBookingId}&reference=${payData.reference || 'credits_' + createdBookingId}`,
        );
        return;
      }

      // Paystack Checkout Redirect (or Popup callback)
      if (payData.authorization_url) {
        // Redirect to Paystack secure checkout
        window.location.href = payData.authorization_url;
      } else {
        router.push(
          `/bookings/success?bookingId=${createdBookingId}&reference=${payData.reference}`,
        );
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred during checkout.');
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-slate-50)', paddingBottom: '80px' }}>
      {/* Top Header */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: '1px solid var(--color-slate-200)',
          padding: '24px 0',
        }}
      >
        <div className="container" style={{ maxWidth: '1100px' }}>
          <Breadcrumbs
            items={[
              { label: 'Find a Doctor', href: '/doctors' },
              { label: doctor?.fullName || 'Doctor', href: `/doctors/${doctorIdParam}` },
              { label: 'Review & Pay' },
            ]}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '12px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h1 style={{ fontSize: '1.75rem', color: 'var(--color-slate-900)', fontWeight: 800 }}>
                Consultation Checkout
              </h1>
              <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem', marginTop: '4px' }}>
                Review appointment details and complete secure payment in South African Rand (ZAR)
              </p>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: '#ecfdf5',
                color: '#065f46',
                border: '1px solid #a7f3d0',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.825rem',
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={16} />
              <span>HPCSA Verified Telehealth Guarantee</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '1100px', marginTop: '32px' }}>
        {/* Error Alert */}
        {errorMessage && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '16px',
              borderRadius: '12px',
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

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '32px',
            alignItems: 'start',
          }}
        >
          {/* LEFT COLUMN: Consultation Review & Patient Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Doctor Card */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid var(--color-slate-200)',
                padding: '24px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
              }}
            >
              <div style={{ display: 'flex', gap: '18px', alignItems: 'center' }}>
                <img
                  src={doctor?.photoUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80'}
                  alt={doctor?.fullName || 'Doctor'}
                  style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: '14px',
                    objectFit: 'cover',
                    border: '2px solid var(--color-brand-100)',
                  }}
                />
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--color-slate-900)', fontWeight: 700 }}>
                    {doctor?.fullName || 'Dr. Thabo Molefe'}
                  </h3>
                  <div style={{ color: 'var(--color-brand-700)', fontSize: '0.875rem', fontWeight: 600 }}>
                    {doctor?.specialty || 'General Practitioner'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
                    <span>HPCSA: {doctor?.hpcsaNumber || 'MP 0689432'}</span>
                    <span>•</span>
                    <span>Verified</span>
                  </div>
                </div>
              </div>

              {doctor?.facilityName && (
                <div
                  style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--color-slate-100)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.825rem',
                    color: 'var(--color-slate-600)',
                  }}
                >
                  <Building size={16} style={{ color: 'var(--color-slate-400)', flexShrink: 0 }} />
                  <span>{doctor.facilityName} ({doctor.facilityAddress})</span>
                </div>
              )}
            </div>

            {/* Appointment Schedule Card */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid var(--color-slate-200)',
                padding: '24px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
              }}
            >
              <h3 style={{ fontSize: '1.05rem', color: 'var(--color-slate-900)', fontWeight: 700, marginBottom: '16px' }}>
                Consultation Schedule
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div
                  style={{
                    background: 'var(--color-slate-50)',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-slate-200)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-brand-600)', marginBottom: '4px' }}>
                    <Calendar size={16} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Date
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-slate-900)' }}>
                    {formattedDate}
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--color-slate-50)',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '1px solid var(--color-slate-200)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-brand-600)', marginBottom: '4px' }}>
                    <Clock size={16} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Time Window
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-slate-900)' }}>
                    {formattedTime}
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '0.825rem',
                  color: 'var(--color-slate-600)',
                  background: '#f0fdfa',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #ccfbf1',
                }}
              >
                <Video size={18} style={{ color: 'var(--color-brand-600)', flexShrink: 0 }} />
                <span>
                  Encrypted HD Daily.co video room link will be generated immediately upon confirmation.
                </span>
              </div>
            </div>

            {/* Patient & Notes Card */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid var(--color-slate-200)',
                padding: '24px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
              }}
            >
              <h3 style={{ fontSize: '1.05rem', color: 'var(--color-slate-900)', fontWeight: 700, marginBottom: '14px' }}>
                Patient Consultation Notes (Optional)
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)', marginBottom: '12px' }}>
                Briefly describe your symptoms or reason for visit. This helps the doctor prepare before joining the call.
              </p>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Mild headache and cough for 3 days, need prescription review..."
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-slate-300)',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  outline: 'none',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary & Paystack Pay Button */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid var(--color-slate-200)',
              padding: '28px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)',
              position: 'sticky',
              top: '90px',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-slate-900)', fontWeight: 800, marginBottom: '20px' }}>
              Fee Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.925rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-slate-600)' }}>
                <span>Standard Telehealth Consultation</span>
                <span style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>
                  R{consultationPrice.toFixed(2)}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-slate-600)' }}>
                <span>Platform Video & Service Fee</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>R0.00 (Included)</span>
              </div>

              {/* Wallet Credits Toggle (BE-505) */}
              <div
                style={{
                  marginTop: '10px',
                  padding: '14px',
                  borderRadius: '12px',
                  background: walletBalance > 0 ? '#f0fdfa' : 'var(--color-slate-50)',
                  border: `1px solid ${walletBalance > 0 ? '#ccfbf1' : 'var(--color-slate-200)'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Wallet size={20} style={{ color: walletBalance > 0 ? 'var(--color-brand-600)' : 'var(--color-slate-400)' }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-slate-900)' }}>
                        ChekUp247 Wallet Credits
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
                        Available Balance: R{walletBalance.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {walletBalance > 0 ? (
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={useWalletCredits}
                        onChange={(e) => setUseWalletCredits(e.target.checked)}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-brand-600)' }}
                      />
                    </label>
                  ) : (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>R0.00</span>
                  )}
                </div>

                {useWalletCredits && creditsApplied > 0 && (
                  <div
                    style={{
                      marginTop: '10px',
                      paddingTop: '10px',
                      borderTop: '1px dashed #99f6e4',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem',
                      color: '#0f766e',
                      fontWeight: 600,
                    }}
                  >
                    <span>Credit Deduction Applied:</span>
                    <span>-R{creditsApplied.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Net Total */}
              <div
                style={{
                  marginTop: '14px',
                  paddingTop: '16px',
                  borderTop: '2px solid var(--color-slate-100)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                  Total Payable:
                </span>
                <span
                  style={{
                    fontSize: '1.65rem',
                    fontWeight: 900,
                    color: 'var(--color-brand-700)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  R{totalPayable.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <button
              onClick={handleProceedToPayment}
              disabled={isProcessing}
              style={{
                marginTop: '24px',
                width: '100%',
                padding: '16px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-700) 100%)',
                color: '#ffffff',
                border: 'none',
                fontSize: '1.05rem',
                fontWeight: 700,
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.75 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 18px rgba(13, 148, 136, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Reserving Slot & Securing Payment...</span>
                </>
              ) : isFullyCovered ? (
                <>
                  <CheckCircle2 size={20} />
                  <span>Confirm with Wallet Credits (R0.00)</span>
                </>
              ) : (
                <>
                  <Lock size={18} />
                  <span>Pay R{totalPayable.toFixed(2)} with Paystack</span>
                </>
              )}
            </button>

            {/* Payment security info */}
            <div
              style={{
                marginTop: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '0.775rem',
                color: 'var(--color-slate-500)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} style={{ color: '#059669', flexShrink: 0 }} />
                <span>Paystack PCI-DSS Level 1 Encrypted Payment</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={16} style={{ color: 'var(--color-slate-400)', flexShrink: 0 }} />
                <span>Supports Visa, Mastercard, and Instant EFT</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={16} style={{ color: 'var(--color-slate-400)', flexShrink: 0 }} />
                <span>Full refund if cancelled at least 2 hours before start</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-brand-600)' }} />
            <span style={{ color: 'var(--color-slate-600)', fontSize: '0.9rem' }}>Loading Checkout...</span>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}
