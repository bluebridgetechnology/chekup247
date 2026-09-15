'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Lock,
  Phone,
  Award,
  FileText,
  DollarSign,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';

const SPECIALTIES = [
  'General Practitioner',
  'Family Medicine Specialist',
  'Paediatrician',
  'Dermatologist',
  'Psychiatrist',
  'Obstetrician & Gynaecologist',
  'Internal Medicine Specialist',
  'Occupational Health Practitioner',
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

  // Step 3: Document Uploads (Simulated S3 / MinIO URLs)
  const [idDocUrl, setIdDocUrl] = useState('https://storage.chekup247.co.za/docs/id-doc-verified.pdf');
  const [hpcsaCertUrl, setHpcsaCertUrl] = useState('https://storage.chekup247.co.za/docs/hpcsa-cert-verified.pdf');
  const [indemnityCertUrl, setIndemnityCertUrl] = useState('https://storage.chekup247.co.za/docs/indemnity-cert.pdf');

  // Step 4: Practice details
  const [ratePerHour, setRatePerHour] = useState('850');
  const [bio, setBio] = useState('');
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
      });

      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please review your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 16px',
        background: 'linear-gradient(180deg, var(--color-slate-100) 0%, #ffffff 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '680px',
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '40px',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--color-slate-200)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-brand-50)',
              color: 'var(--color-brand-700)',
              fontSize: '0.8rem',
              fontWeight: 600,
              marginBottom: '12px',
            }}
          >
            <ShieldCheck size={14} />
            <span>Direct Medical Practice Onboarding</span>
          </div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
            Doctor Registration Wizard
          </h1>
          <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem' }}>
            Step {step} of 4 — {step === 1 && 'Personal & Account Details'}
            {step === 2 && 'HPCSA Registration & Specialty'}
            {step === 3 && 'Required Documentation'}
            {step === 4 && 'Practice Details & Consultation Fee'}
          </p>
        </div>

        {/* Wizard Step Progress Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '0',
              right: '0',
              height: '2px',
              background: 'var(--color-slate-200)',
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
              background: 'var(--color-brand-500)',
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
                background: step >= s ? 'var(--color-brand-500)' : '#ffffff',
                border: `2px solid ${step >= s ? 'var(--color-brand-500)' : 'var(--color-slate-300)'}`,
                color: step >= s ? '#ffffff' : 'var(--color-slate-500)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.85rem',
                fontWeight: 700,
                zIndex: 3,
                transition: 'all 0.2s ease',
              }}
            >
              {step > s ? <Check size={16} /> : s}
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
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-danger-bg)',
              border: '1px solid #fecaca',
              color: 'var(--color-danger)',
              fontSize: '0.875rem',
              marginBottom: '24px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* STEP 1: Personal & Account */}
          {step === 1 && (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                  Full Name & Title
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }}>
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. Thabo Mthembu"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                  Professional Practice Email
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }}>
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dr.thabo@medpractice.co.za"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                  Practice Mobile Phone (Emergency / WhatsApp)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }}>
                    <Phone size={18} />
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+27 83 987 6543"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                className="btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                <span>Continue to Step 2</span>
                <ArrowRight size={18} />
              </button>
            </div>
          )}

          {/* STEP 2: HPCSA Registration & Specialty */}
          {step === 2 && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                  HPCSA Registration Number
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }}>
                    <Award size={18} />
                  </span>
                  <input
                    type="text"
                    required
                    value={hpcsaNumber}
                    onChange={(e) => setHpcsaNumber(e.target.value)}
                    placeholder="e.g. MP 0123456"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      textTransform: 'uppercase',
                      outline: 'none',
                    }}
                  />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: '4px' }}>
                  Your registration status will be verified against the official HPCSA public register.
                </p>
              </div>

              <div style={{ marginBottom: '28px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                  Primary Clinical Specialty
                </label>
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-slate-300)',
                    fontSize: '0.9rem',
                    background: '#ffffff',
                    outline: 'none',
                  }}
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
                  style={{ flex: 1, padding: '12px' }}
                >
                  <ArrowLeft size={18} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="btn-primary"
                  style={{ flex: 2, padding: '12px' }}
                >
                  <span>Continue to Step 3</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Document Uploads */}
          {step === 3 && (
            <div>
              <p style={{ color: 'var(--color-slate-600)', fontSize: '0.875rem', marginBottom: '20px' }}>
                Please supply digital copies of your credentials for administrative verification. Files are encrypted with AES-256 and stored in compliant af-south-1 storage.
              </p>

              {/* Document 1: ID Document */}
              <div style={{ border: '1px solid var(--color-slate-200)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-slate-800)' }}>
                    1. South African National ID or Valid Passport
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: '#ecfdf5', color: '#059669', fontWeight: 600 }}>
                    Attached
                  </span>
                </div>
                <input
                  type="text"
                  value={idDocUrl}
                  onChange={(e) => setIdDocUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-slate-300)',
                    fontSize: '0.8rem',
                    color: 'var(--color-slate-600)',
                  }}
                />
              </div>

              {/* Document 2: HPCSA Certificate */}
              <div style={{ border: '1px solid var(--color-slate-200)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-slate-800)' }}>
                    2. HPCSA Annual Practising Certificate
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: '#ecfdf5', color: '#059669', fontWeight: 600 }}>
                    Attached
                  </span>
                </div>
                <input
                  type="text"
                  value={hpcsaCertUrl}
                  onChange={(e) => setHpcsaCertUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-slate-300)',
                    fontSize: '0.8rem',
                    color: 'var(--color-slate-600)',
                  }}
                />
              </div>

              {/* Document 3: Indemnity Proof */}
              <div style={{ border: '1px solid var(--color-slate-200)', borderRadius: 'var(--radius-lg)', padding: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-slate-800)' }}>
                    3. Proof of Medical Malpractice Indemnity Insurance (MPS/MDU)
                  </div>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: '#ecfdf5', color: '#059669', fontWeight: 600 }}>
                    Attached
                  </span>
                </div>
                <input
                  type="text"
                  value={indemnityCertUrl}
                  onChange={(e) => setIndemnityCertUrl(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-slate-300)',
                    fontSize: '0.8rem',
                    color: 'var(--color-slate-600)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  <ArrowLeft size={18} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="btn-primary"
                  style={{ flex: 2, padding: '12px' }}
                >
                  <span>Continue to Step 4</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Practice Details & Submission */}
          {step === 4 && (
            <div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                  Hourly Consultation Rate (ZAR)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--color-slate-500)' }}>
                    R
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    required
                    value={ratePerHour}
                    onChange={(e) => setRatePerHour(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 32px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: '4px' }}>
                  Recommended baseline for virtual General Practitioner sessions: R650 — R950 / hour.
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                  Clinical Biography & Practice Background
                </label>
                <textarea
                  required
                  rows={4}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Describe your medical qualifications, clinical experience, and approach to telehealth consultations..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-slate-300)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-slate-50)',
                  marginBottom: '24px',
                }}
              >
                <input
                  type="checkbox"
                  id="termsCheck"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  style={{ marginTop: '2px', cursor: 'pointer', accentColor: 'var(--color-brand-500)' }}
                />
                <label htmlFor="termsCheck" style={{ fontSize: '0.85rem', color: 'var(--color-slate-700)', cursor: 'pointer', lineHeight: 1.5 }}>
                  I solemnly declare that I am registered with the Health Professions Council of South Africa (HPCSA) in good standing, hold active medical indemnity cover, and agree to adhere to the HPCSA General Ethical Guidelines for Good Practice in Telehealth.
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="btn-secondary"
                  style={{ flex: 1, padding: '12px' }}
                >
                  <ArrowLeft size={18} />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{ flex: 2, padding: '12px' }}
                >
                  {loading ? 'Submitting Application...' : 'Submit Doctor Registration'}
                </button>
              </div>
            </div>
          )}
        </form>

        <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-slate-600)' }}>
          Already registered as a ChekUp doctor?{' '}
          <Link href="/login" style={{ color: 'var(--color-brand-600)', fontWeight: 600 }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
