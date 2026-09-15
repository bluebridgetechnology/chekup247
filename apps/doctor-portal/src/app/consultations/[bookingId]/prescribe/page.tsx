'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Search,
  Plus,
  Trash2,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Download,
  ArrowLeft,
  Loader2,
  User,
  Calendar,
  Check,
  ChevronRight,
  ExternalLink,
  Eye,
  Edit3,
  Stethoscope,
} from 'lucide-react';
import { useDoctorAuth } from '../../../../context/DoctorAuthContext';

interface Icd10Result {
  code: string;
  description: string;
  chapter?: string;
}

interface MedicationResult {
  name: string;
  generic_name: string;
  nappi_code: string;
  schedule: string;
  dosage_form: string;
  strength: string;
  category: string;
  is_controlled: boolean;
}

interface MedicationRow {
  id: string;
  name: string;
  nappi_code: string;
  schedule_flag: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export default function EPrescriptionBuilderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { doctor, profile, token } = useDoctorAuth();

  const bookingId = (params?.bookingId as string) || searchParams.get('bookingId') || '';

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  // Consultation & Patient Context
  const [isLoadingConsultation, setIsLoadingConsultation] = useState<boolean>(true);
  const [consultation, setConsultation] = useState<any>(null);
  const [patient, setPatient] = useState<{
    name: string;
    email: string;
    phone: string;
  }>({
    name: 'Patient',
    email: 'patient@example.com',
    phone: '',
  });

  // Step / Tab State: 'form' | 'preview' | 'success'
  const [activeTab, setActiveTab] = useState<'form' | 'preview' | 'success'>('form');
  const [issuedPrescription, setIssuedPrescription] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 1. ICD-10 Search & Selection
  const [icd10Query, setIcd10Query] = useState<string>('');
  const [icd10Results, setIcd10Results] = useState<Icd10Result[]>([]);
  const [selectedIcd10, setSelectedIcd10] = useState<Icd10Result | null>(null);
  const [isSearchingIcd10, setIsSearchingIcd10] = useState<boolean>(false);
  const [showIcd10Dropdown, setShowIcd10Dropdown] = useState<boolean>(false);
  const icd10DebounceRef = useRef<NodeJS.Timeout | null>(null);

  // 2. Medication Repeater Items
  const [medications, setMedications] = useState<MedicationRow[]>([
    {
      id: 'med-1',
      name: '',
      nappi_code: '',
      schedule_flag: 'S4',
      dosage: '',
      frequency: 'Daily',
      duration: '5 days',
      instructions: '',
    },
  ]);

  // Medication search per row
  const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(null);
  const [medicationSearchResults, setMedicationSearchResults] = useState<MedicationResult[]>([]);
  const [isSearchingMed, setIsSearchingMed] = useState<boolean>(false);
  const medSearchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // 3. Schedule 5 & 6 Supervision Declaration Modal (DP-703, BE-703)
  const [showSupervisionModal, setShowSupervisionModal] = useState<boolean>(false);
  const [supervisionDeclarationText, setSupervisionDeclarationText] = useState<string>(
    'I, the undersigned medical practitioner registered with the HPCSA, hereby confirm that this Schedule 5/6 medication is issued following a direct real-time telehealth clinical consultation, appropriate diagnostic assessment, and that telehealth supervision requirements have been verified in strict compliance with HPCSA Telemedicine Ethical Guidelines.',
  );
  const [hasConfirmedSupervision, setHasConfirmedSupervision] = useState<boolean>(false);
  const [supervisionChecklist, setSupervisionChecklist] = useState<{
    historyVerified: boolean;
    directAssessment: boolean;
    contraindicationsChecked: boolean;
  }>({
    historyVerified: false,
    directAssessment: false,
    contraindicationsChecked: false,
  });

  // Check if any medication is S5 or S6
  const hasSchedule5or6 = medications.some(
    (m) => m.schedule_flag === 'S5' || m.schedule_flag === 'S6',
  );

