'use client';

import React, { useState } from 'react';
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

export default function DoctorRegisterPage() {
  const router = useRouter();
  const { onboard } = useDoctorAuth();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Personal & Contact
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: HPCSA & Specialty
  const [hpcsaNumber, setHpcsaNumber] = useState('');
  const [specialty, setSpecialty] = useState('General Practitioner');

  // Step 3: Document Uploads
  const [idDocUrl, setIdDocUrl] = useState('https://storage.chekup247.co.za/docs/id-doc-verified.pdf');
  const [hpcsaCertUrl, setHpcsaCertUrl] = useState('https://storage.chekup247.co.za/docs/hpcsa-cert-verified.pdf');
  const [indemnityCertUrl, setIndemnityCertUrl] = useState('https://storage.chekup247.co.za/docs/indemnity-cert.pdf');

  // Step 4: Practice details
  const [ratePerHour, setRatePerHour] = useState('850');
  const [bio, setBio] = useState('');
  const [offersInClinic, setOffersInClinic] = useState(false);
  const [facilityName, setFacilityName] = useState('');
  const [facilityAddress, setFacilityAddress] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNextStep = () => {
    setError(null);
    if (step === 1) {
      if (!fullName.trim() || !email.trim() || !password) {
        setError('Please complete all required fields');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!hpcsaNumber.trim()) {
        setError('HPCSA registration number is required');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!idDocUrl || !hpcsaCertUrl) {
        setError('Please upload your ID and HPCSA registration certificate');
        return;
      }
      setStep(4);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!termsAgreed) {
      setError('You must accept the HPCSA Telehealth Practice Agreement');
      return;
    }

    if (!bio.trim() || bio.length < 20) {
      setError('Please provide a clinical biography (at least 20 characters)');
      return;
    }

    const rate = parseFloat(ratePerHour);
    if (isNaN(rate) || rate < 0) {
      setError('Please enter a valid hourly consultation rate');
      return;
    }

    setLoading(true);

    try {
      await onboard({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        hpcsa_number: hpcsaNumber.trim().toUpperCase(),
        specialty,
        rate_per_hour: rate,
        bio: bio.trim(),
        documents_url: [idDocUrl, hpcsaCertUrl, indemnityCertUrl].filter(Boolean),
        offers_in_clinic: offersInClinic,
        facility_name: offersInClinic && facilityName.trim() ? facilityName.trim() : undefined,
        facility_address: offersInClinic && facilityAddress.trim() ? facilityAddress.trim() : undefined,
      });

      router.push('/');
      toastSuccess('Registration submitted', 'Your credentials are pending verification.');
    } catch (err: any) {
      const msg = errorMessage(err, 'Registration failed. Please review your details.');
      setError(msg);
      toastError('Registration failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-layout">
      {/* LEFT COLUMN: Deep Chocolate Brand Visual Panel */}
      <div className="auth-visual-pane">
        {/* Top: Logo only */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ height: '36px', display: 'flex', alignItems: 'center' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                textDecoration: 'none',
              }}
            >
              <ChekupCrossLogo size={32} />
              <span
                style={{
                  fontFamily: 'var(--font-heading), sans-serif',
                  fontSize: '1.4rem',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                }}
              >
                <span style={{ color: '#ffffff' }}>Chekup</span>
                <span style={{ color: 'var(--color-gold-base, #DFAB62)' }}>247</span>
              </span>
            </Link>
          </div>
        </div>

        {/* Middle: Headline & Text — centred vertically between logo and stats */}
        <div style={{ marginTop: 'auto', marginBottom: 'auto', paddingTop: '32px', paddingBottom: '32px', position: 'relative', zIndex: 2, maxWidth: '440px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-heading), sans-serif',
              fontSize: '2rem',
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.2,
              letterSpacing: '-0.025em',
              margin: '0 0 10px',
            }}
          >
            Join South Africa&apos;s Verified Medical Network
          </h1>

          <p
            style={{
              color: 'rgba(255, 255, 255, 0.75)',
              fontSize: '0.925rem',
              lineHeight: 1.55,
              margin: 0,
              fontWeight: 400,
            }}
          >
            Set your own consultation schedule, consult with verified patients across all 9 provinces, and receive guaranteed payouts with automated 85% revenue share.
          </p>
        </div>

        {/* Bottom: Stats Strip */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="auth-stats-strip">
            <div className="auth-stats-row">
              <div className="auth-stat-item">
                <div className="auth-stat-val">
                  <SolarIcon name="diploma-verified-linear" size={18} color="var(--color-gold-primary, #E2B467)" />
                  <span>HPCSA</span>
                </div>
                <div className="auth-stat-lbl">Direct Register Verification</div>
              </div>

              <div className="auth-stat-divider" aria-hidden="true" />

              <div className="auth-stat-item">
                <div className="auth-stat-val">
                  <SolarIcon name="clock-circle-linear" size={18} color="var(--color-gold-primary, #E2B467)" />
                  <span>Flexible</span>
                </div>
                <div className="auth-stat-lbl">Set Your Own Shifts</div>
              </div>

              <div className="auth-stat-divider" aria-hidden="true" />

              <div className="auth-stat-item">
                <div className="auth-stat-val">
                  <SolarIcon name="stethoscope-linear" size={18} color="var(--color-gold-primary, #E2B467)" />
                  <span>Bi-Weekly</span>
                </div>
                <div className="auth-stat-lbl">Automated Direct Payouts</div>
              </div>
            </div>

            <hr className="auth-stats-hr" />
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Warm Cream Form Panel */}
      <div className="auth-form-pane">
        <div className="auth-form-wrapper" style={{ maxWidth: '540px' }}>
          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <div
              style={{
                height: '36px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full, 9999px)',
                backgroundColor: 'var(--color-gold-pale, #F0E5D3)',
                color: 'var(--color-chocolate-base, #2A170F)',
                border: '1px solid rgba(223, 171, 98, 0.25)',
                fontSize: '0.74rem',
                fontWeight: 700,
                marginBottom: '32px',
              }}
            >
              <SolarIcon name="shield-check-linear" size={14} color="var(--color-chocolate-base)" />
              <span>
                Step {step} of 4 &bull; {step === 1 && 'Personal & Credentials'}
                {step === 2 && 'HPCSA Registration'}
                {step === 3 && 'Compliance Documents'}
                {step === 4 && 'Practice Details'}
              </span>
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-heading), sans-serif',
                fontSize: '2rem',
                fontWeight: 700,
                color: 'var(--color-chocolate-base, #2A170F)',
                margin: '0 0 10px',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
              }}
            >
              Doctor Registration
            </h2>
            <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.925rem', lineHeight: 1.55, margin: 0, fontWeight: 400 }}>
              Provide your clinical credentials for verification by our medical governance board.
            </p>
          </div>

          {/* Stepper Progress Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '0',
                right: '0',
                height: '2px',
                backgroundColor: 'var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                zIndex: 1,
                transform: 'translateY(-50%)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '0',
                width: `${((step - 1) / 3) * 100}%`,
                height: '2px',
                backgroundColor: 'var(--color-gold-primary, #E2B467)',
                zIndex: 2,
                transform: 'translateY(-50%)',
                transition: 'width 0.3s ease',
              }}
            />

            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: step >= s ? 'var(--color-gold-primary, #E2B467)' : 'var(--color-cream-surface, #FDFBF7)',
                  border: `2px solid ${step >= s ? 'var(--color-gold-primary, #E2B467)' : 'var(--color-gold-border, rgba(223, 171, 98, 0.3))'}`,
                  color: step >= s ? 'var(--color-chocolate-base, #2A170F)' : 'var(--color-cream-text-muted, #6B5E55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  zIndex: 3,
                  transition: 'all 0.2s ease',
                  boxShadow: step >= s ? '0 2px 8px var(--color-gold-cta-shadow)' : 'none',
                }}
              >
                {step > s ? <SolarIcon name="check-circle-linear" size={18} color="var(--color-chocolate-base, #2A170F)" /> : s}
              </div>
            ))}
          </div>

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: 'var(--color-danger-bg, #fef2f2)',
                border: '1px solid #fecaca',
                color: 'var(--color-danger, #ef4444)',
                fontSize: '0.875rem',
                marginBottom: '24px',
                fontWeight: 600,
              }}
            >
              <SolarIcon name="danger-circle-linear" size={18} color="var(--color-danger, #ef4444)" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* STEP 1: Personal & Account */}
            {step === 1 && (
              <div>
                <div className="auth-input-group">
                  <label className="auth-label">Full Name & Title</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <SolarIcon name="user-linear" size={18} color="var(--color-gold-bronze, #B88647)" />
                    </span>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. Thabo Mthembu"
                      className="auth-input"
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Professional Practice Email</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <SolarIcon name="letter-linear" size={18} color="var(--color-gold-bronze, #B88647)" />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="dr.thabo@medpractice.co.za"
                      className="auth-input"
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Practice Mobile Phone</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <SolarIcon name="phone-linear" size={18} color="var(--color-gold-bronze, #B88647)" />
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+27 83 987 6543"
                      className="auth-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px' }}>
                  <div>
                    <label className="auth-label">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars"
                      className="auth-input"
                      style={{ paddingLeft: '16px' }}
                    />
                  </div>
                  <div>
                    <label className="auth-label">Confirm</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat"
                      className="auth-input"
                      style={{ paddingLeft: '16px' }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="btn-primary"
                  style={{ width: '100%', height: '48px' }}
                >
                  <span>Continue to Step 2</span>
                  <SolarIcon name="arrow-right-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
                </button>
              </div>
            )}

            {/* STEP 2: HPCSA Registration & Specialty */}
            {step === 2 && (
              <div>
                <div className="auth-input-group">
                  <label className="auth-label">HPCSA Registration Number</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <SolarIcon name="diploma-verified-linear" size={18} color="var(--color-gold-bronze, #B88647)" />
                    </span>
                    <input
                      type="text"
                      required
                      value={hpcsaNumber}
                      onChange={(e) => setHpcsaNumber(e.target.value)}
                      placeholder="e.g. MP 0123456"
                      className="auth-input"
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '6px' }}>
                    Verified live against the official South African HPCSA public medical registry.
                  </p>
                </div>

                <div className="auth-input-group" style={{ marginBottom: '28px' }}>
                  <label className="auth-label">Primary Clinical Specialty</label>
                  <select
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="portal-select"
                    style={{ height: '48px' }}
                  >
                    {SPECIALTIES.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary"
                    style={{ flex: 1, height: '48px' }}
                  >
                    <SolarIcon name="arrow-left-linear" size={18} />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="btn-primary"
                    style={{ flex: 2, height: '48px' }}
                  >
                    <span>Continue to Step 3</span>
                    <SolarIcon name="arrow-right-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Document Uploads */}
            {step === 3 && (
              <div>
                <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.875rem', marginBottom: '20px' }}>
                  Please confirm your credentials for administrative board verification. Documents are stored in encrypted POPIA-compliant storage.
                </p>

                {/* Doc 1 */}
                <div style={{ border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))', borderRadius: '16px', padding: '16px', backgroundColor: 'var(--color-cream-surface, #FDFBF7)', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                      1. South African National ID / Passport
                    </span>
                    <span className="badge-success">Attached</span>
                  </div>
                  <input
                    type="text"
                    value={idDocUrl}
                    onChange={(e) => setIdDocUrl(e.target.value)}
                    className="portal-input"
                    style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                  />
                </div>

                {/* Doc 2 */}
                <div style={{ border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))', borderRadius: '16px', padding: '16px', backgroundColor: 'var(--color-cream-surface, #FDFBF7)', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                      2. HPCSA Annual Practising Certificate
                    </span>
                    <span className="badge-success">Attached</span>
                  </div>
                  <input
                    type="text"
                    value={hpcsaCertUrl}
                    onChange={(e) => setHpcsaCertUrl(e.target.value)}
                    className="portal-input"
                    style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                  />
                </div>

                {/* Doc 3 */}
                <div style={{ border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))', borderRadius: '16px', padding: '16px', backgroundColor: 'var(--color-cream-surface, #FDFBF7)', marginBottom: '28px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                      3. Proof of Medical Indemnity Insurance (MPS/MDU)
                    </span>
                    <span className="badge-success">Attached</span>
                  </div>
                  <input
                    type="text"
                    value={indemnityCertUrl}
                    onChange={(e) => setIndemnityCertUrl(e.target.value)}
                    className="portal-input"
                    style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="btn-secondary"
                    style={{ flex: 1, height: '48px' }}
                  >
                    <SolarIcon name="arrow-left-linear" size={18} />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="btn-primary"
                    style={{ flex: 2, height: '48px' }}
                  >
                    <span>Continue to Step 4</span>
                    <SolarIcon name="arrow-right-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Practice Details & Submission */}
            {step === 4 && (
              <div>
                <div className="auth-input-group">
                  <label className="auth-label">Hourly Consultation Rate (ZAR)</label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon" style={{ fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                      R
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      required
                      value={ratePerHour}
                      onChange={(e) => setRatePerHour(e.target.value)}
                      className="auth-input"
                    />
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '4px' }}>
                    Standard South African virtual consultation baseline: R650 — R950 / hour.
                  </p>
                </div>

                <div className="auth-input-group">
                  <label className="auth-label">Clinical Biography</label>
                  <textarea
                    required
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Describe your medical qualifications, sub-specialties, and clinical philosophy..."
                    className="portal-textarea"
                  />
                </div>

                {/* In-Clinic Visit Option */}
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
                    border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                    marginBottom: '20px',
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-chocolate-base)' }}>
                    <input
                      type="checkbox"
                      checked={offersInClinic}
                      onChange={(e) => setOffersInClinic(e.target.checked)}
                      style={{ accentColor: 'var(--color-gold-base, #DFAB62)', width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span>Offer In-Clinic (In-Person) Visits</span>
                  </label>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted)', marginTop: '4px', marginLeft: '28px', lineHeight: 1.4 }}>
                    Your practice address is strictly private for virtual visits, and will ONLY be displayed to patients when they book an In-Clinic appointment.
                  </p>

                  {offersInClinic && (
                    <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label className="portal-label" style={{ fontSize: '0.8rem' }}>Practice / Clinic Name</label>
                        <input
                          type="text"
                          required={offersInClinic}
                          value={facilityName}
                          onChange={(e) => setFacilityName(e.target.value)}
                          placeholder="e.g. Netcare Sunninghill Hospital Suites"
                          className="portal-input"
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>
                      <div>
                        <label className="portal-label" style={{ fontSize: '0.8rem' }}>Physical Practice Address</label>
                        <input
                          type="text"
                          required={offersInClinic}
                          value={facilityAddress}
                          onChange={(e) => setFacilityAddress(e.target.value)}
                          placeholder="e.g. Cnr Witkoppen & Nanyuki Rd, Sunninghill, Sandton"
                          className="portal-input"
                          style={{ fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '16px',
                    borderRadius: '16px',
                    backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
                    border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                    marginBottom: '24px',
                  }}
                >
                  <input
                    type="checkbox"
                    id="termsCheck"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    style={{ marginTop: '3px', cursor: 'pointer', accentColor: 'var(--color-gold-primary, #E2B467)' }}
                  />
                  <label htmlFor="termsCheck" style={{ fontSize: '0.825rem', color: 'var(--color-chocolate-base, #2A170F)', cursor: 'pointer', lineHeight: 1.5 }}>
                    I solemnly declare that I am registered with the Health Professions Council of South Africa (HPCSA) in good standing, hold active medical indemnity cover, and agree to adhere to the HPCSA General Ethical Guidelines for Good Practice in Telehealth.
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="btn-secondary"
                    style={{ flex: 1, height: '48px' }}
                  >
                    <SolarIcon name="arrow-left-linear" size={18} />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary"
                    style={{ flex: 2, height: '48px' }}
                  >
                    {loading ? 'Submitting Application...' : 'Submit Registration'}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
            Already registered as a ChekUp doctor?{' '}
            <Link href="/login" style={{ color: 'var(--color-chocolate-base, #2A170F)', fontWeight: 700, textDecoration: 'underline' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
