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
  Sparkles,
  Printer,
  FileCheck,
  Hash,
  Clock,
  Building,
  MapPin,
  Award,
} from 'lucide-react';
import { useDoctorAuth } from '../../../../context/DoctorAuthContext';
import { ChekupCrossLogo } from '../../../../components/common/ChekupCrossLogo';
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

  // Add & Remove Medication rows
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
        frequency: 'Once daily',
        duration: '5 days',
        instructions: '',
      },
    ]);
  };

  const removeMedicationRow = (id: string) => {
    if (medications.length <= 1) {
      setMedications([
        {
          id: `med-${Date.now()}`,
          name: '',
          nappi_code: '',
          schedule_flag: 'S4',
          dosage: '',
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

  const prescriberName = doctor?.fullName ? `Dr. ${doctor.fullName}` : 'Dr. M. D. Khumalo';
  const hpcsaReg = profile?.hpcsaNumber || 'MP 0789012';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-cream-base, #FAF6EE)', padding: '28px 20px' }}>
      <div style={{ maxWidth: '1040px', margin: '0 auto' }}>
        {/* Top Header & Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <Link
              href={`/consultations/${bookingId}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--color-cream-text-muted, #6B5E55)',
                fontSize: '0.875rem',
                textDecoration: 'none',
                marginBottom: '8px',
                fontWeight: 600,
                transition: 'color 0.15s',
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Live Consultation Suite</span>
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ChekupCrossLogo size={28} />
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
              South African HPCSA & Medicines Act (Act 101/1965) compliant digital prescription stationary
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
              <Shield size={14} style={{ color: 'var(--color-gold-dark, #C9944A)' }} />
              <span>HPCSA Telemedicine Verified</span>
            </span>
          </div>
        </div>

        {/* Numbered Step Progress Header Matching Patient System */}
        {activeTab !== 'success' && (
          <div
            style={{
              background: 'var(--color-cream-surface, #FDFBF7)',
              border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
              borderRadius: '16px',
              padding: '16px 24px',
              marginBottom: '22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 10px rgba(42, 23, 15, 0.04)',
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
                  ICD-10 Diagnosis
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                  SA MIT Diagnostic Table
                </div>
              </div>
            </div>

            <div style={{ height: '1px', flex: 1, background: 'rgba(223, 171, 98, 0.3)', margin: '0 16px' }} />

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
                  NAPPI Code & Presets
                </div>
              </div>
            </div>

            <div style={{ height: '1px', flex: 1, background: 'rgba(223, 171, 98, 0.3)', margin: '0 16px' }} />

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
                  Stationary & Signature
                </div>
                <div style={{ fontSize: '0.725rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                  Official SA Medical PDF
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Patient Summary Header Card */}
        <div
          style={{
            background: 'var(--color-cream-surface, #FDFBF7)',
            borderRadius: '16px',
            padding: '18px 22px',
            border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
            boxShadow: '0 2px 8px rgba(42, 23, 15, 0.03)',
            marginBottom: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'var(--color-gold-pale, #F0E5D3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-chocolate-base, #2A170F)',
                fontWeight: 800,
                fontSize: '1rem',
                border: '1.5px solid var(--color-gold-base, #DFAB62)',
              }}
            >
              {patient.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-cream-text-muted, #6B5E55)', textTransform: 'uppercase' }}>
                Consultation Patient
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                {patient.name}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '22px', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: 'var(--color-cream-text-muted, #6B5E55)' }}>Booking ID: </span>
              <span style={{ fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                #{bookingId.substring(0, 8).toUpperCase()}
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
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={() => {
                setActiveTab('form');
                setActiveStep(1);
              }}
              style={{
                padding: '10px 22px',
                borderRadius: '9999px',
                border: activeTab === 'form' ? 'none' : '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
                background: activeTab === 'form' ? 'var(--color-chocolate-base, #2A170F)' : 'var(--color-cream-surface, #FDFBF7)',
                color: activeTab === 'form' ? '#ffffff' : 'var(--color-chocolate-base, #2A170F)',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeTab === 'form' ? '0 4px 14px rgba(42, 23, 15, 0.2)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Edit3 size={16} />
              <span>1. Prescription Form & Items</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('preview');
                setActiveStep(3);
              }}
              style={{
                padding: '10px 22px',
                borderRadius: '9999px',
                border: activeTab === 'preview' ? 'none' : '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
                background: activeTab === 'preview' ? 'var(--color-chocolate-base, #2A170F)' : 'var(--color-cream-surface, #FDFBF7)',
                color: activeTab === 'preview' ? '#ffffff' : 'var(--color-chocolate-base, #2A170F)',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: activeTab === 'preview' ? '0 4px 14px rgba(42, 23, 15, 0.2)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Eye size={16} />
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
            <AlertTriangle size={18} style={{ color: '#dc2626' }} />
            <span>{submitError}</span>
          </div>
        )}

        {/* ======================================================================
            TAB 1: FORM BUILDER
            ====================================================================== */}
        {activeTab === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Step 1: ICD-10 Search Section */}
            <div className="portal-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <label className="portal-label" style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                  <Stethoscope size={18} style={{ color: 'var(--color-gold-base, #DFAB62)' }} />
                  <span>Mandatory Diagnostic ICD-10 Code (SA MIT Table)</span>
                  <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <Link
                  href="/icd10"
                  target="_blank"
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span>Open ICD-10 Assistant</span>
                  <ExternalLink size={12} />
                </Link>
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={18} style={{ position: 'absolute', left: '14px', color: 'var(--color-gold-base, #DFAB62)' }} />
                  <input
                    type="text"
                    value={icd10Query}
                    onChange={(e) => handleIcd10Search(e.target.value)}
                    placeholder="Search South African ICD-10 MIT table (e.g. Acute bronchitis, Pharyngitis J06.9, Hypertension I10)..."
                    className="portal-input"
                    style={{ paddingLeft: '44px' }}
                  />
                  {isSearchingIcd10 && (
                    <Loader2 size={18} className="animate-spin" style={{ position: 'absolute', right: '14px', color: 'var(--color-gold-base, #DFAB62)' }} />
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
                                fontSize: '0.9rem',
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
                          <div style={{ fontSize: '0.875rem', color: 'var(--color-chocolate-base, #2A170F)', marginTop: '3px' }}>
                            {item.description}
                          </div>
                        </div>

                        <span className="badge-gold">Select</span>
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
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Check size={16} style={{ color: '#16a34a' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)' }}>
                      Selected Primary Code: [{selectedIcd10.code}] {selectedIcd10.description}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedIcd10(null)}
                    style={{ background: 'none', border: 'none', color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Step 2: Medication Repeater Items */}
            <div className="portal-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div>
                  <h3
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.15rem',
                      fontWeight: 800,
                      color: 'var(--color-chocolate-base, #2A170F)',
                      margin: 0,
                    }}
                  >
                    Medication Items (Rx Formulary)
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                    Add medications, specify NAPPI code, schedule classification, dosage, frequency, and duration.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addMedicationRow}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.825rem' }}
                >
                  <Plus size={16} />
                  <span>Add Another Medication</span>
                </button>
              </div>

              {/* Medication Item Repeater Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {medications.map((row, index) => (
                  <div
                    key={row.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '14px',
                      border: '1.5px solid rgba(223, 171, 98, 0.28)',
                      padding: '18px 20px',
                      boxShadow: '0 2px 10px rgba(42, 23, 15, 0.03)',
                    }}
                  >
                    {/* Item Row Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            background: 'var(--color-chocolate-base, #2A170F)',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                          }}
                        >
                          {index + 1}
                        </span>
                        <span style={{ fontWeight: 800, fontSize: '0.925rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                          Medication #{index + 1}
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
                      </div>

                      {medications.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedicationRow(row.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Remove Item</span>
                        </button>
                      )}
                    </div>

                    {/* Inputs Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '14px' }}>
                      {/* Medication Name & Typeahead (Col 6) */}
                      <div style={{ gridColumn: 'span 6', position: 'relative' }}>
                        <label className="portal-label">Medication / Generic Name *</label>
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => handleMedicationSearch(row.id, e.target.value)}
                          placeholder="e.g. Amoxicillin / Clavulanic Acid 1000mg"
                          className="portal-input"
                        />

                        {/* Search Dropdown */}
                        {activeSearchRowId === row.id && medicationSearchResults.length > 0 && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              zIndex: 40,
                              background: 'var(--color-cream-surface, #FDFBF7)',
                              border: '1.5px solid var(--color-gold-base, #DFAB62)',
                              borderRadius: '10px',
                              boxShadow: '0 8px 24px rgba(42, 23, 15, 0.15)',
                              marginTop: '4px',
                              maxHeight: '220px',
                              overflowY: 'auto',
                            }}
                          >
                            {medicationSearchResults.map((med, i) => (
                              <div
                                key={i}
                                onClick={() => selectMedication(row.id, med)}
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
                                  NAPPI: {med.nappi_code} • {med.category}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* NAPPI Code (Col 3) */}
                      <div style={{ gridColumn: 'span 3' }}>
                        <label className="portal-label">NAPPI Code</label>
                        <input
                          type="text"
                          value={row.nappi_code}
                          onChange={(e) => updateMedicationRow(row.id, 'nappi_code', e.target.value)}
                          placeholder="e.g. 706035001"
                          className="portal-input"
                        />
                      </div>

                      {/* Schedule (Col 3) */}
                      <div style={{ gridColumn: 'span 3' }}>
                        <label className="portal-label">Schedule Flag *</label>
                        <select
                          value={row.schedule_flag}
                          onChange={(e) => updateMedicationRow(row.id, 'schedule_flag', e.target.value)}
                          className="portal-select"
                          style={{
                            fontWeight: 700,
                            color: row.schedule_flag === 'S5' || row.schedule_flag === 'S6' ? '#dc2626' : 'var(--color-chocolate-base, #2A170F)',
                          }}
                        >
                          <option value="S0">Schedule 0 (General OTC)</option>
                          <option value="S1">Schedule 1 (Pharmacy Only)</option>
                          <option value="S2">Schedule 2 (Behind Counter)</option>
                          <option value="S3">Schedule 3 (Chronic Care)</option>
                          <option value="S4">Schedule 4 (Standard Rx)</option>
                          <option value="S5">Schedule 5 (Sedative / Anxiolytic)</option>
                          <option value="S6">Schedule 6 (Narcotic / Controlled)</option>
                        </select>
                      </div>

                      {/* Dosage (Col 4) */}
                      <div style={{ gridColumn: 'span 4' }}>
                        <label className="portal-label">Dosage / Quantity *</label>
                        <input
                          type="text"
                          value={row.dosage}
                          onChange={(e) => updateMedicationRow(row.id, 'dosage', e.target.value)}
                          placeholder="e.g. 1 tablet, 500mg, 10ml"
                          className="portal-input"
                        />
                      </div>

                      {/* Frequency (Col 4) */}
                      <div style={{ gridColumn: 'span 4' }}>
                        <label className="portal-label">Frequency</label>
                        <select
                          value={row.frequency}
                          onChange={(e) => updateMedicationRow(row.id, 'frequency', e.target.value)}
                          className="portal-select"
                        >
                          {FREQUENCY_OPTIONS.map((opt) => (
                            <option key={opt.val} value={opt.val}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Duration (Col 4) */}
                      <div style={{ gridColumn: 'span 4' }}>
                        <label className="portal-label">Duration</label>
                        <input
                          type="text"
                          value={row.duration}
                          onChange={(e) => updateMedicationRow(row.id, 'duration', e.target.value)}
                          placeholder="e.g. 5 days, 1 month, 30 days"
                          className="portal-input"
                        />
                        {/* Duration presets */}
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {DURATION_PRESETS.map((dur) => (
                            <button
                              key={dur}
                              type="button"
                              onClick={() => updateMedicationRow(row.id, 'duration', dur)}
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid rgba(223, 171, 98, 0.3)',
                                background: row.duration === dur ? 'var(--color-gold-pale, #F0E5D3)' : '#ffffff',
                                color: 'var(--color-chocolate-base, #2A170F)',
                                fontSize: '0.675rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              {dur}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Special Instructions (Col 12) */}
                      <div style={{ gridColumn: 'span 12' }}>
                        <label className="portal-label">Special Instructions / Food & Alcohol Warnings</label>
                        <input
                          type="text"
                          value={row.instructions}
                          onChange={(e) => updateMedicationRow(row.id, 'instructions', e.target.value)}
                          placeholder="e.g. Take immediately after meals; complete full antibiotic course; avoid driving or alcohol."
                          className="portal-input"
                        />
                      </div>
                    </div>
                  </div>
                ))}
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
                  gap: '16px',
                  boxShadow: '0 4px 14px rgba(42, 23, 15, 0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <Shield size={28} style={{ color: hasConfirmedSupervision ? '#16a34a' : 'var(--color-gold-dark, #C9944A)' }} />
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
                style={{ padding: '12px 28px', fontSize: '0.95rem' }}
              >
                <span>Proceed to Official Stationary Preview</span>
                <ChevronRight size={18} />
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
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.35))',
                padding: '44px 48px',
                boxShadow: '0 12px 36px rgba(42, 23, 15, 0.08)',
                color: 'var(--color-chocolate-base, #2A170F)',
                position: 'relative',
              }}
            >
              {/* Authentic Header with Brand & Practice stationary */}
              <div
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
                    <ChekupCrossLogo size={32} />
                    <div>
                      <h2
                        style={{
                          fontFamily: 'var(--font-heading)',
                          fontSize: '1.6rem',
                          fontWeight: 900,
                          color: 'var(--color-chocolate-base, #2A170F)',
                          letterSpacing: '-0.02em',
                          margin: 0,
                          lineHeight: 1.1,
                        }}
                      >
                        ChekUp<span style={{ color: 'var(--color-gold-base, #DFAB62)' }}>247</span>
                      </h2>
                      <div style={{ fontSize: '0.725rem', fontWeight: 800, letterSpacing: '0.08em', color: 'var(--color-gold-dark, #C9944A)', textTransform: 'uppercase' }}>
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
                    Medicines & Related Substances Act (Act 101/1965)
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)', marginTop: '4px' }}>
                    Date: {new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Doctor & Patient Credentials Panel */}
              <div
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
                    Discipline: General Practice & Telehealth Medicine
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
                    Session Ref: #{bookingId.substring(0, 10).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Mandatory South African Diagnostic ICD-10 Box */}
              <div
                style={{
                  background: 'var(--color-cream-surface, #FDFBF7)',
                  border: '1.5px solid var(--color-gold-base, #DFAB62)',
                  borderRadius: '10px',
                  padding: '12px 18px',
                  marginBottom: '28px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--color-gold-dark, #C9944A)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Mandatory Diagnostic Code (South African MIT ICD-10 Table)
                  </div>
                  <div style={{ fontSize: '0.975rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', marginTop: '2px' }}>
                    {selectedIcd10 ? `${selectedIcd10.code} — ${selectedIcd10.description}` : icd10Query || 'Not specified'}
                  </div>
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
                    Prescribed Medicines & Dispensing Directions
                  </span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-cream-base, #FAF6EE)', borderBottom: '2px solid rgba(223, 171, 98, 0.35)', textAlign: 'left', fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)', textTransform: 'uppercase' }}>
                      <th style={{ padding: '10px 14px' }}>Item & Medication Name</th>
                      <th style={{ padding: '10px 14px' }}>NAPPI Code</th>
                      <th style={{ padding: '10px 14px' }}>Sched</th>
                      <th style={{ padding: '10px 14px' }}>Dosage & Frequency</th>
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
                    STATUTORY SCHEDULE 5 & 6 TELEHEALTH SUPERVISION DECLARATION
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
                  background: 'var(--color-cream-base, #FAF6EE)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={16} style={{ color: 'var(--color-gold-dark, #C9944A)' }} />
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('form');
                  setActiveStep(1);
                }}
                className="btn-secondary"
                style={{ padding: '12px 24px', fontSize: '0.9rem' }}
              >
                <ArrowLeft size={16} />
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
                    <Loader2 size={18} className="animate-spin" />
                    <span>Signing & Issuing E-Prescription...</span>
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
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                border: '2px solid #86efac',
              }}
            >
              <CheckCircle2 size={44} />
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
                <span style={{ fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                  {issuedPrescription.id?.substring(0, 12).toUpperCase()}
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
                <span style={{ fontWeight: 800, color: '#16a34a' }}>HPCSA & Act 101 Compliant</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '14px' }}>
              <a
                href={`${API_BASE}/prescriptions/${issuedPrescription.id}/download`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary"
                style={{ padding: '12px 24px', fontSize: '0.95rem', gap: '8px' }}
              >
                <Download size={18} />
                <span>Download Signed Stationary PDF</span>
              </a>

              <Link
                href="/appointments"
                className="btn-secondary"
                style={{ padding: '12px 24px', fontSize: '0.95rem' }}
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
              background: 'rgba(30, 16, 10, 0.75)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <div
              className="portal-card"
              style={{
                maxWidth: '620px',
                width: '100%',
                padding: '32px',
                border: '1.5px solid var(--color-gold-base, #DFAB62)',
                boxShadow: '0 24px 48px rgba(42, 23, 15, 0.25)',
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
                  }}
                >
                  <Shield size={26} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                    Schedule 5 & 6 Telehealth Supervision Declaration
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#b45309', fontWeight: 700 }}>
                    Mandatory statutory compliance under HPCSA Telemedicine Ethical Guidelines
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--color-cream-text-muted, #6B5E55)', lineHeight: 1.5, marginBottom: '18px' }}>
                Under South African medical law (Medicines and Related Substances Act, 1965), Schedule 5 & 6
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
                  <span>I have verified the patient's medical history, current medications, and past substance reactions.</span>
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
                  Declaration Text (Appears on Official Stationary & Audit Ledger)
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
