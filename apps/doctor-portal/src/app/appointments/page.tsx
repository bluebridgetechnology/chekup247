'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Video,
  User,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  DollarSign,
  FileText,
  Filter,
  Search,
  Loader2,
  Sparkles,
  Phone,
  Mail,
  X,
} from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { SolarIcon } from '../../components/common/SolarIcon';

interface DoctorAppointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  slot_id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  price: number;
  commission_amount: number;
  payment_status: 'unpaid' | 'held' | 'released' | 'refunded';
  created_at: string;
  patient?: {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
  slot?: {
    id: string;
    startTime: string;
    endTime: string;
  };
}

export default function DoctorAppointmentsPage() {
  const { doctor, profile, token, isAuthenticated } = useDoctorAuth();
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<'today' | 'upcoming' | 'completed'>('today');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAppointment, setSelectedAppointment] = useState<DoctorAppointment | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  useEffect(() => {
    let isMounted = true;

    async function loadAppointments() {
      try {
        setIsLoading(true);
        if (!token) {
          if (isMounted) setAppointments([]);
          return;
        }

        const res = await fetch(`${API_BASE}/bookings/doctor`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data)) {
            setAppointments(data);
            return;
          }
        }
        if (isMounted) setAppointments([]);
      } catch (err) {
        console.warn('Error fetching doctor appointments:', err);
        if (isMounted) setAppointments([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAppointments();
    return () => {
      isMounted = false;
    };
  }, [token, API_BASE]);

  // Filter Appointments
  const filteredList = useMemo(() => {
    const today = new Date().toDateString();

    return appointments.filter((apt) => {
      const aptDate = apt.slot?.startTime ? new Date(apt.slot.startTime).toDateString() : '';
      const isToday = aptDate === today;
      const isPast = apt.slot?.startTime ? new Date(apt.slot.startTime).getTime() < Date.now() : false;

      // Tab filtering
      if (filterTab === 'today') {
        if (!isToday || apt.status === 'completed' || apt.status === 'cancelled') return false;
      } else if (filterTab === 'upcoming') {
        if (isToday || isPast || apt.status === 'completed' || apt.status === 'cancelled') return false;
      } else if (filterTab === 'completed') {
        if (apt.status !== 'completed' && (!isPast || apt.status === 'cancelled')) return false;
      }

      // Search filtering
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const patientName = apt.patient?.fullName?.toLowerCase() || '';
        const patientEmail = apt.patient?.email?.toLowerCase() || '';
        return patientName.includes(query) || patientEmail.includes(query);
      }

      return true;
    });
  }, [appointments, filterTab, searchQuery]);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Page Title & Stats */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-gold-bronze, #B88647)',
                }}
              >
                Telehealth Queue • Direct Daily.co Launcher
              </span>
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.95rem',
                fontWeight: 800,
                color: 'var(--color-chocolate-base, #2A170F)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Consultation Queue & Appointments
            </h1>
            <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.925rem', marginTop: '6px' }}>
              Manage today's clinical consultations, connect to high-definition video rooms, and inspect scheduled patients
            </p>
          </div>

          <Link href="/calendar" className="btn-secondary">
            <SolarIcon name="calendar-linear" size={17} color="var(--color-chocolate-base, #2A170F)" />
            <span>Manage Calendar Shifts</span>
          </Link>
        </div>

        {/* Stats Row in Cream Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginTop: '24px',
          }}
        >
          <div className="portal-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Today's Patients
              </span>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--color-gold-pale, #F0E5D3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SolarIcon name="user-rounded-bold" size={18} color="var(--color-chocolate-base, #2A170F)" />
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
              {
                appointments.filter((a) => {
                  const d = a.slot?.startTime ? new Date(a.slot.startTime).toDateString() : '';
                  return d === new Date().toDateString() && a.status === 'confirmed';
                }).length
              }
            </div>
            <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
              Confirmed & queued for video
            </div>
          </div>

          <div className="portal-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Estimated Payout Today
              </span>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--color-gold-pale, #F0E5D3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SolarIcon name="wallet-money-bold" size={18} color="var(--color-chocolate-base, #2A170F)" />
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: '#059669' }}>
              R
              {appointments
                .filter((a) => {
                  const d = a.slot?.startTime ? new Date(a.slot.startTime).toDateString() : '';
                  return d === new Date().toDateString() && a.status === 'confirmed';
                })
                .reduce((sum, a) => sum + (Number(a.price) - Number(a.commission_amount || a.price * 0.15)), 0)
                .toFixed(2)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '4px' }}>
              Net earnings (85% take-home settled)
            </div>
          </div>

          <div className="portal-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Upcoming Total
              </span>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--color-gold-pale, #F0E5D3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SolarIcon name="calendar-bold" size={18} color="var(--color-chocolate-base, #2A170F)" />
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
              {appointments.filter((a) => a.status === 'confirmed').length}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '4px' }}>
              Future consultations on roster
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs (specialty-chip) & Search Bar (doctors-search-pill) */}
      <div
        className="portal-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Specialty Chip Pill Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          {(['today', 'upcoming', 'completed'] as const).map((tab) => {
            const isActive = filterTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterTab(tab)}
                className={`specialty-chip ${isActive ? 'active' : ''}`}
              >
                <SolarIcon
                  name={
                    tab === 'today'
                      ? 'clock-circle-bold'
                      : tab === 'upcoming'
                      ? 'calendar-bold'
                      : 'check-circle-bold'
                  }
                  size={15}
                  color={isActive ? 'var(--color-chocolate-base, #2A170F)' : 'var(--color-gold-bronze, #B88647)'}
                />
                <span>{tab === 'today' ? "Today's Consultations" : tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
              </button>
            );
          })}
        </div>

        {/* Doctors Search Pill with Solar Icon & Gold Action */}
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <div className="doctors-search-pill">
            <SolarIcon name="magnifer-linear" size={18} color="var(--color-gold-base, #DFAB62)" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient name or email..."
              className="doctors-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-cream-text-muted)' }}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
            <button
              type="button"
              className="doctors-search-submit"
              onClick={() => {}}
            >
              <SolarIcon name="magnifer-bold" size={14} color="var(--color-chocolate-base)" />
              <span>Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* Appointment Queue List */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-gold-base, #DFAB62)' }} />
        </div>
      ) : filteredList.length === 0 ? (
        <div
          className="portal-card"
          style={{
            padding: '56px 24px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--color-gold-pale, #F0E5D3)',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SolarIcon name="clock-circle-bold" size={30} color="var(--color-gold-bronze, #B88647)" />
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.25rem',
              color: 'var(--color-chocolate-base, #2A170F)',
              fontWeight: 800,
            }}
          >
            No consultations found in this queue
          </h3>
          <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.9rem', maxWidth: '440px', margin: '8px auto 20px' }}>
            Open your practice calendar to publish new bookable availability slots for patients.
          </p>
          <Link href="/calendar" className="btn-primary">
            <SolarIcon name="calendar-bold" size={17} color="var(--color-chocolate-base, #2A170F)" />
            <span>Open Calendar Roster</span>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredList.map((appointment) => {
            const startIso = appointment.slot?.startTime;
            const startTimeStr = startIso
              ? new Date(startIso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
              : '10:00';
            const endTimeStr = appointment.slot?.endTime
              ? new Date(appointment.slot.endTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
              : '10:45';
            const dateStr = startIso
              ? new Date(startIso).toLocaleDateString('en-ZA', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })
              : 'Today';

            const netPayout = Number(appointment.price) - Number(appointment.commission_amount || appointment.price * 0.15);

            // Compute patient initials
            const nameParts = (appointment.patient?.fullName || 'Patient Client').split(' ');
            const initials = nameParts.length >= 2
              ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
              : nameParts[0].substring(0, 2).toUpperCase();

            return (
              <div
                key={appointment.id}
                className="portal-card"
                style={{
                  padding: '22px 26px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '18px',
                }}
              >
                {/* Time & Patient Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', minWidth: '280px', flex: '1 1 300px' }}>
                  {/* Pale Gold Time Badge */}
                  <div
                    style={{
                      background: 'var(--color-gold-pale, #F0E5D3)',
                      border: '1.5px solid rgba(223, 171, 98, 0.35)',
                      borderRadius: '16px',
                      padding: '12px 16px',
                      textAlign: 'center',
                      minWidth: '105px',
                    }}
                  >
                    <div style={{ fontSize: '0.725rem', fontWeight: 700, color: 'var(--color-gold-bronze, #B88647)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {dateStr}
                    </div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', marginTop: '2px' }}>
                      {startTimeStr}
                    </div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                      to {endTimeStr}
                    </div>
                  </div>

                  {/* Patient Avatar & Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div className="doctor-avatar-circle">
                      {initials}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3
                          style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: '1.15rem',
                            fontWeight: 700,
                            color: 'var(--color-chocolate-base, #2A170F)',
                            margin: 0,
                          }}
                        >
                          {appointment.patient?.fullName || 'Patient Client'}
                        </h3>
                        <span className="badge-gold">
                          CONFIRMED
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '14px', fontSize: '0.825rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <SolarIcon name="letter-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
                          <span>{appointment.patient?.email || 'patient@chekup247.com'}</span>
                        </div>
                        {appointment.patient?.phone && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <SolarIcon name="phone-calling-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
                            <span>{appointment.patient.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bold Fee Breakdown */}
                <div style={{ textAlign: 'right', minWidth: '130px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                    Doctor Payout (85%)
                  </div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                    R{netPayout.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                    Gross Patient Fee: R{Number(appointment.price).toFixed(2)}
                  </div>
                </div>

                {/* Action CTAs - Start Consultation direct link to /consultations/${appointment.id} */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Link
                    href={`/consultations/${appointment.id}`}
                    className="btn-primary"
                    style={{ padding: '10px 20px', fontSize: '0.875rem' }}
                  >
                    <SolarIcon name="videocamera-record-bold" size={17} color="var(--color-chocolate-base, #2A170F)" />
                    <span>Start Consultation</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setSelectedAppointment(appointment)}
                    className="btn-secondary"
                    style={{ padding: '10px 18px', fontSize: '0.875rem' }}
                  >
                    <SolarIcon name="notes-minimalistic-linear" size={16} color="var(--color-chocolate-base, #2A170F)" />
                    <span>Details</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Restyled Appointment Details Modal with Glassmorphism Backdrop */}
      {selectedAppointment && (
        <div
          className="portal-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedAppointment(null);
          }}
        >
          <div
            className="portal-modal-surface"
            style={{
              padding: '32px',
              maxWidth: '540px',
              width: '100%',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedAppointment(null)}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '22px',
                right: '22px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-cream-text-muted, #6B5E55)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="close-circle-linear" size={24} color="var(--color-gold-base, #DFAB62)" />
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--color-gold-pale, #F0E5D3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SolarIcon name="user-rounded-bold" size={22} color="var(--color-chocolate-base, #2A170F)" />
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    color: 'var(--color-chocolate-base, #2A170F)',
                    margin: 0,
                  }}
                >
                  Appointment Details
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-gold-bronze, #B88647)', fontWeight: 600 }}>
                  Booking Ref: #{selectedAppointment.id}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Patient Information Box */}
              <div
                style={{
                  background: 'var(--color-cream-base, #FAF6EE)',
                  border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                  padding: '18px 20px',
                  borderRadius: '16px',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gold-bronze, #B88647)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Patient Client
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--color-chocolate-base, #2A170F)', marginTop: '4px' }}>
                  {selectedAppointment.patient?.fullName || 'Patient Client'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SolarIcon name="letter-linear" size={14} color="var(--color-gold-bronze)" />
                  <span>{selectedAppointment.patient?.email || 'N/A'}</span>
                </div>
                {selectedAppointment.patient?.phone && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <SolarIcon name="phone-calling-linear" size={14} color="var(--color-gold-bronze)" />
                    <span>{selectedAppointment.patient.phone}</span>
                  </div>
                )}
              </div>

              {/* Consultation Schedule Window */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div
                  style={{
                    border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
                    background: 'var(--color-cream-surface, #FDFBF7)',
                    padding: '14px',
                    borderRadius: '14px',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-gold-bronze, #B88647)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Date
                  </div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-chocolate-base, #2A170F)', marginTop: '2px' }}>
                    {selectedAppointment.slot?.startTime
                      ? new Date(selectedAppointment.slot.startTime).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Today'}
                  </div>
                </div>

                <div
                  style={{
                    border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
                    background: 'var(--color-cream-surface, #FDFBF7)',
                    padding: '14px',
                    borderRadius: '14px',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-gold-bronze, #B88647)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Time Window
                  </div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-chocolate-base, #2A170F)', marginTop: '2px' }}>
                    {selectedAppointment.slot?.startTime
                      ? new Date(selectedAppointment.slot.startTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
                      : '10:00'}{' '}
                    SAST
                  </div>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div
                style={{
                  border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
                  background: 'var(--color-cream-surface, #FDFBF7)',
                  padding: '18px 20px',
                  borderRadius: '16px',
                }}
              >
                <div style={{ fontSize: '0.75rem', color: 'var(--color-gold-bronze, #B88647)', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Financial Breakdown (ZAR)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                  <span>Patient Total Charged:</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-chocolate-base)' }}>R{Number(selectedAppointment.price).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '6px' }}>
                  <span>ChekUp247 Platform Fee (15%):</span>
                  <span>-R{Number(selectedAppointment.commission_amount || selectedAppointment.price * 0.15).toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1.05rem',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 800,
                    color: '#059669',
                    marginTop: '10px',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
                  }}
                >
                  <span>Net Doctor Payout (85%):</span>
                  <span>
                    R
                    {(
                      Number(selectedAppointment.price) -
                      Number(selectedAppointment.commission_amount || selectedAppointment.price * 0.15)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Launch CTA - Direct link to /consultations/${selectedAppointment.id} */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '26px' }}>
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="btn-secondary"
                style={{ padding: '10px 20px', fontSize: '0.875rem' }}
              >
                Close
              </button>

              <Link
                href={`/consultations/${selectedAppointment.id}`}
                className="btn-primary"
                style={{ padding: '10px 22px', fontSize: '0.875rem' }}
              >
                <SolarIcon name="videocamera-record-bold" size={17} color="var(--color-chocolate-base, #2A170F)" />
                <span>Launch Video Room</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
