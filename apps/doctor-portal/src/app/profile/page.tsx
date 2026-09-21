'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { toastSuccess, toastError, errorMessage } from '../../lib/toast';
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

type ProfileTab = 'clinical' | 'availability' | 'practice' | 'payouts';

interface UploadedDocument {
  id: string;
  name: string;
  type: 'id_document' | 'hpcsa_certificate' | 'medical_degree' | 'other';
  title: string;
  url: string;
  uploadedAt: string;
  status: 'verified' | 'pending' | 'rejected';
}

export default function DoctorProfilePage() {
  const router = useRouter();
  const { doctor, profile, isAuthenticated, isLoading, updateProfile, toggleHolidayMode } = useDoctorAuth();

  const [activeTab, setActiveTab] = useState<ProfileTab>('clinical');
  const [copiedHpcsa, setCopiedHpcsa] = useState(false);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string>('/images/doctor_sarah_avatar.jpg');

  // Clinical specialty & rates
  const [specialty, setSpecialty] = useState('');
  const [secondarySpecialties, setSecondarySpecialties] = useState<string[]>([]);
  const [ratePerHour, setRatePerHour] = useState('850');
  const [bio, setBio] = useState('');

  // Practice Availability & Holiday Mode
  const [isOnHoliday, setIsOnHoliday] = useState(false);
  const [togglingHoliday, setTogglingHoliday] = useState(false);

  // Digital Signature
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [isDraggingSignature, setIsDraggingSignature] = useState(false);

  // Regulatory Documents & ID
  const [idDocument, setIdDocument] = useState<UploadedDocument | null>({
    id: 'doc-id-1',
    name: 'South_African_National_ID.pdf',
    type: 'id_document',
    title: 'National Identity Document / Smart ID Card',
    url: '#',
    uploadedAt: '12 Jan 2026',
    status: 'verified',
  });

  const [hpcsaCertificate, setHpcsaCertificate] = useState<UploadedDocument | null>({
    id: 'doc-hpcsa-1',
    name: 'HPCSA_Annual_Practicing_Certificate_2026.pdf',
    type: 'hpcsa_certificate',
    title: 'HPCSA Annual Practicing Certificate (2026/2027)',
    url: '#',
    uploadedAt: '15 Jan 2026',
    status: 'verified',
  });

  const [additionalDocs, setAdditionalDocs] = useState<UploadedDocument[]>([
    {
      id: 'doc-med-1',
      name: 'MBChB_Degree_Certificate.pdf',
      type: 'medical_degree',
      title: 'Bachelor of Medicine & Surgery (MBChB)',
      url: '#',
      uploadedAt: '10 Jan 2026',
      status: 'verified',
    },
  ]);

  const [newCertTitle, setNewCertTitle] = useState('');
  const [showAddCertModal, setShowAddCertModal] = useState(false);

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
    const currentAvatar = profile?.photoUrl || doctor?.avatarUrl || (profile as any)?.photo_url;
    if (currentAvatar) {
      setAvatarUrl(currentAvatar);
    } else {
      setAvatarUrl('/images/doctor_sarah_avatar.jpg');
    }

    if (profile) {
      setSpecialty(profile.specialty || 'General Practitioner');
      setSecondarySpecialties(profile.secondarySpecialties || []);
      setRatePerHour(profile.ratePerHour ? String(profile.ratePerHour) : '850');
      setBio(profile.bio || '');
      setIsOnHoliday(profile.isOnHoliday === true);
      setSignatureUrl(profile.signatureUrl || null);

      if (profile.bankName) setBankName(profile.bankName);
      if (profile.accountNumber) setAccountNumber(profile.accountNumber);
      if (profile.branchCode) setBranchCode(profile.branchCode);
      if (profile.accountType) setAccountType(profile.accountType);
      if (profile.accountHolder) setAccountHolder(profile.accountHolder);

      setOffersVideo(profile.offersVideo !== false);
      setOffersAudio(profile.offersAudio === true);
      setOffersInClinic(profile.offersInClinic === true);
      setAcceptsMedicalAid(profile.acceptsMedicalAid === true);
      if (profile.facilityName) setPracticeName(profile.facilityName);
      if (profile.facilityAddress) {
        setStreetAddress(profile.facilityAddress);
      }
      if (profile.consultationTypes && profile.consultationTypes.length > 0) {
        setSelectedExpertise(profile.consultationTypes);
      }
      if (profile.experienceYears !== undefined) {
        setExperienceYears(profile.experienceYears);
      }
      if (profile.isBoardCertified !== undefined) {
        setIsBoardCertified(profile.isBoardCertified);
      }
      if (profile.boardCertificationTitle) {
        setBoardCertificationTitle(profile.boardCertificationTitle);
      }

      // Load documents if stored
      if (profile.documentsUrl && Array.isArray(profile.documentsUrl) && profile.documentsUrl.length > 0) {
        try {
          const parsed = profile.documentsUrl.map((docStr, idx) => {
            if (docStr.startsWith('{')) {
              return JSON.parse(docStr);
            }
            return {
              id: `doc-${idx}`,
              name: docStr.split('/').pop() || `Document_${idx + 1}.pdf`,
              type: idx === 0 ? 'id_document' : idx === 1 ? 'hpcsa_certificate' : 'other',
              title: idx === 0 ? 'National Identity Document' : idx === 1 ? 'HPCSA Certificate' : 'Medical Certificate',
              url: docStr,
              uploadedAt: 'Recent',
              status: 'verified',
            };
          });

          const idD = parsed.find((d: UploadedDocument) => d.type === 'id_document');
          const hpcsaD = parsed.find((d: UploadedDocument) => d.type === 'hpcsa_certificate');
          const others = parsed.filter((d: UploadedDocument) => d.type !== 'id_document' && d.type !== 'hpcsa_certificate');

          if (idD) setIdDocument(idD);
          if (hpcsaD) setHpcsaCertificate(hpcsaD);
          if (others.length > 0) setAdditionalDocs(others);
        } catch (e) {
          // ignore parsing error
        }
      }
    }
    if (doctor && !profile?.accountHolder) {
      setAccountHolder(doctor.fullName ? `Dr ${doctor.fullName} Inc.` : 'Dr Practitioner Inc.');
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

  const handleCopyHpcsa = () => {
    const regNum = profile?.hpcsaNumber || 'MP 0089432';
    navigator.clipboard.writeText(regNum);
    setCopiedHpcsa(true);
    setTimeout(() => setCopiedHpcsa(false), 2000);
    toastSuccess('Copied to clipboard', `HPCSA Reg ${regNum} copied.`);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toastError('Invalid format', 'Please upload an image file (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setAvatarUrl(url);
      toastSuccess('Photo updated', 'Profile image updated. Click Save Changes to keep.');
    };
    reader.readAsDataURL(file);
  };

  const handleToggleHoliday = async () => {
    try {
      setTogglingHoliday(true);
      const nextStatus = !isOnHoliday;
      setIsOnHoliday(nextStatus);
      await toggleHolidayMode(nextStatus);
      toastSuccess(
        nextStatus ? 'Holiday mode enabled' : 'Holiday mode disabled',
        nextStatus ? 'Your slots are hidden from patients.' : 'Your slots are live for booking.'
      );
    } catch (err: any) {
      const msg = errorMessage(err, 'Failed to update holiday mode.');
      toastError('Could not update holiday mode', msg);
    } finally {
      setTogglingHoliday(false);
    }
  };

  const processSignatureFile = (file: File) => {
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
      setSignatureUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processSignatureFile(file);
  };

  const handleSignatureDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingSignature(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processSignatureFile(file);
  };

  const handleClearSignature = () => {
    setSignatureUrl(null);
  };

  // Government ID upload
  const handleIdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toastError('File too large', 'Document must be under 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setIdDocument({
        id: `id-${Date.now()}`,
        name: file.name,
        type: 'id_document',
        title: 'National Identity Document / Smart ID Card',
        url: reader.result as string,
        uploadedAt: new Date().toLocaleDateString('en-ZA'),
        status: 'pending',
      });
      toastSuccess('ID uploaded', `${file.name} uploaded successfully.`);
    };
    reader.readAsDataURL(file);
  };

  // HPCSA Certificate upload
  const handleHpcsaFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toastError('File too large', 'Document must be under 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setHpcsaCertificate({
        id: `hpcsa-${Date.now()}`,
        name: file.name,
        type: 'hpcsa_certificate',
        title: 'HPCSA Annual Practicing Certificate',
        url: reader.result as string,
        uploadedAt: new Date().toLocaleDateString('en-ZA'),
        status: 'pending',
      });
      toastSuccess('Certificate uploaded', `${file.name} uploaded successfully.`);
    };
    reader.readAsDataURL(file);
  };

  // Additional Degree upload
  const handleAddCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toastError('File too large', 'Document must be under 10MB.');
      return;
    }
    const title = newCertTitle.trim() || file.name.replace(/\.[^/.]+$/, '');
    const reader = new FileReader();
    reader.onload = () => {
      setAdditionalDocs((prev) => [
        ...prev,
        {
          id: `cert-${Date.now()}`,
          name: file.name,
          type: 'medical_degree',
          title,
          url: reader.result as string,
          uploadedAt: new Date().toLocaleDateString('en-ZA'),
          status: 'pending',
        },
      ]);
      setNewCertTitle('');
      setShowAddCertModal(false);
      toastSuccess('Certificate added', `${title} uploaded.`);
    };
    reader.readAsDataURL(file);
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);

    const rate = parseFloat(ratePerHour);
    if (isNaN(rate) || rate < 0) {
      toastError('Invalid rate', 'Please provide a valid hourly consultation rate.');
      setSaving(false);
      return;
    }

    if (!offersVideo && !offersAudio && !offersInClinic) {
      toastError(
        'Consultation mode required',
        'Please select at least one consultation mode (Virtual Video, Audio, or In-Clinic Visits).'
      );
      setSaving(false);
      return;
    }

    try {
      const fullFacilityAddress = [streetAddress, suburbCity, postalCode, province]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join(', ');

      const documentsToSave: string[] = [];
      if (idDocument) documentsToSave.push(JSON.stringify(idDocument));
      if (hpcsaCertificate) documentsToSave.push(JSON.stringify(hpcsaCertificate));
      additionalDocs.forEach((d) => documentsToSave.push(JSON.stringify(d)));

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
        photoUrl: avatarUrl,
        documentsUrl: documentsToSave,
        bankName,
        accountNumber,
        branchCode,
        accountType,
        accountHolder,
      });
      toastSuccess('Profile updated', 'Your practice details have been saved.');
    } catch (err: any) {
      const msg = errorMessage(err, 'Failed to update profile settings.');
      toastError('Could not update profile', msg);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !doctor) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: 'var(--text-sm)' }}>
          Loading clinical profile...
        </p>
      </div>
    );
  }

  const isVerified = profile?.verificationStatus === 'verified';
  const hourlyRateNum = Number(ratePerHour) || 0;
  const netTakeHome = (hourlyRateNum * 0.85).toFixed(2);
  const ext10Min = (hourlyRateNum / 6).toFixed(2);
  const ext20Min = (hourlyRateNum / 3).toFixed(2);
  const ext30Min = (hourlyRateNum / 2).toFixed(2);

  return (
    <div className="profile-page">
      {/* Top Header Row with Page Title, Quick Status, and Top-Right Save Changes Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ flex: 1, minWidth: '260px' }}>
          <div className="page-eyebrow">
            <SolarIcon name="shield-check-bold" size={14} color="var(--color-gold-bronze)" />
            <span>Clinical Identity &amp; Governance</span>
          </div>
          <h1 className="page-title">My Profile</h1>
          <p className="page-subtitle">
            Manage your clinical credentials, consultation billing rates, practice rooms, and payout banking details.
          </p>
        </div>

        {/* Top-Right Action Group */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexShrink: 0,
            alignSelf: 'flex-start',
          }}
        >
          {/* Quick Availability Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: 'var(--radius-full)',
              backgroundColor: isOnHoliday ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
              border: `1.5px solid ${isOnHoliday ? 'var(--color-warning)' : 'var(--color-success)'}`,
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: isOnHoliday ? '#92400e' : '#065f46',
              whiteSpace: 'nowrap',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: isOnHoliday ? 'var(--color-warning)' : 'var(--color-success)',
              }}
            />
            <span>{isOnHoliday ? 'Holiday Mode (Paused)' : 'Accepting Appointments'}</span>
          </div>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={saving}
            className="btn-primary"
            style={{ padding: '9px 22px', fontSize: 'var(--text-sm)', whiteSpace: 'nowrap' }}
          >
            <SolarIcon name="check-circle-bold" size={16} color="var(--color-chocolate-base)" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Identity & Compliance Stepper Card */}
      <div
        className="portal-card"
        style={{
          marginBottom: '24px',
          padding: '24px',
          backgroundColor: 'var(--color-cream-surface)',
          border: '1.5px solid var(--color-gold-border)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '18px',
            paddingBottom: '20px',
            borderBottom: '1px solid var(--color-gold-border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            {/* Avatar Image with Upload/Change Action */}
            <div style={{ position: 'relative', width: '68px', height: '68px', flexShrink: 0 }}>
              <img
                src={avatarUrl}
                alt={doctor.fullName || 'Doctor profile'}
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2.5px solid var(--color-gold-base)',
                  display: 'block',
                }}
              />
              <label
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-gold-primary)',
                  border: '2px solid var(--color-cream-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                }}
                title="Upload / Change Profile Photo"
              >
                <SolarIcon name="camera-minimalistic-bold" size={13} color="var(--color-chocolate-base)" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' }}>
                <h2
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 700,
                    color: 'var(--color-chocolate-base)',
                    margin: 0,
                  }}
                >
                  {doctor.fullName}
                </h2>

                {isVerified ? (
                  <span className="badge-success" style={{ gap: '4px' }}>
                    <SolarIcon name="shield-check-bold" size={13} color="#059669" />
                    <span>HPCSA VERIFIED</span>
                  </span>
                ) : (
                  <span className="badge-warning" style={{ gap: '4px' }}>
                    <SolarIcon name="shield-warning-bold" size={13} color="#b45309" />
                    <span>AUDIT IN REVIEW</span>
                  </span>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                  color: 'var(--color-cream-text-muted)',
                  fontSize: 'var(--text-xs)',
                }}
              >
                <span>{doctor.email}</span>
                <span>•</span>
                <button
                  type="button"
                  onClick={handleCopyHpcsa}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'var(--color-chocolate-base)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 'inherit',
                  }}
                  title="Click to copy HPCSA number"
                >
                  <span>HPCSA: {profile?.hpcsaNumber || 'MP 0089432'}</span>
                  <SolarIcon
                    name={copiedHpcsa ? 'check-circle-bold' : 'copy-linear'}
                    size={12}
                    color={copiedHpcsa ? 'var(--color-success)' : 'var(--color-gold-bronze)'}
                  />
                </button>
                <span>•</span>
                <span style={{ color: 'var(--color-gold-bronze)', fontWeight: 600 }}>
                  {specialty || 'General Practitioner'}
                </span>
              </div>
            </div>
          </div>

          {/* LocumStaff SSO Badge (ONLY show if verificationSource === 'locumstaff') */}
          {profile?.verificationSource === 'locumstaff' && (
            <div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-cream-base)',
                  border: '1px solid var(--color-gold-border)',
                  color: 'var(--color-chocolate-base)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                }}
              >
                <SolarIcon name="link-bold" size={12} color="var(--color-gold-bronze)" />
                <span>LocumStaff SSO Synchronized</span>
              </span>
            </div>
          )}
        </div>

        {/* Credential Compliance Stepper */}
        <div style={{ paddingTop: '18px' }}>
          <div
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 700,
              color: 'var(--color-gold-bronze)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '12px',
            }}
          >
            Credential Compliance Status
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-cream-base)',
                border: '1px solid var(--color-gold-border)',
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-success-bg)',
                  border: '1.5px solid var(--color-success)',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                ✓
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>
                  Profile Completed
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-cream-text-muted)' }}>Email verified &amp; active</div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-cream-base)',
                border: '1px solid var(--color-gold-border)',
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: isVerified ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
                  border: `1.5px solid ${isVerified ? 'var(--color-success)' : 'var(--color-warning)'}`,
                  color: isVerified ? '#059669' : '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {isVerified ? '✓' : '2'}
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>
                  HPCSA Register Audit
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-cream-text-muted)' }}>
                  {isVerified ? 'Credentials validated' : 'Audit under review'}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-cream-base)',
                border: '1px solid var(--color-gold-border)',
              }}
            >
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor: isVerified ? 'var(--color-success-bg)' : 'var(--color-cream-surface)',
                  border: `1.5px solid ${isVerified ? 'var(--color-success)' : 'var(--color-gold-border)'}`,
                  color: isVerified ? '#059669' : 'var(--color-cream-text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {isVerified ? '✓' : '3'}
              </div>
              <div>
                <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>
                  Telehealth Activation
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-cream-text-muted)' }}>
                  {isVerified ? 'Live on patient search' : 'Unpublished until verified'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation Strip */}
      <div className="profile-tab-group">
        <button
          type="button"
          onClick={() => setActiveTab('clinical')}
          className={`profile-tab-btn ${activeTab === 'clinical' ? 'active' : ''}`}
        >
          <SolarIcon
            name="stethoscope-bold"
            size={16}
            color={activeTab === 'clinical' ? 'var(--color-chocolate-base)' : 'var(--color-gold-bronze)'}
          />
          <span>Clinical Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('availability')}
          className={`profile-tab-btn ${activeTab === 'availability' ? 'active' : ''}`}
        >
          <SolarIcon
            name="calendar-minimalistic-bold"
            size={16}
            color={activeTab === 'availability' ? 'var(--color-chocolate-base)' : 'var(--color-gold-bronze)'}
          />
          <span>Availability &amp; Services</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('practice')}
          className={`profile-tab-btn ${activeTab === 'practice' ? 'active' : ''}`}
        >
          <SolarIcon
            name="document-text-bold"
            size={16}
            color={activeTab === 'practice' ? 'var(--color-chocolate-base)' : 'var(--color-gold-bronze)'}
          />
          <span>Credentials &amp; Documents</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('payouts')}
          className={`profile-tab-btn ${activeTab === 'payouts' ? 'active' : ''}`}
        >
          <SolarIcon
            name="wallet-money-bold"
            size={16}
            color={activeTab === 'payouts' ? 'var(--color-chocolate-base)' : 'var(--color-gold-bronze)'}
          />
          <span>Payouts &amp; Banking</span>
        </button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSubmit}>
        {/* ====================================================================
            TAB 1: CLINICAL PROFILE
            ==================================================================== */}
        {activeTab === 'clinical' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Primary Specialty & Hourly Rates Card */}
            <div
              className="portal-card"
              style={{
                padding: '24px',
                backgroundColor: 'var(--color-cream-surface)',
                border: '1.5px solid var(--color-gold-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-gold-pale)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SolarIcon name="stethoscope-bold" size={17} color="var(--color-chocolate-base)" />
                </div>
                <div>
                  <h2 className="section-title">Specialty &amp; Consultation Rates</h2>
                  <p className="section-subtitle">
                    Rates and disciplines displayed to patients booking consultations
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label className="portal-label">Primary Specialty</label>
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
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', marginTop: '4px', display: 'block' }}>
                    Main discipline featured on patient search cards
                  </span>
                </div>

                <div>
                  <label className="portal-label">Consultation Rate per Hour (ZAR)</label>
                  <div style={{ position: 'relative' }}>
                    <span
                      style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontWeight: 700,
                        color: 'var(--color-gold-bronze)',
                        fontSize: 'var(--text-sm)',
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
                      style={{ paddingLeft: '32px' }}
                      required
                    />
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '6px',
                      fontSize: 'var(--text-xs)',
                    }}
                  >
                    <span style={{ color: 'var(--color-cream-text-muted)' }}>Net 85% practitioner split:</span>
                    <strong style={{ color: 'var(--color-chocolate-base)' }}>R{netTakeHome}/hr</strong>
                  </div>
                </div>
              </div>

              {/* In-call Extension Pro-rata Breakdown */}
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--color-cream-base)',
                  border: '1px solid var(--color-gold-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <SolarIcon name="info-circle-linear" size={15} color="var(--color-gold-bronze)" />
                  <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>
                    Live In-Call Time Extension Rates
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', margin: '0 0 10px' }}>
                  When extending active telehealth consultations, the patient is billed pro-rata from this hourly rate:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-cream-surface)',
                      border: '1px solid var(--color-gold-border)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-cream-text-muted)', fontWeight: 600 }}>+10 min</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>R{ext10Min}</div>
                  </div>
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-cream-surface)',
                      border: '1px solid var(--color-gold-border)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-cream-text-muted)', fontWeight: 600 }}>+20 min</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>R{ext20Min}</div>
                  </div>
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-cream-surface)',
                      border: '1px solid var(--color-gold-border)',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-cream-text-muted)', fontWeight: 600 }}>+30 min</div>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>R{ext30Min}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Secondary Specialties Chips */}
            <div
              className="portal-card"
              style={{
                padding: '24px',
                backgroundColor: 'var(--color-cream-surface)',
                border: '1.5px solid var(--color-gold-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="portal-label" style={{ margin: 0 }}>
                  Secondary Specialties &amp; Sub-disciplines
                </label>
                <span className="badge-gold">
                  {secondarySpecialties.length} selected
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', margin: '0 0 14px' }}>
                Select secondary areas or sub-disciplines you are credentialed to consult on:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {AVAILABLE_SPECIALTIES.filter((s) => s !== specialty).map((spec) => {
                  const isSelected = secondarySpecialties.includes(spec);
                  return (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => toggleSecondarySpecialty(spec)}
                      className={`specialty-chip ${isSelected ? 'active' : ''}`}
                    >
                      <SolarIcon
                        name={isSelected ? 'check-circle-bold' : 'add-circle-linear'}
                        size={14}
                        color={isSelected ? 'var(--color-chocolate-base)' : 'var(--color-gold-bronze)'}
                      />
                      <span>{spec}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clinical Experience & Board Certification */}
            <div
              className="portal-card"
              style={{
                padding: '24px',
                backgroundColor: 'var(--color-cream-surface)',
                border: '1.5px solid var(--color-gold-border)',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label className="portal-label">Years of Clinical Experience</label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(Math.max(0, parseInt(e.target.value) || 0))}
                    className="portal-input"
                    required
                  />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', marginTop: '4px', display: 'block' }}>
                    Displays on profile as: <strong>{experienceYears}+ Years Experience</strong>
                  </span>
                </div>

                <div>
                  <label className="portal-label">Board Certification &amp; Credentials</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '42px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-chocolate-base)' }}>
                      <input
                        type="checkbox"
                        checked={isBoardCertified}
                        onChange={(e) => setIsBoardCertified(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--color-gold-base)', cursor: 'pointer' }}
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
                      style={{ marginTop: '4px', fontSize: 'var(--text-sm)' }}
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="portal-label">Clinical Biography &amp; Practice Summary</label>
                <textarea
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Detail your clinical background, medical education, training, and consultation approach..."
                  className="portal-textarea"
                />
              </div>
            </div>

            {/* Areas of Expertise & Clinical Focus */}
            <div
              className="portal-card"
              style={{
                padding: '24px',
                backgroundColor: 'var(--color-cream-surface)',
                border: '1.5px solid var(--color-gold-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label className="portal-label" style={{ margin: 0 }}>
                  Areas of Expertise &amp; Clinical Focus
                </label>
                <span className="badge-gold">
                  {selectedExpertise.length} Selected
                </span>
              </div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', margin: '0 0 14px' }}>
                Conditions, therapies, and clinical areas highlighted on your public profile:
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
                {Array.from(new Set([...PRESET_EXPERTISE_OPTIONS, ...selectedExpertise])).map((tag) => {
                  const isSelected = selectedExpertise.includes(tag);
                  const isCustom = !PRESET_EXPERTISE_OPTIONS.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleExpertise(tag)}
                      className={`specialty-chip ${isSelected ? 'active' : ''}`}
                    >
                      <SolarIcon
                        name={isSelected ? 'check-circle-bold' : 'add-circle-linear'}
                        size={14}
                        color={isSelected ? 'var(--color-chocolate-base)' : 'var(--color-gold-bronze)'}
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
                          title="Remove custom tag"
                        >
                          ✕
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Tag Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  paddingTop: '14px',
                  borderTop: '1px solid var(--color-gold-border)',
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
                  style={{ flex: 1, padding: '8px 12px', fontSize: 'var(--text-sm)' }}
                />
                <button
                  type="button"
                  onClick={handleAddCustomExpertise}
                  disabled={!customExpertiseInput.trim()}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: 'var(--text-sm)' }}
                >
                  <SolarIcon name="add-circle-bold" size={15} color="var(--color-chocolate-base)" />
                  <span>Add Focus Area</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            TAB 2: AVAILABILITY & SERVICES
            ==================================================================== */}
        {activeTab === 'availability' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Holiday Mode Management Card */}
            <div
              className="portal-card"
              style={{
                padding: '24px',
                backgroundColor: 'var(--color-cream-surface)',
                border: `1.5px solid ${isOnHoliday ? 'var(--color-warning)' : 'var(--color-gold-border)'}`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: isOnHoliday ? 'var(--color-warning-bg)' : 'var(--color-success-bg)',
                      border: `1px solid ${isOnHoliday ? 'var(--color-warning)' : 'var(--color-success)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <SolarIcon
                      name={isOnHoliday ? 'calendar-minimalistic-bold' : 'sun-2-bold'}
                      size={22}
                      color={isOnHoliday ? '#b45309' : '#059669'}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <h2 className="section-title">Holiday Mode &amp; Practice Availability</h2>
                      <span
                        className={isOnHoliday ? 'badge-warning' : 'badge-success'}
                        style={{ fontSize: '0.7rem' }}
                      >
                        {isOnHoliday ? 'PAUSED / ON LEAVE' : 'ACTIVE & ACCEPTING APPOINTMENTS'}
                      </span>
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', margin: 0, maxWidth: '640px', lineHeight: 1.5 }}>
                      {isOnHoliday
                        ? 'Your public calendar slots are hidden. Patients cannot book new consultations while Holiday Mode is on. Any previously confirmed consultations remain active.'
                        : 'Your calendar slots and instant consultations are live. Enable Holiday Mode when going on leave to automatically pause patient slot discovery.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleHoliday}
                  disabled={togglingHoliday}
                  className={isOnHoliday ? 'btn-secondary' : 'btn-primary'}
                  style={{ padding: '9px 18px', fontSize: 'var(--text-sm)' }}
                >
                  <SolarIcon
                    name={isOnHoliday ? 'play-bold' : 'pause-circle-bold'}
                    size={16}
                    color="var(--color-chocolate-base)"
                  />
                  <span>
                    {togglingHoliday
                      ? 'Updating...'
                      : isOnHoliday
                      ? 'Resume Practice Slots'
                      : 'Turn On Holiday Mode'}
                  </span>
                </button>
              </div>
            </div>

            {/* Telehealth Services Toggle Cards */}
            <div
              className="portal-card"
              style={{
                padding: '24px',
                backgroundColor: 'var(--color-cream-surface)',
                border: '1.5px solid var(--color-gold-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-gold-pale)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SolarIcon name="videocamera-bold" size={17} color="var(--color-chocolate-base)" />
                </div>
                <div>
                  <h2 className="section-title">Consultation Channels &amp; Modes</h2>
                  <p className="section-subtitle">
                    Select which communication channels patients can select when booking
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  {
                    label: 'Video Consultation',
                    description: 'Patients book HD video calls — recommended primary telehealth mode',
                    icon: 'videocamera-record-bold',
                    value: offersVideo,
                    onChange: setOffersVideo,
                  },
                  {
                    label: 'In-Clinic Visit',
                    description: 'Allow patients to book in-person consultations at your practice rooms (address is only shown after confirmation)',
                    icon: 'hospital-bold',
                    value: offersInClinic,
                    onChange: setOffersInClinic,
                  },
                  {
                    label: 'Audio Consultation',
                    description: 'Patients can book audio-only phone calls (no camera required)',
                    icon: 'phone-calling-bold',
                    value: offersAudio,
                    onChange: setOffersAudio,
                  },
                  {
                    label: 'Accepts Medical Aid',
                    description: 'Show "Medical Aid Accepted" badge on your public doctor profile',
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
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-lg)',
                      backgroundColor: value ? 'var(--color-cream-base)' : 'var(--color-cream-surface)',
                      border: `1.5px solid ${value ? 'var(--color-gold-base)' : 'var(--color-gold-border)'}`,
                      transition: 'border-color 0.2s ease, background-color 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: value ? 'var(--color-gold-pale)' : 'var(--color-cream-base)',
                          border: '1px solid var(--color-gold-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <SolarIcon
                          name={icon}
                          size={18}
                          color={value ? 'var(--color-chocolate-base)' : 'var(--color-cream-text-muted)'}
                        />
                      </div>
                      <div>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-chocolate-base)', marginBottom: '2px' }}>
                          {label}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)' }}>
                          {description}
                        </div>
                      </div>
                    </div>

                    {/* Accessible Micro-Switch */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={value}
                      onClick={() => onChange(!value)}
                      className="profile-switch"
                      style={{
                        backgroundColor: value ? 'var(--color-gold-base)' : 'var(--color-cream-text-muted)',
                      }}
                      title={`Toggle ${label}`}
                    >
                      <span className="profile-switch-thumb" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Physical Practice Address & Rooms Card */}
            <div
              className="portal-card"
              style={{
                padding: '24px',
                backgroundColor: 'var(--color-cream-surface)',
                border: '1.5px solid var(--color-gold-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-gold-pale)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SolarIcon name="map-point-bold" size={17} color="var(--color-chocolate-base)" />
                </div>
                <div>
                  <h2 className="section-title">Physical Practice Address &amp; Rooms</h2>
                  <p className="section-subtitle">
                    Confidential rooms address. Disclosed to patients when an In-Clinic Visit is confirmed.
                  </p>
                </div>
              </div>

              {!offersInClinic && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-cream-base)',
                    border: '1px solid var(--color-gold-border)',
                    marginBottom: '16px',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-cream-text-muted)',
                  }}
                >
                  <SolarIcon name="info-circle-linear" size={15} color="var(--color-gold-bronze)" />
                  <span>
                    Note: Enable <strong>In-Clinic Visit</strong> in Consultation Channels above to activate patient bookings at these rooms.
                  </span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="portal-label">Practice / Rooms Name</label>
                  <input
                    type="text"
                    value={practiceName}
                    onChange={(e) => setPracticeName(e.target.value)}
                    placeholder="e.g. Sandton Mediclinic Suites"
                    className="portal-input"
                  />
                </div>
                <div>
                  <label className="portal-label">Street Address</label>
                  <input
                    type="text"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    placeholder="e.g. 165 Rivonia Road, Suite 402"
                    className="portal-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                <div>
                  <label className="portal-label">Suburb &amp; City</label>
                  <input
                    type="text"
                    value={suburbCity}
                    onChange={(e) => setSuburbCity(e.target.value)}
                    placeholder="e.g. Morningside, Sandton"
                    className="portal-input"
                  />
                </div>
                <div>
                  <label className="portal-label">Postal Code</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 2196"
                    className="portal-input"
                  />
                </div>
                <div>
                  <label className="portal-label">Province</label>
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
          </div>
        )}

        {/* ====================================================================
            TAB 3: CREDENTIALS & DOCUMENTS
            ==================================================================== */}
        {activeTab === 'practice' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Government ID & Regulatory Certificates Card */}
            <div
              className="portal-card"
              style={{
                padding: '24px',
                backgroundColor: 'var(--color-cream-surface)',
                border: '1.5px solid var(--color-gold-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-gold-pale)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SolarIcon name="diploma-bold" size={17} color="var(--color-chocolate-base)" />
                </div>
                <div>
                  <h2 className="section-title">Government-Issued ID &amp; Medical Certificates</h2>
                  <p className="section-subtitle">
                    Upload official identification and HPCSA compliance documents for statutory governance
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px', marginBottom: '20px' }}>
                {/* 1. Government-Issued ID */}
                <div
                  style={{
                    padding: '18px',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--color-cream-base)',
                    border: '1.5px solid var(--color-gold-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>
                        National ID or Passport
                      </span>
                      {idDocument ? (
                        <span className="badge-success" style={{ fontSize: '0.7rem' }}>
                          <SolarIcon name="check-circle-bold" size={12} color="#059669" />
                          VERIFIED
                        </span>
                      ) : (
                        <span className="badge-warning" style={{ fontSize: '0.7rem' }}>
                          REQUIRED
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', margin: '0 0 12px' }}>
                      South African Smart ID Card (both sides) or valid Passport.
                    </p>

                    {idDocument ? (
                      <div
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--color-cream-surface)',
                          border: '1px solid var(--color-gold-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          marginBottom: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <SolarIcon name="document-text-bold" size={20} color="var(--color-gold-bronze)" />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-chocolate-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {idDocument.name}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--color-cream-text-muted)' }}>
                              Uploaded: {idDocument.uploadedAt}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIdDocument(null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            fontSize: 'var(--text-xs)',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                          title="Remove document"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginBottom: '12px' }}>
                        <label
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1.5px dashed var(--color-gold-border)',
                            backgroundColor: 'var(--color-cream-surface)',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          <SolarIcon name="cloud-upload-bold" size={22} color="var(--color-gold-bronze)" />
                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>
                            Upload National ID / Passport
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-cream-text-muted)' }}>
                            PDF, PNG or JPG (max 10MB)
                          </span>
                          <input type="file" accept=".pdf,image/*" onChange={handleIdFileUpload} style={{ display: 'none' }} />
                        </label>
                      </div>
                    )}
                  </div>

                  {idDocument && (
                    <label className="btn-ghost" style={{ padding: '6px 12px', fontSize: 'var(--text-xs)', alignSelf: 'flex-start', cursor: 'pointer' }}>
                      <SolarIcon name="restart-linear" size={14} />
                      <span>Replace ID Document</span>
                      <input type="file" accept=".pdf,image/*" onChange={handleIdFileUpload} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>

                {/* 2. HPCSA Annual Practicing Certificate */}
                <div
                  style={{
                    padding: '18px',
                    borderRadius: 'var(--radius-lg)',
                    backgroundColor: 'var(--color-cream-base)',
                    border: '1.5px solid var(--color-gold-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>
                        HPCSA Practicing Certificate
                      </span>
                      {hpcsaCertificate ? (
                        <span className="badge-success" style={{ fontSize: '0.7rem' }}>
                          <SolarIcon name="shield-check-bold" size={12} color="#059669" />
                          VALIDATED
                        </span>
                      ) : (
                        <span className="badge-warning" style={{ fontSize: '0.7rem' }}>
                          REQUIRED
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', margin: '0 0 12px' }}>
                      Current annual HPCSA registration card or practicing receipt (e.g. {profile?.hpcsaNumber || 'MP 0089432'}).
                    </p>

                    {hpcsaCertificate ? (
                      <div
                        style={{
                          padding: '12px 14px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--color-cream-surface)',
                          border: '1px solid var(--color-gold-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          marginBottom: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <SolarIcon name="diploma-bold" size={20} color="var(--color-gold-bronze)" />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-chocolate-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {hpcsaCertificate.name}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--color-cream-text-muted)' }}>
                              Uploaded: {hpcsaCertificate.uploadedAt}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setHpcsaCertificate(null)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            fontSize: 'var(--text-xs)',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                          title="Remove certificate"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div style={{ marginBottom: '12px' }}>
                        <label
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '16px',
                            borderRadius: 'var(--radius-md)',
                            border: '1.5px dashed var(--color-gold-border)',
                            backgroundColor: 'var(--color-cream-surface)',
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          <SolarIcon name="cloud-upload-bold" size={22} color="var(--color-gold-bronze)" />
                          <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>
                            Upload HPCSA Practicing Card
                          </span>
                          <span style={{ fontSize: '0.68rem', color: 'var(--color-cream-text-muted)' }}>
                            PDF, PNG or JPG (max 10MB)
                          </span>
                          <input type="file" accept=".pdf,image/*" onChange={handleHpcsaFileUpload} style={{ display: 'none' }} />
                        </label>
                      </div>
                    )}
                  </div>

                  {hpcsaCertificate && (
                    <label className="btn-ghost" style={{ padding: '6px 12px', fontSize: 'var(--text-xs)', alignSelf: 'flex-start', cursor: 'pointer' }}>
                      <SolarIcon name="restart-linear" size={14} />
                      <span>Replace HPCSA Document</span>
                      <input type="file" accept=".pdf,image/*" onChange={handleHpcsaFileUpload} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              </div>

              {/* 3. Additional Qualifications / Degrees List */}
              <div
                style={{
                  padding: '18px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--color-cream-base)',
                  border: '1.5px solid var(--color-gold-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>
                      Medical Degrees &amp; Specialist Fellowships
                    </span>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', margin: '2px 0 0' }}>
                      MBChB degree certificate, board certifications, and specialist fellowships.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddCertModal(!showAddCertModal)}
                    className="btn-secondary"
                    style={{ padding: '6px 14px', fontSize: 'var(--text-xs)' }}
                  >
                    <SolarIcon name="add-circle-bold" size={14} color="var(--color-chocolate-base)" />
                    <span>Upload Certificate</span>
                  </button>
                </div>

                {showAddCertModal && (
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--color-cream-surface)',
                      border: '1px solid var(--color-gold-border)',
                      marginBottom: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <label className="portal-label" style={{ margin: 0 }}>
                      Certificate Title or Qualification Name
                    </label>
                    <input
                      type="text"
                      value={newCertTitle}
                      onChange={(e) => setNewCertTitle(e.target.value)}
                      placeholder="e.g. Fellowship of the College of Physicians (FCP SA)"
                      className="portal-input"
                      style={{ fontSize: 'var(--text-xs)', padding: '8px 12px' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <label className="btn-primary" style={{ padding: '8px 16px', fontSize: 'var(--text-xs)', cursor: 'pointer' }}>
                        <SolarIcon name="cloud-upload-bold" size={14} color="var(--color-chocolate-base)" />
                        <span>Select Certificate File (.pdf, image)</span>
                        <input type="file" accept=".pdf,image/*" onChange={handleAddCertUpload} style={{ display: 'none' }} />
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowAddCertModal(false)}
                        className="btn-ghost"
                        style={{ padding: '8px 12px', fontSize: 'var(--text-xs)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {additionalDocs.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--color-cream-surface)',
                        border: '1px solid var(--color-gold-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <SolarIcon name="diploma-bold" size={18} color="var(--color-gold-bronze)" />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-chocolate-base)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.title}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--color-cream-text-muted)' }}>
                            {doc.name} • Uploaded: {doc.uploadedAt}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="badge-success" style={{ fontSize: '0.65rem' }}>
                          ON FILE
                        </span>
                        <button
                          type="button"
                          onClick={() => setAdditionalDocs((prev) => prev.filter((d) => d.id !== doc.id))}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#dc2626',
                            fontSize: 'var(--text-xs)',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                          title="Remove certificate"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Official HPCSA E-Prescription Signature Upload */}
            <div
              className="portal-card"
              style={{
                padding: '24px',
                backgroundColor: 'var(--color-cream-surface)',
                border: '1.5px solid var(--color-gold-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--color-gold-pale)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SolarIcon name="pen-new-square-bold" size={17} color="var(--color-chocolate-base)" />
                  </div>
                  <div>
                    <h2 className="section-title">Official E-Prescription Signature Seal</h2>
                    <p className="section-subtitle">
                      Uploaded signature is rendered onto digital prescription PDFs &amp; HTML views (HPCSA Rule 23.3)
                    </p>
                  </div>
                </div>

                {signatureUrl ? (
                  <span className="badge-success">
                    <SolarIcon name="shield-check-bold" size={13} color="#059669" />
                    <span>SIGNATURE ACTIVE</span>
                  </span>
                ) : (
                  <span className="badge-warning">
                    <SolarIcon name="danger-circle-bold" size={13} color="#b45309" />
                    <span>SIGNATURE REQUIRED</span>
                  </span>
                )}
              </div>

              {signatureError && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--color-danger-bg)',
                    border: '1px solid var(--color-danger)',
                    color: '#991b1b',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    marginBottom: '14px',
                  }}
                >
                  {signatureError}
                </div>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: signatureUrl ? '1fr 1fr' : '1fr',
                  gap: '20px',
                  alignItems: 'center',
                }}
              >
                {/* Signature Preview */}
                {signatureUrl && (
                  <div
                    style={{
                      padding: '20px',
                      borderRadius: 'var(--radius-lg)',
                      background: 'repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%) 50% / 14px 14px',
                      border: '1.5px solid var(--color-gold-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '130px',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={signatureUrl}
                      alt="Doctor Signature Preview"
                      style={{
                        maxHeight: '75px',
                        maxWidth: '100%',
                        objectFit: 'contain',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '6px',
                        right: '10px',
                        fontSize: '0.68rem',
                        color: 'var(--color-cream-text-muted)',
                        fontWeight: 600,
                      }}
                    >
                      HPCSA Rule 23.3 Compliant
                    </div>
                  </div>
                )}

                {/* Upload Drag & Drop Zone */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDraggingSignature(true);
                    }}
                    onDragLeave={() => setIsDraggingSignature(false)}
                    onDrop={handleSignatureDrop}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '22px',
                      borderRadius: 'var(--radius-lg)',
                      border: `2px dashed ${isDraggingSignature ? 'var(--color-gold-base)' : 'var(--color-gold-border)'}`,
                      backgroundColor: isDraggingSignature ? 'var(--color-gold-pale)' : 'var(--color-cream-base)',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <SolarIcon name="cloud-upload-bold" size={24} color="var(--color-gold-bronze)" />
                    <div>
                      <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>
                        {signatureUrl ? 'Click or Drag to Replace Signature' : 'Upload PNG Signature File'}
                      </span>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', margin: '4px 0 0' }}>
                        Transparent background (.png only, max 5MB).
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
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
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
          </div>
        )}

        {/* ====================================================================
            TAB 4: PAYOUTS & BANKING
            ==================================================================== */}
        {activeTab === 'payouts' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* South Africa EFT Banking Card */}
            <div
              className="portal-card"
              style={{
                padding: '24px',
                backgroundColor: 'var(--color-cream-surface)',
                border: '1.5px solid var(--color-gold-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-gold-pale)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SolarIcon name="card-bold" size={17} color="var(--color-chocolate-base)" />
                </div>
                <div>
                  <h2 className="section-title">Payout Banking Details (South Africa EFT)</h2>
                  <p className="section-subtitle">
                    Automated consultation earnings settlements are transferred directly into this account
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label className="portal-label">Account Holder Name</label>
                  <input
                    type="text"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="e.g. Dr T Molefe Inc."
                    className="portal-input"
                    required
                  />
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', marginTop: '4px', display: 'block' }}>
                    Registered legal name associated with the bank account
                  </span>
                </div>

                <div>
                  <label className="portal-label">Bank Institution</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                <div>
                  <label className="portal-label">Account Number</label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 62891048291"
                    className="portal-input"
                    required
                  />
                </div>

                <div>
                  <label className="portal-label">Account Type</label>
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
                  <label className="portal-label">Branch Code</label>
                  <input
                    type="text"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    placeholder="e.g. 250655"
                    className="portal-input"
                    required
                  />
                </div>
              </div>

              {/* Settlement Schedule Notice */}
              <div
                style={{
                  marginTop: '20px',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--color-cream-base)',
                  border: '1px solid var(--color-gold-border)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <SolarIcon name="shield-check-bold" size={18} color="var(--color-gold-bronze)" style={{ marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-chocolate-base)', marginBottom: '2px' }}>
                    Automated Bi-Monthly EFT Settlements
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', margin: 0, lineHeight: 1.5 }}>
                    Settlements are processed on the 1st and 16th of every month. Your 85% net take-home earnings are transferred directly via South African National Payment System EFT.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* On-Page Bottom Action Bar */}
        <div className="profile-action-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-gold-base)',
              }}
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', fontWeight: 600 }}>
              Tab: <strong style={{ color: 'var(--color-chocolate-base)' }}>
                {activeTab === 'clinical' && 'Clinical Profile'}
                {activeTab === 'availability' && 'Availability & Services'}
                {activeTab === 'practice' && 'Credentials & Documents'}
                {activeTab === 'payouts' && 'Payouts & Banking'}
              </strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{ padding: '10px 24px', fontSize: 'var(--text-sm)' }}
            >
              <SolarIcon name="check-circle-bold" size={16} color="var(--color-chocolate-base)" />
              <span>{saving ? 'Saving Changes...' : 'Save All Changes'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
