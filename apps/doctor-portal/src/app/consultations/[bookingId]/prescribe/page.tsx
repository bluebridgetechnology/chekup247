'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useDoctorAuth } from '../../../../context/DoctorAuthContext';
import { toastSuccess, toastError, errorMessage } from '../../../../lib/toast';
import { SolarIcon } from '../../../../components/common/SolarIcon';

interface Icd10Result {
  code: string;
  description: string;
  chapter?: string;
  is_valid_primary?: boolean;
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

const FREQUENCY_OPTIONS = [
  { label: 'Daily (Once a day)', val: 'Once daily' },
  { label: '12-hourly (BD - Twice daily)', val: '12-hourly (BD)' },
  { label: '8-hourly (TDS - Three times daily)', val: '8-hourly (TDS)' },
  { label: '6-hourly (QDS - Four times daily)', val: '6-hourly (QDS)' },
  { label: 'At night (Nocte)', val: 'At night (Nocte)' },
  { label: 'As needed (PRN)', val: 'As needed (PRN)' },
];

const DURATION_PRESETS = ['3 days', '5 days', '7 days', '10 days', '14 days', '30 days (1 month)'];

const cleanDoctorName = (name?: string) => {
  if (!name) return 'Dr. Practitioner';
  return name.startsWith('Dr.') || name.startsWith('Dr ') ? name : `Dr. ${name}`;
};

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
    name: 'Sipho Sithole',
    email: 'sipho.sithole@example.co.za',
    phone: '+27 82 555 1234',
  });

  // Step / Tab State: 'form' (Step 1 & 2) | 'preview' (Step 3) | 'success'
  const [activeStep, setActiveStep] = useState<number>(1);
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

  // Symptoms & Clinical Presentation
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomInput, setSymptomInput] = useState<string>('');

  const addSymptom = (sym: string) => {
    const trimmed = sym.trim();
    if (!trimmed) return;
    if (!symptoms.includes(trimmed)) {
      setSymptoms((prev) => [...prev, trimmed]);
    }
    setSymptomInput('');
  };

  const removeSymptom = (sym: string) => {
    setSymptoms((prev) => prev.filter((s) => s !== sym));
  };

  // 2. Medication Repeater Items
  const [medications, setMedications] = useState<MedicationRow[]>([
    {
      id: 'med-1',
      name: 'Amoxicillin / Clavulanic Acid 1000mg',
      nappi_code: '706035001',
      schedule_flag: 'S4',
      dosage: '1 tablet (1000mg)',
      frequency: '12-hourly (BD)',
      duration: '5 days',
      instructions: 'Take with food or a large glass of water. Complete full course.',
    },
  ]);

  // Medication search per row
  const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(null);
  const [medicationSearchResults, setMedicationSearchResults] = useState<MedicationResult[]>([]);
  const [isSearchingMed, setIsSearchingMed] = useState<boolean>(false);
  const medSearchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Medication Sidesheet State (DP-704)
  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);

  // Close sidesheet on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingMedicationId) {
        setEditingMedicationId(null);
        setActiveSearchRowId(null);
        setMedicationSearchResults([]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingMedicationId]);

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
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            if (isMounted) {
              setConsultation(data);
              const p = data.patient || data.booking?.patient;
              if (p) {
                setPatient({
                  name: p.fullName || p.name || 'Patient',
                  email: p.email || '',
                  phone: p.phone || '',
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

  // Handle ICD-10 Search Typeahead
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
        } else {
          // Local SA common ICD-10 fallback
          const common = [
            { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', chapter: 'X', is_valid_primary: true },
            { code: 'I10', description: 'Essential (primary) hypertension', chapter: 'IX', is_valid_primary: true },
            { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', chapter: 'IV', is_valid_primary: true },
            { code: 'J45.9', description: 'Asthma, unspecified', chapter: 'X', is_valid_primary: true },
            { code: 'K21.9', description: 'Gastro-oesophageal reflux disease without oesophagitis [GERD]', chapter: 'XI', is_valid_primary: true },
            { code: 'M54.5', description: 'Low back pain / Lumbago', chapter: 'XIII', is_valid_primary: true },
            { code: 'R05', description: 'Cough', chapter: 'XVIII', is_valid_primary: true },
            { code: 'R51', description: 'Headache', chapter: 'XVIII', is_valid_primary: true },
          ].filter(
            (c) =>
              c.code.toLowerCase().includes(val.toLowerCase()) ||
              c.description.toLowerCase().includes(val.toLowerCase()),
          );
          setIcd10Results(common);
        }
      } catch (err) {
        console.warn('ICD10 query notice:', err);
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

  // Handle Medication Name Typeahead Search
  const handleMedicationSearch = (rowId: string, val: string) => {
    updateMedicationRow(rowId, 'name', val);
    setActiveSearchRowId(rowId);

    if (medSearchDebounceRef.current) clearTimeout(medSearchDebounceRef.current);

    if (val.trim().length < 2) {
      setMedicationSearchResults([]);
      return;
    }

    medSearchDebounceRef.current = setTimeout(async () => {
      try {
        setIsSearchingMed(true);
        const res = await fetch(`${API_BASE}/medical/medications?q=${encodeURIComponent(val)}&limit=8`);
        if (res.ok) {
          const items = await res.json();
          setMedicationSearchResults(items || []);
        } else {
          // SA Formulary fallback presets
          const localMeds: MedicationResult[] = [
            { name: 'Amoxicillin / Clavulanic Acid 1000mg', generic_name: 'Co-Amoxiclav', nappi_code: '706035001', schedule: 'S4', dosage_form: 'Tablet', strength: '1000mg', category: 'Antibiotic', is_controlled: false },
            { name: 'Azithromycin 500mg', generic_name: 'Azithromycin', nappi_code: '705423001', schedule: 'S4', dosage_form: 'Film-coated tablet', strength: '500mg', category: 'Antibiotic', is_controlled: false },
            { name: 'Paracetamol 500mg', generic_name: 'Acetaminophen', nappi_code: '754123001', schedule: 'S0', dosage_form: 'Tablet', strength: '500mg', category: 'Analgesic', is_controlled: false },
            { name: 'Ibuprofen 400mg', generic_name: 'Ibuprofen', nappi_code: '732156001', schedule: 'S2', dosage_form: 'Tablet', strength: '400mg', category: 'NSAID', is_controlled: false },
            { name: 'Salbutamol Inhaler 100mcg', generic_name: 'Salbutamol', nappi_code: '772189001', schedule: 'S2', dosage_form: 'Aerosol Inhalation', strength: '100mcg/dose', category: 'Bronchodilator', is_controlled: false },
            { name: 'Amlodipine 5mg', generic_name: 'Amlodipine Besylate', nappi_code: '712490001', schedule: 'S3', dosage_form: 'Tablet', strength: '5mg', category: 'Antihypertensive', is_controlled: false },
            { name: 'Metformin 850mg', generic_name: 'Metformin HCl', nappi_code: '741289001', schedule: 'S3', dosage_form: 'Tablet', strength: '850mg', category: 'Antidiabetic', is_controlled: false },
            { name: 'Zolpidem Hemitartrate 10mg', generic_name: 'Zolpidem', nappi_code: '789123001', schedule: 'S5', dosage_form: 'Tablet', strength: '10mg', category: 'Hypnotic', is_controlled: true },
            { name: 'Methylphenidate HCl 10mg', generic_name: 'Methylphenidate', nappi_code: '799456001', schedule: 'S6', dosage_form: 'Tablet', strength: '10mg', category: 'CNS Stimulant', is_controlled: true },
          ].filter(
            (m) =>
              m.name.toLowerCase().includes(val.toLowerCase()) ||
              m.generic_name.toLowerCase().includes(val.toLowerCase()) ||
              m.nappi_code.includes(val),
          );
          setMedicationSearchResults(localMeds);
        }
      } catch (err) {
        console.warn('Medication search notice:', err);
      } finally {
        setIsSearchingMed(false);
      }
    }, 200);
  };

  const selectMedication = (rowId: string, med: MedicationResult) => {
    setMedications((prev) =>
      prev.map((r) => {
        if (r.id === rowId) {
          return {
            ...r,
            name: med.name,
            nappi_code: med.nappi_code,
            schedule_flag: med.schedule || 'S4',
            dosage: r.dosage || `1 ${med.dosage_form.toLowerCase()}`,
          };
        }
        return r;
      }),
    );
    setActiveSearchRowId(null);
    setMedicationSearchResults([]);
  };

  // Add & Remove Medication rows & Sidesheet Handlers
  const openEditSidesheet = (id: string) => {
    setEditingMedicationId(id);
    setActiveSearchRowId(null);
    setMedicationSearchResults([]);
  };

  const addMedicationAndOpenSidesheet = () => {
    const newId = `med-${Date.now()}`;
    setMedications((prev) => [
      ...prev,
      {
        id: newId,
        name: '',
        nappi_code: '',
        schedule_flag: 'S4',
        dosage: '1 tablet',
        frequency: 'Once daily',
        duration: '5 days',
        instructions: '',
      },
    ]);
    setEditingMedicationId(newId);
    setActiveSearchRowId(null);
    setMedicationSearchResults([]);
  };

  const closeSidesheet = () => {
    setEditingMedicationId(null);
    setActiveSearchRowId(null);
    setMedicationSearchResults([]);
  };

  const addMedicationRow = () => {
    addMedicationAndOpenSidesheet();
  };

  const removeMedicationRow = (id: string) => {
    if (editingMedicationId === id) {
      setEditingMedicationId(null);
    }
    if (medications.length <= 1) {
      setMedications([
        {
          id: `med-${Date.now()}`,
          name: '',
          nappi_code: '',
          schedule_flag: 'S4',
          dosage: '1 tablet',
          frequency: 'Once daily',
          duration: '5 days',
          instructions: '',
        },
      ]);
      return;
    }
    setMedications((prev) => prev.filter((r) => r.id !== id));
  };

  const updateMedicationRow = (id: string, field: keyof MedicationRow, value: string) => {
    setMedications((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  };

  const activeMedication = medications.find((m) => m.id === editingMedicationId) || null;
  const activeMedicationIndex = medications.findIndex((m) => m.id === editingMedicationId);

  // Schedule 5/6 Verification confirm
  const handleConfirmSupervision = () => {
    if (
      supervisionChecklist.historyVerified &&
      supervisionChecklist.directAssessment &&
      supervisionChecklist.contraindicationsChecked
    ) {
      setHasConfirmedSupervision(true);
      setShowSupervisionModal(false);
      setSubmitError(null);
    }
  };

  // Submit & Issue Prescription
  const handleIssuePrescription = async () => {
    try {
      setSubmitError(null);

      if (!selectedIcd10 && !icd10Query.trim()) {
        setSubmitError('Please select or specify a mandatory South African ICD-10 diagnostic code.');
        setActiveTab('form');
        setActiveStep(1);
        return;
      }

      const validMeds = medications.filter((m) => m.name.trim().length > 0);
      if (validMeds.length === 0) {
        setSubmitError('Please prescribe at least one medication item.');
        setActiveTab('form');
        setActiveStep(2);
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
        symptoms: symptoms,
        clinicalNotes: symptoms.length > 0 ? `Symptoms: ${symptoms.join(', ')}` : undefined,
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
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to create electronic prescription');
      }

      const saved = await res.json();
      setIssuedPrescription(saved);
      setActiveTab('success');
      toastSuccess('Prescription issued', 'The patient has been notified.');
    } catch (err: any) {
      const msg = errorMessage(err, 'Error issuing electronic prescription');
      setSubmitError(msg);
      toastError('Could not issue prescription', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const prescriberName = cleanDoctorName(doctor?.fullName);
  const hpcsaReg = profile?.hpcsaNumber || 'MP 0689432';

  return (
    <div className="prescribe-page" style={{ minHeight: '100vh', background: 'var(--color-cream-base, #FAF6EE)', padding: '24px 16px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: '1080px', margin: '0 auto', width: '100%' }}>
        {/* Top Header & Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
          <div>
            <Link
              href={`/consultations/${bookingId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--color-cream-text-muted, #6B5E55)',
                fontSize: '0.85rem',
                textDecoration: 'none',
                marginBottom: '8px',
                fontWeight: 600,
                transition: 'color 0.15s',
              }}
            >
              <SolarIcon name="arrow-left-linear" size={16} color="var(--color-cream-text-muted, #6B5E55)" />
              <span>Back to Live Consultation Suite</span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <SolarIcon name="document-medicine-linear" size={26} color="var(--color-gold-bronze, #B88647)" />
              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  color: 'var(--color-chocolate-base, #2A170F)',
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                E-Prescription Builder (Rx)
              </h1>
            </div>
            <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.875rem', margin: '6px 0 0 0' }}>
              South African HPCSA &amp; Medicines Act (Act 101/1965) compliant digital prescription stationary
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                padding: '6px 14px',
                background: 'var(--color-gold-pale, #F0E5D3)',
                color: 'var(--color-chocolate-base, #2A170F)',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(223, 171, 98, 0.4)',
              }}
            >
              <SolarIcon name="shield-check-linear" size={15} color="var(--color-gold-bronze, #B88647)" />
              <span>HPCSA Telemedicine Verified</span>
            </span>
          </div>
        </div>

        {/* Numbered Step Progress Header Matching Patient System */}
        {activeTab !== 'success' && (
          <div
            className="portal-card prescribe-steps-container"
            style={{
              padding: '16px 20px',
              marginBottom: '22px',
            }}
          >
            <div
              className="prescribe-steps-inner"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {/* Step 1 */}
              <div
                onClick={() => {
                  setActiveTab('form');
                  setActiveStep(1);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background:
                      activeStep === 1
                        ? 'var(--color-gold-primary, #E2B467)'
                        : selectedIcd10 || icd10Query
                        ? 'var(--color-chocolate-base, #2A170F)'
                        : 'var(--color-gold-pale, #F0E5D3)',
                    color:
                      activeStep === 1
                        ? 'var(--color-chocolate-base, #2A170F)'
                        : selectedIcd10 || icd10Query
                        ? '#ffffff'
                        : 'var(--color-chocolate-base, #2A170F)',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: activeStep === 1 ? '2px solid var(--color-gold-base, #DFAB62)' : 'none',
                  }}
                >
                  1
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                    Mandatory Diagnostic ICD-10
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                    Primary Diagnosis &amp; Symptoms
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', flex: 1, background: 'rgba(223, 171, 98, 0.3)', margin: '0 16px', minWidth: '24px' }} />

              {/* Step 2 */}
              <div
                onClick={() => {
                  setActiveTab('form');
                  setActiveStep(2);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background:
                      activeStep === 2
                        ? 'var(--color-gold-primary, #E2B467)'
                        : medications.length > 0 && medications[0].name
                        ? 'var(--color-chocolate-base, #2A170F)'
                        : 'var(--color-gold-pale, #F0E5D3)',
                    color:
                      activeStep === 2
                        ? 'var(--color-chocolate-base, #2A170F)'
                        : medications.length > 0 && medications[0].name
                        ? '#ffffff'
                        : 'var(--color-chocolate-base, #2A170F)',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: activeStep === 2 ? '2px solid var(--color-gold-base, #DFAB62)' : 'none',
                  }}
                >
                  2
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                    Medication Items (Rx)
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                    NAPPI Code &amp; Presets
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', flex: 1, background: 'rgba(223, 171, 98, 0.3)', margin: '0 16px', minWidth: '24px' }} />

              {/* Step 3 */}
              <div
                onClick={() => {
                  setActiveTab('preview');
                  setActiveStep(3);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background:
                      activeStep === 3
                        ? 'var(--color-gold-primary, #E2B467)'
                        : 'var(--color-gold-pale, #F0E5D3)',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: activeStep === 3 ? '2px solid var(--color-gold-base, #DFAB62)' : 'none',
                  }}
                >
                  3
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                    Stationary &amp; Signature
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                    Official SA Medical PDF
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patient Summary Header Card (Clean - No Avatar Circle) */}
        <div
          className="portal-card"
          style={{
            padding: '16px 20px',
            marginBottom: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-cream-text-muted, #6B5E55)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Consultation Patient
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', marginTop: '2px' }}>
              {patient.name}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px 24px', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: 'var(--color-cream-text-muted, #6B5E55)' }}>Booking ID: </span>
              <span style={{ fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', fontFamily: 'monospace' }}>
                #{bookingId ? bookingId.substring(0, 8).toUpperCase() : 'N/A'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--color-cream-text-muted, #6B5E55)' }}>Prescriber: </span>
              <span style={{ fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                {prescriberName}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--color-cream-text-muted, #6B5E55)' }}>HPCSA: </span>
              <span style={{ fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                {hpcsaReg}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--color-cream-text-muted, #6B5E55)' }}>Date: </span>
              <span style={{ fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                {new Date().toLocaleDateString('en-ZA')}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selection: Form vs Preview */}
        {activeTab !== 'success' && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('form');
                setActiveStep(1);
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '9999px',
                border: activeTab === 'form' ? 'none' : '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
                background: activeTab === 'form' ? 'var(--color-chocolate-base, #2A170F)' : 'var(--color-cream-surface, #FDFBF7)',
                color: activeTab === 'form' ? '#ffffff' : 'var(--color-chocolate-base, #2A170F)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <SolarIcon name="pen-new-square-linear" size={16} color={activeTab === 'form' ? '#DFAB62' : 'var(--color-chocolate-base, #2A170F)'} />
              <span>1. Prescription Form &amp; Items</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('preview');
                setActiveStep(3);
              }}
              style={{
                padding: '10px 20px',
                borderRadius: '9999px',
                border: activeTab === 'preview' ? 'none' : '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
                background: activeTab === 'preview' ? 'var(--color-chocolate-base, #2A170F)' : 'var(--color-cream-surface, #FDFBF7)',
                color: activeTab === 'preview' ? '#ffffff' : 'var(--color-chocolate-base, #2A170F)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <SolarIcon name="eye-linear" size={16} color={activeTab === 'preview' ? '#DFAB62' : 'var(--color-chocolate-base, #2A170F)'} />
              <span>2. Official SA Medical Stationary Preview</span>
            </button>
          </div>
        )}

        {submitError && (
          <div
            style={{
              padding: '14px 18px',
              borderRadius: '12px',
              background: '#fef2f2',
              border: '1.5px solid #f87171',
              color: '#991b1b',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            <SolarIcon name="danger-circle-linear" size={18} color="#dc2626" />
            <span>{submitError}</span>
          </div>
        )}

        {/* ======================================================================
            TAB 1: FORM BUILDER
            ====================================================================== */}
        {activeTab === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Step 1: ICD-10 Search & Symptoms Section */}
            <div className="portal-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <label className="portal-label" style={{ fontSize: '0.95rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                    <SolarIcon name="stethoscope-linear" size={18} color="var(--color-gold-base, #DFAB62)" />
                    <span>Mandatory Diagnostic ICD-10</span>
                    <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                    Select primary diagnosis code and document patient presentation.
                  </p>
                </div>
                <Link
                  href="/icd10"
                  target="_blank"
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>ICD-10 Helper</span>
                  <SolarIcon name="link-broken-linear" size={13} color="var(--color-chocolate-base, #2A170F)" />
                </Link>
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: '14px', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                    <SolarIcon name="magnifer-linear" size={18} color="var(--color-gold-base, #DFAB62)" />
                  </span>
                  <input
                    type="text"
                    value={icd10Query}
                    onChange={(e) => handleIcd10Search(e.target.value)}
                    placeholder="Search diagnosis or ICD-10 code (e.g. Hypertension, J06.9, Acute bronchitis)..."
                    className="portal-input"
                    style={{ paddingLeft: '44px' }}
                  />
                  {isSearchingIcd10 && (
                    <span style={{ position: 'absolute', right: '14px', display: 'flex', alignItems: 'center' }}>
                      <SolarIcon name="refresh-linear" size={18} color="var(--color-gold-base, #DFAB62)" style={{ animation: 'spin 1s linear infinite' }} />
                    </span>
                  )}
                </div>

                {/* ICD-10 Results Dropdown */}
                {showIcd10Dropdown && icd10Results.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 50,
                      background: 'var(--color-cream-surface, #FDFBF7)',
                      border: '1.5px solid var(--color-gold-base, #DFAB62)',
                      borderRadius: '12px',
                      boxShadow: '0 12px 28px rgba(42, 23, 15, 0.15)',
                      marginTop: '6px',
                      maxHeight: '260px',
                      overflowY: 'auto',
                    }}
                  >
                    {icd10Results.map((item) => (
                      <div
                        key={item.code}
                        onClick={() => selectIcd10(item)}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          borderBottom: '1px solid rgba(223, 171, 98, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px',
                        }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-gold-pale, #F0E5D3)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontWeight: 800,
                                fontSize: '0.88rem',
                                color: 'var(--color-chocolate-base, #2A170F)',
                                background: 'rgba(223, 171, 98, 0.2)',
                                padding: '2px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              {item.code}
                            </span>
                            {item.chapter && (
                              <span style={{ fontSize: '0.725rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                                Chapter {item.chapter}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-chocolate-base, #2A170F)', marginTop: '3px' }}>
                            {item.description}
                          </div>
                        </div>

                        <span className="badge-gold" style={{ flexShrink: 0 }}>Select</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedIcd10 && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--color-gold-pale, #F0E5D3)',
                    border: '1px solid rgba(223, 171, 98, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <SolarIcon name="check-circle-linear" size={16} color="#059669" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Primary Code: [{selectedIcd10.code}] {selectedIcd10.description}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedIcd10(null)}
                    style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Symptoms & Clinical Findings (Multi-Symptom Support) */}
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(223, 171, 98, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
                  <label className="portal-label" style={{ fontSize: '0.85rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Symptoms &amp; Clinical Findings</span>
                    {symptoms.length > 0 && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          background: 'var(--color-gold-pale, #F0E5D3)',
                          color: 'var(--color-chocolate-base, #2A170F)',
                        }}
                      >
                        {symptoms.length}
                      </span>
                    )}
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                    Add multiple patient symptoms or presentation signs
                  </span>
                </div>

                {/* Symptoms Input */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    value={symptomInput}
                    onChange={(e) => setSymptomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSymptom(symptomInput);
                      }
                    }}
                    placeholder="Type a symptom and press Enter (e.g. Dry cough, Fever, Severe headache)..."
                    className="portal-input"
                    style={{ height: '40px', fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => addSymptom(symptomInput)}
                    className="btn-secondary"
                    style={{ padding: '0 16px', height: '40px', fontSize: '0.825rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <SolarIcon name="add-circle-linear" size={15} color="var(--color-chocolate-base, #2A170F)" />
                    <span>Add</span>
                  </button>
                </div>

                {/* Quick Suggestion Chips */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: symptoms.length > 0 ? '12px' : '0' }}>
                  {[
                    'Cough',
                    'Fever',
                    'Headache',
                    'Sore throat',
                    'Fatigue',
                    'Body aches',
                    'Nausea',
                    'Nasal congestion',
                    'Shortness of breath',
                  ].map((chip) => {
                    const isSelected = symptoms.includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => (isSelected ? removeSymptom(chip) : addSymptom(chip))}
                        style={{
                          padding: '3px 9px',
                          borderRadius: '6px',
                          border: isSelected
                            ? '1px solid var(--color-gold-base, #DFAB62)'
                            : '1px solid rgba(223, 171, 98, 0.25)',
                          background: isSelected ? 'var(--color-gold-pale, #F0E5D3)' : 'var(--color-cream-surface, #FDFBF7)',
                          color: 'var(--color-chocolate-base, #2A170F)',
                          fontSize: '0.725rem',
                          fontWeight: isSelected ? 800 : 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{isSelected ? '✓ ' + chip : '+ ' + chip}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Added Symptoms Tags List */}
                {symptoms.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {symptoms.map((sym) => (
                      <span
                        key={sym}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'var(--color-chocolate-base, #2A170F)',
                          color: '#ffffff',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                        }}
                      >
                        <span>{sym}</span>
                        <button
                          type="button"
                          onClick={() => removeSymptom(sym)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ffffff',
                            cursor: 'pointer',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            opacity: 0.8,
                          }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.8')}
                        >
                          <SolarIcon name="close-circle-linear" size={13} color="#ffffff" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: Medication Items List (Sane, Clean & Compact) */}
            <div className="portal-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3
                      style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: 'var(--color-chocolate-base, #2A170F)',
                        margin: 0,
                      }}
                    >
                      Prescribed Medication Items (Rx Formulary)
                    </h3>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        background: 'var(--color-gold-pale, #F0E5D3)',
                        color: 'var(--color-chocolate-base, #2A170F)',
                      }}
                    >
                      {medications.length} {medications.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  <p style={{ margin: '3px 0 0 0', fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                    Click any medication item to review or edit its details in the sidesheet.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addMedicationAndOpenSidesheet}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.825rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <SolarIcon name="add-circle-linear" size={16} color="var(--color-chocolate-base, #2A170F)" />
                  <span>Add Medication</span>
                </button>
              </div>

              {/* Sane & Clean Medication List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {medications.map((row, index) => (
                  <div
                    key={row.id}
                    className="rx-med-card"
                    onClick={() => openEditSidesheet(row.id)}
                  >
                    {/* Left: Index badge & Medication Overview */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                      <span
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: row.name ? 'var(--color-chocolate-base, #2A170F)' : 'var(--color-gold-pale, #F0E5D3)',
                          color: row.name ? '#ffffff' : 'var(--color-chocolate-base, #2A170F)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.85rem',
                          flexShrink: 0,
                        }}
                      >
                        {index + 1}
                      </span>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        {/* Title & Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              color: row.name ? 'var(--color-chocolate-base, #2A170F)' : 'var(--color-cream-text-muted, #6B5E55)',
                              fontStyle: row.name ? 'normal' : 'italic',
                            }}
                          >
                            {row.name || 'Unnamed medication — click to configure details'}
                          </span>

                          {row.schedule_flag && (
                            <span
                              style={{
                                fontSize: '0.725rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                background:
                                  row.schedule_flag === 'S5' || row.schedule_flag === 'S6'
                                    ? '#fee2e2'
                                    : 'var(--color-gold-pale, #F0E5D3)',
                                color:
                                  row.schedule_flag === 'S5' || row.schedule_flag === 'S6'
                                    ? '#dc2626'
                                    : 'var(--color-chocolate-base, #2A170F)',
                                border:
                                  row.schedule_flag === 'S5' || row.schedule_flag === 'S6'
                                    ? '1px solid #fca5a5'
                                    : '1px solid rgba(223, 171, 98, 0.4)',
                              }}
                            >
                              Schedule {row.schedule_flag}
                            </span>
                          )}

                          {row.nappi_code && (
                            <span
                              style={{
                                fontSize: '0.725rem',
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                color: 'var(--color-cream-text-muted, #6B5E55)',
                                background: 'rgba(223, 171, 98, 0.15)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                              }}
                            >
                              NAPPI: {row.nappi_code}
                            </span>
                          )}
                        </div>

                        {/* Dosage, Frequency, Duration & Instructions snippet */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px 12px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                          <span>
                            <strong style={{ color: 'var(--color-chocolate-base, #2A170F)' }}>Dosage:</strong> {row.dosage || '1 dose'}
                          </span>
                          <span>•</span>
                          <span>
                            <strong style={{ color: 'var(--color-chocolate-base, #2A170F)' }}>Frequency:</strong> {row.frequency || 'Daily'}
                          </span>
                          <span>•</span>
                          <span>
                            <strong style={{ color: 'var(--color-chocolate-base, #2A170F)' }}>Duration:</strong> {row.duration || '5 days'}
                          </span>
                          {row.instructions && (
                            <>
                              <span>•</span>
                              <span style={{ fontStyle: 'italic', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                &ldquo;{row.instructions}&rdquo;
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="rx-med-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditSidesheet(row.id);
                        }}
                        className="btn-secondary"
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <SolarIcon name="pen-new-square-linear" size={14} color="var(--color-chocolate-base, #2A170F)" />
                        <span>Edit Details</span>
                      </button>

                      {medications.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeMedicationRow(row.id);
                          }}
                          title="Remove medication"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '6px',
                            borderRadius: '8px',
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#fee2e2')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'none')}
                        >
                          <SolarIcon name="trash-bin-trash-linear" size={17} color="#dc2626" />
                        </button>
                      )}

                      <SolarIcon name="alt-arrow-right-linear" size={16} color="var(--color-gold-base, #DFAB62)" />
                    </div>
                  </div>
                ))}

                {/* Quick Add Another Medication Dashed Card */}
                <button
                  type="button"
                  onClick={addMedicationAndOpenSidesheet}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '1.5px dashed var(--color-gold-base, #DFAB62)',
                    background: 'rgba(223, 171, 98, 0.04)',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--color-gold-pale, #F0E5D3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(223, 171, 98, 0.04)';
                  }}
                >
                  <SolarIcon name="add-circle-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
                  <span>Add Another Medication Item</span>
                </button>
              </div>
            </div>

            {/* Schedule 5/6 Verification Banner */}
            {hasSchedule5or6 && (
              <div
                style={{
                  background: hasConfirmedSupervision ? '#f0fdf4' : '#fffbeb',
                  border: `1.5px solid ${hasConfirmedSupervision ? '#86efac' : 'var(--color-gold-base, #DFAB62)'}`,
                  borderRadius: '16px',
                  padding: '18px 22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <SolarIcon
                    name={hasConfirmedSupervision ? 'shield-check-linear' : 'shield-warning-linear'}
                    size={28}
                    color={hasConfirmedSupervision ? '#059669' : 'var(--color-gold-bronze, #B88647)'}
                  />
                  <div>
                    <h4
                      style={{
                        margin: 0,
                        fontSize: '0.95rem',
                        fontWeight: 800,
                        color: hasConfirmedSupervision ? '#15803d' : 'var(--color-chocolate-base, #2A170F)',
                      }}
                    >
                      {hasConfirmedSupervision
                        ? 'Schedule 5/6 Telehealth Supervision Verified & Signed'
                        : 'Schedule 5/6 Controlled Medication Selected — Verification Required'}
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: hasConfirmedSupervision ? '#166534' : 'var(--color-cream-text-muted, #6B5E55)' }}>
                      {hasConfirmedSupervision
                        ? 'Statutory clinical verification recorded for medical council audit.'
                        : 'HPCSA regulations require a completed and signed Telehealth Supervision Declaration.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowSupervisionModal(true)}
                  className={hasConfirmedSupervision ? 'btn-secondary' : 'btn-primary'}
                  style={{ padding: '8px 18px', fontSize: '0.85rem' }}
                >
                  {hasConfirmedSupervision ? 'Review Declaration' : 'Complete Declaration'}
                </button>
              </div>
            )}

            {/* Proceed to Preview CTA */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('preview');
                  setActiveStep(3);
                }}
                className="btn-primary"
                style={{ padding: '12px 28px', fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <span>Proceed to Official Stationary Preview</span>
                <SolarIcon name="arrow-right-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
              </button>
            </div>
          </div>
        )}

        {/* ======================================================================
            TAB 2: AUTHENTIC SOUTH AFRICAN MEDICAL PRESCRIPTION STATIONARY
            ====================================================================== */}
        {activeTab === 'preview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Authentic South African Stationary Sheet */}
            <div
              className="prescribe-stationary-sheet"
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.35))',
                padding: '40px 44px',
                color: 'var(--color-chocolate-base, #2A170F)',
                position: 'relative',
              }}
            >
              {/* Authentic Header with Brand & Practice stationary */}
              <div
                className="prescribe-stationary-header"
                style={{
                  borderBottom: '2.5px solid var(--color-chocolate-base, #2A170F)',
                  paddingBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <SolarIcon name="document-medicine-linear" size={30} color="var(--color-gold-bronze, #B88647)" />
                    <div>
                      <h2
                        style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: '1.55rem',
                          fontWeight: 900,
                          color: 'var(--color-chocolate-base, #2A170F)',
                          letterSpacing: '-0.02em',
                          margin: 0,
                          lineHeight: 1.1,
                        }}
                      >
                        ChekUp<span style={{ color: 'var(--color-gold-base, #DFAB62)' }}>247</span>
                      </h2>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--color-gold-dark, #C9944A)', textTransform: 'uppercase' }}>
                        Healthcare Virtual Consulting Practice
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--color-cream-text-muted, #6B5E55)', lineHeight: 1.4 }}>
                    Practice No: <strong>PR 0998822</strong> (BHF Registered Telemedicine Provider)
                    <br />
                    Physical Address: Suite 4B, Sandton Medical Square, 135 Rivonia Rd, Sandton, 2196, South Africa
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.1rem',
                      fontWeight: 900,
                      color: 'var(--color-chocolate-base, #2A170F)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    OFFICIAL MEDICAL PRESCRIPTION
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '3px' }}>
                    Medicines &amp; Related Substances Act (Act 101/1965)
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)', marginTop: '4px' }}>
                    Date: {new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Doctor & Patient Credentials Panel */}
              <div
                className="prescribe-stationary-creds"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '24px',
                  margin: '24px 0',
                  padding: '16px 20px',
                  background: 'var(--color-cream-base, #FAF6EE)',
                  borderRadius: '12px',
                  border: '1px solid rgba(223, 171, 98, 0.25)',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-gold-dark, #C9944A)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Prescribing Medical Practitioner
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', marginTop: '2px' }}>
                    {prescriberName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '2px' }}>
                    HPCSA Reg: <strong>{hpcsaReg}</strong> • Qualification: <strong>MBChB, FCFP (SA)</strong>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                    Discipline: General Practice &amp; Telehealth Medicine
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-gold-dark, #C9944A)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Patient Identification
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', marginTop: '2px' }}>
                    {patient.name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '2px' }}>
                    Contact: {patient.email || patient.phone || 'On verified patient file'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                    Session Ref: #{bookingId ? bookingId.substring(0, 10).toUpperCase() : 'N/A'}
                  </div>
                </div>
              </div>

              {/* Mandatory Diagnostic ICD-10 Box */}
              <div
                style={{
                  background: 'var(--color-cream-surface, #FDFBF7)',
                  border: '1.5px solid var(--color-gold-base, #DFAB62)',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  marginBottom: '28px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-gold-dark, #C9944A)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Diagnostic ICD-10 &amp; Clinical Presentation
                  </div>
                  <div style={{ fontSize: '0.975rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', marginTop: '2px' }}>
                    {selectedIcd10 ? `${selectedIcd10.code} — ${selectedIcd10.description}` : icd10Query || 'Not specified'}
                  </div>
                  {symptoms.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '4px' }}>
                      <strong style={{ color: 'var(--color-chocolate-base, #2A170F)' }}>Symptoms on Record:</strong> {symptoms.join(', ')}
                    </div>
                  )}
                </div>

                {hasSchedule5or6 && (
                  <span className="badge-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                    Schedule 5/6 Controlled Substance
                  </span>
                )}
              </div>

              {/* Prescription Items (Rx Monogram Header) */}
              <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span
                    style={{
                      fontFamily: 'serif',
                      fontSize: '1.8rem',
                      fontWeight: 900,
                      fontStyle: 'italic',
                      color: 'var(--color-chocolate-base, #2A170F)',
                      lineHeight: 1,
                    }}
                  >
                    Rx
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-cream-text-muted, #6B5E55)', textTransform: 'uppercase' }}>
                    Prescribed Medicines &amp; Dispensing Directions
                  </span>
                </div>

                <div className="doctor-table-scroll">
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '580px' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-cream-base, #FAF6EE)', borderBottom: '2px solid rgba(223, 171, 98, 0.35)', textAlign: 'left', fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)', textTransform: 'uppercase' }}>
                        <th style={{ padding: '10px 14px' }}>Item &amp; Medication Name</th>
                        <th style={{ padding: '10px 14px' }}>NAPPI Code</th>
                        <th style={{ padding: '10px 14px' }}>Sched</th>
                        <th style={{ padding: '10px 14px' }}>Dosage &amp; Frequency</th>
                        <th style={{ padding: '10px 14px' }}>Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medications.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid rgba(223, 171, 98, 0.18)', fontSize: '0.875rem' }}>
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                              {idx + 1}. {item.name || 'Unnamed medication'}
                            </div>
                            {item.instructions && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontStyle: 'italic', marginTop: '2px' }}>
                                Signatura: {item.instructions}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '12px 14px', color: 'var(--color-cream-text-muted, #6B5E55)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                            {item.nappi_code || '—'}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: item.schedule_flag === 'S5' || item.schedule_flag === 'S6' ? '#fee2e2' : 'var(--color-gold-pale, #F0E5D3)',
                                color: item.schedule_flag === 'S5' || item.schedule_flag === 'S6' ? '#b91c1c' : 'var(--color-chocolate-base, #2A170F)',
                              }}
                            >
                              {item.schedule_flag}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)' }}>
                            {item.dosage || '1 dose'} ({item.frequency})
                          </td>
                          <td style={{ padding: '12px 14px', color: 'var(--color-chocolate-base, #2A170F)' }}>
                            {item.duration}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Schedule 5 & 6 Telehealth Supervision Declaration (If Applicable) */}
              {hasSchedule5or6 && (
                <div
                  style={{
                    background: '#fffbeb',
                    border: '1.5px solid var(--color-gold-base, #DFAB62)',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    marginBottom: '26px',
                  }}
                >
                  <div style={{ fontSize: '0.775rem', fontWeight: 800, color: '#b45309', marginBottom: '4px' }}>
                    STATUTORY SCHEDULE 5 &amp; 6 TELEHEALTH SUPERVISION DECLARATION
                  </div>
                  <div style={{ fontSize: '0.775rem', color: '#78350f', lineHeight: 1.5 }}>
                    {supervisionDeclarationText}
                  </div>
                </div>
              )}

              {/* Verified Digital Signature & Tamper-Evident Seal */}
              <div
                style={{
                  border: '1.5px solid rgba(223, 171, 98, 0.35)',
                  borderRadius: '12px',
                  padding: '18px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  background: 'var(--color-cream-base, #FAF6EE)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <SolarIcon name="shield-check-linear" size={16} color="var(--color-gold-bronze, #B88647)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--color-gold-dark, #C9944A)', textTransform: 'uppercase' }}>
                      Digitally Certified Telehealth Practitioner
                    </span>
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--color-chocolate-base, #2A170F)', marginTop: '2px' }}>
                    {prescriberName}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '2px' }}>
                    HPCSA Reg: {hpcsaReg} • Practice: PR 0998822 • SHA-256 Verified Electronic Seal
                  </div>
                </div>

                {/* Seal Stamp */}
                <div
                  style={{
                    border: '2px solid var(--color-gold-base, #DFAB62)',
                    borderRadius: '10px',
                    padding: '8px 18px',
                    textAlign: 'center',
                    background: '#ffffff',
                    boxShadow: '0 2px 8px rgba(223, 171, 98, 0.2)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 900, color: 'var(--color-chocolate-base, #2A170F)' }}>CHEKUP247</div>
                  <div style={{ fontSize: '0.675rem', fontWeight: 800, color: 'var(--color-gold-dark, #C9944A)' }}>OFFICIAL RX SEAL</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>TAMPER-EVIDENT</div>
                </div>
              </div>
            </div>

            {/* Preview Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('form');
                  setActiveStep(1);
                }}
                className="btn-secondary"
                style={{ padding: '12px 24px', fontSize: '0.9rem' }}
              >
                <SolarIcon name="arrow-left-linear" size={16} color="var(--color-chocolate-base, #2A170F)" />
                <span>Back to Edit Form</span>
              </button>

              <button
                type="button"
                onClick={handleIssuePrescription}
                disabled={isSubmitting}
                className="btn-primary"
                style={{ padding: '14px 32px', fontSize: '1rem' }}
              >
                {isSubmitting ? (
                  <>
                    <SolarIcon name="refresh-linear" size={18} color="var(--color-chocolate-base, #2A170F)" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Signing &amp; Issuing E-Prescription...</span>
                  </>
                ) : (
                  <>
                    <SolarIcon name="check-circle-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
                    <span>Sign &amp; Issue Electronic Prescription</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ======================================================================
            TAB 3: SUCCESS CONFIRMATION
            ====================================================================== */}
        {activeTab === 'success' && issuedPrescription && (
          <div
            className="portal-card"
            style={{
              padding: '44px 36px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                border: '2px solid #86efac',
              }}
            >
              <SolarIcon name="check-circle-linear" size={44} color="#059669" />
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.75rem',
                fontWeight: 900,
                color: 'var(--color-chocolate-base, #2A170F)',
                margin: '0 0 8px 0',
              }}
            >
              E-Prescription Successfully Issued!
            </h2>
            <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto 26px' }}>
              The signed e-prescription has been cryptographically secured, archived in compliance with the HPCSA, and made immediately available in the patient portal.
            </p>

            <div
              style={{
                background: 'var(--color-cream-base, #FAF6EE)',
                borderRadius: '12px',
                border: '1px solid rgba(223, 171, 98, 0.3)',
                padding: '18px 22px',
                maxWidth: '420px',
                margin: '0 auto 30px',
                textAlign: 'left',
                fontSize: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-cream-text-muted, #6B5E55)' }}>Prescription ID:</span>
                <span style={{ fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', fontFamily: 'monospace' }}>
                  #{issuedPrescription.id?.substring(0, 8).toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: 'var(--color-cream-text-muted, #6B5E55)' }}>ICD-10 Diagnostic:</span>
                <span style={{ fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                  {issuedPrescription.icd10_code}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-cream-text-muted, #6B5E55)' }}>Digital Verification:</span>
                <span style={{ fontWeight: 800, color: '#047857' }}>HPCSA &amp; Act 101 Compliant</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '14px' }}>
              <a
                href={`${API_BASE}/prescriptions/${issuedPrescription.id}/download`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
                style={{ padding: '12px 24px', fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <SolarIcon name="download-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
                <span>Download Signed Stationary PDF</span>
              </a>

              <Link
                href="/appointments"
                className="btn-secondary"
                style={{ padding: '12px 24px', fontSize: '0.95rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <SolarIcon name="arrow-left-linear" size={16} color="var(--color-chocolate-base, #2A170F)" />
                <span>Return to Appointments</span>
              </Link>
            </div>
          </div>
        )}

        {/* DP-703: Schedule 5 & 6 Supervision Declaration Modal */}
        {showSupervisionModal && (
          <div
            className="portal-modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowSupervisionModal(false);
            }}
          >
            <div
              className="portal-modal-surface"
              style={{
                maxWidth: '620px',
                width: '100%',
                padding: '32px',
                borderRadius: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'var(--color-gold-pale, #F0E5D3)',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1.5px solid var(--color-gold-base, #DFAB62)',
                    flexShrink: 0,
                  }}
                >
                  <SolarIcon name="shield-warning-linear" size={26} color="var(--color-gold-bronze, #B88647)" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                    Schedule 5 &amp; 6 Telehealth Supervision Declaration
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#b45309', fontWeight: 700 }}>
                    Mandatory statutory compliance under HPCSA Telemedicine Ethical Guidelines
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--color-cream-text-muted, #6B5E55)', lineHeight: 1.5, marginBottom: '18px' }}>
                Under South African medical law (Medicines and Related Substances Act, 1965), Schedule 5 &amp; 6
                substances issued via telemedicine require a verified practitioner clinical declaration to be
                appended to the prescription and recorded in the audit log.
              </p>

              {/* Statutory Confirmation Checklist */}
              <div
                style={{
                  background: 'var(--color-cream-base, #FAF6EE)',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid rgba(223, 171, 98, 0.3)',
                  marginBottom: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.875rem', color: 'var(--color-chocolate-base, #2A170F)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={supervisionChecklist.historyVerified}
                    onChange={(e) =>
                      setSupervisionChecklist((p) => ({ ...p, historyVerified: e.target.checked }))
                    }
                    style={{ marginTop: '3px', accentColor: 'var(--color-chocolate-base, #2A170F)' }}
                  />
                  <span>I have verified the patient&apos;s medical history, current medications, and past substance reactions.</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.875rem', color: 'var(--color-chocolate-base, #2A170F)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={supervisionChecklist.directAssessment}
                    onChange={(e) =>
                      setSupervisionChecklist((p) => ({ ...p, directAssessment: e.target.checked }))
                    }
                    style={{ marginTop: '3px', accentColor: 'var(--color-chocolate-base, #2A170F)' }}
                  />
                  <span>I conducted a direct real-time interactive assessment of the patient during this consultation.</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '0.875rem', color: 'var(--color-chocolate-base, #2A170F)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={supervisionChecklist.contraindicationsChecked}
                    onChange={(e) =>
                      setSupervisionChecklist((p) => ({ ...p, contraindicationsChecked: e.target.checked }))
                    }
                    style={{ marginTop: '3px', accentColor: 'var(--color-chocolate-base, #2A170F)' }}
                  />
                  <span>I confirm the prescribed quantity does not exceed statutory limits and I accept full supervision responsibility.</span>
                </label>
              </div>

              {/* Editable Declaration Statement */}
              <div style={{ marginBottom: '22px' }}>
                <label className="portal-label">
                  Declaration Text (Appears on Official Stationary &amp; Audit Ledger)
                </label>
                <textarea
                  value={supervisionDeclarationText}
                  onChange={(e) => setSupervisionDeclarationText(e.target.value)}
                  rows={3}
                  className="portal-textarea"
                  style={{ fontSize: '0.8rem' }}
                />
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowSupervisionModal(false)}
                  className="btn-secondary"
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
                  className="btn-primary"
                >
                  Sign &amp; Confirm Supervision Declaration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================================
            MEDICATION DETAILS SIDESHEET (SLIDE-OVER DRAWER)
            ====================================================================== */}
        {editingMedicationId && activeMedication && (
          <div
            className="portal-sidesheet-backdrop"
            onClick={closeSidesheet}
          >
            <div
              className="portal-sidesheet"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Sidesheet Header */}
              <div className="portal-sidesheet-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '10px',
                      background: 'var(--color-gold-pale, #F0E5D3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: '1px solid var(--color-gold-base, #DFAB62)',
                    }}
                  >
                    <SolarIcon name="pill-linear" size={22} color="var(--color-gold-bronze, #B88647)" />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontFamily: 'var(--font-heading)',
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: 'var(--color-chocolate-base, #2A170F)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {activeMedication.name || `Medication #${activeMedicationIndex + 1}`}
                    </h3>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                      Item #{activeMedicationIndex + 1} • South African Formulary &amp; Act 101 Compliance
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeSidesheet}
                  title="Close sidesheet (Esc)"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-cream-text-muted, #6B5E55)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-chocolate-base, #2A170F)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-cream-text-muted, #6B5E55)')}
                >
                  <SolarIcon name="close-circle-linear" size={22} color="currentColor" />
                </button>
              </div>

              {/* Sidesheet Body */}
              <div className="portal-sidesheet-body">
                {/* 1. Medication Name & Typeahead Search */}
                <div style={{ position: 'relative' }}>
                  <label className="portal-label" style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <SolarIcon name="magnifer-linear" size={15} color="var(--color-gold-base, #DFAB62)" />
                    <span>Medication / Generic Name</span>
                    <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={activeMedication.name}
                      onChange={(e) => handleMedicationSearch(activeMedication.id, e.target.value)}
                      placeholder="Search or enter medication (e.g. Amoxicillin, Paracetamol, Metformin)..."
                      className="portal-input"
                      autoFocus
                    />
                    {isSearchingMed && (
                      <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center' }}>
                        <SolarIcon name="refresh-linear" size={16} color="var(--color-gold-base, #DFAB62)" style={{ animation: 'spin 1s linear infinite' }} />
                      </span>
                    )}
                  </div>

                  {/* Autocomplete dropdown */}
                  {activeSearchRowId === activeMedication.id && medicationSearchResults.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 50,
                        background: 'var(--color-cream-surface, #FDFBF7)',
                        border: '1.5px solid var(--color-gold-base, #DFAB62)',
                        borderRadius: '10px',
                        boxShadow: '0 10px 28px rgba(42, 23, 15, 0.18)',
                        marginTop: '4px',
                        maxHeight: '240px',
                        overflowY: 'auto',
                      }}
                    >
                      {medicationSearchResults.map((med, i) => (
                        <div
                          key={i}
                          onClick={() => selectMedication(activeMedication.id, med)}
                          style={{
                            padding: '10px 14px',
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(223, 171, 98, 0.15)',
                          }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-gold-pale, #F0E5D3)')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)', fontSize: '0.875rem' }}>
                              {med.name}
                            </span>
                            <span className={med.schedule === 'S5' || med.schedule === 'S6' ? 'badge-danger' : 'badge-gold'}>
                              {med.schedule}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '2px' }}>
                            NAPPI: {med.nappi_code} • {med.dosage_form} • {med.category}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Schedule Classification */}
                <div>
                  <label className="portal-label" style={{ fontWeight: 800 }}>
                    Schedule Classification *
                  </label>
                  <select
                    value={activeMedication.schedule_flag}
                    onChange={(e) => updateMedicationRow(activeMedication.id, 'schedule_flag', e.target.value)}
                    className="portal-select"
                    style={{
                      fontWeight: 700,
                      color:
                        activeMedication.schedule_flag === 'S5' || activeMedication.schedule_flag === 'S6'
                          ? '#dc2626'
                          : 'var(--color-chocolate-base, #2A170F)',
                    }}
                  >
                    <option value="S0">Schedule 0 (General OTC - Unscheduled)</option>
                    <option value="S1">Schedule 1 (Pharmacy Only)</option>
                    <option value="S2">Schedule 2 (Behind the Counter Pharmacist Dispensed)</option>
                    <option value="S3">Schedule 3 (Prescription Required - Chronic Care)</option>
                    <option value="S4">Schedule 4 (Standard Prescription Only)</option>
                    <option value="S5">Schedule 5 (Sedative / Anxiolytic - Telehealth Verified)</option>
                    <option value="S6">Schedule 6 (Narcotic / Controlled - Telehealth Verified)</option>
                  </select>

                  {(activeMedication.schedule_flag === 'S5' || activeMedication.schedule_flag === 'S6') && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        color: '#92400e',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      <SolarIcon name="shield-warning-linear" size={16} color="#d97706" />
                      <span>
                        Schedule 5/6 controlled substance selected. An HPCSA Telemedicine Supervision Declaration is mandatory prior to issuance.
                      </span>
                    </div>
                  )}
                </div>

                {/* 3. NAPPI Code */}
                <div>
                  <label className="portal-label">
                    NAPPI Code
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 500, marginLeft: '6px' }}>
                      (South African National Pharmaceutical Product Index)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={activeMedication.nappi_code}
                    onChange={(e) => updateMedicationRow(activeMedication.id, 'nappi_code', e.target.value)}
                    placeholder="e.g. 706035001"
                    className="portal-input"
                  />
                </div>

                {/* 4. Dosage & Quantity */}
                <div>
                  <label className="portal-label" style={{ fontWeight: 800 }}>
                    Dosage / Strength / Quantity *
                  </label>
                  <input
                    type="text"
                    value={activeMedication.dosage}
                    onChange={(e) => updateMedicationRow(activeMedication.id, 'dosage', e.target.value)}
                    placeholder="e.g. 1 tablet (1000mg), 2 capsules, 10ml"
                    className="portal-input"
                  />
                </div>

                {/* 5. Frequency */}
                <div>
                  <label className="portal-label" style={{ fontWeight: 800 }}>
                    Frequency of Administration *
                  </label>
                  <select
                    value={activeMedication.frequency}
                    onChange={(e) => updateMedicationRow(activeMedication.id, 'frequency', e.target.value)}
                    className="portal-select"
                  >
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <option key={opt.val} value={opt.val}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Duration & Presets */}
                <div>
                  <label className="portal-label" style={{ fontWeight: 800 }}>
                    Duration of Course *
                  </label>
                  <input
                    type="text"
                    value={activeMedication.duration}
                    onChange={(e) => updateMedicationRow(activeMedication.id, 'duration', e.target.value)}
                    placeholder="e.g. 5 days, 1 month, 30 days"
                    className="portal-input"
                  />
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {DURATION_PRESETS.map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => updateMedicationRow(activeMedication.id, 'duration', dur)}
                        style={{
                          padding: '4px 9px',
                          borderRadius: '6px',
                          border: '1px solid rgba(223, 171, 98, 0.3)',
                          background: activeMedication.duration === dur ? 'var(--color-gold-pale, #F0E5D3)' : '#ffffff',
                          color: 'var(--color-chocolate-base, #2A170F)',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 7. Special Instructions & Warning Chips */}
                <div>
                  <label className="portal-label">
                    Special Instructions / Signatura (Food, Driving &amp; Alcohol Warnings)
                  </label>
                  <textarea
                    value={activeMedication.instructions}
                    onChange={(e) => updateMedicationRow(activeMedication.id, 'instructions', e.target.value)}
                    placeholder="e.g. Take with food or a large glass of water. Complete full course. Do not consume alcohol."
                    rows={3}
                    className="portal-textarea"
                    style={{ fontSize: '0.85rem' }}
                  />

                  {/* Quick instructions chips */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {[
                      'Take with food',
                      'Take before meals',
                      'Complete full course',
                      'Avoid alcohol',
                      'May cause drowsiness',
                      'Take with plenty of water',
                    ].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          const current = activeMedication.instructions.trim();
                          const updated = current ? `${current}. ${chip}` : chip;
                          updateMedicationRow(activeMedication.id, 'instructions', updated);
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(223, 171, 98, 0.25)',
                          background: 'var(--color-cream-base, #FAF6EE)',
                          color: 'var(--color-cream-text-muted, #6B5E55)',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        + {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidesheet Footer */}
              <div className="portal-sidesheet-footer">
                <div>
                  {medications.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        removeMedicationRow(activeMedication.id);
                        closeSidesheet();
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                      }}
                    >
                      <SolarIcon name="trash-bin-trash-linear" size={16} color="#dc2626" />
                      <span>Remove Item</span>
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={closeSidesheet}
                    className="btn-secondary"
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={closeSidesheet}
                    className="btn-primary"
                    style={{ padding: '8px 20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <SolarIcon name="check-circle-linear" size={16} color="var(--color-chocolate-base, #2A170F)" />
                    <span>Done &amp; Apply</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
