'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  Building,
  UserCheck,
  MapPin,
  Landmark,
} from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { SolarIcon } from '../../components/common/SolarIcon';

const AVAILABLE_SPECIALTIES = [
  'General Practitioner',
  'Dentist',
  'Psychologist',
  'Podiatrist',
  'Dermatologist',
  'Pediatrician',
  'Physician',
  'Obstetrics & Gynaecology',
  'Dietician',
];

const PRESET_EXPERTISE_OPTIONS = [
  'Video Telehealth Consultation',
  'Digital Prescription Renewal',
  'Medical Certificates / Sick Notes',
  'Specialist Referral Letters',
  'Chronic Medication Management',
  "Women's Health & Contraception",
  'Paediatric & Child Wellness',
  'Mental Health & Anxiety Support',
  'Acute Infection & Flu Care',
  'Lab Results & Diagnostics Review',
  'Hypertension & Diabetes Care',
  'Preventative Health Screening',
];

export default function DoctorProfilePage() {
  const router = useRouter();
  const { doctor, profile, isAuthenticated, isLoading, updateProfile, toggleHolidayMode } = useDoctorAuth();

  // Clinical specialty & rates
  const [specialty, setSpecialty] = useState('');
  const [secondarySpecialties, setSecondarySpecialties] = useState<string[]>([]);
  const [ratePerHour, setRatePerHour] = useState('');
  const [bio, setBio] = useState('');

  // Practice Availability & Holiday Mode
  const [isOnHoliday, setIsOnHoliday] = useState(false);
  const [togglingHoliday, setTogglingHoliday] = useState(false);

  // Digital Signature
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);

  // Physical Practice Address
  const [practiceName, setPracticeName] = useState('Sandton Mediclinic Suites');
  const [streetAddress, setStreetAddress] = useState('165 Rivonia Road, Suite 402');
  const [suburbCity, setSuburbCity] = useState('Morningside, Sandton');
  const [postalCode, setPostalCode] = useState('2196');
  const [province, setProvince] = useState('Gauteng');

  // Banking details for EFT Settlements
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('First National Bank (FNB)');
  const [accountNumber, setAccountNumber] = useState('62891048291');
  const [accountType, setAccountType] = useState('Cheque / Current');
  const [branchCode, setBranchCode] = useState('250655');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Telehealth service toggles
  const [offersVideo, setOffersVideo] = useState(true);
  const [offersAudio, setOffersAudio] = useState(false);
  const [offersInClinic, setOffersInClinic] = useState(false);
  const [acceptsMedicalAid, setAcceptsMedicalAid] = useState(false);

  // Areas of Expertise tags
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([
    'Video Telehealth Consultation',
    'Digital Prescription Renewal',
    'Medical Certificates / Sick Notes',
    'Specialist Referral Letters',
    'Chronic Medication Management',
  ]);
  const [customExpertiseInput, setCustomExpertiseInput] = useState('');

  // Experience & Board certification credentials
  const [experienceYears, setExperienceYears] = useState<number>(12);
  const [isBoardCertified, setIsBoardCertified] = useState<boolean>(true);
  const [boardCertificationTitle, setBoardCertificationTitle] = useState('Board Certified');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (profile) {
      setSpecialty(profile.specialty || 'General Practitioner');
      setSecondarySpecialties(profile.secondarySpecialties || []);
      setRatePerHour(profile.ratePerHour ? String(profile.ratePerHour) : '850');
      setBio(profile.bio || '');
      setIsOnHoliday(profile.isOnHoliday === true);
      setSignatureUrl(profile.signatureUrl || null);

      // Load banking details
      if (profile.bankName) setBankName(profile.bankName);
      if (profile.accountNumber) setAccountNumber(profile.accountNumber);
      if (profile.branchCode) setBranchCode(profile.branchCode);
      if (profile.accountType) setAccountType(profile.accountType);
      if (profile.accountHolder) setAccountHolder(profile.accountHolder);

      // Load telehealth service flags (default to true if not yet saved)
      setOffersVideo(profile.offersVideo !== false);
      setOffersAudio(profile.offersAudio === true);
      setOffersInClinic(profile.offersInClinic === true);
      setAcceptsMedicalAid(profile.acceptsMedicalAid === true);
      if (profile.facilityName) setPracticeName(profile.facilityName);
      if (profile.facilityAddress) {
        setStreetAddress(profile.facilityAddress);
      }
      // Load consultation types / expertise tags if saved
      if (profile.consultationTypes && profile.consultationTypes.length > 0) {
        setSelectedExpertise(profile.consultationTypes);
      }
      // Load credentials
      if (profile.experienceYears !== undefined) {
        setExperienceYears(profile.experienceYears);
      }
      if (profile.isBoardCertified !== undefined) {
        setIsBoardCertified(profile.isBoardCertified);
      }
      if (profile.boardCertificationTitle) {
        setBoardCertificationTitle(profile.boardCertificationTitle);
      }
    }
    if (doctor) {
      if (!profile?.accountHolder) {
        setAccountHolder(doctor.fullName ? `Dr ${doctor.fullName} Inc.` : 'Dr Practitioner Inc.');
      }
    }
  }, [profile, doctor]);

  const toggleExpertise = (tag: string) => {
    setSelectedExpertise((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleSecondarySpecialty = (spec: string) => {
    setSecondarySpecialties((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const handleToggleHoliday = async () => {
    try {
      setTogglingHoliday(true);
      const nextStatus = !isOnHoliday;
      await toggleHolidayMode(nextStatus);
      setIsOnHoliday(nextStatus);
      setMessage({
        type: 'success',
        text: nextStatus
          ? 'Holiday Mode activated: Your public calendar slots are now hidden from patients.'
          : 'Holiday Mode deactivated: Your calendar slots are live for patient booking.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update holiday mode.' });
    } finally {
      setTogglingHoliday(false);
    }
  };

  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'image/png') {
      setSignatureError('Invalid format: Signature must be a high-resolution PNG file with a transparent background.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSignatureError('File size too large: PNG signature must be under 5MB.');
      return;
    }

    setSignatureError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSignatureUrl(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleClearSignature = () => {
    setSignatureUrl(null);
  };

  const handleAddCustomExpertise = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = customExpertiseInput.trim();
    if (!trimmed) return;
    if (!selectedExpertise.includes(trimmed)) {
      setSelectedExpertise((prev) => [...prev, trimmed]);
    }
    setCustomExpertiseInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const rate = parseFloat(ratePerHour);
    if (isNaN(rate) || rate < 0) {
      setMessage({ type: 'error', text: 'Please provide a valid hourly consultation rate' });
      setSaving(false);
      return;
    }

    if (!offersVideo && !offersAudio && !offersInClinic) {
      setMessage({
        type: 'error',
        text: 'Please select at least one consultation mode (Virtual Video, Audio, or In-Clinic Visits).',
      });
      setSaving(false);
      return;
    }

    try {
      const fullFacilityAddress = [streetAddress, suburbCity, postalCode, province]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join(', ');

      await updateProfile({
        specialty,
        secondarySpecialties,
        ratePerHour: rate,
        bio,
        offersVideo,
        offersAudio,
        offersInClinic,
        facilityName: practiceName.trim(),
        facilityAddress: fullFacilityAddress,
        acceptsMedicalAid,
        consultationTypes: selectedExpertise,
        experienceYears: Number(experienceYears) || 0,
        isBoardCertified,
        boardCertificationTitle,
        isOnHoliday,
        signatureUrl,
        bankName,
        accountNumber,
        branchCode,
        accountType,
        accountHolder,
      });
      setMessage({ type: 'success', text: 'Practice profile, clinical settings, signature and banking details updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !doctor) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)' }}>Loading clinical profile...</p>
      </div>
    );
  }

  const isVerified = profile?.verificationStatus === 'verified';
  const doctorInitials = doctor.fullName
    ? doctor.fullName
        .split(' ')
        .map((p) => p[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'DR';

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
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
            Clinical Identity & Governance
          </span>
        </div>
        <h1
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '2rem',
            fontWeight: 800,
            color: 'var(--color-chocolate-base, #2A170F)',
            margin: '0 0 6px',
            letterSpacing: '-0.02em',
          }}
        >
          Doctor Practice Profile
        </h1>
        <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.95rem' }}>
          Manage your clinical credentials, consultation billing rates, physical rooms, and payout banking details.
        </p>
      </div>

      {message && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            borderRadius: '14px',
            background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1.5px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '24px',
          }}
        >
          {message.type === 'success' ? (
            <SolarIcon name="check-circle-bold" size={20} color="#059669" />
          ) : (
            <SolarIcon name="danger-circle-bold" size={20} color="#dc2626" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Identity Banner with Avatar Preview, Gold Shield, and Verification Timeline */}
      <div
        className="portal-card"
        style={{
          marginBottom: '28px',
          padding: '30px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px',
            paddingBottom: '24px',
            borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '22px' }}>
            {/* Avatar Photo Preview / Initials */}
            <div
              style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: 'var(--color-gold-pale, #F0E5D3)',
                border: '2.5px solid var(--color-gold-base, #DFAB62)',
                color: 'var(--color-chocolate-base, #2A170F)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-heading)',
                fontSize: '1.75rem',
                fontWeight: 800,
                boxShadow: '0 4px 16px rgba(42, 23, 15, 0.08)',
                flexShrink: 0,
              }}
            >
              {doctorInitials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '6px' }}>
                <h2
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.45rem',
                    fontWeight: 800,
                    color: 'var(--color-chocolate-base, #2A170F)',
                    margin: 0,
                  }}
                >
                  {doctor.fullName}
                </h2>

                {/* HPCSA Verified Gold Shield Badge */}
                {isVerified ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full, 9999px)',
                      background: 'var(--color-gold-pale, #F0E5D3)',
                      color: 'var(--color-chocolate-base, #2A170F)',
                      border: '1.5px solid var(--color-gold-base, #DFAB62)',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                    }}
                  >
                    <SolarIcon name="shield-check-bold" size={15} color="var(--color-gold-bronze, #B88647)" />
                    <span>HPCSA VERIFIED</span>
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full, 9999px)',
                      background: '#fffbeb',
                      color: '#b45309',
                      border: '1px solid #fcd34d',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                    }}
                  >
                    <SolarIcon name="shield-warning-bold" size={15} color="#b45309" />
                    <span>AUDIT IN REVIEW</span>
                  </span>
                )}
              </div>

              <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.9rem', margin: 0 }}>
                {doctor.email} • HPCSA Reg: <strong>{profile?.hpcsaNumber || 'Pending Check'}</strong> •{' '}
                {specialty || 'General Practitioner'}
              </p>
            </div>
          </div>

          <div>
            <span
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-full, 9999px)',
                background: 'var(--color-cream-base, #FAF6EE)',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                color: 'var(--color-chocolate-base, #2A170F)',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              Auth: {profile?.verificationSource === 'locumstaff' ? 'LocumStaff SSO Synchronized' : 'Direct ChekUp247 Register'}
            </span>
          </div>
        </div>

        {/* Verification Timeline Row */}
        <div style={{ paddingTop: '22px' }}>
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--color-gold-bronze, #B88647)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '14px',
            }}
          >
            Credential Compliance Status
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: '#ecfdf5',
                  border: '1.5px solid #10b981',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}
              >
                ✓
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>
                  Profile Completed
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted)' }}>Email verified & active</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: isVerified ? '#ecfdf5' : 'var(--color-gold-primary, #E2B467)',
                  border: isVerified ? '1.5px solid #10b981' : '1.5px solid var(--color-gold-base, #DFAB62)',
                  color: isVerified ? '#059669' : 'var(--color-chocolate-base)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}
              >
                {isVerified ? '✓' : '2'}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>
                  HPCSA Register Audit
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted)' }}>
                  {isVerified ? 'Credentials validated' : 'Audit under review'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: isVerified ? '#ecfdf5' : 'var(--color-gold-pale, #F0E5D3)',
                  border: isVerified ? '1.5px solid #10b981' : '1.5px solid rgba(223, 171, 98, 0.3)',
                  color: isVerified ? '#059669' : 'var(--color-cream-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                }}
              >
                {isVerified ? '✓' : '3'}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>
                  Telehealth Activation
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted)' }}>
                  {isVerified ? 'Live on patient search' : 'Unpublished until verified'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Holiday Mode Management Card */}
      <div
        className="portal-card"
        style={{
          marginBottom: '28px',
          padding: '24px 30px',
          background: isOnHoliday
            ? 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
            : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
          border: isOnHoliday
            ? '1.5px solid #f59e0b'
            : '1.5px solid #86efac',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              background: isOnHoliday ? '#fbbf24' : '#22c55e',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              flexShrink: 0,
            }}
          >
            <SolarIcon
              name={isOnHoliday ? 'calendar-minimalistic-bold' : 'sun-2-bold'}
              size={28}
              color="#ffffff"
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: isOnHoliday ? '#92400e' : '#14532d',
                  margin: 0,
                }}
              >
                Holiday Mode & Practice Availability
              </h3>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  background: isOnHoliday ? '#fef3c7' : '#dcfce7',
                  color: isOnHoliday ? '#b45309' : '#15803d',
                  border: `1px solid ${isOnHoliday ? '#fcd34d' : '#86efac'}`,
                }}
              >
                {isOnHoliday ? 'PAUSED / ON HOLIDAY' : 'ACTIVE & ACCEPTING APPOINTMENTS'}
              </span>
            </div>
            <p
              style={{
                fontSize: '0.85rem',
                color: isOnHoliday ? '#78350f' : '#166534',
                margin: 0,
                maxWidth: '640px',
                lineHeight: 1.45,
              }}
            >
              {isOnHoliday
                ? 'Your public calendar is currently hidden. Patients cannot book new consultations while Holiday Mode is on. Any previously confirmed consultations remain active.'
                : 'Your calendar slots and instant consultations are live. Enable Holiday Mode when going on leave to automatically pause patient slot discovery.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleHoliday}
          disabled={togglingHoliday}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            borderRadius: '12px',
            fontSize: '0.9rem',
            fontWeight: 800,
            cursor: togglingHoliday ? 'not-allowed' : 'pointer',
            border: 'none',
            background: isOnHoliday ? '#22c55e' : '#f59e0b',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            transition: 'all 0.2s ease',
          }}
        >
          <SolarIcon
            name={isOnHoliday ? 'check-circle-bold' : 'pause-circle-bold'}
            size={18}
            color="#ffffff"
          />
          <span>
            {togglingHoliday
              ? 'Updating...'
              : isOnHoliday
              ? 'End Holiday (Resume Practice)'
              : 'Turn On Holiday Mode'}
          </span>
        </button>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Section 1: Clinical Practice Information */}
        <div className="portal-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
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
              <SolarIcon name="stethoscope-bold" size={18} color="var(--color-chocolate-base, #2A170F)" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', margin: 0 }}>
                Clinical Practice Information
              </h2>
              <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.825rem', margin: 0 }}>
                Specialty and rates presented to patients booking virtual consultations
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label className="portal-label">
                Primary Specialty
              </label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="portal-select"
                required
              >
                {!AVAILABLE_SPECIALTIES.includes(specialty) && specialty && (
                  <option value={specialty}>{specialty}</option>
                )}
                {AVAILABLE_SPECIALTIES.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="portal-label">
                Consultation Rate per Hour (ZAR)
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 800,
                    color: 'var(--color-gold-bronze, #B88647)',
                  }}
                >
                  R
                </span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={ratePerHour}
                  onChange={(e) => setRatePerHour(e.target.value)}
                  className="portal-input"
                  style={{ paddingLeft: '34px' }}
                  required
                />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '4px', display: 'block' }}>
                Net 85% practitioner take-home: R{(Number(ratePerHour || 0) * 0.85).toFixed(2)}/hr
              </span>
            </div>
          </div>

          {/* Secondary Specialties Selection Pills */}
          <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '12px', background: 'var(--color-cream-base)', border: '1px solid var(--color-profile-border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label className="portal-label" style={{ margin: 0 }}>
                Secondary Specialties & Sub-specialties
              </label>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-gold-bronze)', fontWeight: 700 }}>
                {secondarySpecialties.length} selected
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted)', margin: '0 0 10px' }}>
              Select sub-disciplines or secondary specialties you are credentialed to practice:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {AVAILABLE_SPECIALTIES.filter((s) => s !== specialty).map((spec) => {
                const isSelected = secondarySpecialties.includes(spec);
                return (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => toggleSecondarySpecialty(spec)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      background: isSelected ? 'var(--color-gold-pale)' : '#ffffff',
                      color: isSelected ? 'var(--color-chocolate-base)' : 'var(--color-cream-text-muted)',
                      border: `1.5px solid ${isSelected ? 'var(--color-gold-base)' : 'var(--color-profile-border-subtle)'}`,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <SolarIcon
                      name={isSelected ? 'check-circle-bold' : 'add-circle-linear'}
                      size={14}
                      color={isSelected ? 'var(--color-gold-bronze)' : 'var(--color-cream-text-muted)'}
                    />
                    <span>{spec}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Credentials: Years of Experience & Board Certification */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label className="portal-label">
                Years of Clinical Experience
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={experienceYears}
                onChange={(e) => setExperienceYears(Math.max(0, parseInt(e.target.value) || 0))}
                className="portal-input"
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted)', marginTop: '4px', display: 'block' }}>
                Displays on profile as: <strong>{experienceYears}+ Years Experience</strong>
              </span>
            </div>

            <div>
              <label className="portal-label">
                Board Certification & Credentials
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '42px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-chocolate-base)' }}>
                  <input
                    type="checkbox"
                    checked={isBoardCertified}
                    onChange={(e) => setIsBoardCertified(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--color-gold-base)', cursor: 'pointer' }}
                  />
                  <span>Show Board Certified Badge</span>
                </label>
              </div>
              {isBoardCertified && (
                <input
                  type="text"
                  value={boardCertificationTitle}
                  onChange={(e) => setBoardCertificationTitle(e.target.value)}
                  placeholder="e.g. Board Certified"
                  className="portal-input"
                  style={{ marginTop: '4px', fontSize: '0.85rem' }}
                />
              )}
            </div>
          </div>

          <div>
            <label className="portal-label">
              Clinical Biography & Experience
            </label>
            <textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Detail your clinical background, university education, training, and consultation approach..."
              className="portal-textarea"
            />
          </div>
        </div>

        {/* Section: HPCSA Official E-Prescription Signature */}
        <div className="portal-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                <SolarIcon name="pen-new-square-bold" size={18} color="var(--color-chocolate-base, #2A170F)" />
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', margin: 0 }}>
                  HPCSA Official E-Prescription Signature
                </h2>
                <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.825rem', margin: 0 }}>
                  Upload your high-resolution PNG signature with a transparent background for digital prescription PDFs
                </p>
              </div>
            </div>

            {signatureUrl ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: '#ecfdf5',
                  color: '#065f46',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  border: '1px solid #10b981',
                }}
              >
                <SolarIcon name="shield-check-bold" size={14} color="#059669" />
                SIGNATURE SEAL ACTIVE
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  background: '#fffbeb',
                  color: '#b45309',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  border: '1px solid #fcd34d',
                }}
              >
                <SolarIcon name="danger-circle-bold" size={14} color="#b45309" />
                SIGNATURE REQUIRED FOR PDF
              </span>
            )}
          </div>

          {signatureError && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                color: '#991b1b',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '16px',
              }}
            >
              {signatureError}
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: signatureUrl ? '1fr 1.2fr' : '1fr',
              gap: '24px',
              alignItems: 'center',
            }}
          >
            {/* Signature Preview if uploaded */}
            {signatureUrl && (
              <div
                style={{
                  padding: '20px',
                  borderRadius: '14px',
                  background: 'repeating-conic-gradient(#f3f4f6 0% 25%, #ffffff 0% 50%) 50% / 16px 16px',
                  border: '1.5px solid var(--color-gold-base, #DFAB62)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '140px',
                  position: 'relative',
                }}
              >
                <img
                  src={signatureUrl}
                  alt="Doctor Electronic Signature"
                  style={{
                    maxHeight: '85px',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '6px',
                    right: '10px',
                    fontSize: '0.7rem',
                    color: 'var(--color-cream-text-muted)',
                    fontWeight: 600,
                  }}
                >
                  HPCSA Rule 23.3 Compliant
                </div>
              </div>
            )}

            {/* Upload or change signature */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '24px',
                  borderRadius: '14px',
                  border: '2px dashed var(--color-gold-base, #DFAB62)',
                  background: 'var(--color-gold-pale, #F0E5D3)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'background 0.2s ease',
                }}
              >
                <SolarIcon name="cloud-upload-bold" size={28} color="var(--color-gold-bronze, #B88647)" />
                <div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                    {signatureUrl ? 'Click to Replace Signature (High-Res PNG)' : 'Upload High-Resolution PNG Signature'}
                  </span>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', margin: '4px 0 0' }}>
                    Transparent background (.png only, max 5MB). Scaled onto the digital seal of all E-Prescription PDFs.
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/png"
                  onChange={handleSignatureFileChange}
                  style={{ display: 'none' }}
                />
              </label>

              {signatureUrl && (
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={handleClearSignature}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Remove Signature
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Telehealth Services */}
        <div className="portal-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'var(--color-gold-pale)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="videocamera-bold" size={18} color="var(--color-chocolate-base)" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-chocolate-base)', margin: 0 }}>
                Telehealth Services
              </h2>
              <p style={{ color: 'var(--color-cream-text-muted)', fontSize: '0.825rem', margin: 0 }}>
                Choose which consultation modes patients can book with you
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Toggle row helper */}
            {[
              {
                label: 'Video Consultation',
                description: 'Patients book HD video calls — primary telehealth mode',
                icon: 'videocamera-record-bold',
                value: offersVideo,
                onChange: setOffersVideo,
              },
              {
                label: 'In-Clinic Visit',
                description: 'Allow patients to book in-person consultations at your practice rooms (address will only show when selected)',
                icon: 'hospital-bold',
                value: offersInClinic,
                onChange: setOffersInClinic,
              },
              {
                label: 'Audio Consultation',
                description: 'Patients can book audio-only calls (no camera required)',
                icon: 'phone-calling-bold',
                value: offersAudio,
                onChange: setOffersAudio,
              },
              {
                label: 'Accepts Medical Aid',
                description: 'Show Medical Aid accepted badge on your public profile',
                icon: 'card-bold',
                value: acceptsMedicalAid,
                onChange: setAcceptsMedicalAid,
              },
            ].map(({ label, description, icon, value, onChange }) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  padding: '16px 18px',
                  borderRadius: '12px',
                  background: value ? 'var(--color-gold-pale)' : 'var(--color-cream-base)',
                  border: `1.5px solid ${value ? 'var(--color-gold-base)' : 'var(--color-profile-border-subtle)'}`,
                  transition: 'background 0.2s ease, border-color 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: value ? 'var(--color-gold-primary)' : 'var(--color-profile-tag-bg)',
                      border: `1px solid ${value ? 'var(--color-gold-base)' : 'var(--color-profile-border-subtle)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <SolarIcon
                      name={icon}
                      size={18}
                      color={value ? 'var(--color-chocolate-base)' : 'var(--color-cream-text-muted)'}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-chocolate-base)', marginBottom: '2px' }}>
                      {label}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted)' }}>
                      {description}
                    </div>
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={value}
                  onClick={() => onChange(!value)}
                  style={{
                    position: 'relative',
                    width: '48px',
                    height: '26px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: value ? 'var(--color-gold-base)' : 'var(--color-profile-border)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'background 0.2s ease',
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: value ? '25px' : '3px',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: 'var(--color-white)',
                      boxShadow: '0 1px 4px rgba(42,23,15,0.2)',
                      transition: 'left 0.2s ease',
                      display: 'block',
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Areas of Expertise & Clinical Focus */}
        <div className="portal-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--color-gold-pale)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SolarIcon name="medal-ribbons-star-bold" size={18} color="var(--color-chocolate-base)" />
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-chocolate-base)', margin: 0 }}>
                  Areas of Expertise & Clinical Focus
                </h2>
                <p style={{ color: 'var(--color-cream-text-muted)', fontSize: '0.825rem', margin: 0 }}>
                  Select the services, conditions, and special interests displayed on your public doctor profile
                </p>
              </div>
            </div>

            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '9999px',
                background: 'var(--color-gold-pale)',
                color: 'var(--color-chocolate-base)',
                fontSize: '0.8rem',
                fontWeight: 700,
                border: '1px solid var(--color-gold-base)',
              }}
            >
              <SolarIcon name="check-circle-bold" size={14} color="var(--color-chocolate-base)" />
              {selectedExpertise.length} Selected
            </span>
          </div>

          {/* Tag Badges Grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '22px' }}>
            {Array.from(new Set([...PRESET_EXPERTISE_OPTIONS, ...selectedExpertise])).map((tag) => {
              const isSelected = selectedExpertise.includes(tag);
              const isCustom = !PRESET_EXPERTISE_OPTIONS.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleExpertise(tag)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '9999px',
                    fontSize: '0.825rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    background: isSelected ? 'var(--color-gold-pale)' : 'var(--color-cream-base)',
                    color: isSelected ? 'var(--color-chocolate-base)' : 'var(--color-cream-text-muted)',
                    border: `1.5px solid ${isSelected ? 'var(--color-gold-base)' : 'var(--color-profile-border-subtle)'}`,
                    transition: 'all 0.18s ease',
                  }}
                >
                  <SolarIcon
                    name={isSelected ? 'check-circle-bold' : 'add-circle-linear'}
                    size={15}
                    color={isSelected ? 'var(--color-gold-bronze)' : 'var(--color-cream-text-muted)'}
                  />
                  <span>{tag}</span>
                  {isCustom && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedExpertise((prev) => prev.filter((t) => t !== tag));
                      }}
                      style={{
                        marginLeft: '4px',
                        fontSize: '0.75rem',
                        opacity: 0.7,
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Add custom expertise input */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              paddingTop: '16px',
              borderTop: '1px solid var(--color-profile-border-subtle)',
            }}
          >
            <input
              type="text"
              value={customExpertiseInput}
              onChange={(e) => setCustomExpertiseInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomExpertise(e);
                }
              }}
              placeholder="Add custom clinical focus (e.g. Travel Medicine, ADHD in Adults)..."
              className="portal-input"
              style={{ flex: 1, padding: '10px 14px', fontSize: '0.875rem' }}
            />
            <button
              type="button"
              onClick={handleAddCustomExpertise}
              disabled={!customExpertiseInput.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: '12px',
                background: customExpertiseInput.trim() ? 'var(--color-gold-base)' : 'var(--color-profile-border-subtle)',
                color: customExpertiseInput.trim() ? 'var(--color-chocolate-base)' : 'var(--color-cream-text-muted)',
                fontWeight: 700,
                fontSize: '0.85rem',
                border: 'none',
                cursor: customExpertiseInput.trim() ? 'pointer' : 'not-allowed',
                whiteSpace: 'nowrap',
                transition: 'all 0.18s ease',
              }}
            >
              <SolarIcon name="add-circle-bold" size={16} color="currentColor" />
              <span>Add Focus Area</span>
            </button>
          </div>
        </div>

        {/* Section 4: Physical Practice Address */}
        <div className="portal-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
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
              <SolarIcon name="map-point-bold" size={18} color="var(--color-chocolate-base, #2A170F)" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', margin: 0 }}>
                Physical Practice Address
              </h2>
              <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.825rem', margin: 0 }}>
                Rooms and facility address. Strictly confidential for virtual care — only displayed to patients when an In-Clinic Visit is booked.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '18px' }}>
            <div>
              <label className="portal-label">
                Practice / Rooms Name
              </label>
              <input
                type="text"
                value={practiceName}
                onChange={(e) => setPracticeName(e.target.value)}
                placeholder="e.g. Sandton Mediclinic Suites"
                className="portal-input"
              />
            </div>
            <div>
              <label className="portal-label">
                Street Address
              </label>
              <input
                type="text"
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="e.g. 165 Rivonia Road, Suite 402"
                className="portal-input"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label className="portal-label">
                Suburb & City
              </label>
              <input
                type="text"
                value={suburbCity}
                onChange={(e) => setSuburbCity(e.target.value)}
                placeholder="e.g. Morningside, Sandton"
                className="portal-input"
              />
            </div>
            <div>
              <label className="portal-label">
                Postal Code
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="e.g. 2196"
                className="portal-input"
              />
            </div>
            <div>
              <label className="portal-label">
                Province
              </label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="portal-select"
              >
                <option value="Gauteng">Gauteng</option>
                <option value="Western Cape">Western Cape</option>
                <option value="KwaZulu-Natal">KwaZulu-Natal</option>
                <option value="Eastern Cape">Eastern Cape</option>
                <option value="Free State">Free State</option>
                <option value="Limpopo">Limpopo</option>
                <option value="Mpumalanga">Mpumalanga</option>
                <option value="North West">North West</option>
                <option value="Northern Cape">Northern Cape</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 5: Banking Details for Payout Settlements */}
        <div className="portal-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
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
              <SolarIcon name="card-bold" size={18} color="var(--color-chocolate-base, #2A170F)" />
            </div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', margin: 0 }}>
                Payout Banking Details (South Africa EFT)
              </h2>
              <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.825rem', margin: 0 }}>
                Designated bank account for automated consultation earnings settlements
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '18px' }}>
            <div>
              <label className="portal-label">
                Account Holder Name
              </label>
              <input
                type="text"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="e.g. Dr K Molefe Inc"
                className="portal-input"
              />
            </div>
            <div>
              <label className="portal-label">
                Bank Institution
              </label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="portal-select"
              >
                <option value="First National Bank (FNB)">First National Bank (FNB)</option>
                <option value="Standard Bank">Standard Bank</option>
                <option value="Nedbank">Nedbank</option>
                <option value="ABSA Bank">ABSA Bank</option>
                <option value="Capitec Bank">Capitec Bank</option>
                <option value="Investec Bank">Investec Bank</option>
                <option value="Discovery Bank">Discovery Bank</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '16px' }}>
            <div>
              <label className="portal-label">
                Account Number
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. 62891048291"
                className="portal-input"
              />
            </div>
            <div>
              <label className="portal-label">
                Account Type
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="portal-select"
              >
                <option value="Cheque / Current">Cheque / Current</option>
                <option value="Savings">Savings</option>
                <option value="Transmission">Transmission</option>
              </select>
            </div>
            <div>
              <label className="portal-label">
                Branch Code
              </label>
              <input
                type="text"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
                placeholder="e.g. 250655"
                className="portal-input"
              />
            </div>
          </div>
        </div>

        {/* Save CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px', marginTop: '10px' }}>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
            style={{ padding: '12px 32px', fontSize: '0.95rem' }}
          >
            <SolarIcon name="check-circle-bold" size={18} color="var(--color-chocolate-base, #2A170F)" />
            <span>{saving ? 'Saving Profile...' : 'Save All Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
