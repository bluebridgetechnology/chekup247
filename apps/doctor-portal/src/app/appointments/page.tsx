'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
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
  const { doctor, token } = useDoctorAuth();
  const [appointments, setAppointments] = useState<DoctorAppointment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<'today' | 'upcoming' | 'completed'>('today');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAppointment, setSelectedAppointment] = useState<DoctorAppointment | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const loadAppointments = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);

      if (!token) {
        setAppointments([]);
        return;
      }

      const res = await fetch(`${API_BASE}/bookings/doctor`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAppointments(data);
          return;
        }
      }
      setAppointments([]);
    } catch (err) {
      console.warn('Error fetching doctor appointments:', err);
      setAppointments([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, API_BASE]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Counts & Summaries
  const todayStr = useMemo(() => new Date().toDateString(), []);

  // Check if an appointment has ended / is in the past
  const isAptPast = useCallback((apt: DoctorAppointment): boolean => {
    if (apt.status === 'completed' || apt.status === 'cancelled') return true;
    const startIso = apt.slot?.startTime;
    const endIso = apt.slot?.endTime;
    if (!startIso) return false;
    const endMs = endIso ? new Date(endIso).getTime() : new Date(startIso).getTime() + 45 * 60 * 1000;
    return endMs < Date.now();
  }, []);

  const counts = useMemo(() => {
    let today = 0;
    let upcoming = 0;
    let completed = 0;
    let todayConfirmed = 0;
    let todayPayout = 0;

    appointments.forEach((apt) => {
      const startIso = apt.slot?.startTime;
      const aptDate = startIso ? new Date(startIso).toDateString() : '';
      const isToday = aptDate === todayStr;
      const past = isAptPast(apt);

      if (apt.status === 'completed' || past) {
        completed += 1;
      } else if (apt.status === 'cancelled') {
        // Excluded from active queue counts
      } else if (isToday) {
        today += 1;
        if (apt.status === 'confirmed') {
          todayConfirmed += 1;
          const net = Number(apt.price) - Number(apt.commission_amount || apt.price * 0.15);
          todayPayout += net;
        }
      } else {
        upcoming += 1;
      }
    });

    return {
      today,
      upcoming,
      completed,
      todayConfirmed,
      todayPayout,
      totalActive: appointments.filter((a) => a.status === 'confirmed' && !isAptPast(a)).length,
    };
  }, [appointments, todayStr, isAptPast]);

  // Filter Appointments
  const filteredList = useMemo(() => {
    return appointments.filter((apt) => {
      const startIso = apt.slot?.startTime;
      const aptDate = startIso ? new Date(startIso).toDateString() : '';
      const isToday = aptDate === todayStr;
      const past = isAptPast(apt);

      // Tab filtering
      if (filterTab === 'today') {
        if (!isToday || past || apt.status === 'completed' || apt.status === 'cancelled') return false;
      } else if (filterTab === 'upcoming') {
        if (isToday || past || apt.status === 'completed' || apt.status === 'cancelled') return false;
      } else if (filterTab === 'completed') {
        if (!past && apt.status !== 'completed') return false;
        if (apt.status === 'cancelled') return false;
      }

      // Search filtering
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const patientName = apt.patient?.fullName?.toLowerCase() || '';
        const patientEmail = apt.patient?.email?.toLowerCase() || '';
        const refId = apt.id.toLowerCase();
        return patientName.includes(query) || patientEmail.includes(query) || refId.includes(query);
      }

      return true;
    });
  }, [appointments, filterTab, searchQuery, todayStr, isAptPast]);

  // Up Next / Imminent Appointment for Today
  const imminentAppointment = useMemo(() => {
    const todayConfirmed = appointments.filter((apt) => {
      const startIso = apt.slot?.startTime;
      if (!startIso) return false;
      const d = new Date(startIso);
      return d.toDateString() === todayStr && apt.status === 'confirmed' && !isAptPast(apt);
    });

    if (todayConfirmed.length === 0) return null;

    // Sort by start time ascending
    todayConfirmed.sort((a, b) => {
      const timeA = new Date(a.slot?.startTime || 0).getTime();
      const timeB = new Date(b.slot?.startTime || 0).getTime();
      return timeA - timeB;
    });

    return todayConfirmed[0];
  }, [appointments, todayStr, isAptPast]);

  return (
    <div className="appointments-page" style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '48px', width: '100%', boxSizing: 'border-box' }}>
      {/* Top Header Section */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--color-gold-bronze, #B88647)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <SolarIcon name="videocamera-record-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
                Telehealth Queue • Direct Daily.co Launcher
              </span>
            </div>
            <h1 className="page-title">
              Consultation Queue & Appointments
            </h1>
            <p className="page-subtitle" style={{ maxWidth: '680px' }}>
              Manage today&apos;s clinical consultations, connect to high-definition video rooms, and inspect scheduled patient records.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link href="/calendar" className="btn-secondary" style={{ padding: '9px 18px', fontSize: '0.84rem' }}>
              <SolarIcon name="calendar-linear" size={16} color="var(--color-chocolate-base, #2A170F)" />
              <span>Manage Roster</span>
            </Link>
          </div>
        </div>

        {/* Metric / KPI Cards — single row on desktop/tablet */}
        <div className="stats-grid-4">
          {/* Today's Patients */}
          <div className="portal-card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span className="stat-label">
                Today&apos;s Queue
              </span>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--color-gold-pale, #F0E5D3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SolarIcon name="user-rounded-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
              </div>
            </div>
            <div className="stat-number">
              {counts.today}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600, marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#059669', display: 'inline-block' }} />
              <span>{counts.todayConfirmed} confirmed &amp; queued</span>
            </div>
          </div>

          {/* Estimated Payout Today */}
          <div className="portal-card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span className="stat-label">
                Estimated Payout Today
              </span>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--color-gold-pale, #F0E5D3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SolarIcon name="wallet-money-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
              </div>
            </div>
            <div className="stat-number">
              R{counts.todayPayout.toFixed(2)}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '8px' }}>
              Net earnings (85% doctor take-home)
            </div>
          </div>

          {/* Upcoming Total */}
          <div className="portal-card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span className="stat-label">
                Upcoming Consultations
              </span>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--color-gold-pale, #F0E5D3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SolarIcon name="calendar-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
              </div>
            </div>
            <div className="stat-number">
              {counts.upcoming}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '8px' }}>
              Future consultations on roster
            </div>
          </div>

          {/* Completed Visits */}
          <div className="portal-card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span className="stat-label">
                Completed Visits
              </span>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--color-gold-pale, #F0E5D3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SolarIcon name="check-circle-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
              </div>
            </div>
            <div className="stat-number">
              {counts.completed}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '8px' }}>
              Concluded medical appointments
            </div>
          </div>
        </div>
      </div>

      {/* Imminent / Up Next Priority Card for Today */}
      {imminentAppointment && filterTab === 'today' && !searchQuery && (
        <div
          style={{
            marginBottom: '24px',
            borderRadius: '18px',
            backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
            border: '1.5px solid var(--color-gold-base, #DFAB62)',
            boxShadow: 'none',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle gold accent edge */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: '4px',
              backgroundColor: 'var(--color-gold-base, #DFAB62)',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-gold-pale, #F0E5D3)',
                color: 'var(--color-chocolate-base, #2A170F)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1rem',
                flexShrink: 0,
              }}
            >
              {imminentAppointment.patient?.fullName
                ? imminentAppointment.patient.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()
                : 'PT'}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span
                  style={{
                    backgroundColor: 'rgba(5, 150, 105, 0.12)',
                    color: '#047857',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#059669' }} />
                  Next Up in Queue
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                  Ref: #{imminentAppointment.id.substring(0, 8)}
                </span>
              </div>

              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 'var(--font-heading-weight, 400)', color: 'var(--color-chocolate-base, #2A170F)' }}>
                {imminentAppointment.patient?.fullName || 'Scheduled Patient'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.82rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '2px', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <SolarIcon name="clock-circle-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
                  <span>
                    {imminentAppointment.slot?.startTime
                      ? new Date(imminentAppointment.slot.startTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
                      : '10:00'}{' '}
                    –{' '}
                    {imminentAppointment.slot?.endTime
                      ? new Date(imminentAppointment.slot.endTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
                      : '10:45'}{' '}
                    SAST
                  </span>
                </span>

                {imminentAppointment.patient?.email && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <SolarIcon name="letter-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
                    <span>{imminentAppointment.patient.email}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setSelectedAppointment(imminentAppointment)}
              className="btn-secondary"
              style={{ padding: '10px 16px', fontSize: '0.85rem' }}
            >
              <SolarIcon name="document-text-linear" size={15} color="var(--color-chocolate-base, #2A170F)" />
              <span>Details</span>
            </button>

            <Link
              href={`/consultations/${imminentAppointment.id}`}
              className="btn-primary"
              style={{ padding: '10px 20px', fontSize: '0.85rem' }}
            >
              <SolarIcon name="videocamera-record-linear" size={16} color="var(--color-chocolate-base, #2A170F)" />
              <span>Launch Video Room</span>
            </Link>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar Container */}
      <div
        className="portal-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        {/* Specialty Filter Tabs with Dynamic Count Badges */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          {(
            [
              { id: 'today', label: "Today's Queue", count: counts.today, icon: 'clock-circle-linear' },
              { id: 'upcoming', label: 'Upcoming', count: counts.upcoming, icon: 'calendar-linear' },
              { id: 'completed', label: 'Completed', count: counts.completed, icon: 'check-circle-linear' },
            ] as const
          ).map((tab) => {
            const isActive = filterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id)}
                className={`specialty-chip ${isActive ? 'active' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  fontSize: '0.84rem',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.18s ease',
                }}
              >
                <SolarIcon
                  name={tab.icon}
                  size={15}
                  color={isActive ? 'var(--color-chocolate-base, #2A170F)' : 'var(--color-gold-bronze, #B88647)'}
                />
                <span>{tab.label}</span>
                <span
                  style={{
                    backgroundColor: isActive ? 'var(--color-chocolate-base, #2A170F)' : 'rgba(223, 171, 98, 0.25)',
                    color: isActive ? '#ffffff' : 'var(--color-chocolate-base, #2A170F)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '9999px',
                    minWidth: '18px',
                    textAlign: 'center',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Clean Doctors Search Pill */}
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <div className="doctors-search-pill" style={{ height: '42px' }}>
            <SolarIcon name="magnifer-linear" size={17} color="var(--color-gold-base, #DFAB62)" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient name, email, ref..."
              className="doctors-search-input"
              style={{ fontSize: '0.85rem' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-cream-text-muted)' }}
                aria-label="Clear search"
              >
                <SolarIcon name="close-circle-linear" size={16} color="var(--color-cream-text-muted)" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Appointment Queue List & States */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: '12px' }}>
          <SolarIcon
            name="refresh-linear"
            size={36}
            color="var(--color-gold-base, #DFAB62)"
            style={{ animation: 'spin 1s linear infinite' }}
          />
          <span style={{ fontSize: '0.875rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
            Loading consultation queue...
          </span>
        </div>
      ) : filteredList.length === 0 ? (
        <div
          className="portal-card"
          style={{
            padding: '56px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'var(--color-gold-pale, #F0E5D3)',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SolarIcon
              name={searchQuery ? 'magnifer-linear' : 'clock-circle-linear'}
              size={28}
              color="var(--color-gold-bronze, #B88647)"
            />
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.25rem',
              color: 'var(--color-chocolate-base, #2A170F)',
              fontWeight: 700,
              margin: '0 0 6px',
            }}
          >
            {searchQuery
              ? `No consultations matching "${searchQuery}"`
              : filterTab === 'today'
              ? "No consultations queued for today"
              : filterTab === 'upcoming'
              ? 'No upcoming consultations scheduled'
              : 'No completed consultations recorded'}
          </h3>
          <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            {searchQuery
              ? 'Try checking for typos or searching by the booking reference number.'
              : filterTab === 'today'
              ? 'Patient appointments booked on your practice calendar will appear here in real time.'
              : filterTab === 'upcoming'
              ? 'Publish available time windows on your practice calendar to open bookings for patients.'
              : 'Past consultations that have concluded will be archived here for record-keeping.'}
          </p>

          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="btn-secondary"
              style={{ padding: '8px 20px', fontSize: '0.85rem' }}
            >
              Clear Search Query
            </button>
          ) : (
            <Link href="/calendar" className="btn-primary" style={{ padding: '9px 22px', fontSize: '0.85rem' }}>
              <SolarIcon name="calendar-linear" size={16} color="var(--color-chocolate-base, #2A170F)" />
              <span>Open Practice Calendar</span>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="doctor-table-card doctor-table-view">
            <div className="doctor-table-scroll">
              <table className="doctor-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Schedule</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Payout (85%)</th>
                    <th style={{ textAlign: 'right', paddingRight: '18px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((appointment) => {
                    const startIso = appointment.slot?.startTime;
                    const startTimeStr = startIso
                      ? new Date(startIso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
                      : '10:00';
                    const endTimeStr = appointment.slot?.endTime
                      ? new Date(appointment.slot.endTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
                      : '10:45';
                    const dateStr = startIso
                      ? new Date(startIso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
                      : 'Today';

                    const netPayout = Number(appointment.price) - Number(appointment.commission_amount || appointment.price * 0.15);

                    const nameParts = (appointment.patient?.fullName || 'Patient Client').split(' ');
                    const initials = nameParts.length >= 2
                      ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
                      : nameParts[0].substring(0, 2).toUpperCase();

                    return (
                      <tr key={appointment.id}>
                        {/* Patient */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div className="doctor-avatar-circle" style={{ width: '38px', height: '38px', fontSize: '0.82rem' }}>
                              {initials}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                                {appointment.patient?.fullName || 'Patient Client'}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                                <SolarIcon name="letter-linear" size={13} color="var(--color-gold-bronze, #B88647)" />
                                <span>{appointment.patient?.email || '—'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Schedule */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-chocolate-base, #2A170F)' }}>
                              {dateStr}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                              <SolarIcon name="clock-circle-linear" size={13} color="var(--color-gold-bronze, #B88647)" />
                              <span>{startTimeStr} – {endTimeStr} SAST</span>
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="badge-gold"
                            style={{
                              textTransform: 'capitalize',
                              ...(appointment.status === 'confirmed' && !isAptPast(appointment)
                                ? { backgroundColor: 'rgba(5, 150, 105, 0.1)', color: '#047857', borderColor: 'rgba(5, 150, 105, 0.25)' }
                                : isAptPast(appointment) && appointment.status !== 'completed' && appointment.status !== 'cancelled'
                                ? { backgroundColor: 'rgba(107, 94, 85, 0.1)', color: '#6B5E55', borderColor: 'rgba(107, 94, 85, 0.25)' }
                                : {}),
                            }}
                          >
                            {isAptPast(appointment) && appointment.status === 'confirmed' ? 'Concluded' : appointment.status}
                          </span>
                        </td>

                        {/* Payout */}
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div style={{ color: '#047857', fontWeight: 700, fontSize: '0.925rem' }}>
                            R{netPayout.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                            Gross R{Number(appointment.price).toFixed(2)}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            {!isAptPast(appointment) ? (
                              <Link
                                href={`/consultations/${appointment.id}`}
                                className="btn-primary"
                                style={{ padding: '7px 14px', fontSize: '0.8rem' }}
                              >
                                <SolarIcon name="videocamera-record-linear" size={15} color="var(--color-chocolate-base, #2A170F)" />
                                <span>Start</span>
                              </Link>
                            ) : (
                              <Link
                                href={`/consultations/${appointment.id}`}
                                className="btn-secondary"
                                style={{ padding: '7px 12px', fontSize: '0.8rem' }}
                              >
                                <SolarIcon name="document-text-linear" size={14} color="var(--color-chocolate-base, #2A170F)" />
                                <span>Record</span>
                              </Link>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedAppointment(appointment)}
                              className="btn-secondary"
                              style={{ padding: '7px 12px', fontSize: '0.8rem' }}
                            >
                              <SolarIcon name="notes-minimalistic-linear" size={15} color="var(--color-chocolate-base, #2A170F)" />
                              <span>Details</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Card View */}
          <div className="doctor-cards-view">
            {filteredList.map((appointment) => {
              const startIso = appointment.slot?.startTime;
              const startTimeStr = startIso
                ? new Date(startIso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
                : '10:00';
              const endTimeStr = appointment.slot?.endTime
                ? new Date(appointment.slot.endTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })
                : '10:45';
              const dateStr = startIso
                ? new Date(startIso).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
                : 'Today';

              const netPayout = Number(appointment.price) - Number(appointment.commission_amount || appointment.price * 0.15);

              const nameParts = (appointment.patient?.fullName || 'Patient Client').split(' ');
              const initials = nameParts.length >= 2
                ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
                : nameParts[0].substring(0, 2).toUpperCase();

              return (
                <div key={appointment.id} className="doctor-mobile-card">
                  <div className="doctor-mobile-card-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div className="doctor-avatar-circle" style={{ width: '40px', height: '40px', fontSize: '0.85rem' }}>
                        {initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-chocolate-base, #2A170F)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {appointment.patient?.fullName || 'Patient Client'}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--color-cream-text-muted, #6B5E55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {appointment.patient?.email || '—'}
                        </div>
                      </div>
                    </div>
                    <span
                      className="badge-gold"
                      style={{
                        flexShrink: 0,
                        textTransform: 'capitalize',
                        ...(appointment.status === 'confirmed' && !isAptPast(appointment)
                          ? { backgroundColor: 'rgba(5, 150, 105, 0.1)', color: '#047857', borderColor: 'rgba(5, 150, 105, 0.25)' }
                          : isAptPast(appointment) && appointment.status !== 'completed' && appointment.status !== 'cancelled'
                          ? { backgroundColor: 'rgba(107, 94, 85, 0.1)', color: '#6B5E55', borderColor: 'rgba(107, 94, 85, 0.25)' }
                          : {}),
                      }}
                    >
                      {isAptPast(appointment) && appointment.status === 'confirmed' ? 'Concluded' : appointment.status}
                    </span>
                  </div>

                  <div className="doctor-mobile-card-row" style={{ fontSize: '0.82rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                      <SolarIcon name="clock-circle-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
                      <span>{dateStr} • {startTimeStr}–{endTimeStr}</span>
                    </span>
                    <span style={{ color: '#047857', fontWeight: 700 }}>R{netPayout.toFixed(2)}</span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {!isAptPast(appointment) ? (
                      <Link
                        href={`/consultations/${appointment.id}`}
                        className="btn-primary"
                        style={{ padding: '10px', fontSize: '0.82rem' }}
                      >
                        <SolarIcon name="videocamera-record-linear" size={15} color="var(--color-chocolate-base, #2A170F)" />
                        <span>Start</span>
                      </Link>
                    ) : (
                      <Link
                        href={`/consultations/${appointment.id}`}
                        className="btn-secondary"
                        style={{ padding: '10px', fontSize: '0.82rem' }}
                      >
                        <SolarIcon name="document-text-linear" size={14} color="var(--color-chocolate-base, #2A170F)" />
                        <span>Record</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedAppointment(appointment)}
                      className="btn-secondary"
                      style={{ padding: '10px', fontSize: '0.82rem' }}
                    >
                      <SolarIcon name="notes-minimalistic-linear" size={15} color="var(--color-chocolate-base, #2A170F)" />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Appointment Details Modal */}
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
              padding: '30px',
              maxWidth: '540px',
              width: '100%',
              position: 'relative',
              borderRadius: '20px',
            }}
          >
            <button
              type="button"
              onClick={() => setSelectedAppointment(null)}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-cream-text-muted, #6B5E55)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
              }}
            >
              <SolarIcon name="close-circle-linear" size={22} color="var(--color-gold-base, #DFAB62)" />
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: 'var(--color-gold-pale, #F0E5D3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SolarIcon name="user-rounded-linear" size={20} color="var(--color-chocolate-base, #2A170F)" />
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    color: 'var(--color-chocolate-base, #2A170F)',
                    margin: 0,
                  }}
                >
                  Consultation Details
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-gold-bronze, #B88647)', fontWeight: 600 }}>
                  Booking Ref: #{selectedAppointment.id}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Patient Information Box */}
              <div
                style={{
                  background: 'var(--color-cream-surface, #FDFBF7)',
                  border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                  padding: '16px 18px',
                  borderRadius: '14px',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-gold-bronze, #B88647)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Patient Client
                </div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 'var(--font-heading-weight, 400)', fontSize: '1.1rem', color: 'var(--color-chocolate-base, #2A170F)', marginTop: '4px' }}>
                  {selectedAppointment.patient?.fullName || 'Patient Client'}
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SolarIcon name="letter-linear" size={14} color="var(--color-gold-bronze)" />
                  <span>{selectedAppointment.patient?.email || 'N/A'}</span>
                </div>
                {selectedAppointment.patient?.phone && (
                  <div style={{ fontSize: '0.825rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <SolarIcon name="phone-calling-linear" size={14} color="var(--color-gold-bronze)" />
                    <span>{selectedAppointment.patient.phone}</span>
                  </div>
                )}
              </div>

              {/* Consultation Schedule Window */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div
                  style={{
                    border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
                    background: 'var(--color-cream-surface, #FDFBF7)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-gold-bronze, #B88647)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Date
                  </div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 'var(--font-heading-weight, 400)', fontSize: '0.925rem', color: 'var(--color-chocolate-base, #2A170F)', marginTop: '3px' }}>
                    {selectedAppointment.slot?.startTime
                      ? new Date(selectedAppointment.slot.startTime).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
                      : 'Today'}
                  </div>
                </div>

                <div
                  style={{
                    border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
                    background: 'var(--color-cream-surface, #FDFBF7)',
                    padding: '12px 14px',
                    borderRadius: '12px',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-gold-bronze, #B88647)', fontWeight: 700, textTransform: 'uppercase' }}>
                    Time Window
                  </div>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 'var(--font-heading-weight, 400)', fontSize: '0.925rem', color: 'var(--color-chocolate-base, #2A170F)', marginTop: '3px' }}>
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
                  padding: '16px 18px',
                  borderRadius: '14px',
                }}
              >
                <div style={{ fontSize: '0.72rem', color: 'var(--color-gold-bronze, #B88647)', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Financial Settlement (ZAR)
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                  <span>Patient Total:</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-chocolate-base)' }}>R{Number(selectedAppointment.price).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '6px' }}>
                  <span>ChekUp247 Fee (15%):</span>
                  <span>-R{Number(selectedAppointment.commission_amount || selectedAppointment.price * 0.15).toFixed(2)}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1rem',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    color: '#047857',
                    marginTop: '8px',
                    paddingTop: '8px',
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

            {/* Launch CTA */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="btn-secondary"
                style={{ padding: '9px 18px', fontSize: '0.85rem' }}
              >
                Close
              </button>

              {!isAptPast(selectedAppointment) ? (
                <Link
                  href={`/consultations/${selectedAppointment.id}`}
                  className="btn-primary"
                  style={{ padding: '9px 20px', fontSize: '0.85rem' }}
                >
                  <SolarIcon name="videocamera-record-linear" size={16} color="var(--color-chocolate-base, #2A170F)" />
                  <span>Launch Video Room</span>
                </Link>
              ) : (
                <Link
                  href={`/consultations/${selectedAppointment.id}`}
                  className="btn-secondary"
                  style={{ padding: '9px 20px', fontSize: '0.85rem' }}
                >
                  <SolarIcon name="document-text-linear" size={16} color="var(--color-chocolate-base, #2A170F)" />
                  <span>View Consultation Record</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
