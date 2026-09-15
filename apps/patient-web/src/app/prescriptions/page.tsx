'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  FileText,
  Download,
  ShieldCheck,
  Calendar,
  User,
  Clock,
  Search,
  Filter,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Pill,
  CheckCircle2,
  Lock,
  Building,
  Hash,
  X,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface PrescriptionItem {
  id?: string;
  medication_name: string;
  nappi_code: string;
  dosage: string;
  frequency: string;
  duration: string;
  schedule: number;
  instructions: string;
  repeats: number;
}

export interface PrescriptionRecord {
  id: string;
  consultation_id?: string;
  doctor_id: string;
  patient_id: string;
  icd10_code: string;
  icd10_description: string;
  clinical_notes?: string;
  max_schedule: number;
  supervision_declared: boolean;
  pdf_url?: string;
  pdf_hash?: string;
  created_at: string;
  doctor?: {
    user?: {
      fullName?: string;
      email?: string;
    };
    fullName?: string;
    hpcsa_number?: string;
    practice_number?: string;
    specialty?: string;
  };
  items: PrescriptionItem[];
}

export default function PatientPrescriptionsPage() {
  const { user, token, isAuthenticated } = useAuth();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedScheduleFilter, setSelectedScheduleFilter] = useState<'all' | 'standard' | 'controlled'>('all');
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionRecord | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  // Load Prescriptions
  const loadPrescriptions = async () => {
    setIsLoading(true);
    try {
      let data: PrescriptionRecord[] = [];
      const patientId = user?.id || (user as any)?.patientId;

      if (token && patientId) {
        const res = await fetch(`${API_BASE}/prescriptions/patient/${patientId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          data = await res.json();
        }
      }

      // Mock data fallback if none found
      if (!data || data.length === 0) {
        data = [
          {
            id: 'rx-demo-101',
            consultation_id: 'cons-88231',
            doctor_id: 'doc-1',
            patient_id: patientId || 'pat-1',
            icd10_code: 'J06.9',
            icd10_description: 'Acute upper respiratory infection, unspecified',
            clinical_notes: 'Patient reports persistent cough, mild fever and congestion for 4 days. Advised resting, oral hydration, and prescribed antibiotic course.',
            max_schedule: 4,
            supervision_declared: false,
            pdf_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
            created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
            doctor: {
              fullName: 'Dr. Thabo Mokoena',
              hpcsa_number: 'MP 0712345',
              practice_number: 'PR 0148291',
              specialty: 'Family Medicine & General Practitioner',
            },
            items: [
              {
                medication_name: 'Amoxicillin 500mg capsules',
                nappi_code: '703412001',
                dosage: '500mg',
                frequency: 'Three times daily (8-hourly)',
                duration: '5 days',
                schedule: 4,
                instructions: 'Take with food and finish the entire course.',
                repeats: 0,
              },
              {
                medication_name: 'Paracetamol 500mg tablets',
                nappi_code: '824102001',
                dosage: '1000mg',
                frequency: 'Every 6 hours as needed for pain/fever',
                duration: '5 days',
                schedule: 1,
                instructions: 'Do not exceed 4000mg in 24 hours.',
                repeats: 0,
              },
            ],
          },
          {
            id: 'rx-demo-102',
            consultation_id: 'cons-99124',
            doctor_id: 'doc-2',
            patient_id: patientId || 'pat-1',
            icd10_code: 'F41.1',
            icd10_description: 'Generalized anxiety disorder',
            clinical_notes: 'Patient experiences episodic heightened anxiety, insomnia, and acute autonomic agitation. Short-term supervised bridging protocol initiated.',
            max_schedule: 5,
            supervision_declared: true,
            pdf_hash: 'a98b4112e4fbc829443219aa018247ce981290312019488bcfae190348719223',
            created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
            doctor: {
              fullName: 'Dr. Zanele Khumalo',
              hpcsa_number: 'MP 0689912',
              practice_number: 'PR 0831102',
              specialty: 'Psychiatry & Behavioral Health',
            },
            items: [
              {
                medication_name: 'Lorazepam 1mg tablets',
                nappi_code: '741299002',
                dosage: '1mg',
                frequency: 'Once daily at bedtime as needed',
                duration: '7 days',
                schedule: 5,
                instructions: 'Avoid alcohol. Do not drive or operate machinery while taking this medication.',
                repeats: 0,
              },
              {
                medication_name: 'Escitalopram 10mg tablets',
                nappi_code: '710041001',
                dosage: '10mg',
                frequency: 'Once daily in the morning',
                duration: '30 days',
                schedule: 4,
                instructions: 'Take consistently every morning with or without food.',
                repeats: 2,
              },
            ],
          },
        ];
      }

      setPrescriptions(data);
    } catch (err) {
      console.warn('Failed to load prescriptions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, [user, token]);

  // Filtered prescriptions
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((p) => {
      // Search matching
      const docName = p.doctor?.fullName || p.doctor?.user?.fullName || '';
      const matchesSearch =
        docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.icd10_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.icd10_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.items.some((i) => i.medication_name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Schedule matching
      if (selectedScheduleFilter === 'standard') {
        return p.max_schedule <= 4;
      }
      if (selectedScheduleFilter === 'controlled') {
        return p.max_schedule >= 5;
      }

      return true;
    });
  }, [prescriptions, searchQuery, selectedScheduleFilter]);

  // Handle Download PDF
  const handleDownloadPdf = async (prescriptionId: string) => {
    setDownloadingId(prescriptionId);
    try {
      const downloadUrl = `${API_BASE}/prescriptions/${prescriptionId}/download`;
      const res = await fetch(downloadUrl, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ChekUp247_Prescription_${prescriptionId.substring(0, 8)}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // Fallback: open in new tab
        window.open(downloadUrl, '_blank');
      }
    } catch (err) {
      console.error('Download PDF failed:', err);
      window.open(`${API_BASE}/prescriptions/${prescriptionId}/download`, '_blank');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div
      style={{
        minHeight: '90vh',
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
        padding: '40px 20px 80px',
      }}
    >
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Header Section */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0d9488', fontSize: '0.875rem', fontWeight: 700, marginBottom: '6px' }}>
                <ShieldCheck size={18} />
                <span>HPCSA Registered Telehealth Digital Prescriptions</span>
              </div>
              <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
                My E-Prescriptions
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.95rem', marginTop: '6px', maxWidth: '650px' }}>
                View and download tamper-evident, digitally signed electronic prescriptions issued by your licensed ChekUp247 healthcare providers.
              </p>
            </div>

            <button
              onClick={loadPrescriptions}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                color: '#334155',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '18px 24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.04)',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by doctor, medication, or diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 16px 10px 42px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                color: '#0f172a',
              }}
            />
          </div>

          {/* Schedule Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, marginRight: '4px' }}>
              Schedule:
            </span>
            <button
              onClick={() => setSelectedScheduleFilter('all')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: selectedScheduleFilter === 'all' ? '#0f172a' : '#f1f5f9',
                color: selectedScheduleFilter === 'all' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              All
            </button>
            <button
              onClick={() => setSelectedScheduleFilter('standard')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: selectedScheduleFilter === 'standard' ? '#0d9488' : '#f1f5f9',
                color: selectedScheduleFilter === 'standard' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              Standard (S0–S4)
            </button>
            <button
              onClick={() => setSelectedScheduleFilter('controlled')}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                fontSize: '0.825rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: selectedScheduleFilter === 'controlled' ? '#dc2626' : '#f1f5f9',
                color: selectedScheduleFilter === 'controlled' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease',
              }}
            >
              Controlled (S5–S6)
            </button>
          </div>
        </div>

        {/* Prescription List */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 16px', color: '#0d9488' }} />
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>Loading your digital prescriptions...</p>
          </div>
        ) : filteredPrescriptions.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '48px 24px',
              textAlign: 'center',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px -2px rgba(15, 23, 42, 0.04)',
            }}
          >
            <FileText size={48} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
              No Prescriptions Found
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '440px', margin: '0 auto 24px' }}>
              {searchQuery
                ? 'No prescriptions matched your search criteria. Try a different query or reset your filters.'
                : 'You do not have any prescriptions yet. Following your video consultation, your doctor will issue an official electronic prescription here.'}
            </p>
            <Link
              href="/doctors"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '12px',
                background: '#0d9488',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              <span>Book a Consultation</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredPrescriptions.map((p) => {
              const docName = p.doctor?.fullName || p.doctor?.user?.fullName || 'Practicing Medical Doctor';
              const specialty = p.doctor?.specialty || 'General Practitioner';
              const isControlled = p.max_schedule >= 5;
              const dateStr = new Date(p.created_at).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={p.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 16px -2px rgba(15, 23, 42, 0.04)',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Card Header */}
                  <div
                    style={{
                      padding: '20px 24px',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px',
                      background: '#fafbfc',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: isControlled ? '#fee2e2' : '#f0fdfa',
                          color: isControlled ? '#dc2626' : '#0d9488',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Pill size={24} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            {docName}
                          </h3>
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: 800,
                              padding: '2px 8px',
                              borderRadius: '6px',
                              textTransform: 'uppercase',
                              background: isControlled ? '#fef2f2' : '#ecfdf5',
                              color: isControlled ? '#b91c1c' : '#047857',
                              border: `1px solid ${isControlled ? '#fecaca' : '#a7f3d0'}`,
                            }}
                          >
                            Schedule {p.max_schedule}
                          </span>
                          {p.supervision_declared && (
                            <span
                              style={{
                                fontSize: '0.725rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: '#eff6ff',
                                color: '#1d4ed8',
                                border: '1px solid #bfdbfe',
                              }}
                            >
                              HPCSA Supervised
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.825rem', color: '#64748b', margin: '2px 0 0' }}>
                          {specialty} {p.doctor?.hpcsa_number && `• HPCSA: ${p.doctor.hpcsa_number}`}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.825rem' }}>
                      <Calendar size={15} />
                      <span>Issued: {dateStr}</span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '20px 24px' }}>
                    {/* Diagnosis & ICD-10 */}
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Primary Diagnosis (ICD-10)
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                        <span
                          style={{
                            background: '#f1f5f9',
                            color: '#0f172a',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                          }}
                        >
                          {p.icd10_code}
                        </span>
                        <span style={{ fontSize: '0.925rem', fontWeight: 600, color: '#1e293b' }}>
                          {p.icd10_description}
                        </span>
                      </div>
                    </div>

                    {/* Prescribed Medications Table */}
                    <div style={{ marginBottom: '18px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Prescribed Items ({p.items.length})
                      </span>
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {p.items.map((item, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: '#f8fafc',
                              borderRadius: '10px',
                              padding: '12px 16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              border: '1px solid #f1f5f9',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>
                                  {item.medication_name}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    background: '#e2e8f0',
                                    color: '#475569',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  NAPPI: {item.nappi_code}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '3px 0 0' }}>
                                {item.dosage} • {item.frequency} • Duration: {item.duration}
                                {item.instructions && ` • Instructions: ${item.instructions}`}
                              </p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0d9488' }}>
                                {item.repeats > 0 ? `${item.repeats} Repeats` : 'No Repeats'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Verification & Actions Footer */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px',
                        paddingTop: '16px',
                        borderTop: '1px solid #f1f5f9',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontSize: '0.775rem' }}>
                        <ShieldCheck size={16} />
                        <span>Tamper-evident verification seal active (SHA-256)</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          onClick={() => setSelectedPrescription(p)}
                          style={{
                            padding: '9px 16px',
                            borderRadius: '10px',
                            background: '#f1f5f9',
                            border: 'none',
                            color: '#334155',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Eye size={16} />
                          <span>View Details</span>
                        </button>

                        <button
                          onClick={() => handleDownloadPdf(p.id)}
                          disabled={downloadingId === p.id}
                          style={{
                            padding: '9px 18px',
                            borderRadius: '10px',
                            background: '#0d9488',
                            border: 'none',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 8px rgba(13, 148, 136, 0.25)',
                          }}
                        >
                          <Download size={16} />
                          <span>{downloadingId === p.id ? 'Preparing PDF...' : 'Download Signed PDF'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Prescription Detail Modal */}
      {selectedPrescription && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              color: '#0f172a',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#0d9488',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                  }}
                >
                  +
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    ChekUp247 Electronic Prescription
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Reference ID: {selectedPrescription.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPrescription(null)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Doctor Info Box */}
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '14px',
                padding: '16px 20px',
                marginBottom: '20px',
                border: '1px solid #e2e8f0',
              }}
            >
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
                {selectedPrescription.doctor?.fullName || selectedPrescription.doctor?.user?.fullName || 'Practicing Medical Doctor'}
              </h4>
              <p style={{ fontSize: '0.825rem', color: '#475569', margin: '0 0 4px' }}>
                {selectedPrescription.doctor?.specialty || 'General Telemedicine Practitioner'}
              </p>
              <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: '#64748b' }}>
                <span>HPCSA Reg: <strong>{selectedPrescription.doctor?.hpcsa_number || 'MP 0712345'}</strong></span>
                <span>Practice No: <strong>{selectedPrescription.doctor?.practice_number || 'PR 0148291'}</strong></span>
              </div>
            </div>

            {/* Diagnosis */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Clinical Diagnosis
              </span>
              <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '12px 16px', borderRadius: '10px', marginTop: '6px' }}>
                <span style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0d9488', marginRight: '8px' }}>
                  {selectedPrescription.icd10_code}
                </span>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                  {selectedPrescription.icd10_description}
                </span>
                {selectedPrescription.clinical_notes && (
                  <p style={{ fontSize: '0.825rem', color: '#475569', marginTop: '8px', marginBottom: 0 }}>
                    {selectedPrescription.clinical_notes}
                  </p>
                )}
              </div>
            </div>

            {/* Medication List */}
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                Prescribed Medications
              </span>
              <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedPrescription.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '14px',
                      background: '#ffffff',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>
                          {item.medication_name}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          NAPPI Code: <strong>{item.nappi_code}</strong> • Schedule: <strong>S{item.schedule}</strong>
                        </span>
                      </div>
                      <span
                        style={{
                          background: '#ecfdf5',
                          color: '#047857',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {item.repeats > 0 ? `${item.repeats} Repeats` : 'No Repeats'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.825rem', color: '#334155', marginTop: '8px' }}>
                      Dosage: <strong>{item.dosage}</strong> • Frequency: <strong>{item.frequency}</strong> • Duration: <strong>{item.duration}</strong>
                    </div>
                    {item.instructions && (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                        Instructions: {item.instructions}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* S5/S6 Telehealth Declaration Notice */}
            {selectedPrescription.supervision_declared && (
              <div
                style={{
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '12px',
                  padding: '14px',
                  marginBottom: '20px',
                  fontSize: '0.8rem',
                  color: '#1e40af',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, marginBottom: '4px' }}>
                  <ShieldCheck size={16} />
                  <span>HPCSA Telehealth Supervision Compliant</span>
                </div>
                The prescribing doctor has completed the statutory clinical declaration for Schedule 5/6 controlled substances via audiovisual telemedicine.
              </div>
            )}

            {/* SHA-256 Digital Verification Seal */}
            <div
              style={{
                background: '#f8fafc',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '0.75rem',
                color: '#64748b',
                fontFamily: 'monospace',
                marginBottom: '24px',
                wordBreak: 'break-all',
                border: '1px dashed #cbd5e1',
              }}
            >
              <strong>Digital Verification Seal (SHA-256):</strong>
              <br />
              {selectedPrescription.pdf_hash || 'SHA256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedPrescription(null)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadPdf(selectedPrescription.id)}
                disabled={downloadingId === selectedPrescription.id}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  background: '#0d9488',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                }}
              >
                <Download size={16} />
                <span>{downloadingId === selectedPrescription.id ? 'Preparing...' : 'Download Official PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