  // Fetch consultation & patient context
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoadingConsultation(true);
        if (bookingId && token) {
          const res = await fetch(`${API_BASE}/consultations/${bookingId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (isMounted) {
              setConsultation(data);
              if (data.booking?.patient) {
                setPatient({
                  name: data.booking.patient.fullName || 'Patient',
                  email: data.booking.patient.email || '',
                  phone: data.booking.patient.phone || '',
                });
              }
            }
          }
        }
      } catch (e) {
        console.warn('Consultation fetch notice:', e);
      } finally {
        if (isMounted) setIsLoadingConsultation(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [bookingId, token, API_BASE]);

  // Handle ICD-10 Search Typeahead (BE-704)
  const handleIcd10Search = (val: string) => {
    setIcd10Query(val);
    setShowIcd10Dropdown(true);

    if (icd10DebounceRef.current) clearTimeout(icd10DebounceRef.current);

    if (val.trim().length < 2) {
      setIcd10Results([]);
      return;
    }

    icd10DebounceRef.current = setTimeout(async () => {
      try {
        setIsSearchingIcd10(true);
        const res = await fetch(`${API_BASE}/medical/icd10?q=${encodeURIComponent(val)}&limit=10`);
        if (res.ok) {
          const items = await res.json();
          setIcd10Results(items || []);
        }
      } catch (err) {
        console.warn('ICD10 query error:', err);
      } finally {
        setIsSearchingIcd10(false);
      }
    }, 250);
  };

  const selectIcd10 = (item: Icd10Result) => {
    setSelectedIcd10(item);
    setIcd10Query(`${item.code} — ${item.description}`);
    setShowIcd10Dropdown(false);
  };

  // Handle Medication Search per row (BE-705)
  const handleMedSearch = (rowId: string, query: string) => {
    setActiveSearchRowId(rowId);
    updateMedicationRow(rowId, 'name', query);

    if (medSearchDebounceRef.current) clearTimeout(medSearchDebounceRef.current);

    if (query.trim().length < 2) {
      setMedicationSearchResults([]);
      return;
    }

    medSearchDebounceRef.current = setTimeout(async () => {
      try {
        setIsSearchingMed(true);
        const res = await fetch(`${API_BASE}/medical/medications?q=${encodeURIComponent(query)}&limit=8`);
        if (res.ok) {
          const items = await res.json();
          setMedicationSearchResults(items || []);
        }
      } catch (e) {
        console.warn('Medication search error:', e);
      } finally {
        setIsSearchingMed(false);
      }
    }, 250);
  };

  const selectMedication = (rowId: string, med: MedicationResult) => {
    setMedications((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            name: `${med.name} (${med.strength})`,
            nappi_code: med.nappi_code,
            schedule_flag: med.schedule || 'S4',
            dosage: med.strength || '1 tablet',
          };
        }
        return row;
      }),
    );
    setActiveSearchRowId(null);
    setMedicationSearchResults([]);

    // Check if S5 or S6 is selected
    if (med.schedule === 'S5' || med.schedule === 'S6') {
      setShowSupervisionModal(true);
    }
  };

  const updateMedicationRow = (rowId: string, field: keyof MedicationRow, value: string) => {
    setMedications((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const updated = { ...row, [field]: value };
          if (field === 'schedule_flag' && (value === 'S5' || value === 'S6')) {
            setShowSupervisionModal(true);
          }
          return updated;
        }
        return row;
      }),
    );
  };

  const addMedicationRow = () => {
    const newId = `med-${Date.now()}`;
    setMedications((prev) => [
      ...prev,
      {
        id: newId,
        name: '',
        nappi_code: '',
        schedule_flag: 'S4',
        dosage: '',
        frequency: 'Daily',
        duration: '5 days',
        instructions: '',
      },
    ]);
  };

  const removeMedicationRow = (rowId: string) => {
    if (medications.length <= 1) return;
    setMedications((prev) => prev.filter((r) => r.id !== rowId));
  };

  // Confirm Schedule 5 & 6 Supervision (DP-703)
  const handleConfirmSupervision = () => {
    setHasConfirmedSupervision(true);
    setShowSupervisionModal(false);
  };

  // Submit & Issue Prescription (DP-704, BE-702)
  const handleIssuePrescription = async () => {
    try {
      setSubmitError(null);

      // Validation
      if (!selectedIcd10 && !icd10Query.trim()) {
        setSubmitError('Please select or specify a mandatory South African ICD-10 diagnostic code.');
        setActiveTab('form');
        return;
      }

      const validMeds = medications.filter((m) => m.name.trim().length > 0);
      if (validMeds.length === 0) {
        setSubmitError('Please prescribe at least one medication item.');
        setActiveTab('form');
        return;
      }

      if (hasSchedule5or6 && !hasConfirmedSupervision) {
        setShowSupervisionModal(true);
        setSubmitError('Schedule 5/6 medication selected: You must complete the mandatory Supervision Declaration.');
        return;
      }

      setIsSubmitting(true);

      const icdCode = selectedIcd10 ? selectedIcd10.code : icd10Query.split('—')[0].trim();

      const payload = {
        bookingId: bookingId || consultation?.booking_id,
        consultationId: consultation?.id,
        doctorId: doctor?.id,
        icd10Code: icdCode,
        medications: validMeds.map((m) => ({
          name: m.name,
          dosage: m.dosage || 'As directed',
          duration: m.duration || '5 days',
          instructions: m.instructions || '',
          nappi_code: m.nappi_code || undefined,
          schedule_flag: m.schedule_flag || 'S4',
          frequency: m.frequency || 'Daily',
        })),
        scheduleFlag: hasSchedule5or6 ? 'S5' : 'S4',
        supervisionDeclaration: hasSchedule5or6 ? supervisionDeclarationText : undefined,
      };

      const res = await fetch(`${API_BASE}/prescriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-doctor-id': doctor?.id || 'system-doctor',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to create electronic prescription');
      }

