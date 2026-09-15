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
        if (token) {
          const res = await fetch(`${API_BASE}/bookings/doctor`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (isMounted && Array.isArray(data) && data.length > 0) {
              setAppointments(data);
              return;
            }
          }
        }

        // Mock schedule appointments for preview / initial boot
        if (isMounted) {
          const now = new Date();
          const todaySlot1 = new Date(now.getTime() + 45 * 60 * 1000);
          const todaySlot1End = new Date(todaySlot1.getTime() + 45 * 60 * 1000);

          const todaySlot2 = new Date(now.getTime() + 3 * 60 * 60 * 1000);
          const todaySlot2End = new Date(todaySlot2.getTime() + 45 * 60 * 1000);

          const tomorrowSlot = new Date(now.getTime() + 26 * 60 * 60 * 1000);
          const tomorrowSlotEnd = new Date(tomorrowSlot.getTime() + 45 * 60 * 1000);

          const pastSlot = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const pastSlotEnd = new Date(pastSlot.getTime() + 45 * 60 * 1000);

          setAppointments([
            {
              id: 'apt-001',
              patient_id: 'pat-1',
              doctor_id: doctor?.id || 'doc-1',
              slot_id: 'slt-001',
              status: 'confirmed',
              price: 850.0,
              commission_amount: 127.5,
              payment_status: 'held',
              created_at: new Date().toISOString(),
              patient: {
                id: 'pat-1',
                fullName: 'Sipho Dlamini',
                email: 'sipho.dlamini@example.com',
                phone: '+27 82 459 1234',
              },
              slot: {
                id: 'slt-001',
                startTime: todaySlot1.toISOString(),
                endTime: todaySlot1End.toISOString(),
              },
            },
            {
              id: 'apt-002',
              patient_id: 'pat-2',
              doctor_id: doctor?.id || 'doc-1',
              slot_id: 'slt-002',
              status: 'confirmed',
              price: 850.0,
              commission_amount: 127.5,
              payment_status: 'held',
              created_at: new Date().toISOString(),
              patient: {
                id: 'pat-2',
                fullName: 'Lindiwe Khumalo',
                email: 'lindiwe.k@example.com',
                phone: '+27 71 830 5678',
              },
              slot: {
                id: 'slt-002',
                startTime: todaySlot2.toISOString(),
                endTime: todaySlot2End.toISOString(),
              },
            },
            {
              id: 'apt-003',
              patient_id: 'pat-3',
              doctor_id: doctor?.id || 'doc-1',
              slot_id: 'slt-003',
              status: 'confirmed',
              price: 850.0,
              commission_amount: 127.5,
              payment_status: 'held',
              created_at: new Date().toISOString(),
              patient: {
                id: 'pat-3',
                fullName: 'Johannes van Zyl',
                email: 'johannes.vz@example.com',
                phone: '+27 83 291 4455',
              },
              slot: {
                id: 'slt-003',
                startTime: tomorrowSlot.toISOString(),
                endTime: tomorrowSlotEnd.toISOString(),
              },
            },
            {
              id: 'apt-004',
              patient_id: 'pat-4',
              doctor_id: doctor?.id || 'doc-1',
              slot_id: 'slt-004',
              status: 'completed',
              price: 850.0,
              commission_amount: 127.5,
              payment_status: 'released',
              created_at: pastSlot.toISOString(),
              patient: {
                id: 'pat-4',
                fullName: 'Fatima Patel',
                email: 'fatima.patel@example.com',
                phone: '+27 84 901 2233',
              },
              slot: {
                id: 'slt-004',
                startTime: pastSlot.toISOString(),
                endTime: pastSlotEnd.toISOString(),
              },
            },
          ]);
        }
      } catch (err) {
        console.warn('Error fetching doctor appointments:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadAppointments();
    return () => {
      isMounted = false;
    };
  }, [token, doctor?.id, API_BASE]);

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
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Title & Stats */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
              Consultation Queue & Appointments
            </h1>
            <p style={{ color: 'var(--color-slate-500)', fontSize: '0.925rem', marginTop: '4px' }}>
              Manage today's clinical consultations, connect to video rooms, and view scheduled patients
            </p>
          </div>

          <Link
            href="/calendar"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '12px',
              background: '#ffffff',
              border: '1px solid var(--color-slate-300)',
              color: 'var(--color-slate-700)',
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
            }}
          >
            <Calendar size={16} style={{ color: 'var(--color-brand-600)' }} />
            <span>Manage Calendar Shifts</span>
          </Link>
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginTop: '24px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              padding: '20px',
              borderRadius: '16px',
              border: '1px solid var(--color-slate-200)',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
              Today's Patients
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-slate-900)', marginTop: '6px' }}>
              {
                appointments.filter((a) => {
                  const d = a.slot?.startTime ? new Date(a.slot.startTime).toDateString() : '';
                  return d === new Date().toDateString() && a.status === 'confirmed';
                }).length
              }
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-brand-700)', marginTop: '4px' }}>
              Confirmed & scheduled
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              padding: '20px',
              borderRadius: '16px',
              border: '1px solid var(--color-slate-200)',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
              Estimated Payout Today
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669', marginTop: '6px' }}>
              R
              {appointments
                .filter((a) => {
                  const d = a.slot?.startTime ? new Date(a.slot.startTime).toDateString() : '';
                  return d === new Date().toDateString() && a.status === 'confirmed';
                })
                .reduce((sum, a) => sum + (Number(a.price) - Number(a.commission_amount || a.price * 0.15)), 0)
                .toFixed(2)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: '4px' }}>
              Net earnings (85% take-home)
            </div>
          </div>

          <div
            style={{
              background: '#ffffff',
              padding: '20px',
              borderRadius: '16px',
              border: '1px solid var(--color-slate-200)',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', fontWeight: 600, textTransform: 'uppercase' }}>
              Upcoming Total
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-brand-700)', marginTop: '6px' }}>
              {appointments.filter((a) => a.status === 'confirmed').length}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: '4px' }}>
              Future appointments
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid var(--color-slate-200)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['today', 'upcoming', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                border: 'none',
                background: filterTab === tab ? 'var(--color-brand-50)' : 'transparent',
                color: filterTab === tab ? 'var(--color-brand-700)' : 'var(--color-slate-600)',
                fontWeight: filterTab === tab ? 700 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s ease',
              }}
            >
              {tab === 'today' ? "Today's Consultations" : tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--color-slate-400)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search patient name or email..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '10px',
              border: '1px solid var(--color-slate-300)',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Appointment Queue List */}
      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-brand-600)' }} />
        </div>
      ) : filteredList.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1px solid var(--color-slate-200)',
            padding: '56px 24px',
            textAlign: 'center',
          }}
        >
          <Clock size={44} style={{ color: 'var(--color-slate-300)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--color-slate-800)', fontWeight: 700 }}>
            No appointments found in this queue
          </h3>
          <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem', maxWidth: '400px', margin: '8px auto 0' }}>
            Open your practice calendar to publish new availability slots for patients to book.
          </p>
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

            return (
              <div
                key={appointment.id}
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid var(--color-slate-200)',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                }}
              >
                {/* Time & Patient Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '280px' }}>
                  <div
                    style={{
                      background: 'var(--color-slate-50)',
                      border: '1px solid var(--color-slate-200)',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      textAlign: 'center',
                      minWidth: '95px',
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>
                      {dateStr}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-slate-900)', marginTop: '2px' }}>
                      {startTimeStr}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
                      to {endTimeStr}
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                        {appointment.patient?.fullName || 'Patient Client'}
                      </h3>
                      <span
                        style={{
                          background: '#ecfdf5',
                          color: '#065f46',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                        }}
                      >
                        CONFIRMED
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.825rem', color: 'var(--color-slate-500)', marginTop: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={14} />
                        <span>{appointment.patient?.email || 'patient@chekup247.com'}</span>
                      </div>
                      {appointment.patient?.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Phone size={14} />
                          <span>{appointment.patient.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Earnings */}
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', textTransform: 'uppercase', fontWeight: 700 }}>
                    Doctor Payout
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                    R{netPayout.toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
                    Gross: R{Number(appointment.price).toFixed(2)}
                  </div>
                </div>

                {/* Action CTAs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Link
                    href={`/consultations/${appointment.id}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-700) 100%)',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      textDecoration: 'none',
                      boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
                    }}
                  >
                    <Video size={16} />
                    <span>Start Consultation</span>
                  </Link>

                  <button
                    onClick={() => setSelectedAppointment(appointment)}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '12px',
                      border: '1px solid var(--color-slate-300)',
                      background: '#ffffff',
                      color: 'var(--color-slate-700)',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Appointment Details Modal (DP-502) */}
      {selectedAppointment && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setSelectedAppointment(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-slate-400)',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <User size={22} style={{ color: 'var(--color-brand-600)' }} />
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                Appointment Details
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Patient Details */}
              <div style={{ background: 'var(--color-slate-50)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-500)', textTransform: 'uppercase' }}>
                  Patient Information
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-slate-900)', marginTop: '4px' }}>
                  {selectedAppointment.patient?.fullName || 'Patient Client'}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-600)', marginTop: '4px' }}>
                  Email: {selectedAppointment.patient?.email || 'N/A'}
                </div>
                {selectedAppointment.patient?.phone && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-slate-600)' }}>
                    Phone: {selectedAppointment.patient.phone}
                  </div>
                )}
              </div>

              {/* Consultation Schedule */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ border: '1px solid var(--color-slate-200)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', fontWeight: 700 }}>
                    DATE
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-slate-900)', marginTop: '2px' }}>
                    {selectedAppointment.slot?.startTime
                      ? new Date(selectedAppointment.slot.startTime).toLocaleDateString('en-ZA')
                      : 'Today'}
                  </div>
                </div>

                <div style={{ border: '1px solid var(--color-slate-200)', padding: '12px', borderRadius: '10px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', fontWeight: 700 }}>
                    TIME WINDOW
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-slate-900)', marginTop: '2px' }}>
                    {selectedAppointment.slot?.startTime
                      ? new Date(selectedAppointment.slot.startTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })
                      : '10:00'}{' '}
                    SAST
                  </div>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div style={{ border: '1px solid var(--color-slate-200)', padding: '16px', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)', fontWeight: 700, marginBottom: '8px' }}>
                  FINANCIAL SUMMARY (ZAR)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--color-slate-600)' }}>
                  <span>Patient Total Charged:</span>
                  <span style={{ fontWeight: 600 }}>R{Number(selectedAppointment.price).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--color-slate-600)', marginTop: '4px' }}>
                  <span>Platform Commission (15%):</span>
                  <span>-R{Number(selectedAppointment.commission_amount || selectedAppointment.price * 0.15).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, color: '#059669', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-slate-100)' }}>
                  <span>Net Doctor Payout:</span>
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

            {/* Launch CTA */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => setSelectedAppointment(null)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-slate-300)',
                  background: '#ffffff',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                Close
              </button>

              <Link
                href={`/consultation?booking=${selectedAppointment.id}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-700) 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                }}
              >
                <Video size={16} />
                <span>Launch Video Room</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
