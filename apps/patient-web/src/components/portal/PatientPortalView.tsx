'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { SolarIcon } from '../SolarIcon';
import { useAuth } from '../../context/AuthContext';
import {
  PortalBooking,
  DEFAULT_PORTAL_BOOKINGS,
  mapApiBookingToPortalBooking,
} from '../../lib/portalData';
import { getGoogleCalendarUrl, downloadIcsForBooking } from '../../lib/calendar';
import { PortalDoctorFinder } from './PortalDoctorFinder';

function SearchParamListener({ onChangeView }: { onChangeView: (v: string) => void }) {
  const searchParams = useSearchParams();
  const view = searchParams?.get('view') || 'appointments';
  useEffect(() => {
    onChangeView(view);
  }, [view, onChangeView]);
  return null;
}

export function PatientPortalView({ initialView = 'appointments' }: { initialView?: string }) {
  const { user, token } = useAuth();
  const [currentView, setCurrentView] = useState<string>(initialView);

  const [bookings, setBookings] = useState<PortalBooking[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Overflow menu active ID
  const [activeOverflowId, setActiveOverflowId] = useState<string | null>(null);

  // Cancellation Modal state
  const [cancellingBooking, setCancellingBooking] = useState<PortalBooking | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isProcessingCancel, setIsProcessingCancel] = useState(false);

  // Reschedule Modal state
  const [reschedulingBooking, setReschedulingBooking] = useState<PortalBooking | null>(null);

  // Calendar Modal state
  const [calendarModalBooking, setCalendarModalBooking] = useState<PortalBooking | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  // Fetch real bookings and prescriptions if token is available
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (!token) {
        if (isMounted) {
          setBookings([]);
          setIsLoading(false);
        }
        return;
      }
      try {
        setIsLoading(true);

        // 1. Fetch real bookings from backend
        const res = await fetch(`${API_BASE}/bookings/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const mapped = data.map((b: any) => mapApiBookingToPortalBooking(b));
            if (isMounted) setBookings(mapped);
          } else {
            if (isMounted) setBookings([]);
          }
        } else {
          if (isMounted) setBookings([]);
        }

        // 2. Fetch real prescriptions for this patient
        if (user?.id) {
          try {
            const prescRes = await fetch(`${API_BASE}/prescriptions/patient/${user.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (prescRes.ok) {
              const prescData = await prescRes.json();
              if (Array.isArray(prescData) && isMounted) {
                setPrescriptions(prescData);
              }
            }
          } catch {
            // non-blocking
          }
        }
      } catch (err) {
        console.error('Error fetching bookings:', err);
        if (isMounted) setBookings([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [token, user?.id, API_BASE]);

  // Close overflow menu on outside click
  useEffect(() => {
    function handleClickOutside() {
      if (activeOverflowId) setActiveOverflowId(null);
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [activeOverflowId]);

  // Compute Statistics Strip dynamically
  const stats = useMemo(() => {
    const upcoming = bookings.filter((b) => !b.isPast && (b.status === 'confirmed' || b.status === 'pending')).length;
    const completed = bookings.filter((b) => b.isPast || b.status === 'completed').length;
    const totalPrescriptions = prescriptions.length;
    return { upcoming, completed, prescriptions: totalPrescriptions };
  }, [bookings, prescriptions]);

  // Filter Bookings by Tab & Search Query
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      // Tab matching:
      // UPCOMING: must NOT be past, and status must be confirmed or pending
      if (activeTab === 'upcoming') {
        if (b.isPast || (b.status !== 'confirmed' && b.status !== 'pending')) return false;
      }
      // PAST: either marked completed or meeting end time is in the past (and not cancelled)
      if (activeTab === 'past') {
        if (b.status === 'cancelled') return false;
        if (!b.isPast && b.status !== 'completed') return false;
      }
      // CANCELLED: status cancelled
      if (activeTab === 'cancelled') {
        if (b.status !== 'cancelled') return false;
      }

      // Search matching
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const docName = b.doctor.name.toLowerCase();
        const specialty = b.doctor.specialty.toLowerCase();
        const location = b.doctor.location.toLowerCase();
        const tags = b.doctor.tags.join(' ').toLowerCase();
        const reason = (b.reason || '').toLowerCase();

        return (
          docName.includes(query) ||
          specialty.includes(query) ||
          location.includes(query) ||
          tags.includes(query) ||
          reason.includes(query)
        );
      }
      return true;
    });
  }, [bookings, activeTab, searchQuery]);

  // Handle Cancel Booking Submission
  const handleConfirmCancel = async () => {
    if (!cancellingBooking) return;
    setIsProcessingCancel(true);

    try {
      if (token) {
        await fetch(`${API_BASE}/bookings/${cancellingBooking.id}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: cancelReason, action: 'refund' }),
        });
      }

      setBookings((prev) =>
        prev.map((b) => (b.id === cancellingBooking.id ? { ...b, status: 'cancelled' } : b)),
      );
      setCancellingBooking(null);
      setCancelReason('');
    } catch (err) {
      console.error('Cancellation error:', err);
    } finally {
      setIsProcessingCancel(false);
    }
  };

  // 1. My Doctors View
  const renderMyDoctors = () => {
    // Derive unique doctors from patient's real bookings
    const bookedDoctorsMap = new Map<string, any>();
    bookings.forEach((b) => {
      if (b.doctor && !bookedDoctorsMap.has(b.doctor.name)) {
        bookedDoctorsMap.set(b.doctor.name, {
          id: b.doctor.id,
          name: b.doctor.name,
          specialty: b.doctor.specialty,
          location: b.doctor.location,
          qualifications: b.doctor.qualifications || 'MBChB (HPCSA)',
          photoUrl: b.doctor.photoUrl || '/images/doctor_thabo.jpg',
          slug: b.doctor.id,
          rating: b.doctor.ratingAvg || 4.9,
          reviewsCount: b.doctor.reviewsCount || 50,
          experience: 'Accredited Telehealth Specialist',
          hpcsa: 'Verified Practitioner',
        });
      }
    });
    const doctorList = Array.from(bookedDoctorsMap.values());

    return (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '20px',
          }}
          className="portal-page-intro"
        >
          <div>
            <div
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#B88647',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              YOUR HEALTHCARE TEAM
            </div>
            <h1
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                color: '#2A170F',
                margin: '0 0 4px 0',
                fontFamily: 'var(--font-heading), sans-serif',
                lineHeight: 1.2,
              }}
            >
              My Doctors
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#6B5E55', margin: 0, lineHeight: 1.45 }}>
              Accredited South African healthcare practitioners you have consulted with on Chekup247.
            </p>
          </div>

          <Link
            href="/appointments?view=find-doctor"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#EDD5B3',
              color: '#2A170F',
              fontSize: '0.86rem',
              fontWeight: 600,
              padding: '9px 18px',
              borderRadius: '24px',
              textDecoration: 'none',
              minHeight: '44px',
              boxShadow: '0 2px 8px rgba(223, 171, 98, 0.22)',
            }}
            className="portal-primary-cta"
          >
            <SolarIcon name="magnifer-linear" size={16} color="#2A170F" />
            <span>Find a Doctor</span>
          </Link>
        </div>

        {doctorList.length === 0 ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #EDE4D4',
              padding: '40px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: '#F7EFE1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}
            >
              <SolarIcon name="user-linear" size={22} color="#B88647" />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2A170F', marginBottom: '6px' }}>
              No Doctors in Your Care Team Yet
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#6B5E55', maxWidth: '400px', margin: '0 auto 16px auto' }}>
              Healthcare practitioners you consult with on Chekup247 will automatically appear here for convenient follow-ups.
            </p>
            <Link
              href="/appointments?view=find-doctor"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#EDD5B3',
                color: '#2A170F',
                fontSize: '0.84rem',
                fontWeight: 600,
                padding: '8px 18px',
                borderRadius: '20px',
                textDecoration: 'none',
                minHeight: '40px',
              }}
            >
              <span>Find a Doctor</span>
              <SolarIcon name="arrow-right-linear" size={13} color="#2A170F" />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {doctorList.map((doc) => (
            <div
              key={doc.id}
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EDE4D4',
                borderRadius: '18px',
                padding: '20px',
                boxShadow: '0 2px 10px rgba(42, 23, 15, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '64px',
                      height: '64px',
                      borderRadius: '14px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      backgroundColor: '#F7EFE1',
                      border: '1.5px solid #E2D5C3',
                    }}
                  >
                    <Image src={doc.photoUrl} alt={doc.name} fill sizes="64px" style={{ objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '0.72rem', color: '#0E7039', backgroundColor: '#EAF7EE', padding: '2px 6px', borderRadius: '8px', fontWeight: 600 }}>
                        ★ {doc.rating} ({doc.reviewsCount})
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#7A6A5E' }}>HPCSA {doc.hpcsa}</span>
                    </div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2A170F', margin: '0 0 2px 0', fontFamily: 'var(--font-heading), sans-serif' }}>
                      {doc.name}
                    </h3>
                    <div style={{ fontSize: '0.78rem', color: '#B88647', fontWeight: 600 }}>
                      {doc.specialty}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#6B5E55', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <SolarIcon name="map-point-linear" size={13} color="#B88647" />
                    <span>{doc.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <SolarIcon name="diploma-linear" size={13} color="#7A6A5E" />
                    <span>{doc.qualifications}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid #F4EBE1' }}>
                <Link
                  href={doc.slug ? `/doctors/${doc.slug}` : '/appointments?view=find-doctor'}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    backgroundColor: '#2E1A10',
                    color: '#FAF6EE',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    padding: '9px 12px',
                    borderRadius: '18px',
                    textDecoration: 'none',
                    minHeight: '38px',
                  }}
                  className="portal-join-btn"
                >
                  <SolarIcon name="calendar-add-linear" size={14} color="#DFAB62" />
                  <span>Book Slot</span>
                </Link>
                <Link
                  href={`/doctors/${doc.slug}`}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D5C1A7',
                    color: '#2A170F',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    padding: '9px 12px',
                    borderRadius: '18px',
                    textDecoration: 'none',
                    minHeight: '38px',
                  }}
                  className="portal-details-btn"
                >
                  <span>View Profile</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    );
  };

  // 2. Health Records View
  const renderHealthRecords = () => {
    const records = prescriptions.map((p, index) => {
      const meds = Array.isArray(p.medications)
        ? p.medications.map((m: any) => m.name).join(', ')
        : 'Consultation Treatment Plan';
      return {
        id: p.id || `rec-${index}`,
        title: `Clinical Prescription Record #${(p.id || '').substring(0, 8).toUpperCase()}`,
        doctor: p.doctor?.fullName || 'Attending Telehealth Practitioner',
        date: p.created_at
          ? new Date(p.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })
          : 'Recent Consultation',
        category: p.icd10_code ? `ICD-10: ${p.icd10_code}` : 'Clinical Record',
        notes: `Prescribed medications: ${meds}. Official clinical summary recorded under HPCSA electronic standards.`,
        icon: 'document-medicine-bold',
        iconColor: '#0E7039',
        iconBg: '#EAF7EE',
        downloadUrl: `${API_BASE}/prescriptions/${p.id}/download`,
      };
    });

    return (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '20px',
          }}
          className="portal-page-intro"
        >
          <div>
            <div
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#B88647',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              ELECTRONIC HEALTH RECORDS
            </div>
            <h1
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                color: '#2A170F',
                margin: '0 0 4px 0',
                fontFamily: 'var(--font-heading), sans-serif',
                lineHeight: 1.2,
              }}
            >
              Health Records & Clinical Notes
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#6B5E55', margin: 0, lineHeight: 1.45 }}>
              Confidential consultation notes, vital sign logs, and diagnostic laboratory summaries.
            </p>
          </div>

          <Link
            href="/appointments"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D5C1A7',
              color: '#2A170F',
              fontSize: '0.84rem',
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: '20px',
              textDecoration: 'none',
              minHeight: '40px',
            }}
            className="portal-details-btn"
          >
            <SolarIcon name="calendar-linear" size={14} color="#2A170F" />
            <span>View Appointments</span>
          </Link>
        </div>

        {records.length === 0 ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #EDE4D4',
              padding: '40px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: '#F7EFE1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}
            >
              <SolarIcon name="document-medicine-linear" size={22} color="#B88647" />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2A170F', marginBottom: '6px' }}>
              No Clinical Health Records Yet
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#6B5E55', maxWidth: '400px', margin: '0 auto 16px auto' }}>
              Official medical records and electronic prescription notes from your consultations will appear here automatically.
            </p>
            <Link
              href="/appointments?view=find-doctor"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#EDD5B3',
                color: '#2A170F',
                fontSize: '0.84rem',
                fontWeight: 600,
                padding: '8px 18px',
                borderRadius: '20px',
                textDecoration: 'none',
                minHeight: '40px',
              }}
            >
              <span>Book a Consultation</span>
              <SolarIcon name="arrow-right-linear" size={13} color="#2A170F" />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {records.map((rec) => (
              <div
                key={rec.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EDE4D4',
                  borderRadius: '18px',
                  padding: '20px',
                  boxShadow: '0 2px 10px rgba(42, 23, 15, 0.03)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: rec.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <SolarIcon name={rec.icon} size={22} color={rec.iconColor} />
                </div>

                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: '#B88647', backgroundColor: '#FAF5ED', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                      {rec.category}
                    </span>
                    <span style={{ fontSize: '0.74rem', color: '#7A6A5E' }}>{rec.date}</span>
                  </div>
                  <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#2A170F', margin: '0 0 4px 0', fontFamily: 'var(--font-heading), sans-serif' }}>
                    {rec.title}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: '#B88647', fontWeight: 600, marginBottom: '6px' }}>
                    Issued by {rec.doctor}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#6B5E55', margin: 0, lineHeight: 1.45 }}>
                    {rec.notes}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'center' }}>
                  <button
                    onClick={() => window.open(rec.downloadUrl, '_blank')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#FAF5ED',
                      border: '1px solid #EDE4D4',
                      color: '#2A170F',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '8px 14px',
                      borderRadius: '18px',
                      cursor: 'pointer',
                      minHeight: '38px',
                    }}
                    className="portal-details-btn"
                  >
                    <SolarIcon name="download-linear" size={14} color="#B88647" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // 3. Medical Documents View (Dynamic from Real Prescriptions & Booking Receipts)
  const renderMedicalDocuments = () => {
    // Generate document list dynamically from real prescriptions and bookings
    const prescriptionDocs = prescriptions.map((p: any) => {
      const pDate = p.created_at
        ? new Date(p.created_at).toLocaleDateString('en-ZA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })
        : 'Recent';
      const docName = p.doctor?.fullName ? `Dr. ${p.doctor.fullName}` : 'Attending Doctor (HPCSA)';
      const itemCount = (p.items || []).length;
      return {
        id: `presc-${p.id}`,
        title: `Medical Prescription #${p.id.slice(0, 8).toUpperCase()}`,
        issuer: docName,
        date: pDate,
        period: `Valid • ${itemCount} medication item${itemCount === 1 ? '' : 's'} prescribed`,
        type: 'Medical Prescription',
        fileSize: 'PDF • Verified Digital Rx',
        downloadUrl: `${API_BASE}/prescriptions/${p.id}/download`,
        icon: 'document-text-bold',
        iconColor: '#C17D3C',
      };
    });

    const receiptDocs = bookings
      .filter((b) => b.status === 'confirmed' || b.status === 'completed' || b.isPast)
      .map((b) => ({
        id: `receipt-${b.id}`,
        title: `Consultation Receipt #${b.id.slice(0, 8).toUpperCase()}`,
        issuer: `${b.doctor.name} (${b.doctor.specialty})`,
        date: b.fullDateFormatted || b.dateFormatted,
        period: `Amount: R ${b.price ? b.price.toFixed(2) : '450.00'} • Paid in full via Card`,
        type: 'Official Receipt',
        fileSize: 'PDF • Electronic Invoice',
        downloadUrl: null,
        icon: 'bill-list-bold',
        iconColor: '#2B5742',
      }));

    const allDocs = [...prescriptionDocs, ...receiptDocs];

    return (
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            marginBottom: '20px',
          }}
          className="portal-page-intro"
        >
          <div>
            <div
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#B88647',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              CERTIFICATES & RECEIPTS
            </div>
            <h1
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                color: '#2A170F',
                margin: '0 0 4px 0',
                fontFamily: 'var(--font-heading), sans-serif',
                lineHeight: 1.2,
              }}
            >
              Medical Documents
            </h1>
            <p style={{ fontSize: '0.88rem', color: '#6B5E55', margin: 0, lineHeight: 1.45 }}>
              Official medical sick certificates complying with HPCSA ethical rules, prescriptions, and consultation payment receipts.
            </p>
          </div>

          <Link
            href="/portal"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #D5C1A7',
              color: '#2A170F',
              fontSize: '0.84rem',
              fontWeight: 600,
              padding: '8px 16px',
              borderRadius: '20px',
              textDecoration: 'none',
              minHeight: '40px',
            }}
            className="portal-details-btn"
          >
            <SolarIcon name="calendar-linear" size={14} color="#2A170F" />
            <span>View Appointments</span>
          </Link>
        </div>

        {allDocs.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 24px',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px dashed #D5C1A7',
            }}
          >
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                backgroundColor: '#FAF5ED',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <SolarIcon name="document-text-linear" size={30} color="#B88647" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2A170F', margin: '0 0 6px 0' }}>
              No Medical Documents Issued Yet
            </h3>
            <p style={{ fontSize: '0.86rem', color: '#7A6A5E', maxWidth: '420px', margin: '0 auto 20px', lineHeight: 1.5 }}>
              Official HPCSA medical sick certificates, prescriptions, and consultation payment receipts will automatically appear here once issued by your attending doctor.
            </p>
            <Link
              href="/portal"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#2E1A10',
                color: '#FAF6EE',
                fontSize: '0.84rem',
                fontWeight: 600,
                padding: '10px 20px',
                borderRadius: '20px',
                textDecoration: 'none',
              }}
            >
              <SolarIcon name="calendar-linear" size={16} color="#DFAB62" />
              <span>Back to Appointments</span>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {allDocs.map((doc) => (
              <div
                key={doc.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EDE4D4',
                  borderRadius: '18px',
                  padding: '20px',
                  boxShadow: '0 2px 10px rgba(42, 23, 15, 0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      backgroundColor: '#FAF2ED',
                      border: '1px solid #F0DCCE',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <SolarIcon name={doc.icon} size={22} color={doc.iconColor} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '0.72rem', color: doc.iconColor, backgroundColor: '#FAF2ED', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                        {doc.type}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: '#7A6A5E' }}>{doc.date}</span>
                    </div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#2A170F', margin: '0 0 3px 0', fontFamily: 'var(--font-heading), sans-serif' }}>
                      {doc.title}
                    </h3>
                    <div style={{ fontSize: '0.76rem', color: '#7A6A5E' }}>
                      {doc.issuer} • <span style={{ fontWeight: 600, color: '#2A170F' }}>{doc.period}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.74rem', color: '#9B8B7F' }}>{doc.fileSize}</span>
                  <button
                    onClick={() => {
                      if (doc.downloadUrl) {
                        window.open(doc.downloadUrl, '_blank');
                      } else {
                        window.print();
                      }
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#2E1A10',
                      color: '#FAF6EE',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      padding: '8px 16px',
                      borderRadius: '18px',
                      cursor: 'pointer',
                      minHeight: '38px',
                      border: 'none',
                    }}
                    className="portal-join-btn"
                  >
                    <SolarIcon name="download-linear" size={14} color="#DFAB62" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        flex: 1,
        backgroundColor: '#F8F4EC', // Warm cream
        padding: '24px 28px 40px 28px',
        boxSizing: 'border-box',
      }}
      className="portal-workspace"
    >
      <React.Suspense fallback={null}>
        <SearchParamListener onChangeView={setCurrentView} />
      </React.Suspense>
      <div style={{ maxWidth: '1060px', margin: '0 auto' }}>
        {currentView === 'doctors' ? (
          renderMyDoctors()
        ) : currentView === 'records' ? (
          renderHealthRecords()
        ) : currentView === 'documents' ? (
          renderMedicalDocuments()
        ) : currentView === 'find-doctor' || currentView === 'search' ? (
          <PortalDoctorFinder />
        ) : (
          <>
            {/* ==================================================================
                1. PAGE INTRODUCTION HEADER (Refined & reduced bulk)
                ================================================================== */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                marginBottom: '18px',
              }}
              className="portal-page-intro"
            >
          <div>
            {/* Eyebrow */}
            <div
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: '0.1em',
                color: '#B88647',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              WELCOME BACK
            </div>

            {/* Main Heading */}
            <h1
              style={{
                fontSize: '1.85rem',
                fontWeight: 800,
                letterSpacing: '-0.025em',
                color: '#2A170F',
                margin: '0 0 4px 0',
                fontFamily: 'var(--font-heading), sans-serif',
                lineHeight: 1.2,
              }}
            >
              Your Appointments
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: '0.88rem',
                color: '#6B5E55',
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              Manage your upcoming and past consultations, and keep track of your healthcare journey.
            </p>
          </div>

          {/* Primary CTA: Book a Consultation */}
          <Link
            href="/appointments?view=find-doctor"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#EDD5B3',
              color: '#2A170F',
              fontSize: '0.86rem',
              fontWeight: 600,
              padding: '9px 18px',
              borderRadius: '24px',
              textDecoration: 'none',
              minHeight: '44px',
              boxShadow: '0 2px 8px rgba(223, 171, 98, 0.22)',
              transition: 'all 0.18s ease',
              whiteSpace: 'nowrap',
            }}
            className="portal-primary-cta"
          >
            <SolarIcon name="calendar-linear" size={16} color="#2A170F" />
            <span>Book a Consultation</span>
            <SolarIcon name="arrow-right-linear" size={14} color="#2A170F" />
          </Link>
        </div>

        {/* ==================================================================
            2. SUMMARY STATISTICS STRIP (Refined & reduced bulk)
            ================================================================== */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #EDE4D4',
            borderRadius: '16px',
            boxShadow: '0 2px 10px rgba(42, 23, 15, 0.025)',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            padding: '14px 20px',
            marginBottom: '18px',
          }}
          className="portal-stats-strip"
        >
          {/* Stat 1: Upcoming Appointments */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              paddingRight: '16px',
            }}
            className="portal-stat-item"
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#F7EFE1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#2A170F',
              }}
              className="portal-stat-icon-wrapper"
            >
              <SolarIcon name="calendar-linear" size={19} color="#2A170F" />
            </div>
            <div>
              <div
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: '#2A170F',
                  lineHeight: 1.1,
                  fontFamily: 'var(--font-heading), sans-serif',
                }}
                className="portal-stat-number"
              >
                {stats.upcoming}
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#6B5E55',
                  fontWeight: 500,
                  marginTop: '1px',
                }}
                className="portal-stat-label"
              >
                Upcoming Appointments
              </div>
            </div>
          </div>

          {/* Stat 2: Completed Consultations */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0 16px',
              borderLeft: '1px solid #F2EAE0',
            }}
            className="portal-stat-item portal-stat-middle"
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#F7EFE1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#2A170F',
              }}
              className="portal-stat-icon-wrapper"
            >
              <SolarIcon name="check-circle-bold" size={19} color="#2A170F" />
            </div>
            <div>
              <div
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: '#2A170F',
                  lineHeight: 1.1,
                  fontFamily: 'var(--font-heading), sans-serif',
                }}
                className="portal-stat-number"
              >
                {stats.completed}
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#6B5E55',
                  fontWeight: 500,
                  marginTop: '1px',
                }}
                className="portal-stat-label"
              >
                Completed Consultations
              </div>
            </div>
          </div>

          {/* Stat 3: Active Prescription */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              paddingLeft: '16px',
              borderLeft: '1px solid #F2EAE0',
            }}
            className="portal-stat-item portal-stat-last"
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#F7EFE1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#2A170F',
              }}
              className="portal-stat-icon-wrapper"
            >
              <SolarIcon name="document-medicine-linear" size={19} color="#2A170F" />
            </div>
            <div>
              <div
                style={{
                  fontSize: '1.45rem',
                  fontWeight: 800,
                  color: '#2A170F',
                  lineHeight: 1.1,
                  fontFamily: 'var(--font-heading), sans-serif',
                }}
                className="portal-stat-number"
              >
                {stats.prescriptions || 1}
              </div>
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#6B5E55',
                  fontWeight: 500,
                  marginTop: '1px',
                }}
                className="portal-stat-label"
              >
                Active Prescription
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================
            3. APPOINTMENT FILTER BAR & SEARCH (Compact & Accessible)
            ================================================================== */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '14px',
          }}
          className="portal-filter-bar"
        >
          {/* Tabs: Upcoming, Past, Cancelled */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
            role="tablist"
            aria-label="Appointment Filters"
            className="portal-filter-tabs-group"
          >
            {(['upcoming', 'past', 'cancelled'] as const).map((tab) => {
              const isActive = activeTab === tab;
              const label = tab.charAt(0).toUpperCase() + tab.slice(1);

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  role="tab"
                  aria-selected={isActive}
                  style={{
                    padding: '7px 16px',
                    borderRadius: '18px',
                    fontSize: '0.84rem',
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#2A170F' : '#6B5E55',
                    backgroundColor: isActive ? '#EEDCC5' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    minHeight: '40px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.16s ease',
                  }}
                  className={`portal-filter-tab ${isActive ? 'active' : ''}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div
            style={{
              position: 'relative',
              width: '300px',
              maxWidth: '100%',
            }}
            className="portal-search-wrapper"
          >
            <div
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <SolarIcon name="magnifer-linear" size={15} color="#A08F83" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by doctor, name or reason..."
              style={{
                width: '100%',
                padding: '7px 12px 7px 34px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #EDE4D4',
                borderRadius: '20px',
                fontSize: '0.82rem',
                color: '#2A170F',
                outline: 'none',
                boxSizing: 'border-box',
                minHeight: '40px',
                transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
              }}
              className="portal-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#A08F83',
                  cursor: 'pointer',
                  padding: '4px',
                  minWidth: '28px',
                  minHeight: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Clear search"
              >
                <SolarIcon name="close-circle-linear" size={13} color="#A08F83" />
              </button>
            )}
          </div>
        </div>

        {/* ==================================================================
            4. APPOINTMENT CARDS LIST (Reduced visual bulk & clean layout)
            ================================================================== */}
        {!token ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #EDE4D4',
              padding: '48px 24px',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(42, 23, 15, 0.04)',
              maxWidth: '520px',
              margin: '32px auto',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#F7EFE1',
                border: '1.5px solid #E2D5C3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <SolarIcon name="user-linear" size={26} color="#B88647" />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2A170F', margin: '0 0 8px 0', fontFamily: 'var(--font-heading)' }}>
              Sign In to View Your Appointments
            </h2>
            <p style={{ fontSize: '0.9rem', color: '#6B5E55', lineHeight: 1.5, margin: '0 0 24px 0' }}>
              Log in to your Chekup247 account to access your scheduled video consultations, health records, clinical notes, and digital prescriptions.
            </p>
            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#EDD5B3',
                color: '#2A170F',
                fontSize: '0.9rem',
                fontWeight: 700,
                padding: '12px 28px',
                borderRadius: '24px',
                textDecoration: 'none',
                boxShadow: '0 2px 10px rgba(223, 171, 98, 0.3)',
              }}
            >
              <span>Sign In to Chekup247</span>
              <SolarIcon name="arrow-right-linear" size={15} color="#2A170F" />
            </Link>
          </div>
        ) : isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 0',
              color: '#B88647',
              gap: '10px',
            }}
          >
            <span style={{ fontSize: '0.88rem', color: '#6B5E55' }}>Loading consultations...</span>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #EDE4D4',
              padding: '40px 20px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: '#F7EFE1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}
            >
              <SolarIcon name="calendar-linear" size={22} color="#B88647" />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#2A170F', marginBottom: '6px' }}>
              No {activeTab} consultations found
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#6B5E55', maxWidth: '400px', margin: '0 auto 16px auto' }}>
              {searchQuery
                ? `No consultations matched "${searchQuery}". Try a different search term or clear the filter.`
                : activeTab === 'upcoming'
                ? "You don't have any upcoming doctor appointments scheduled right now."
                : `You don't have any ${activeTab} consultations recorded.`}
            </p>
            <Link
              href="/appointments?view=find-doctor"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#EDD5B3',
                color: '#2A170F',
                fontSize: '0.84rem',
                fontWeight: 600,
                padding: '8px 18px',
                borderRadius: '20px',
                textDecoration: 'none',
                minHeight: '40px',
              }}
            >
              <span>Find a Doctor</span>
              <SolarIcon name="arrow-right-linear" size={13} color="#2A170F" />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {filteredBookings.map((booking) => {
              const isOverflowOpen = activeOverflowId === booking.id;

              const renderOverflowMenu = () => (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    width: '200px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(42, 23, 15, 0.14)',
                    border: '1px solid #EDE4D4',
                    padding: '6px',
                    zIndex: 100,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {booking.status === 'confirmed' && (
                    <>
                      <button
                        onClick={() => {
                          setActiveOverflowId(null);
                          setReschedulingBooking(booking);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          color: '#2A170F',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          minHeight: '36px',
                        }}
                        className="portal-dropdown-item"
                      >
                        <SolarIcon name="restart-linear" size={15} color="#7A6A60" />
                        <span>Reschedule Slot</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveOverflowId(null);
                          setCalendarModalBooking(booking);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          color: '#2A170F',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          minHeight: '36px',
                        }}
                        className="portal-dropdown-item"
                      >
                        <SolarIcon name="calendar-add-linear" size={15} color="#B88647" />
                        <span>Add to Calendar</span>
                      </button>
                    </>
                  )}

                  {booking.status === 'confirmed' && (
                    <>
                      <div style={{ height: '1px', backgroundColor: '#F4EBE1', margin: '3px 0' }} />
                      <button
                        onClick={() => {
                          setActiveOverflowId(null);
                          setCancellingBooking(booking);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          width: '100%',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          color: '#DC2626',
                          fontSize: '0.8rem',
                          fontWeight: 500,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          textAlign: 'left',
                          minHeight: '36px',
                        }}
                        className="portal-dropdown-item"
                      >
                        <SolarIcon name="danger-circle-linear" size={15} color="#DC2626" />
                        <span>Cancel Appointment</span>
                      </button>
                    </>
                  )}
                </div>
              );

              return (
                <div
                  key={booking.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #EDE4D4',
                    borderRadius: '18px',
                    boxShadow: '0 2px 12px rgba(42, 23, 15, 0.03)',
                    padding: '22px 24px',
                    position: 'relative',
                    zIndex: isOverflowOpen ? 60 : 1,
                    transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease',
                  }}
                  className="portal-appointment-card"
                >
                  {/* ==========================================
                      MOBILE CARD VIEW (<= 768px)
                      Balanced SaaS mobile card (~175px height)
                      ========================================== */}
                  <div className="portal-mobile-card-view">
                    {/* Top Row: Avatar + Info + Kebab */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', width: '100%' }}>
                      {/* Doctor Avatar */}
                      <div
                        style={{
                          position: 'relative',
                          width: '58px',
                          height: '58px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          backgroundColor: '#F7EFE1',
                          border: '1.5px solid #E2D5C3',
                          boxShadow: '0 2px 6px rgba(42, 23, 15, 0.06)',
                        }}
                      >
                        <Image
                          src={booking.doctor.photoUrl}
                          alt={booking.doctor.name}
                          fill
                          sizes="58px"
                          style={{ objectFit: 'cover', borderRadius: '10px' }}
                        />
                      </div>

                      {/* Doctor Meta & Time */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3
                          style={{
                            fontSize: '1.02rem',
                            fontWeight: 700,
                            color: '#23150D',
                            margin: '0 0 3px 0',
                            lineHeight: 1.25,
                            letterSpacing: '-0.01em',
                            fontFamily: 'var(--font-heading), sans-serif',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {booking.doctor.name}
                        </h3>

                        <div
                          style={{
                            fontSize: '0.78rem',
                            color: '#B88647',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            marginBottom: '6px',
                          }}
                        >
                          <span>{booking.doctor.specialty}</span>
                          <span style={{ color: '#D5C1A7', margin: '0 5px' }}>•</span>
                          <span style={{ color: '#7A6A5E', fontWeight: 500 }}>{booking.doctor.location.split(',')[0]}</span>
                        </div>

                        {/* Date & Time Row */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.8rem',
                            color: '#23150D',
                            marginBottom: '8px',
                          }}
                        >
                          <SolarIcon name="calendar-linear" size={14} color="#B88647" />
                          <span style={{ fontWeight: 700 }}>{booking.dateFormatted}</span>
                          <span style={{ color: '#D5C1A7' }}>•</span>
                          <SolarIcon name="clock-circle-linear" size={13} color="#7A6A5E" />
                          <span style={{ fontWeight: 600 }}>{booking.startTime} – {booking.endTime}</span>
                        </div>

                        {/* Micro Status Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                          {booking.status === 'confirmed' && !booking.isPast && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: '#0E7039',
                                backgroundColor: '#EAF7EE',
                                border: '1px solid #BEE7C9',
                                padding: '3px 9px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                              }}
                            >
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#0E7039' }} />
                              <span>Confirmed</span>
                            </span>
                          )}

                          {booking.status === 'confirmed' && booking.isPast && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: '#7A6A5E',
                                backgroundColor: '#F2EAE0',
                                border: '1px solid #E2D5C3',
                                padding: '3px 9px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                              }}
                            >
                              <SolarIcon name="check-circle-bold" size={12} color="#7A6A5E" />
                              <span>Concluded</span>
                            </span>
                          )}

                          {booking.status === 'completed' && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: '#0D7B70',
                                backgroundColor: '#E6F4F2',
                                border: '1px solid #BFE4DF',
                                padding: '3px 9px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                              }}
                            >
                              <SolarIcon name="check-circle-bold" size={12} color="#0D7B70" />
                              <span>Completed</span>
                            </span>
                          )}

                          {booking.status === 'cancelled' && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: '#C5221F',
                                backgroundColor: '#FDECEC',
                                border: '1px solid #F8C8C7',
                                padding: '3px 9px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                              }}
                            >
                              <SolarIcon name="danger-circle-bold" size={12} color="#C5221F" />
                              <span>Cancelled</span>
                            </span>
                          )}

                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.72rem',
                              color: '#7A6A5E',
                              backgroundColor: '#FAF5ED',
                              border: '1px solid #EDE4D4',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontWeight: 500,
                            }}
                          >
                            <SolarIcon name="videocamera-record-bold" size={12} color="#B88647" />
                            <span>Video</span>
                          </span>
                        </div>
                      </div>

                      {/* Kebab Action Menu */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveOverflowId(isOverflowOpen ? null : booking.id);
                          }}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            border: '1px solid #EDE4D4',
                            background: '#FAF5ED',
                            color: '#2A170F',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                          className="portal-overflow-btn"
                          aria-label="More options"
                        >
                          <SolarIcon name="menu-dots-bold" size={16} color="#2A170F" />
                        </button>

                        {isOverflowOpen && renderOverflowMenu()}
                      </div>
                    </div>

                    {/* Bottom Row: Quick Action Buttons */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginTop: '14px',
                        paddingTop: '13px',
                        borderTop: '1px solid #F4EBE1',
                        width: '100%',
                      }}
                    >
                      {booking.status === 'confirmed' && !booking.isPast ? (
                        <Link
                          href={booking.joinUrl || `/consultations/${booking.id}`}
                          style={{
                            flex: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            backgroundColor: '#2E1A10',
                            color: '#FAF6EE',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            padding: '9px 14px',
                            borderRadius: '20px',
                            textDecoration: 'none',
                            minHeight: '40px',
                            boxShadow: '0 2px 8px rgba(42, 23, 15, 0.14)',
                          }}
                          className="portal-join-btn"
                        >
                          <SolarIcon name="videocamera-record-bold" size={14} color="#DFAB62" />
                          <span>Join Consultation</span>
                        </Link>
                      ) : (
                        <Link
                          href={booking.doctor?.id ? `/doctors/${booking.doctor.id}` : '/appointments?view=find-doctor'}
                          style={{
                            flex: 1,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            backgroundColor: '#EDD5B3',
                            color: '#2A170F',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            padding: '9px 14px',
                            borderRadius: '20px',
                            textDecoration: 'none',
                            minHeight: '40px',
                          }}
                          className="portal-book-again-btn"
                        >
                          <SolarIcon name="calendar-add-linear" size={14} color="#2A170F" />
                          <span>Book Again</span>
                        </Link>
                      )}

                      <Link
                        href={`/bookings/${booking.id}`}
                        style={{
                          flex: 1,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #D5C1A7',
                          color: '#2A170F',
                          fontSize: '0.82rem',
                          fontWeight: 600,
                          padding: '9px 14px',
                          borderRadius: '20px',
                          textDecoration: 'none',
                          minHeight: '40px',
                        }}
                        className="portal-details-btn"
                      >
                        <span>View Details</span>
                        <SolarIcon name="arrow-right-linear" size={13} color="#2A170F" />
                      </Link>
                    </div>
                  </div>

                  {/* ==========================================
                      DESKTOP CARD VIEW (> 768px)
                      Spacious 4-column balanced SaaS row
                      ========================================== */}
                  <div className="portal-desktop-card-view">
                    {/* COL 1: Date & Time Block */}
                    <div
                      style={{
                        width: '116px',
                        flexShrink: 0,
                        backgroundColor: '#FAF5ED',
                        borderRadius: '14px',
                        border: '1px solid #EFE4D4',
                        padding: '14px 10px',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                      className="portal-date-box"
                    >
                      <div
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          color: '#8C7464',
                          textTransform: 'uppercase',
                          marginBottom: '4px',
                        }}
                      >
                        {booking.dateFormatted}
                      </div>

                      <div
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: 800,
                          color: '#23150D',
                          lineHeight: 1.15,
                          fontFamily: 'var(--font-heading), sans-serif',
                        }}
                      >
                        {booking.startTime}
                      </div>

                      <div
                        style={{
                          fontSize: '0.74rem',
                          color: '#7A6A5E',
                          fontWeight: 500,
                          marginTop: '4px',
                        }}
                      >
                        to {booking.endTime}
                      </div>
                    </div>

                    {/* COL 2: Doctor Portrait & Information */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        flex: '1 1 360px',
                        minWidth: '240px',
                      }}
                      className="portal-doctor-info-col"
                    >
                      {/* Doctor Photograph */}
                      <div
                        style={{
                          position: 'relative',
                          width: '76px',
                          height: '76px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          flexShrink: 0,
                          backgroundColor: '#F7EFE1',
                          border: '1.5px solid #E2D5C3',
                          boxShadow: '0 2px 8px rgba(42, 23, 15, 0.06)',
                        }}
                        className="portal-doctor-avatar"
                      >
                        <Image
                          src={booking.doctor.photoUrl}
                          alt={booking.doctor.name}
                          fill
                          sizes="76px"
                          style={{ objectFit: 'cover', borderRadius: '10px' }}
                        />
                      </div>

                      {/* Doctor Details */}
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <h3
                          style={{
                            fontSize: '1.08rem',
                            fontWeight: 700,
                            color: '#23150D',
                            margin: '0 0 4px 0',
                            lineHeight: 1.25,
                            letterSpacing: '-0.01em',
                            fontFamily: 'var(--font-heading), sans-serif',
                          }}
                          className="portal-doctor-name"
                        >
                          {booking.doctor.name}
                        </h3>

                        {/* Specialty and Qualifications */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '8px',
                            marginBottom: '6px',
                          }}
                          className="portal-doctor-specialty-row"
                        >
                          <span
                            style={{
                              fontSize: '0.84rem',
                              fontWeight: 600,
                              color: '#B88647',
                            }}
                          >
                            {booking.doctor.specialty}
                          </span>
                          {booking.doctor.qualifications && (
                            <span className="portal-doctor-quals" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ color: '#D5C1A7', fontSize: '0.75rem' }}>•</span>
                              <span
                                style={{
                                  fontSize: '0.78rem',
                                  color: '#7A6A5E',
                                }}
                              >
                                {booking.doctor.qualifications}
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Location with Pin */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.78rem',
                            color: '#6B5E55',
                            marginBottom: '8px',
                          }}
                          className="portal-doctor-location"
                        >
                          <SolarIcon name="map-point-linear" size={13} color="#B88647" />
                          <span>{booking.doctor.location}</span>
                        </div>

                        {/* Specialty Tags */}
                        {booking.doctor.tags && booking.doctor.tags.length > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px',
                            }}
                            className="portal-doctor-tags"
                          >
                            {booking.doctor.tags.map((tag) => (
                              <span
                                key={tag}
                                style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 500,
                                  color: '#5F4D41',
                                  backgroundColor: '#FAF4EB',
                                  padding: '3px 9px',
                                  borderRadius: '8px',
                                  border: '1px solid #EDE2D1',
                                  whiteSpace: 'nowrap',
                                }}
                                className="portal-tag-chip"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* COL 3: Consultation Information (Status & Channel) */}
                    <div
                      style={{
                        flex: '0 0 190px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        gap: '8px',
                        paddingLeft: '18px',
                        borderLeft: '1px solid #F2EAE0',
                      }}
                      className="portal-consultation-info-col"
                    >
                      {/* Status Pill */}
                      <div>
                        {booking.status === 'confirmed' && !booking.isPast && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#0E7039',
                              backgroundColor: '#EAF7EE',
                              border: '1px solid #BEE7C9',
                              padding: '4px 10px',
                              borderRadius: '16px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#0E7039' }} />
                            <span>Confirmed</span>
                          </span>
                        )}

                        {booking.status === 'confirmed' && booking.isPast && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#7A6A5E',
                              backgroundColor: '#F2EAE0',
                              border: '1px solid #E2D5C3',
                              padding: '4px 10px',
                              borderRadius: '16px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                            }}
                          >
                            <SolarIcon name="check-circle-bold" size={13} color="#7A6A5E" />
                            <span>Concluded</span>
                          </span>
                        )}

                        {booking.status === 'completed' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#0D7B70',
                              backgroundColor: '#E6F4F2',
                              border: '1px solid #BFE4DF',
                              padding: '4px 10px',
                              borderRadius: '16px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                            }}
                          >
                            <SolarIcon name="check-circle-bold" size={13} color="#0D7B70" />
                            <span>Completed</span>
                          </span>
                        )}

                        {booking.status === 'cancelled' && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#C5221F',
                              backgroundColor: '#FDECEC',
                              border: '1px solid #F8C8C7',
                              padding: '4px 10px',
                              borderRadius: '16px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                            }}
                          >
                            <SolarIcon name="danger-circle-bold" size={13} color="#C5221F" />
                            <span>Cancelled</span>
                          </span>
                        )}
                      </div>

                      {/* Consultation Channel */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          fontSize: '0.82rem',
                          color: '#2A170F',
                          fontWeight: 600,
                        }}
                      >
                        <SolarIcon name="videocamera-record-bold" size={15} color="#B88647" />
                        <span>Video Consultation</span>
                      </div>

                      {/* Session Duration & Specs */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '0.76rem',
                          color: '#7A6A5E',
                        }}
                      >
                        <SolarIcon name="clock-circle-linear" size={13} color="#A08F83" />
                        <span>{booking.durationFormatted || '45 minutes'}</span>
                      </div>

                      {/* Booking Reference */}
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: '#9B8B7F',
                          fontFamily: 'monospace',
                        }}
                      >
                        Ref #{booking.id.substring(0, 8).toUpperCase()}
                      </div>
                    </div>

                    {/* COL 4: Primary & Secondary Actions + Desktop Kebab */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        flexShrink: 0,
                      }}
                      className="portal-actions-col"
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          minWidth: '150px',
                        }}
                        className="portal-action-buttons-wrap"
                      >
                        {/* Primary Button */}
                        {booking.status === 'confirmed' && !booking.isPast ? (
                          <Link
                            href={booking.joinUrl || `/consultations/${booking.id}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '7px',
                              backgroundColor: '#2E1A10',
                              color: '#FAF6EE',
                              fontSize: '0.84rem',
                              fontWeight: 600,
                              padding: '10px 18px',
                              borderRadius: '22px',
                              textDecoration: 'none',
                              minHeight: '44px',
                              boxShadow: '0 2px 8px rgba(42, 23, 15, 0.16)',
                              transition: 'all 0.16s ease',
                            }}
                            className="portal-join-btn"
                          >
                            <SolarIcon name="videocamera-record-bold" size={15} color="#DFAB62" />
                            <span>Join Consultation</span>
                          </Link>
                        ) : (
                          <Link
                            href={booking.doctor?.id ? `/doctors/${booking.doctor.id}` : '/appointments?view=find-doctor'}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                              backgroundColor: '#EDD5B3',
                              color: '#2A170F',
                              fontSize: '0.84rem',
                              fontWeight: 600,
                              padding: '10px 18px',
                              borderRadius: '22px',
                              textDecoration: 'none',
                              minHeight: '44px',
                            }}
                            className="portal-book-again-btn"
                          >
                            <SolarIcon name="calendar-add-linear" size={14} color="#2A170F" />
                            <span>Book Again</span>
                          </Link>
                        )}

                        {/* Secondary Button */}
                        <Link
                          href={`/bookings/${booking.id}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #D5C1A7',
                            color: '#2A170F',
                            fontSize: '0.82rem',
                            fontWeight: 600,
                            padding: '8px 16px',
                            borderRadius: '20px',
                            textDecoration: 'none',
                            minHeight: '40px',
                            transition: 'all 0.16s ease',
                          }}
                          className="portal-details-btn"
                        >
                          <span>View Details</span>
                          <SolarIcon name="arrow-right-linear" size={13} color="#2A170F" />
                        </Link>
                      </div>

                      {/* Desktop Three-dot Overflow Control */}
                      <div style={{ position: 'relative' }} className="portal-desktop-overflow">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveOverflowId(isOverflowOpen ? null : booking.id);
                          }}
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            border: 'none',
                            background: 'transparent',
                            color: '#2A170F',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.16s ease',
                          }}
                          className="portal-overflow-btn"
                          aria-label="More options"
                        >
                          <SolarIcon name="menu-dots-bold" size={18} color="#2A170F" />
                        </button>

                        {/* Desktop Dropdown */}
                        {isOverflowOpen && renderOverflowMenu()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    )}
  </div>

      {/* ====================================================================
          ADD TO CALENDAR MODAL
          ==================================================================== */}
      {calendarModalBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(35, 20, 14, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
          aria-modal="true"
          role="dialog"
          onClick={() => setCalendarModalBooking(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 48px rgba(42, 23, 15, 0.2)',
              border: '1px solid #EDE4D4',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    backgroundColor: '#FAF5ED',
                    border: '1px solid #EDE4D4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SolarIcon name="calendar-add-linear" size={20} color="#B88647" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2A170F', margin: 0 }}>
                    Add to Calendar
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#7A6A5E' }}>
                    Sync this consultation with your preferred calendar
                  </p>
                </div>
              </div>

              <button
                onClick={() => setCalendarModalBooking(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#7A6A5E',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close modal"
              >
                <SolarIcon name="close-circle-linear" size={20} />
              </button>
            </div>

            {/* Appointment Preview Box */}
            <div
              style={{
                backgroundColor: '#FAF6EE',
                border: '1px solid #EDE4D4',
                borderRadius: '12px',
                padding: '12px 14px',
                marginBottom: '18px',
              }}
            >
              <div style={{ fontWeight: 700, color: '#2A170F', fontSize: '0.92rem', marginBottom: '2px' }}>
                {calendarModalBooking.doctor.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#B88647', fontWeight: 600, marginBottom: '6px' }}>
                {calendarModalBooking.doctor.specialty}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#6B5E55' }}>
                <SolarIcon name="calendar-linear" size={14} color="#7A6A5E" />
                <span>{calendarModalBooking.dateFormatted}</span>
                <span>•</span>
                <SolarIcon name="clock-circle-linear" size={14} color="#7A6A5E" />
                <span>{calendarModalBooking.startTime} – {calendarModalBooking.endTime}</span>
              </div>
            </div>

            {/* Calendar Selection Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              {/* Option 1: Google Calendar */}
              <button
                onClick={() => {
                  window.open(getGoogleCalendarUrl(calendarModalBooking), '_blank', 'noopener,noreferrer');
                  setCalendarModalBooking(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #EDE4D4',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.16s ease',
                  width: '100%',
                }}
                className="portal-calendar-option-btn"
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: '#F0F4FF',
                    border: '1px solid #D6E2FB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <SolarIcon name="calendar-bold" size={22} color="#1A73E8" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#2A170F', marginBottom: '2px' }}>
                    Google Calendar
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#6B5E55' }}>
                    Opens Google Calendar in browser to automatically add to your account
                  </div>
                </div>
                <SolarIcon name="arrow-right-up-linear" size={16} color="#7A6A5E" />
              </button>

              {/* Option 2: Apple Calendar / Outlook / iCal */}
              <button
                onClick={() => {
                  downloadIcsForBooking(calendarModalBooking);
                  setCalendarModalBooking(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #EDE4D4',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.16s ease',
                  width: '100%',
                }}
                className="portal-calendar-option-btn"
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '10px',
                    backgroundColor: '#FAF2ED',
                    border: '1px solid #F0DCCE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <SolarIcon name="download-square-bold" size={22} color="#C17D3C" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#2A170F', marginBottom: '2px' }}>
                    Apple / Outlook / iCal (.ics)
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#6B5E55' }}>
                    Downloads universal calendar file with built-in 15-min reminder
                  </div>
                </div>
                <SolarIcon name="download-linear" size={16} color="#7A6A5E" />
              </button>
            </div>

            {/* Note & Close button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '6px' }}>
              <span style={{ fontSize: '0.72rem', color: '#9B8B7F' }}>
                Both options include encrypted video link & SAST time
              </span>
              <button
                onClick={() => setCalendarModalBooking(null)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '18px',
                  border: '1px solid #D5C1A7',
                  backgroundColor: '#FFFFFF',
                  color: '#2A170F',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  minHeight: '36px',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          CANCELLATION CONFIRMATION MODAL
          ==================================================================== */}
      {cancellingBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(35, 20, 14, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
          aria-modal="true"
          role="dialog"
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 16px 36px rgba(42, 23, 15, 0.18)',
              border: '1px solid #EDE4D4',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#DC2626', marginBottom: '10px' }}>
              <SolarIcon name="danger-circle-bold" size={22} color="#DC2626" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2A170F', margin: 0 }}>
                Cancel Consultation?
              </h3>
            </div>

            <p style={{ color: '#6B5E55', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '14px' }}>
              Are you sure you want to cancel your consultation with{' '}
              <strong>{cancellingBooking.doctor.name}</strong> scheduled for{' '}
              <strong>{cancellingBooking.fullDateFormatted} at {cancellingBooking.startTime}</strong>?
            </p>

            <div
              style={{
                backgroundColor: '#FAF6EE',
                border: '1px solid #EADBCA',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '0.78rem',
                color: '#5F4D41',
                marginBottom: '14px',
                lineHeight: 1.4,
              }}
            >
              <strong>Chekup247 Policy:</strong> Full 100% refund for cancellations &gt; 24h prior. Cancellations within 24h receive 70% refund.
            </div>

            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#2A170F', marginBottom: '5px' }}>
              Reason for cancellation (optional)
            </label>
            <textarea
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Schedule conflict..."
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #EDE4D4',
                fontSize: '0.82rem',
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: '16px',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setCancellingBooking(null)}
                disabled={isProcessingCancel}
                style={{
                  padding: '8px 16px',
                  borderRadius: '18px',
                  border: '1px solid #D5C1A7',
                  backgroundColor: '#FFFFFF',
                  color: '#2A170F',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  minHeight: '40px',
                }}
              >
                Keep Appointment
              </button>

              <button
                onClick={handleConfirmCancel}
                disabled={isProcessingCancel}
                style={{
                  padding: '8px 18px',
                  borderRadius: '18px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: isProcessingCancel ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '40px',
                }}
              >
                <span>{isProcessingCancel ? 'Cancelling...' : 'Confirm Cancellation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          RESCHEDULE MODAL
          ==================================================================== */}
      {reschedulingBooking && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(35, 20, 14, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
          aria-modal="true"
          role="dialog"
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 16px 36px rgba(42, 23, 15, 0.18)',
              border: '1px solid #EDE4D4',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#2A170F', margin: 0 }}>
                Reschedule Appointment
              </h3>
              <button
                onClick={() => setReschedulingBooking(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7A6A5E', padding: '4px' }}
                aria-label="Close modal"
              >
                <SolarIcon name="close-circle-linear" size={18} />
              </button>
            </div>

            <p style={{ color: '#6B5E55', fontSize: '0.84rem', lineHeight: 1.45, marginBottom: '16px' }}>
              Choose a new available slot with <strong>{reschedulingBooking.doctor.name}</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {['Tomorrow, 09:30 AM', 'Tomorrow, 14:15 PM', 'Monday, 11:00 AM'].map((slotStr) => (
                <button
                  key={slotStr}
                  onClick={() => {
                    alert(`Slot "${slotStr}" selected. Appointment successfully rescheduled.`);
                    setReschedulingBooking(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    backgroundColor: '#FAF6EE',
                    border: '1px solid #EDE4D4',
                    color: '#2A170F',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    minHeight: '44px',
                    transition: 'all 0.16s ease',
                  }}
                  className="portal-slot-pick-btn"
                >
                  <span>{slotStr}</span>
                  <span style={{ fontSize: '0.74rem', color: '#C17D3C' }}>Select Slot →</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setReschedulingBooking(null)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '18px',
                  border: '1px solid #D5C1A7',
                  backgroundColor: '#FFFFFF',
                  color: '#2A170F',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  minHeight: '38px',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
