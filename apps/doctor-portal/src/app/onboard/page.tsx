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
  const [specialty, setSpecialty] = useState(profile?.specialty ?? SPECIALTIES[0]);
  const [province, setProvince] = useState('');
  const [ratePerHour, setRatePerHour] = useState(String(profile?.ratePerHour ?? ''));
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
      const presignedRes = await fetch(`http://localhost:4000/api/v1/storage/presigned-upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('chekup_doctor_token') || ''}`,
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          category: 'other',
          scope: 'doctor',
        }),
        credentials: 'include',
      });
      const presigned = await presignedRes.json();
      if (!presignedRes.ok) throw new Error(presigned.message || 'Failed to prepare upload');

      const putRes = await fetch(presigned.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error('Upload failed');

      setDocs((prev) =>
        prev.map((d, i) => (i === index ? { ...d, filename: file.name, fileUrl: presigned.fileUrl } : d)),
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

  return (
    <div className="portal-page auth-split-layout" style={{ minHeight: '100vh' }}>
      <div className="auth-form-pane" style={{ justifyContent: 'center' }}>
        <div className="auth-form-wrapper" style={{ maxWidth: '560px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div
              style={{
                width: '34px', height: '34px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'var(--color-gold-pale, #F0E5D3)', border: '1px solid rgba(223, 171, 98, 0.3)',
                color: 'var(--color-chocolate-base, #2A170F)', fontWeight: 800, fontSize: '0.9rem',
              }}
            >
              Done
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                Complete Your Professional Profile
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                {doctor?.email || 'Finishing account setup'}
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px',
                backgroundColor: 'var(--color-danger-bg, #fef2f2)', border: '1px solid #fecaca',
                color: 'var(--color-danger, #ef4444)', fontSize: '0.875rem', marginBottom: '20px', fontWeight: 600,
              }}
            >
              <SolarIcon name="danger-circle-linear" size={18} color="var(--color-danger, #ef4444)" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="portal-input-group" style={{ marginBottom: '18px' }}>
              <label className="portal-label">HPCSA Registration Number</label>
              <input
                type="text"
                required
                value={hpcsaNumber}
                onChange={(e) => setHpcsaNumber(e.target.value)}
                placeholder="e.g. MP 0123456"
                className="portal-input"
                style={{ textTransform: 'uppercase' }}
              />
            </div>

            <div className="portal-input-group" style={{ marginBottom: '18px' }}>
              <label className="portal-label">Primary Specialty</label>
              <select
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                className="portal-input portal-select"
              >
                {SPECIALTIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="portal-input-group" style={{ marginBottom: '18px' }}>
              <label className="portal-label">Province <span style={{ fontWeight: 400, color: 'var(--color-cream-text-muted)' }}>(optional)</span></label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="portal-input portal-select"
              >
                <option value="">Select your province</option>
                {PROVINCES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="portal-input-group" style={{ marginBottom: '18px' }}>
              <label className="portal-label">Verification Documents</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {docs.map((doc, i) => (
                  <div key={i} style={{ border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))', borderRadius: '14px', padding: '14px', backgroundColor: 'var(--color-cream-surface, #FDFBF7)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-chocolate-base, #2A170F)' }}>{doc.label}</span>
                      {doc.fileUrl ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '999px', backgroundColor: 'rgba(41, 153, 111, 0.1)', color: '#29996F', fontSize: '0.72rem', fontWeight: 700 }}>
                          <SolarIcon name="check-circle-linear" size={13} color="#29996F" /> Uploaded
                        </span>
                      ) : null}
                    </div>
                    <input
                      ref={i === 1 ? hpcsaRef : undefined}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => e.target.files?.[0] && uploadFile(i, e.target.files[0])}
                      className="portal-input"
                      style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                    />
                    <div style={{ fontSize: '0.74rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '6px' }}>
                      {doc.hint}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="portal-input-group" style={{ marginBottom: '18px' }}>
              <label className="portal-label">Hourly Consultation Rate (ZAR)</label>
              <input
                type="number"
                min="0"
                step="50"
                required
                value={ratePerHour}
                onChange={(e) => setRatePerHour(e.target.value)}
                placeholder="e.g. 850"
                className="portal-input"
              />
            </div>

            <div className="portal-input-group" style={{ marginBottom: '18px' }}>
              <label className="portal-label">Clinical Biography</label>
              <textarea
                required
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Describe your qualifications, sub-specialties, and clinical philosophy..."
                className="portal-input portal-textarea"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', cursor: 'pointer',
                padding: '14px', borderRadius: '14px', border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
              }}
              onClick={() => setOffersInClinic((v) => !v)}
            >
              <input type="checkbox" checked={offersInClinic} readOnly style={{ accentColor: 'var(--color-gold-base, #DFAB62)', width: '18px', height: '18px', cursor: 'pointer' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-chocolate-base, #2A170F)' }}>Offer In-Clinic Visitn</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>Optional - shown to patients who prefer physical consultations.</div>
              </div>
            </div>

            {offersInClinic && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                <div>
                  <label className="portal-label">Practice Name</label>
                  <input type="text" value={facilityName} onChange={(e) => setFacilityName(e.target.value)} placeholder="e.g. Netcare Sunninghill" className="portal-input" />
                </div>
                <div>
                  <label className="portal-label">Practice Address</label>
                  <input type="text" value={facilityAddress} onChange={(e) => setFacilityAddress(e.target.value)} placeholder="Clinic street address" className="portal-input" />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '20px' }}>
              <input
                type="checkbox"
                id="terms"
                required
                checked={termsAgreed}
                onChange={(e) => setTermsAgreed(e.target.checked)}
                style={{ marginTop: '3px', accentColor: 'var(--color-gold-base, #DFAB62)' }}
              />
              <label htmlFor="terms" style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', lineHeight: 1.5 }}>
                I declare that I am registered with the HPCSA in good standing, hold valid medical
                indemnity cover, and agree to the Chekup247 Doctor Terms &amp; Telehealth Practice Agreement.
              </label>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', height: '48px' }}>
              {loading ? 'Submitting...' : 'Submit for Verification'}
            </button>
          </form>

          <div style={{ marginTop: '22px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
            {doctor ? (
              <Link href="/" style={{ color: 'var(--color-chocolate-base, #2A170F)', fontWeight: 700 }}>Back to Dashboard</Link>
            ) : (
              <Link href="/login" style={{ color: 'var(--color-chocolate-base, #2A170F)', fontWeight: 700 }}>Sign In</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
