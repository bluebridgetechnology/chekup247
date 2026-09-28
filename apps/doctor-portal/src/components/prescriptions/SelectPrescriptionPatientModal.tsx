'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { SolarIcon } from '../common/SolarIcon';

export interface PreviousPatientItem {
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone?: string;
  lastBookingId: string;
  lastConsultationDate: string;
  consultationStatus: string;
  totalConsultations: number;
}

interface SelectPrescriptionPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SelectPrescriptionPatientModal({
  isOpen,
  onClose,
}: SelectPrescriptionPatientModalProps) {
  const router = useRouter();
  const { doctor, token } = useDoctorAuth();
  const [patients, setPatients] = useState<PreviousPatientItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function fetchPreviousPatients() {
      try {
        setIsLoading(true);
        if (!token) return;

        const res = await fetch(`${API_BASE}/bookings/doctor`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });

        if (res.ok) {
          const bookings = await res.json();
          if (Array.isArray(bookings)) {
            // Group by patient and find patients who have had a consultation
            const patientMap = new Map<string, PreviousPatientItem>();

            for (const b of bookings) {
              const p = b.patient;
              if (!p) continue;
              const pId = p.id || b.patient_id || p.email;
              if (!pId) continue;

              const bookingDate = b.slot?.startTime || b.created_at || new Date().toISOString();
              const isPast =
                b.status === 'completed' ||
                b.status === 'concluded' ||
                (b.slot?.endTime && new Date(b.slot.endTime).getTime() < Date.now());

              // Accept bookings that have had a consultation (or completed)
              if (!isPast && b.status !== 'confirmed') {
                continue;
              }

              const existing = patientMap.get(pId);
              if (!existing) {
                patientMap.set(pId, {
                  patientId: pId,
                  patientName: p.fullName || p.name || 'Patient',
                  patientEmail: p.email || '',
                  patientPhone: p.phone || '',
                  lastBookingId: b.id,
                  lastConsultationDate: bookingDate,
                  consultationStatus: b.status || 'completed',
                  totalConsultations: 1,
                });
              } else {
                existing.totalConsultations += 1;
                // Update to most recent booking
                if (new Date(bookingDate).getTime() > new Date(existing.lastConsultationDate).getTime()) {
                  existing.lastBookingId = b.id;
                  existing.lastConsultationDate = bookingDate;
                  existing.consultationStatus = b.status || existing.consultationStatus;
                }
              }
            }

            const list = Array.from(patientMap.values()).sort(
              (a, b) =>
                new Date(b.lastConsultationDate).getTime() - new Date(a.lastConsultationDate).getTime(),
            );

            if (isMounted) {
              setPatients(list);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load past consultation patients:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchPreviousPatients();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, token, API_BASE, onClose]);

  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.patientName.toLowerCase().includes(q) ||
        p.patientEmail.toLowerCase().includes(q) ||
        (p.patientPhone && p.patientPhone.includes(q)),
    );
  }, [patients, searchQuery]);

  if (!isOpen) return null;

  const handleSelectPatient = (patient: PreviousPatientItem) => {
    onClose();
    router.push(`/consultations/${patient.lastBookingId}/prescribe`);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(30, 16, 10, 0.7)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1.5px solid rgba(223, 171, 98, 0.35)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          color: '#2A170F',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '22px 28px',
            borderBottom: '1px solid rgba(223, 171, 98, 0.2)',
            backgroundColor: '#FAF6EE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <SolarIcon name="document-text-linear" size={18} color="var(--color-gold-bronze, #B88647)" />
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-gold-bronze, #B88647)',
                }}
              >
                HPCSA Telemedicine Compliance
              </span>
            </div>
            <h2
              style={{
                margin: 0,
                fontFamily: 'var(--font-heading)',
                fontSize: '1.35rem',
                fontWeight: 'var(--font-heading-weight, 400)',
                color: 'var(--color-chocolate-base, #2A170F)',
              }}
            >
              Raise Prescription for Patient
            </h2>
            <p
              style={{
                margin: '4px 0 0 0',
                fontSize: '0.825rem',
                color: 'var(--color-cream-text-muted, #6B5E55)',
              }}
            >
              Select a patient who has had a previous consultation with you to generate a valid electronic prescription.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '8px',
              borderRadius: '50%',
              cursor: 'pointer',
              color: 'var(--color-cream-text-muted, #6B5E55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'rgba(223, 171, 98, 0.15)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'none')}
          >
            <SolarIcon name="close-circle-linear" size={22} color="var(--color-chocolate-base, #2A170F)" />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '16px 28px', borderBottom: '1px solid rgba(223, 171, 98, 0.15)' }}>
          <div className="doctors-search-pill" style={{ width: '100%', height: '44px' }}>
            <SolarIcon name="magnifer-linear" size={18} color="var(--color-gold-base, #DFAB62)" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search previous patient by name, email, or phone number..."
              className="doctors-search-input"
              style={{ fontSize: '0.875rem' }}
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-cream-text-muted, #6B5E55)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Patient List */}
        <div
          style={{
            padding: '20px 28px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {isLoading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
              <div style={{ display: 'inline-block', marginBottom: '12px' }}>
                <SolarIcon name="clock-circle-linear" size={32} color="var(--color-gold-base, #DFAB62)" />
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Loading previous consultation patients...</p>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                backgroundColor: 'rgba(223, 171, 98, 0.05)',
                borderRadius: '16px',
                border: '1.5px dashed rgba(223, 171, 98, 0.3)',
              }}
            >
              <div
                style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-gold-pale, #F0E5D3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <SolarIcon name="user-linear" size={24} color="var(--color-chocolate-base, #2A170F)" />
              </div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--color-chocolate-base, #2A170F)', marginBottom: '6px' }}>
                {searchQuery ? 'No matching patients found' : 'No previous consultation patients found'}
              </div>
              <p
                style={{
                  margin: '0 auto 18px',
                  fontSize: '0.85rem',
                  color: 'var(--color-cream-text-muted, #6B5E55)',
                  maxWidth: '440px',
                  lineHeight: 1.5,
                }}
              >
                {searchQuery
                  ? `We could not find any patient matching "${searchQuery}". Please check the spelling or try searching by phone number.`
                  : 'HPCSA telemedicine guidelines require an established doctor-patient clinical consultation prior to electronic prescription issuance. Complete a consultation to issue prescriptions.'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push('/appointments');
                  }}
                  className="btn-secondary"
                  style={{ padding: '8px 18px', fontSize: '0.825rem' }}
                >
                  <SolarIcon name="calendar-linear" size={15} color="var(--color-chocolate-base, #2A170F)" />
                  <span>View Appointments Queue</span>
                </button>
              )}
            </div>
          ) : (
            filteredPatients.map((patient) => {
              const nameParts = patient.patientName.split(' ');
              const initials =
                nameParts.length >= 2
                  ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
                  : patient.patientName.substring(0, 2).toUpperCase();

              const formattedDate = new Date(patient.lastConsultationDate).toLocaleDateString('en-ZA', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });

              return (
                <div
                  key={patient.patientId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: '14px',
                    backgroundColor: '#FFFFFF',
                    border: '1.5px solid rgba(223, 171, 98, 0.25)',
                    boxShadow: '0 2px 8px rgba(42, 23, 15, 0.03)',
                    transition: 'all 0.18s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-gold-base, #DFAB62)';
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#FAF6EE';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(223, 171, 98, 0.25)';
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#FFFFFF';
                  }}
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--color-gold-pale, #F0E5D3)',
                        color: 'var(--color-chocolate-base, #2A170F)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '0.95rem',
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          color: 'var(--color-chocolate-base, #2A170F)',
                          marginBottom: '2px',
                        }}
                      >
                        {patient.patientName}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontSize: '0.78rem',
                          color: 'var(--color-cream-text-muted, #6B5E55)',
                          flexWrap: 'wrap',
                        }}
                      >
                        {patient.patientEmail && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <SolarIcon name="letter-linear" size={13} color="var(--color-gold-bronze, #B88647)" />
                            <span>{patient.patientEmail}</span>
                          </span>
                        )}
                        {patient.patientPhone && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <SolarIcon name="phone-linear" size={13} color="var(--color-gold-bronze, #B88647)" />
                            <span>{patient.patientPhone}</span>
                          </span>
                        )}
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <SolarIcon name="calendar-linear" size={13} color="var(--color-gold-bronze, #B88647)" />
                          <span>Last Consulted: {formattedDate}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectPatient(patient);
                      }}
                      className="btn-primary"
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.8rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <SolarIcon name="pill-linear" size={15} color="var(--color-chocolate-base, #2A170F)" />
                      <span>Prescribe</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: '1px solid rgba(223, 171, 98, 0.2)',
            backgroundColor: '#FAF6EE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
            Showing <strong>{filteredPatients.length}</strong> previous consultation patient{filteredPatients.length === 1 ? '' : 's'}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '8px 20px', fontSize: '0.825rem' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