      const saved = await res.json();
      setIssuedPrescription(saved);
      setActiveTab('success');
    } catch (err: any) {
      setSubmitError(err.message || 'Error issuing electronic prescription');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px 16px' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {/* Top Header & Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <Link
              href={`/consultations/${bookingId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#64748b',
                fontSize: '0.85rem',
                textDecoration: 'none',
                marginBottom: '8px',
                fontWeight: 600,
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Consultation Call</span>
            </Link>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              E-Prescription Builder (Rx)
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
              South African HPCSA & Medicines Act (Act 101/1965) compliant digital prescription issuer
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                padding: '6px 12px',
                background: '#e0f2fe',
                color: '#0369a1',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Shield size={14} />
              <span>HPCSA Verified Telehealth</span>
            </span>
          </div>
        </div>

        {/* Patient Summary Header Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '16px 20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <User size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                Consultation Patient
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                {patient.name}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#64748b' }}>Booking ID: </span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {bookingId.substring(0, 8).toUpperCase()}
              </span>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Prescriber: </span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {doctor?.fullName ? `Dr. ${doctor.fullName}` : 'Consulting Doctor'}
              </span>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Date: </span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>
                {new Date().toLocaleDateString('en-ZA')}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation: Form vs Preview */}
        {activeTab !== 'success' && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => setActiveTab('form')}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'form' ? '#0284c7' : '#ffffff',
                color: activeTab === 'form' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeTab === 'form' ? '0 2px 4px rgba(2,132,199,0.2)' : 'none',
              }}
            >
              <Edit3 size={16} />
              <span>1. Prescription Form</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              style={{
                padding: '10px 18px',
                borderRadius: '8px',
                border: 'none',
                background: activeTab === 'preview' ? '#0284c7' : '#ffffff',
                color: activeTab === 'preview' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeTab === 'preview' ? '0 2px 4px rgba(2,132,199,0.2)' : 'none',
              }}
            >
              <Eye size={16} />
              <span>2. Official Rx Document Preview</span>
            </button>
          </div>
        )}

        {submitError && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #f87171',
              color: '#dc2626',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            <AlertTriangle size={18} />
            <span>{submitError}</span>
          </div>
        )}

        {/* TAB 1: FORM BUILDER (DP-702) */}
        {activeTab === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Step 1: ICD-10 Search Section */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Stethoscope size={18} style={{ color: '#0284c7' }} />
                  <span>Mandatory ICD-10 Diagnostic Code (MIT Table)</span>
                  <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  Type condition name or code (e.g., J06.9, R05, K21.9)
                </span>
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', color: '#94a3b8' }} />
                  <input
                    type="text"
                    value={icd10Query}
                    onChange={(e) => handleIcd10Search(e.target.value)}
                    placeholder="Search South African ICD-10 MIT table (e.g. Acute bronchitis, Pharyngitis, Cough)..."
                    style={{
                      width: '100%',
                      padding: '12px 14px 12px 40px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.95rem',
                      color: '#0f172a',
                      outline: 'none',
                    }}
                  />
                  {isSearchingIcd10 && (
                    <Loader2 size={18} className="animate-spin" style={{ position: 'absolute', right: '12px', color: '#0284c7' }} />
                  )}
                </div>

                {/* ICD-10 Typeahead Dropdown */}
                {showIcd10Dropdown && icd10Results.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 30,
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      boxShadow: '0 8px 16px rgba(0,0,0,0.1)',
                      marginTop: '4px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                    }}
                  >
                    {icd10Results.map((item) => (
                      <div
                        key={item.code}
                        onClick={() => selectIcd10(item)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#f8fafc')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#ffffff')}
                      >
                        <div>
                          <span style={{ fontWeight: 800, color: '#0284c7', marginRight: '8px' }}>
                            {item.code}
                          </span>
                          <span style={{ color: '#1e293b', fontSize: '0.9rem' }}>{item.description}</span>
                        </div>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: '#f1f5f9',
                            color: '#64748b',
                          }}
                        >
                          Ch: {item.chapter || 'I'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedIcd10 && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                    <CheckCircle2 size={16} style={{ color: '#059669' }} />
                    <span style={{ fontWeight: 700, color: '#065f46' }}>Selected ICD-10:</span>
                    <span style={{ fontWeight: 800, color: '#0284c7' }}>{selectedIcd10.code}</span>
                    <span style={{ color: '#1e293b' }}>— {selectedIcd10.description}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIcd10(null);
                      setIcd10Query('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Change
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Medication Repeater Section */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                padding: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Prescribed Medication Items (Rx)
                  </h3>
                  <p style={{ color: '#64748b', fontSize: '0.8rem', margin: '4px 0 0 0' }}>
                    MediKredit NAPPI indexed catalog or custom primary care prescription
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addMedicationRow}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    color: '#15803d',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={16} />
                  <span>Add Another Medication</span>
                </button>
              </div>

              {/* Medication Rows */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {medications.map((row, index) => (
                  <div
                    key={row.id}
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0284c7' }}>
                        MEDICATION #{index + 1}
                      </span>
                      {medications.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedicationRow(row.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>

                    {/* Row Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '12px' }}>
                      {/* Name Search (Col 6) */}
                      <div style={{ gridColumn: 'span 6', position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Medication Name & Strength *
                        </label>
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => handleMedSearch(row.id, e.target.value)}
                          placeholder="Search e.g. Augmentin, Panado, Amloc, Xanax..."
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.9rem',
                            background: '#ffffff',
                          }}
                        />

                        {/* Medication Typeahead Dropdown */}
                        {activeSearchRowId === row.id && medicationSearchResults.length > 0 && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              zIndex: 40,
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: '8px',
                              boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                              marginTop: '4px',
                              maxHeight: '200px',
                              overflowY: 'auto',
                            }}
                          >
                            {medicationSearchResults.map((med, i) => (
                              <div
                                key={i}
                                onClick={() => selectMedication(row.id, med)}
                                style={{
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid #f1f5f9',
                                  fontSize: '0.85rem',
                                }}
                                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#f8fafc')}
                                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = '#ffffff')}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 700, color: '#0f172a' }}>{med.name}</span>
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontWeight: 800,
                                      background:
                                        med.schedule === 'S5' || med.schedule === 'S6' ? '#fee2e2' : '#e0f2fe',
                                      color:
                                        med.schedule === 'S5' || med.schedule === 'S6' ? '#b91c1c' : '#0369a1',
                                    }}
                                  >
                                    {med.schedule}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                  NAPPI: {med.nappi_code} • {med.category}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* NAPPI Code (Col 3) */}
                      <div style={{ gridColumn: 'span 3' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          NAPPI Code
                        </label>
                        <input
                          type="text"
                          value={row.nappi_code}
                          onChange={(e) => updateMedicationRow(row.id, 'nappi_code', e.target.value)}
                          placeholder="e.g. 706035001"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            background: '#ffffff',
                          }}
                        />
                      </div>

                      {/* Schedule (Col 3) */}
                      <div style={{ gridColumn: 'span 3' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Schedule Flag *
                        </label>
                        <select
                          value={row.schedule_flag}
                          onChange={(e) => updateMedicationRow(row.id, 'schedule_flag', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            background: '#ffffff',
                            fontWeight: 700,
                            color: row.schedule_flag === 'S5' || row.schedule_flag === 'S6' ? '#dc2626' : '#0f172a',
                          }}
                        >
                          <option value="S0">Schedule 0 (General)</option>
                          <option value="S1">Schedule 1 (Pharmacy)</option>
                          <option value="S2">Schedule 2 (Behind Counter)</option>
                          <option value="S3">Schedule 3 (Chronic Care)</option>
                          <option value="S4">Schedule 4 (Prescription Rx)</option>
                          <option value="S5">Schedule 5 (Sedative / Anxiolytic)</option>
                          <option value="S6">Schedule 6 (Narcotic / Controlled)</option>
                        </select>
                      </div>

                      {/* Dosage (Col 4) */}
                      <div style={{ gridColumn: 'span 4' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Dosage / Quantity *
                        </label>
                        <input
                          type="text"
                          value={row.dosage}
                          onChange={(e) => updateMedicationRow(row.id, 'dosage', e.target.value)}
                          placeholder="e.g. 1 tablet, 500mg, 10ml"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            background: '#ffffff',
                          }}
                        />
                      </div>

                      {/* Frequency (Col 4) */}
                      <div style={{ gridColumn: 'span 4' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Frequency
                        </label>
                        <select
                          value={row.frequency}
                          onChange={(e) => updateMedicationRow(row.id, 'frequency', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            background: '#ffffff',
                          }}
                        >
                          <option value="Daily">Daily (Once a day)</option>
                          <option value="12-hourly">12-hourly (Twice a day - BD)</option>
                          <option value="8-hourly">8-hourly (Three times a day - TDS)</option>
                          <option value="6-hourly">6-hourly (Four times a day - QDS)</option>
                          <option value="At night">At night (Nocte)</option>
                          <option value="As needed (PRN)">As needed (PRN)</option>
                        </select>
                      </div>

                      {/* Duration (Col 4) */}
                      <div style={{ gridColumn: 'span 4' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Duration
                        </label>
                        <input
                          type="text"
                          value={row.duration}
                          onChange={(e) => updateMedicationRow(row.id, 'duration', e.target.value)}
                          placeholder="e.g. 5 days, 1 month, 30 days"
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            background: '#ffffff',
                          }}
                        />
                      </div>

                      {/* Special Instructions (Col 12) */}
                      <div style={{ gridColumn: 'span 12' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                          Special Instructions / Food & Alcohol Warnings
                        </label>
                        <input
                          type="text"
                          value={row.instructions}
                          onChange={(e) => updateMedicationRow(row.id, 'instructions', e.target.value)}
                          placeholder="e.g. Take immediately after meals; complete full course; avoid driving or alcohol."
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            background: '#ffffff',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Schedule 5/6 Status Warning Banner */}
            {hasSchedule5or6 && (
              <div
                style={{
                  background: hasConfirmedSupervision ? '#f0fdf4' : '#fef2f2',
                  border: `1.5px solid ${hasConfirmedSupervision ? '#86efac' : '#fca5a5'}`,
                  borderRadius: '12px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Shield size={24} style={{ color: hasConfirmedSupervision ? '#16a34a' : '#dc2626' }} />
                  <div>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        color: hasConfirmedSupervision ? '#15803d' : '#991b1b',
                      }}
                    >
                      {hasConfirmedSupervision
                        ? 'Schedule 5/6 Telehealth Supervision Verified & Signed'
                        : 'Controlled Substance Alert (Schedule 5/6) — Action Required'}
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: hasConfirmedSupervision ? '#166534' : '#7f1d1d' }}>
                      {hasConfirmedSupervision
                        ? 'Compliance declaration recorded for statutory audit review.'
                        : 'HPCSA regulations strictly require a completed Supervision Declaration before issuance.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSupervisionModal(true)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: hasConfirmedSupervision ? '#ffffff' : '#dc2626',
                    border: `1px solid ${hasConfirmedSupervision ? '#86efac' : '#b91c1c'}`,
                    color: hasConfirmedSupervision ? '#15803d' : '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  {hasConfirmedSupervision ? 'Review Declaration' : 'Sign Declaration (Required)'}
                </button>
              </div>
            )}

            {/* Bottom Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  background: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(2,132,199,0.3)',
                }}
              >
                <span>Proceed to Document Preview</span>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: DOCUMENT PREVIEW (DP-704) */}
        {activeTab === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Visual Prescription Sheet Representation */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #cbd5e1',
                padding: '36px 40px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {/* Header */}
              <div
                style={{
                  borderBottom: '2px solid #0284c7',
                  paddingBottom: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0284c7', margin: 0, letterSpacing: '-0.02em' }}>
                    CHEKUP247 TELEHEALTH
                  </h2>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                    HPCSA Telemedicine Accredited Virtual Practice • PR 0998822
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a' }}>
                    OFFICIAL ELECTRONIC PRESCRIPTION
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                    Date: {new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Doctor & Patient Context Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', margin: '20px 0' }}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                    Prescribing Practitioner
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    {doctor?.fullName ? `Dr. ${doctor.fullName}` : 'Dr. ChekUp247'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                    HPCSA Reg: {profile?.hpcsaNumber || 'MP 0789012'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    Specialty: {profile?.specialty || 'General Practitioner'}
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase' }}>
                    Patient Details
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                    {patient.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px' }}>
                    Contact: {patient.email || patient.phone || 'On file'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    Session Ref: {bookingId.substring(0, 10).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Diagnosis Box */}
              <div
                style={{
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#0369a1', textTransform: 'uppercase' }}>
                    Primary Clinical Diagnosis (Mandatory ICD-10 MIT)
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    {selectedIcd10 ? `${selectedIcd10.code} — ${selectedIcd10.description}` : icd10Query || 'Not specified'}
                  </div>
                </div>
                {hasSchedule5or6 && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#dc2626', background: '#fee2e2', padding: '4px 8px', borderRadius: '6px' }}>
                    Contains Schedule 5/6 Substance
                  </span>
                )}
              </div>

              {/* Medication Table Preview */}
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1', textAlign: 'left', fontSize: '0.8rem', color: '#475569' }}>
                    <th style={{ padding: '10px' }}>ITEM & MEDICATION</th>
                    <th style={{ padding: '10px' }}>NAPPI</th>
                    <th style={{ padding: '10px' }}>SCHED</th>
                    <th style={{ padding: '10px' }}>DOSAGE & FREQUENCY</th>
                    <th style={{ padding: '10px' }}>DURATION</th>
                  </tr>
                </thead>
                <tbody>
                  {medications.map((item, idx) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>
                          {idx + 1}. {item.name || 'Unnamed medication'}
                        </div>
                        {item.instructions && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '2px' }}>
                            Instr: {item.instructions}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px', color: '#64748b', fontSize: '0.8rem' }}>{item.nappi_code || '—'}</td>
                      <td style={{ padding: '10px' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: item.schedule_flag === 'S5' || item.schedule_flag === 'S6' ? '#fee2e2' : '#f1f5f9',
                            color: item.schedule_flag === 'S5' || item.schedule_flag === 'S6' ? '#b91c1c' : '#334155',
                          }}
                        >
                          {item.schedule_flag}
                        </span>
                      </td>
                      <td style={{ padding: '10px', fontWeight: 600, color: '#1e293b' }}>
                        {item.dosage || '1 dose'} ({item.frequency})
                      </td>
                      <td style={{ padding: '10px', color: '#1e293b' }}>{item.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Schedule 5/6 Declaration Block in Preview */}
              {hasSchedule5or6 && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1.5px solid #fde68a',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    marginBottom: '24px',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#b45309', marginBottom: '4px' }}>
                    MANDATORY SCHEDULE 5 & 6 TELEHEALTH SUPERVISION DECLARATION
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#78350f', lineHeight: 1.5 }}>
                    {supervisionDeclarationText}
                  </div>
                </div>
              )}

              {/* Doctor Electronic Seal & Signature Box */}
              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0284c7' }}>
                    DIGITALLY CERTIFIED MEDICAL PRACTITIONER
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
                    Dr. {doctor?.fullName || 'Practitioner'} (HPCSA: {profile?.hpcsaNumber || 'MP 0789012'})
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                    Tamper-Evident SHA-256 Digital Verification Token Generated on Issuance
                  </div>
                </div>

                <div
                  style={{
                    border: '2px dashed #0284c7',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    background: '#f0f9ff',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#0284c7' }}>CHEKUP247</div>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#0369a1' }}>DIGITAL RX SEAL</div>
                </div>
              </div>
            </div>

            {/* Preview Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setActiveTab('form')}
                style={{
                  padding: '12px 20px',
                  borderRadius: '10px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <ArrowLeft size={16} />
                <span>Back to Edit Form</span>
              </button>

              <button
                type="button"
                onClick={handleIssuePrescription}
                disabled={isSubmitting}
                style={{
                  padding: '14px 28px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  fontWeight: 900,
                  fontSize: '1rem',
                  border: 'none',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 4px 16px rgba(2,132,199,0.35)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Generating Signed PDF & Issuing...</span>
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    <span>Sign & Issue Electronic Prescription</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: SUCCESS CONFIRMATION (DP-704) */}
        {activeTab === 'success' && issuedPrescription && (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '40px 32px',
              border: '1px solid #e2e8f0',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            }}
          >
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <CheckCircle2 size={44} />
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0' }}>
              E-Prescription Successfully Issued!
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '500px', margin: '0 auto 24px' }}>
              The signed e-prescription has been cryptographically generated, archived in secure object storage,
              and made immediately available in the patient portal.
            </p>

            <div
              style={{
                background: '#f8fafc',
                borderRadius: '10px',
                padding: '16px',
                maxWidth: '400px',
                margin: '0 auto 28px',
                textAlign: 'left',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Prescription ID:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{issuedPrescription.id.substring(0, 12).toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Diagnostic ICD-10:</span>
                <span style={{ fontWeight: 800, color: '#0284c7' }}>{issuedPrescription.icd10_code}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Status:</span>
                <span style={{ fontWeight: 800, color: '#16a34a' }}>Valid & Tamper-Evident</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
              <a
                href={`${API_BASE}/prescriptions/${issuedPrescription.id}/download`}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '12px 22px',
                  borderRadius: '8px',
                  background: '#0284c7',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(2,132,199,0.25)',
                }}
              >
                <Download size={18} />
                <span>Download Signed PDF</span>
              </a>

              <Link
                href="/appointments"
                style={{
                  padding: '12px 22px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                }}
              >
                Return to Appointments
              </Link>
            </div>
          </div>
        )}

        {/* DP-703: Schedule 5 & 6 Supervision Declaration Modal */}
        {showSupervisionModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background: 'rgba(15, 23, 42, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '28px',
                maxWidth: '600px',
                width: '100%',
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Shield size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                    Schedule 5 & 6 Telehealth Supervision Declaration
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#dc2626', fontWeight: 700 }}>
                    Mandatory compliance under HPCSA Telemedicine Ethical Guidelines
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, marginBottom: '16px' }}>
                Under South African medical law (Medicines and Related Substances Act, 1965), Schedule 5 & 6
                substances issued via telemedicine require a verified practitioner clinical declaration to be
                appended to the prescription and recorded in the audit log.
              </p>

              {/* Statutory Confirmation Checklist */}
              <div
                style={{
                  background: '#f8fafc',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.85rem', color: '#1e293b', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={supervisionChecklist.historyVerified}
                    onChange={(e) =>
                      setSupervisionChecklist((p) => ({ ...p, historyVerified: e.target.checked }))
                    }
                    style={{ marginTop: '2px' }}
                  />
                  <span>I have verified the patient's medical history, current medications, and past substance reactions.</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.85rem', color: '#1e293b', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={supervisionChecklist.directAssessment}
                    onChange={(e) =>
                      setSupervisionChecklist((p) => ({ ...p, directAssessment: e.target.checked }))
                    }
                    style={{ marginTop: '2px' }}
                  />
                  <span>I conducted a direct real-time interactive assessment of the patient during this consultation.</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.85rem', color: '#1e293b', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={supervisionChecklist.contraindicationsChecked}
                    onChange={(e) =>
                      setSupervisionChecklist((p) => ({ ...p, contraindicationsChecked: e.target.checked }))
                    }
                    style={{ marginTop: '2px' }}
                  />
                  <span>I confirm the prescribed quantity does not exceed statutory limits and I accept full supervision responsibility.</span>
                </label>
              </div>

              {/* Editable Declaration Statement */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                  Declaration Text (Appears on Official Prescription & Audit Ledger)
                </label>
                <textarea
                  value={supervisionDeclarationText}
                  onChange={(e) => setSupervisionDeclarationText(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    color: '#334155',
                    background: '#ffffff',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowSupervisionModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: '#f1f5f9',
                    border: 'none',
                    color: '#475569',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSupervision}
                  disabled={
                    !supervisionChecklist.historyVerified ||
                    !supervisionChecklist.directAssessment ||
                    !supervisionChecklist.contraindicationsChecked
                  }
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background:
                      supervisionChecklist.historyVerified &&
                      supervisionChecklist.directAssessment &&
                      supervisionChecklist.contraindicationsChecked
                        ? '#dc2626'
                        : '#cbd5e1',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    border: 'none',
                    cursor:
                      supervisionChecklist.historyVerified &&
                      supervisionChecklist.directAssessment &&
                      supervisionChecklist.contraindicationsChecked
                        ? 'pointer'
                        : 'not-allowed',
                  }}
                >
                  Sign & Confirm Supervision Declaration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
