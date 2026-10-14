'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { toastSuccess, toastError, errorMessage } from '../../lib/toast';
import { SolarIcon } from '../../components/common/SolarIcon';
import '../../styles/profile.css';

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


/**
 * Compact multi-select: one field that shows a summary ("3 selected"), with the choices in a
 * bottom sheet on phones / dropdown on larger screens. Replaces long walls of pills.
 */
function MultiSelect({
  id,
  options,
  selected,
  onToggle,
  placeholder,
  title,
  onAddCustom,
  customPlaceholder,
}: {
  id: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  placeholder: string;
  title: string;
  onAddCustom?: (value: string) => void;
  customPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const wrapRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const summary =
    selected.length === 0
      ? placeholder
      : selected.length <= 2
        ? selected.join(', ')
        : `${selected.length} selected`;

  const addCustom = () => {
    const v = custom.trim();
    if (!v || !onAddCustom) return;
    onAddCustom(v);
    setCustom('');
  };

  return (
    <div className="pf-ms" ref={wrapRef}>
      <button
        type="button"
        id={id}
        className="pf-select pf-ms-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selected.length === 0 ? 'pf-ms-placeholder' : 'pf-ms-summary'}>{summary}</span>
        {selected.length > 2 && <span className="pf-ms-count">{selected.length}</span>}
        <SolarIcon name="alt-arrow-down-linear" size={16} color="var(--color-chocolate-base)" />
      </button>

      {selected.length > 0 && (
        <div className="pf-ms-tags" aria-label="Selected">
          {selected.map((v) => (
            <button key={v} type="button" className="pf-ms-tag" onClick={() => onToggle(v)} aria-label={`Remove ${v}`}>
              <span>{v}</span>
              <SolarIcon name="close-circle-linear" size={14} color="var(--color-gold-bronze)" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <>
          <div className="pf-ms-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="pf-ms-panel" role="dialog" aria-label={title}>
            <div className="pf-ms-panel-head">
              <strong>{title}</strong>
              <span>{selected.length} selected</span>
            </div>
            <div className="pf-ms-list" role="listbox" aria-multiselectable="true">
              {options.map((opt) => {
                const on = selected.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    role="option"
                    aria-selected={on}
                    className={`pf-ms-opt${on ? ' is-on' : ''}`}
                    onClick={() => onToggle(opt)}
                  >
                    <span className="pf-ms-box" aria-hidden="true">
                      {on && <SolarIcon name="check-circle-bold" size={18} color="var(--color-chocolate-base)" />}
                    </span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>
            {onAddCustom && (
              <div className="pf-ms-add">
                <input
                  className="pf-input"
                  type="text"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustom();
                    }
                  }}
                  placeholder={customPlaceholder || 'Add your own…'}
                  aria-label={customPlaceholder || 'Add your own'}
                />
                <button type="button" className="pf-btn" onClick={addCustom}>Add</button>
              </div>
            )}
            <button type="button" className="btn-primary pf-ms-done" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function DoctorProfilePage() {
  const router = useRouter();
  const { doctor, profile, isAuthenticated, isLoading, updateProfile, toggleHolidayMode } = useDoctorAuth();

  const [activeTab, setActiveTab] = useState<ProfileTab>('clinical');
  const [copiedHpcsa, setCopiedHpcsa] = useState(false);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);

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
  const [idDocument, setIdDocument] = useState<UploadedDocument | null>(null);
  const [hpcsaCertificate, setHpcsaCertificate] = useState<UploadedDocument | null>(null);
  const [additionalDocs, setAdditionalDocs] = useState<UploadedDocument[]>([]);

  const [newCertTitle, setNewCertTitle] = useState('');
  const [showAddCertModal, setShowAddCertModal] = useState(false);

  // Physical Practice Address
  const [practiceName, setPracticeName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [suburbCity, setSuburbCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [province, setProvince] = useState('Gauteng');

  // Banking details for EFT Settlements
  const [accountHolder, setAccountHolder] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('Cheque / Current');
  const [branchCode, setBranchCode] = useState('');

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
  const [experienceYears, setExperienceYears] = useState<number>(0);
  const [isBoardCertified, setIsBoardCertified] = useState<boolean>(false);
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
      setAvatarUrl('');
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
    const regNum = profile?.hpcsaNumber || '';
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

  const initials =
    (doctor.fullName || 'Dr')
      .replace(/^(dr|prof)\.?\s+/i, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'DR';
  const hpcsaNumber = profile?.hpcsaNumber || '';
  const hasPracticeAddress = Boolean(practiceName.trim() || streetAddress.trim());

  const TABS: { key: ProfileTab; label: string; icon: string }[] = [
    { key: 'clinical', label: 'Clinical', icon: 'stethoscope-linear' },
    { key: 'availability', label: 'Availability', icon: 'calendar-linear' },
    { key: 'practice', label: 'Credentials', icon: 'document-text-linear' },
    { key: 'payouts', label: 'Payouts', icon: 'wallet-linear' },
  ];

  const renderDocSlot = (
    title: string,
    doc: UploadedDocument | null,
    onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onRemove: () => void,
  ) => (
    <div className={`pf-doc${doc ? '' : ' pf-doc--empty'}`}>
      <span className="pf-card-icon">
        <SolarIcon name="document-text-linear" size={20} color="var(--color-gold-bronze)" />
      </span>
      <div className="pf-doc-text">
        <div className="pf-doc-title">{title}</div>
        <div className="pf-doc-sub">
          {doc ? `${doc.name} · ${doc.uploadedAt}` : 'Not uploaded yet'}
        </div>
        {doc && (
          <span
            className={`pf-pill ${doc.status === 'verified' ? 'pf-pill--ok' : doc.status === 'rejected' ? 'pf-pill--warn' : 'pf-pill--neutral'}`}
            style={{ marginTop: 6 }}
          >
            {doc.status === 'verified' ? 'Verified' : doc.status === 'rejected' ? 'Rejected' : 'Pending review'}
          </span>
        )}
      </div>
      <div className="pf-doc-actions">
        <label className="pf-icon-btn" title={doc ? 'Replace' : 'Upload'} aria-label={doc ? `Replace ${title}` : `Upload ${title}`}>
          <SolarIcon name="upload-linear" size={18} color="var(--color-chocolate-base)" />
          <input type="file" accept=".pdf,image/*" onChange={onUpload} />
        </label>
        {doc && (
          <button type="button" className="pf-icon-btn" onClick={onRemove} aria-label={`Remove ${title}`} title="Remove">
            <SolarIcon name="trash-bin-trash-linear" size={18} color="#b91c1c" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <form className="pf" onSubmit={handleSubmit}>
      {/* ───────────── Identity ───────────── */}
      <section className="pf-identity" aria-label="Profile summary">
        <div className="pf-identity-top">
          <div className="pf-avatar">
            {avatarUrl && !avatarFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="pf-avatar-img"
                src={avatarUrl}
                alt={doctor.fullName || 'Doctor profile'}
                onError={() => setAvatarFailed(true)}
              />
            ) : (
              <span className="pf-avatar-fallback" role="img" aria-label={doctor.fullName || 'Doctor'}>
                {initials}
              </span>
            )}
            <label className="pf-avatar-btn" title="Change profile photo">
              <SolarIcon name="camera-minimalistic-bold" size={14} color="var(--color-chocolate-base)" />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setAvatarFailed(false);
                  handleAvatarChange(e);
                }}
                style={{ display: 'none' }}
              />
            </label>
          </div>
          <div className="pf-who">
            <h1 className="pf-name">{doctor.fullName}</h1>
            <div className="pf-meta">
              <span className="pf-spec">{specialty || 'General Practitioner'}</span>
              {hpcsaNumber && (
                <button type="button" className="pf-chip-btn" onClick={handleCopyHpcsa} title="Copy HPCSA number">
                  <span>HPCSA {hpcsaNumber}</span>
                  <SolarIcon
                    name={copiedHpcsa ? 'check-circle-bold' : 'copy-linear'}
                    size={13}
                    color={copiedHpcsa ? 'var(--color-success)' : 'var(--color-gold-bronze)'}
                  />
                </button>
              )}
            </div>
            <div className="pf-meta" style={{ marginTop: 2, overflowWrap: 'anywhere' }}>
              <span>{doctor.email}</span>
            </div>
          </div>
        </div>

        <div className="pf-badges">
          {isVerified ? (
            <span className="pf-pill pf-pill--ok">
              <SolarIcon name="shield-check-bold" size={13} color="#059669" /> HPCSA verified
            </span>
          ) : (
            <span className="pf-pill pf-pill--warn">
              <SolarIcon name="shield-warning-bold" size={13} color="#b45309" /> Verification in review
            </span>
          )}
          <span className={`pf-pill ${isOnHoliday ? 'pf-pill--warn' : 'pf-pill--ok'}`}>
            <span className="dot" /> {isOnHoliday ? 'On holiday (paused)' : 'Accepting appointments'}
          </span>
          {profile?.verificationSource === 'locumstaff' && (
            <span className="pf-pill pf-pill--neutral">
              <SolarIcon name="link-bold" size={12} color="var(--color-gold-bronze)" /> LocumStaff linked
            </span>
          )}
        </div>

        {(() => {
          const checks = [
            { label: 'Profile', ok: true, hint: 'Email verified' },
            { label: 'HPCSA register', ok: isVerified, hint: isVerified ? 'Credentials validated' : 'Audit in progress' },
            { label: 'Telehealth', ok: isVerified && !isOnHoliday, hint: isVerified && !isOnHoliday ? 'Live on patient search' : isOnHoliday ? 'Paused (holiday mode)' : 'Not visible to patients yet' },
          ];
          const done = checks.filter((c) => c.ok).length;
          return (
            <div className="pf-progress" aria-label={`Credential status: ${done} of ${checks.length} complete`}>
              <div className="pf-progress-head">
                <span className="pf-progress-label">Credential status</span>
                <span className="pf-progress-count">{done}/{checks.length}</span>
              </div>
              <div className="pf-progress-bar" aria-hidden="true">
                {checks.map((c) => (
                  <span key={c.label} className={c.ok ? 'is-done' : ''} />
                ))}
              </div>
              <div className="pf-progress-items">
                {checks.map((c) => (
                  <span key={c.label} className={`pf-progress-item${c.ok ? '' : ' is-pending'}`} title={c.hint}>
                    <SolarIcon name={c.ok ? 'check-circle-bold' : 'danger-triangle-linear'} size={14} />
                    {c.label}
                    {!c.ok && <em>· {c.hint}</em>}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}
      </section>

      {/* ───────────── Tabs ───────────── */}
      <div className="pf-tabs" role="tablist" aria-label="Profile sections">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={activeTab === t.key}
            className="pf-tab"
            onClick={() => setActiveTab(t.key)}
          >
            <SolarIcon name={t.icon} size={17} color="var(--color-chocolate-base)" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ───────────── Clinical ───────────── */}
      {activeTab === 'clinical' && (
        <div className="pf-panel">
          <section className="pf-card">
            <div className="pf-card-head">
              <span className="pf-card-icon"><SolarIcon name="stethoscope-linear" size={20} color="var(--color-gold-bronze)" /></span>
              <div>
                <h2 className="pf-card-title">Specialty &amp; rate</h2>
                <p className="pf-card-sub">What patients see on your search card.</p>
              </div>
            </div>
            <div className="pf-grid pf-grid--2">
              <div className="pf-field">
                <label className="pf-label" htmlFor="pf-specialty">Primary specialty</label>
                <select id="pf-specialty" className="pf-select" value={specialty} onChange={(e) => setSpecialty(e.target.value)} required>
                  {!AVAILABLE_SPECIALTIES.includes(specialty) && specialty && <option value={specialty}>{specialty}</option>}
                  {AVAILABLE_SPECIALTIES.map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>
              <div className="pf-field">
                <span className="pf-label">Consultation rate</span>
                <div className="pf-locked">
                  <SolarIcon name="lock-keyhole-linear" size={18} color="var(--color-gold-bronze)" />
                  <div>
                    <strong>R{profile?.consultationRate ?? (ratePerHour || '850')} per 30 min</strong>
                    <small>Set by ChekUp247 · you keep R{netTakeHome}/hr (85%)</small>
                  </div>
                </div>
              </div>
            </div>
            <div className="pf-field">
              <span className="pf-label">In-call extension rates <span>(pro-rata)</span></span>
              <div className="pf-rate-grid">
                <div className="pf-rate"><small>+10 min</small><strong>R{ext10Min}</strong></div>
                <div className="pf-rate"><small>+20 min</small><strong>R{ext20Min}</strong></div>
                <div className="pf-rate"><small>+30 min</small><strong>R{ext30Min}</strong></div>
              </div>
            </div>
          </section>

          <section className="pf-card">
            <div className="pf-card-head">
              <span className="pf-card-icon"><SolarIcon name="case-round-linear" size={20} color="var(--color-gold-bronze)" /></span>
              <div>
                <h2 className="pf-card-title">About you</h2>
                <p className="pf-card-sub">Experience, certification and a short biography.</p>
              </div>
            </div>
            <div className="pf-grid pf-grid--2">
              <div className="pf-field">
                <label className="pf-label" htmlFor="pf-years">Years of clinical experience</label>
                <input
                  id="pf-years"
                  className="pf-input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Math.max(0, parseInt(e.target.value) || 0))}
                />
              </div>
              <div className="pf-field">
                <label className="pf-label" htmlFor="pf-board">Board certification</label>
                <input
                  id="pf-board"
                  className="pf-input"
                  type="text"
                  value={boardCertificationTitle}
                  onChange={(e) => setBoardCertificationTitle(e.target.value)}
                  placeholder="e.g. Board Certified"
                  disabled={!isBoardCertified}
                />
              </div>
            </div>
            <div className="pf-row">
              <div className="pf-row-text">
                <div className="pf-row-title">Board certified</div>
                <div className="pf-row-desc">Shows a certification badge on your public profile.</div>
              </div>
              <button type="button" role="switch" aria-checked={isBoardCertified} aria-label="Board certified" className="pf-switch" onClick={() => setIsBoardCertified(!isBoardCertified)} />
            </div>
            <div className="pf-field">
              <label className="pf-label" htmlFor="pf-bio">Biography</label>
              <textarea
                id="pf-bio"
                className="pf-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Your background, training and consultation approach…"
              />
            </div>
          </section>

          <section className="pf-card">
            <div className="pf-card-head">
              <span className="pf-card-icon"><SolarIcon name="check-circle-bold" size={20} color="var(--color-gold-bronze)" /></span>
              <div>
                <h2 className="pf-card-title">Specialties &amp; focus areas</h2>
                <p className="pf-card-sub">Tap to select everything you cover.</p>
              </div>
            </div>
            <div className="pf-field">
              <label className="pf-label" htmlFor="pf-secondary">Additional specialties</label>
              <MultiSelect
                id="pf-secondary"
                title="Additional specialties"
                placeholder="Select specialties"
                options={AVAILABLE_SPECIALTIES.filter((sp) => sp !== specialty)}
                selected={secondarySpecialties}
                onToggle={toggleSecondarySpecialty}
              />
            </div>
            <div className="pf-field">
              <label className="pf-label" htmlFor="pf-expertise">Areas of expertise</label>
              <MultiSelect
                id="pf-expertise"
                title="Areas of expertise"
                placeholder="Select areas of expertise"
                options={[...PRESET_EXPERTISE_OPTIONS, ...selectedExpertise.filter((t) => !PRESET_EXPERTISE_OPTIONS.includes(t))]}
                selected={selectedExpertise}
                onToggle={toggleExpertise}
                onAddCustom={(v) => setSelectedExpertise((prev) => (prev.includes(v) ? prev : [...prev, v]))}
                customPlaceholder="Add your own area…"
              />
            </div>
          </section>
        </div>
      )}

      {/* ───────────── Availability ───────────── */}
      {activeTab === 'availability' && (
        <div className="pf-panel">
          <section className="pf-card">
            <div className="pf-card-head">
              <span className="pf-card-icon"><SolarIcon name="sun-fog-linear" size={20} color="var(--color-gold-bronze)" /></span>
              <div>
                <h2 className="pf-card-title">Holiday mode</h2>
                <p className="pf-card-sub">
                  {isOnHoliday
                    ? 'Your slots are hidden and patients cannot book new consultations. Confirmed bookings stay active.'
                    : 'Your slots are live. Turn this on when you are away to pause new bookings.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleHoliday}
              disabled={togglingHoliday}
              className={isOnHoliday ? 'btn-primary' : 'pf-btn'}
              style={{ width: '100%', minHeight: 48 }}
            >
              <SolarIcon name={isOnHoliday ? 'play-bold' : 'pause-circle-bold'} size={17} color="var(--color-chocolate-base)" />
              <span>{togglingHoliday ? 'Updating…' : isOnHoliday ? 'Resume bookings' : 'Turn on holiday mode'}</span>
            </button>
          </section>

          <section className="pf-card">
            <div className="pf-card-head">
              <span className="pf-card-icon"><SolarIcon name="videocamera-record-linear" size={20} color="var(--color-gold-bronze)" /></span>
              <div>
                <h2 className="pf-card-title">Consultation types</h2>
                <p className="pf-card-sub">Choose at least one way patients can see you.</p>
              </div>
            </div>
            <div className="pf-rows">
              {[
                { label: 'Video consultation', description: 'HD video calls — the recommended mode.', icon: 'videocamera-record-bold', value: offersVideo, set: setOffersVideo },
                { label: 'Audio consultation', description: 'Phone-style calls, no camera needed.', icon: 'phone-calling-bold', value: offersAudio, set: setOffersAudio },
                { label: 'In-clinic visit', description: 'In-person at your rooms. Address shown only after confirmation.', icon: 'hospital-bold', value: offersInClinic, set: setOffersInClinic },
                { label: 'Accepts medical aid', description: 'Shows a “Medical aid accepted” badge on your profile.', icon: 'card-bold', value: acceptsMedicalAid, set: setAcceptsMedicalAid },
              ].map(({ label, description, icon, value, set }) => (
                <div className="pf-row" key={label}>
                  <span className="pf-card-icon"><SolarIcon name={icon} size={19} color="var(--color-gold-bronze)" /></span>
                  <div className="pf-row-text">
                    <div className="pf-row-title">{label}</div>
                    <div className="pf-row-desc">{description}</div>
                  </div>
                  <button type="button" role="switch" aria-checked={value} aria-label={label} className="pf-switch" onClick={() => set(!value)} />
                </div>
              ))}
            </div>
          </section>

          <section className="pf-card">
            <div className="pf-card-head">
              <span className="pf-card-icon"><SolarIcon name="hospital-linear" size={20} color="var(--color-gold-bronze)" /></span>
              <div>
                <h2 className="pf-card-title">Practice address</h2>
                <p className="pf-card-sub">
                  {offersInClinic ? 'Used for in-clinic bookings.' : 'Only needed if you offer in-clinic visits.'}
                </p>
              </div>
            </div>
            <div className="pf-grid pf-grid--2">
              <div className="pf-field" style={{ gridColumn: '1 / -1' }}>
                <label className="pf-label" htmlFor="pf-practice">Practice name</label>
                <input id="pf-practice" className="pf-input" type="text" value={practiceName} onChange={(e) => setPracticeName(e.target.value)} placeholder="e.g. Sandton Mediclinic Suites" />
              </div>
              <div className="pf-field" style={{ gridColumn: '1 / -1' }}>
                <label className="pf-label" htmlFor="pf-street">Street address</label>
                <input id="pf-street" className="pf-input" type="text" value={streetAddress} onChange={(e) => setStreetAddress(e.target.value)} placeholder="e.g. 165 Rivonia Road, Suite 402" />
              </div>
              <div className="pf-field">
                <label className="pf-label" htmlFor="pf-suburb">Suburb &amp; city</label>
                <input id="pf-suburb" className="pf-input" type="text" value={suburbCity} onChange={(e) => setSuburbCity(e.target.value)} placeholder="e.g. Morningside, Sandton" />
              </div>
              <div className="pf-field">
                <label className="pf-label" htmlFor="pf-postal">Postal code</label>
                <input id="pf-postal" className="pf-input" type="text" inputMode="numeric" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="e.g. 2196" />
              </div>
              <div className="pf-field" style={{ gridColumn: '1 / -1' }}>
                <label className="pf-label" htmlFor="pf-province">Province</label>
                <select id="pf-province" className="pf-select" value={province} onChange={(e) => setProvince(e.target.value)}>
                  {['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape'].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ───────────── Credentials ───────────── */}
      {activeTab === 'practice' && (
        <div className="pf-panel">
          <section className="pf-card">
            <div className="pf-card-head">
              <span className="pf-card-icon"><SolarIcon name="document-text-linear" size={20} color="var(--color-gold-bronze)" /></span>
              <div>
                <h2 className="pf-card-title">Documents</h2>
                <p className="pf-card-sub">ID and HPCSA papers kept on file for compliance. PDF or image, up to 10MB.</p>
              </div>
            </div>
            {renderDocSlot('National ID / Passport', idDocument, handleIdFileUpload, () => setIdDocument(null))}
            {renderDocSlot('HPCSA practising certificate', hpcsaCertificate, handleHpcsaFileUpload, () => setHpcsaCertificate(null))}
            {additionalDocs.map((doc) => (
              <div className="pf-doc" key={doc.id}>
                <span className="pf-card-icon"><SolarIcon name="document-text-linear" size={20} color="var(--color-gold-bronze)" /></span>
                <div className="pf-doc-text">
                  <div className="pf-doc-title">{doc.title}</div>
                  <div className="pf-doc-sub">{doc.name} · {doc.uploadedAt}</div>
                </div>
                <div className="pf-doc-actions">
                  <button type="button" className="pf-icon-btn" aria-label={`Remove ${doc.title}`} onClick={() => setAdditionalDocs((prev) => prev.filter((d) => d.id !== doc.id))}>
                    <SolarIcon name="trash-bin-trash-linear" size={18} color="#b91c1c" />
                  </button>
                </div>
              </div>
            ))}
            {showAddCertModal ? (
              <div className="pf-add-panel">
                <div className="pf-field">
                  <label className="pf-label" htmlFor="pf-cert-title">Qualification name</label>
                  <input id="pf-cert-title" className="pf-input" type="text" value={newCertTitle} onChange={(e) => setNewCertTitle(e.target.value)} placeholder="e.g. Fellowship of the College of Physicians" />
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <label className="pf-btn" style={{ flex: '1 1 160px' }}>
                    <SolarIcon name="upload-linear" size={17} color="var(--color-chocolate-base)" />
                    <span>Choose file</span>
                    <input type="file" accept=".pdf,image/*" onChange={handleAddCertUpload} />
                  </label>
                  <button type="button" className="pf-btn" onClick={() => setShowAddCertModal(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <button type="button" className="pf-btn" onClick={() => setShowAddCertModal(true)}>
                <SolarIcon name="add-circle-linear" size={18} color="var(--color-chocolate-base)" />
                <span>Add another qualification</span>
              </button>
            )}
          </section>

          <section className="pf-card">
            <div className="pf-card-head">
              <span className="pf-card-icon"><SolarIcon name="pen-new-square-linear" size={20} color="var(--color-gold-bronze)" /></span>
              <div>
                <h2 className="pf-card-title">E-prescription signature</h2>
                <p className="pf-card-sub">Printed on every digital prescription you issue (HPCSA Rule 23.3).</p>
              </div>
            </div>
            {signatureUrl && (
              <div className="pf-sign">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={signatureUrl} alt="Your signature" />
              </div>
            )}
            {signatureError && <div className="pf-error" role="alert">{signatureError}</div>}
            <div
              className={`pf-drop${isDraggingSignature ? ' is-drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingSignature(true); }}
              onDragLeave={() => setIsDraggingSignature(false)}
              onDrop={handleSignatureDrop}
            >
              <SolarIcon name="upload-minimalistic-linear" size={22} color="var(--color-gold-bronze)" />
              <span>{signatureUrl ? 'Replace signature' : 'Upload signature'}</span>
              <small>PNG with transparent background, up to 5MB</small>
              <input type="file" accept="image/png" onChange={handleSignatureFileChange} aria-label="Upload signature PNG" />
            </div>
            {signatureUrl && (
              <button type="button" className="pf-btn pf-btn--danger" onClick={handleClearSignature}>
                <SolarIcon name="trash-bin-trash-linear" size={17} color="#b91c1c" />
                <span>Remove signature</span>
              </button>
            )}
          </section>
        </div>
      )}

      {/* ───────────── Payouts ───────────── */}
      {activeTab === 'payouts' && (
        <div className="pf-panel">
          <section className="pf-card">
            <div className="pf-card-head">
              <span className="pf-card-icon"><SolarIcon name="wallet-linear" size={20} color="var(--color-gold-bronze)" /></span>
              <div>
                <h2 className="pf-card-title">Bank details</h2>
                <p className="pf-card-sub">Where your earnings are paid by EFT (South African accounts).</p>
              </div>
            </div>
            <div className="pf-grid pf-grid--2">
              <div className="pf-field" style={{ gridColumn: '1 / -1' }}>
                <label className="pf-label" htmlFor="pf-holder">Account holder</label>
                <input id="pf-holder" className="pf-input" type="text" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="e.g. Dr T Molefe Inc." />
              </div>
              <div className="pf-field">
                <label className="pf-label" htmlFor="pf-bank">Bank</label>
                <select id="pf-bank" className="pf-select" value={bankName} onChange={(e) => setBankName(e.target.value)}>
                  <option value="">Select your bank</option>
                  {['First National Bank (FNB)', 'Standard Bank', 'Nedbank', 'ABSA Bank', 'Capitec Bank', 'Investec Bank', 'Discovery Bank'].map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="pf-field">
                <label className="pf-label" htmlFor="pf-type">Account type</label>
                <select id="pf-type" className="pf-select" value={accountType} onChange={(e) => setAccountType(e.target.value)}>
                  {['Cheque / Current', 'Savings', 'Transmission'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="pf-field">
                <label className="pf-label" htmlFor="pf-acc">Account number</label>
                <input id="pf-acc" className="pf-input" type="text" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="e.g. 62891048291" />
              </div>
              <div className="pf-field">
                <label className="pf-label" htmlFor="pf-branch">Branch code</label>
                <input id="pf-branch" className="pf-input" type="text" inputMode="numeric" value={branchCode} onChange={(e) => setBranchCode(e.target.value)} placeholder="e.g. 250655" />
              </div>
            </div>
            <div className="pf-note">
              <SolarIcon name="info-circle-linear" size={18} color="var(--color-gold-bronze)" style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Earnings are paid out on the platform settlement schedule. Account details must match the account holder name exactly.</span>
            </div>
          </section>
        </div>
      )}

      {/* ───────────── Save bar ───────────── */}
      <div className="pf-save">
        <div className="pf-save-text">
          <strong>{TABS.find((t) => t.key === activeTab)?.label}</strong>
          Changes apply across all tabs when you save.
        </div>
        <button type="submit" className="btn-primary" disabled={saving}>
          <SolarIcon name="check-circle-bold" size={17} color="var(--color-chocolate-base)" />
          <span>{saving ? 'Saving…' : 'Save changes'}</span>
        </button>
      </div>
    </form>
  );
}
