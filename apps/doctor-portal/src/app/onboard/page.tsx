'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChekupCrossLogo } from '../../components/common/ChekupCrossLogo';
import { SolarIcon } from '../../components/common/SolarIcon';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { toastSuccess, toastError, errorMessage } from '../../lib/toast';

const SPECIALTIES = [
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

const PROVINCES = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
  'Western Cape',
];

interface DocUpload {
  filename: string;
  label: string;
  hint: string;
  fileUrl: string;
}

export default function DoctorOnboardPage() {
  const router = useRouter();
  const { doctor, profile, onboard } = useDoctorAuth();
  const hpcsaRef = useRef<HTMLInputElement>(null);

  const [hpcsaNumber, setHpcsaNumber] = useState(profile?.hpcsaNumber ?? '');
  const [identityType, setIdentityType] = useState<'id' | 'passport'>('id');
  const [identityNumber, setIdentityNumber] = useState('');
  const [specialty, setSpecialty] = useState(profile?.specialty ?? SPECIALTIES[0]);
  const [province, setProvince] = useState('');
  const [ratePerHour, setRatePerHour] = useState(String(profile?.ratePerHour || '850'));
  const [bio, setBio] = useState('');
  const [offersInClinic, setOffersInClinic] = useState(false);
  const [facilityName, setFacilityName] = useState('');
  const [facilityAddress, setFacilityAddress] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [docs, setDocs] = useState<DocUpload[]>([
    { filename: '', label: 'National ID / Passport', hint: 'PDF, JPG, or PNG - verified against Home Affairs', fileUrl: '' },
    { filename: '', label: 'HPCSA Annual Registration Certificate', hint: 'Current practising certificate (PDF preferred)', fileUrl: '' },
    { filename: '', label: 'Indemnity Insurance Certificate', hint: 'Valid MPS / MDD medical malpractice cover', fileUrl: '' },
  ]);
  const [uploadingKey, setUploadingKey] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (index: number, file: File) => {
    setUploadingKey(index);
    setError(null);
    try {
      const apiBase =
        process.env.NEXT_PUBLIC_API_URL ||
        (typeof window !== 'undefined' && window.location.hostname.endsWith('chekup247.com')
          ? 'https://api.chekup247.com/api/v1'
          : 'http://localhost:4000/api/v1');
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch(`${apiBase}/storage/doctor-upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('chekup_doctor_token') || ''}`,
        },
        body: formData,
        credentials: 'include',
      });
      const uploaded = await uploadRes.json();
      if (!uploadRes.ok) {
        const message = Array.isArray(uploaded.message) ? uploaded.message.join(', ') : uploaded.message;
        throw new Error(message || `Upload failed (${uploadRes.status}). Please try again.`);
      }

      setDocs((prev) =>
        prev.map((d, i) => (i === index ? { ...d, filename: uploaded.filename, fileUrl: uploaded.fileUrl } : d)),
      );
      toastSuccess('Upload complete', `${file.name} staged for verification.`);
    } catch (err: any) {
      toastError('Upload failed', errorMessage(err, 'Could not upload the file.'));
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hpcsaNumber.trim()) {
      setError('HPCSA registration number is required');
      return;
    }
    if (identityType === 'id' && !/^\d{13}$/.test(identityNumber.trim())) {
      setError('South African ID number must be exactly 13 digits');
      return;
    }
    if (identityType === 'passport' && !/^[A-Za-z0-9][A-Za-z0-9 -]{5,19}$/.test(identityNumber.trim())) {
      setError('Passport number must be 6 to 20 letters or numbers');
      return;
    }
    if (docs.some((d) => !d.fileUrl)) {
      setError('Please upload your ID, HPCSA certificate, and indemnity certificate');
      return;
    }
    if (!ratePerHour || Number.isNaN(Number(ratePerHour)) || Number(ratePerHour) < 0) {
      setError('Please enter a valid hourly consultation rate');
      return;
    }
    if (!bio.trim() || bio.trim().length < 20) {
      setError('Please provide a clinical biography (at least 20 characters)');
      return;
    }
    if (!termsAgreed) {
      setError('You must accept the Chekup247 terms of service');
      return;
    }

    setLoading(true);
    try {
      await onboard({
        ...(doctor ? {} : {}),
        hpcsa_number: hpcsaNumber.trim().toUpperCase(),
        document_type: identityType,
        id_number: identityNumber.trim().toUpperCase(),
        specialty,
        province: province || undefined,
        rate_per_hour: Number(ratePerHour),
        bio: bio.trim(),
        documents_url: docs.map((d) => d.fileUrl),
        offers_in_clinic: offersInClinic,
        facility_name: offersInClinic && facilityName.trim() ? facilityName.trim() : undefined,
        facility_address: offersInClinic && facilityAddress.trim() ? facilityAddress.trim() : undefined,
      });

      toastSuccess('Onboarding complete', 'Your profile is now under review.');
      router.push('/');
    } catch (err: any) {
      setError(errorMessage(err, 'Onboarding failed. Please review your details.'));
    } finally {
      setLoading(false);
    }
  };

  const uploadedCount = docs.filter((doc) => doc.fileUrl).length;

  return (
    <div className="doctor-onboard-page">
      <div className="doctor-onboard-hero">
        <div>
          <div className="doctor-onboard-breadcrumb">
            <span className="doctor-onboard-breadcrumb-muted">Practice Portal</span>
            <SolarIcon name="alt-arrow-right-linear" size={14} />
            <span>Professional onboarding</span>
          </div>
          <h1>Build your verified practice profile.</h1>
          <p>
            Share the details patients need to choose you with confidence. Your application is reviewed by our clinical team before your profile goes live.
          </p>
        </div>
        <div className="doctor-onboard-hero-meta">
          <span className="doctor-onboard-hero-icon"><SolarIcon name="shield-check-linear" size={22} /></span>
          <div>
            <strong>Private by design</strong>
            <span>Your documents are only used for verification.</span>
          </div>
        </div>
      </div>

      <div className="doctor-onboard-layout">
        <aside className="doctor-onboard-aside">
          <div className="doctor-onboard-account">
            <div className="doctor-onboard-avatar">
              {(doctor?.fullName || 'Doctor')
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase()}
            </div>
            <div>
              <strong>{doctor?.fullName || 'Doctor account'}</strong>
              <span>{doctor?.email || 'Finish setting up your account'}</span>
            </div>
          </div>

          <div className="doctor-onboard-progress">
            <div className="doctor-onboard-progress-top">
              <span>Application progress</span>
              <strong>{uploadedCount === docs.length ? 'Ready to review' : 'In progress'}</strong>
            </div>
            <div className="doctor-onboard-progress-bar">
              <span style={{ width: `${Math.max(12, (uploadedCount / docs.length) * 100)}%` }} />
            </div>
          </div>

          <ol className="doctor-onboard-steps">
            <li className="is-active">
              <span>1</span>
              <div><strong>Professional details</strong><small>Credentials and practice information</small></div>
            </li>
            <li className="is-active">
              <span>2</span>
              <div><strong>Identity details</strong><small>ID or passport information</small></div>
            </li>
            <li className={uploadedCount === docs.length ? 'is-active' : ''}>
              <span>3</span>
              <div><strong>Verification documents</strong><small>{uploadedCount} of {docs.length} uploaded</small></div>
            </li>
            <li>
              <span>4</span>
              <div><strong>Clinical review</strong><small>Usually completed within 2 business days</small></div>
            </li>
          </ol>

          <div className="doctor-onboard-note">
            <SolarIcon name="info-circle-linear" size={18} />
            <p>You can return to this page while your application is in progress. Your profile will only appear in the directory after approval.</p>
          </div>
        </aside>

        <section className="doctor-onboard-form-shell">
          <div className="doctor-onboard-form-heading">
            <div>
              <span className="doctor-onboard-section-kicker">Step 1 of 4</span>
              <h2>Professional details</h2>
              <p>Tell us about your clinical practice and how patients can work with you.</p>
            </div>
            <span className="doctor-onboard-save-state"><SolarIcon name="lock-keyhole-linear" size={15} /> Saved securely</span>
          </div>

          {error && (
            <div className="doctor-onboard-error" role="alert">
              <SolarIcon name="danger-circle-linear" size={19} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="doctor-onboard-section">
              <div className="doctor-onboard-section-title">
                <span className="doctor-onboard-section-number">01</span>
                <div><h3>Practice identity</h3><p>Your professional registration and location.</p></div>
              </div>
              <div className="doctor-onboard-field-grid">
                <div className="portal-input-group">
                  <label className="portal-label" htmlFor="hpcsa-number">HPCSA registration number <span>*</span></label>
                  <input id="hpcsa-number" type="text" required value={hpcsaNumber} onChange={(e) => setHpcsaNumber(e.target.value)} placeholder="MP 0123456" className="portal-input" style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="portal-input-group">
                  <label className="portal-label" htmlFor="specialty">Primary specialty <span>*</span></label>
                  <select id="specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="portal-input portal-select">
                    {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="portal-input-group">
                  <label className="portal-label" htmlFor="province">Province <em>Optional</em></label>
                  <select id="province" value={province} onChange={(e) => setProvince(e.target.value)} className="portal-input portal-select">
                    <option value="">Select your province</option>
                    {PROVINCES.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div className="portal-input-group">
                  <label className="portal-label" htmlFor="rate">
                    Hourly consultation rate <span>*</span>
                  </label>
                  <div className="doctor-onboard-input-prefix">
                    <span>ZAR</span>
                    <input
                      id="rate"
                      type="number"
                      readOnly
                      disabled
                      value={ratePerHour || '850'}
                      placeholder="850"
                      className="portal-input"
                      style={{
                        backgroundColor: 'rgba(223, 171, 98, 0.08)',
                        cursor: 'not-allowed',
                        color: 'var(--color-chocolate-base, #2A170F)',
                        fontWeight: 600,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '0.74rem', color: 'var(--color-cream-text-muted)', marginTop: '4px', display: 'block' }}>
                    Standardized platform rate (R 850 / hr). Managed platform-wide.
                  </span>
                </div>
              </div>
            </div>

            <div className="doctor-onboard-section">
              <div className="doctor-onboard-section-title">
                <span className="doctor-onboard-section-number">02</span>
                <div><h3>Identity details</h3><p>Use the same identity document you will upload below.</p></div>
              </div>
              <div className="doctor-onboard-tabs" role="tablist" aria-label="Identity document type">
                <button type="button" className={identityType === 'id' ? 'is-selected' : ''} onClick={() => setIdentityType('id')} role="tab" aria-selected={identityType === 'id'}>
                  <SolarIcon name="card-2-linear" size={18} />
                  <span><strong>South African ID</strong><small>13-digit ID number</small></span>
                </button>
                <button type="button" className={identityType === 'passport' ? 'is-selected' : ''} onClick={() => setIdentityType('passport')} role="tab" aria-selected={identityType === 'passport'}>
                  <SolarIcon name="document-text-linear" size={18} />
                  <span><strong>Passport</strong><small>International passport</small></span>
                </button>
              </div>
              <div className="portal-input-group doctor-onboard-identity-field">
                <label className="portal-label" htmlFor="identity-number">{identityType === 'id' ? 'South African ID number' : 'Passport number'} <span>*</span></label>
                <input id="identity-number" type="text" required value={identityNumber} onChange={(e) => setIdentityNumber(identityType === 'id' ? e.target.value.replace(/\D/g, '').slice(0, 13) : e.target.value.toUpperCase().slice(0, 20))} inputMode={identityType === 'id' ? 'numeric' : 'text'} maxLength={identityType === 'id' ? 13 : 20} placeholder={identityType === 'id' ? '8001015009087' : 'A1234567'} className="portal-input" />
                <span className="doctor-onboard-field-hint">{identityType === 'id' ? 'Enter all 13 digits without spaces.' : 'Use the number shown on your valid passport.'}</span>
              </div>
            </div>

            <div className="doctor-onboard-section">
              <div className="doctor-onboard-section-title">
                <span className="doctor-onboard-section-number">03</span>
                <div><h3>Verification documents</h3><p>Clear, current files help us review your application faster.</p></div>
              </div>
              <div className="doctor-onboard-docs">
                {docs.map((doc, i) => (
                  <div className={`doctor-onboard-doc ${doc.fileUrl ? 'is-uploaded' : ''}`} key={doc.label}>
                    <div className="doctor-onboard-doc-icon"><SolarIcon name={doc.fileUrl ? 'check-circle-linear' : 'document-add-linear'} size={21} /></div>
                    <div className="doctor-onboard-doc-copy"><strong>{doc.label}</strong><span>{doc.hint}</span>{doc.fileUrl && <small>{doc.filename}</small>}</div>
                    <label className="doctor-onboard-upload">
                      <input ref={i === 1 ? hpcsaRef : undefined} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => e.target.files?.[0] && uploadFile(i, e.target.files[0])} />
                      <span>{uploadingKey === i ? 'Uploading...' : doc.fileUrl ? 'Replace' : 'Choose file'}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="doctor-onboard-section">
              <div className="doctor-onboard-section-title">
                <span className="doctor-onboard-section-number">04</span>
                <div><h3>How you practise</h3><p>Help patients understand your approach and availability.</p></div>
              </div>
              <div className="portal-input-group">
                <label className="portal-label" htmlFor="bio">Clinical biography <span>*</span></label>
                <textarea id="bio" required rows={5} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Share your qualifications, areas of focus, and what patients can expect from a consultation." className="portal-input portal-textarea" style={{ resize: 'vertical' }} />
                <span className="doctor-onboard-field-hint">At least 20 characters. This will be reviewed before publication.</span>
              </div>
              <button type="button" className={`doctor-onboard-toggle ${offersInClinic ? 'is-selected' : ''}`} onClick={() => setOffersInClinic((v) => !v)} aria-pressed={offersInClinic}>
                <span className="doctor-onboard-toggle-check"><SolarIcon name={offersInClinic ? 'check-linear' : 'add-linear'} size={17} /></span>
                <span><strong>Offer in-clinic visits</strong><small>Optional. Show patients that you also see them at a physical practice.</small></span>
                <span className="doctor-onboard-toggle-state">{offersInClinic ? 'Selected' : 'Add'}</span>
              </button>
              {offersInClinic && (
                <div className="doctor-onboard-field-grid doctor-onboard-clinic-fields">
                  <div><label className="portal-label" htmlFor="facility-name">Practice name</label><input id="facility-name" type="text" value={facilityName} onChange={(e) => setFacilityName(e.target.value)} placeholder="e.g. Netcare Sunninghill" className="portal-input" /></div>
                  <div><label className="portal-label" htmlFor="facility-address">Practice address</label><input id="facility-address" type="text" value={facilityAddress} onChange={(e) => setFacilityAddress(e.target.value)} placeholder="Clinic street address" className="portal-input" /></div>
                </div>
              )}
            </div>

            <div className="doctor-onboard-submit">
              <label className="doctor-onboard-terms">
                <input type="checkbox" id="terms" required checked={termsAgreed} onChange={(e) => setTermsAgreed(e.target.checked)} />
                <span>I confirm that I am registered with the HPCSA in good standing, hold valid indemnity cover, and agree to the Chekup247 Doctor Terms &amp; Telehealth Practice Agreement.</span>
              </label>
              <button type="submit" disabled={loading} className="btn-primary doctor-onboard-submit-button">
                {loading ? 'Submitting application...' : 'Submit application for review'}
                {!loading && <SolarIcon name="arrow-right-linear" size={18} />}
              </button>
              <p>Your profile stays private until the clinical team approves your application.</p>
            </div>
          </form>
        </section>
      </div>
      <div className="doctor-onboard-footer">
        {doctor ? <Link href="/">Back to dashboard</Link> : <Link href="/login">Sign in instead</Link>}
      </div>
    </div>
  );
}
