'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChekupCrossLogo } from '../../components/common/ChekupCrossLogo';
import { SolarIcon } from '../../components/common/SolarIcon';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { toastSuccess, toastError, errorMessage } from '../../lib/toast';

const TITLES = ['Dr', 'Prof', 'Dr (MC)', 'Dr (FC)', 'Other'];

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

const LANGUAGES = [
  'isiZulu',
  'isiXhosa',
  'Afrikaans',
  'English',
  'Sepedi',
  'Setswana',
  'Sesotho',
  'Xitsonga',
  'siSwati',
  'Tshivenda',
  'isiNdebele',
];

export default function DoctorRegisterPage() {
  const router = useRouter();
  const { registerDoctor, verifyOtp, resendOtp } = useDoctorAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState('Dr');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [gender, setGender] = useState('');
  const [province, setProvince] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [qualifications, setQualifications] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [otp, setOtp] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleLanguage = (lang: string) => {
    setLanguages((prev) => (prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]));
  };

  const startResendCountdown = () => {
    setResendCountdown(30);
    const timer = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please provide your first and last name');
      return;
    }
    if (idNumber.trim() && !/^(\d{13}|[A-Za-z0-9]{5,9})$/.test(idNumber.trim())) {
      setError('ID number must be 13 digits (RSA) or a valid passport number');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Please provide a valid email address');
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
    if (languages.length === 0) {
      setError('Please select at least one language you speak');
      return;
    }

    setLoading(true);
    try {
      await registerDoctor({
        title,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        id_number: idNumber.trim() || undefined,
        gender: (gender as 'male' | 'female') || undefined,
        province: province || undefined,
        languages_spoken: languages,
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
      });
      setVerifyEmail(email.trim());
      setStep(2);
      toastSuccess('Account created', 'A 6-digit verification code has been sent to your email.');
      startResendCountdown();
    } catch (err: any) {
      setError(errorMessage(err, 'Registration failed. Please check your details.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(verifyEmail, otp);
      toastSuccess('Email verified', 'Redirecting to complete your onboardingâ€¦');
      router.push('/onboard');
    } catch (err: any) {
      setError(errorMessage(err, 'Verification failed.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    try {
      await resendOtp(verifyEmail);
      toastSuccess('Code resent', 'A new 6-digit code has been sent.');
      startResendCountdown();
    } catch (err: any) {
      setError(errorMessage(err, 'Failed to resend code.'));
    }
  };

  const fieldLabel: React.CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
    color: 'var(--color-cream-text-muted, #6B5E55)',
    marginBottom: '7px',
    textTransform: 'uppercase',
  };

  const fieldInput: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1.5px solid rgba(223, 171, 98, 0.3)',
    backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
    color: 'var(--color-chocolate-base, #2A170F)',
    fontSize: '0.9rem',
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div className="auth-split-layout" style={{ minHeight: '100vh' }}>
      <div className="auth-visual-pane">
        <div style={{ padding: '28px 36px', display: 'flex', flexDirection: 'column', minHeight: '100%', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ChekupCrossLogo size={30} />
            <span style={{ fontFamily: 'var(--font-heading), sans-serif', fontSize: '1.15rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
              Chekup247<span style={{ color: 'var(--color-gold-base, #DFAB62)' }}> â€¢ Doctor</span>
            </span>
          </div>

          <div style={{ maxWidth: '380px' }}>
            <h1 style={{ fontFamily: 'var(--font-heading), sans-serif', fontSize: '1.65rem', fontWeight: 700, color: '#fff', lineHeight: 1.25, margin: '0 0 16px' }}>
              Join South Africa&apos;s verified doctor network
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', lineHeight: 1.6, margin: '0 0 26px' }}>
              Create your account in under 2 minutes, then verify your email to complete your HPCSA + specialty profile.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { icon: 'verified-check-linear', label: 'HPCSA verified', sub: 'Registry-checked credentials' },
                { icon: 'clock-circle-linear', label: 'Your hours, your terms', sub: 'Set shifts & rates yourself' },
                { icon: 'wallet-linear', label: 'Paid fortnightly', sub: 'Direct, reliable payouts' },
              ].map((b) => (
                <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'rgba(223,171,98,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SolarIcon name={b.icon as any} size={17} color="#DFAB62" />
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>{b.label}</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>{b.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-pane">
        <div className="auth-form-wrapper" style={{ maxWidth: '520px' }}>
          <div className="auth-heading-block" style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', marginBottom: '4px' }}>
              {step === 1 ? 'Create your doctor account' : 'Verify your email'}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
              {step === 1 ? 'Short signup â€” OTP confirmation is next.' : `We sent a 6-digit code to ${verifyEmail}.`}
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '12px', backgroundColor: 'var(--color-danger-bg, #fef2f2)', border: '1px solid #fecaca', color: 'var(--color-danger, #ef4444)', fontSize: '0.85rem', marginBottom: '20px', fontWeight: 600 }}>
              <SolarIcon name="danger-circle-linear" size={18} color="var(--color-danger, #ef4444)" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRegister}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label className="portal-label" style={fieldLabel}>Title</label>
                  <select value={title} onChange={(e) => setTitle(e.target.value)} className="portal-select" style={fieldInput}>
                    {TITLES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="portal-label" style={fieldLabel}>First Name</label>
                  <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Thabo" className="portal-input" style={fieldInput} />
                </div>
                <div>
                  <label className="portal-label" style={fieldLabel}>Last Name</label>
                  <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Mthembu" className="portal-input" style={fieldInput} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label className="portal-label" style={fieldLabel}>ID Number / Passport</label>
                  <input type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="13-digit ID or passport" className="portal-input" style={fieldInput} />
                </div>
                <div>
                  <label className="portal-label" style={fieldLabel}>Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="portal-select" style={fieldInput}>
                    <option value="">Selectâ€¦</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              <div className="portal-input-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label" style={fieldLabel}>Province</label>
                <select value={province} onChange={(e) => setProvince(e.target.value)} className="portal-select" style={fieldInput}>
                  <option value="">Select your provinceâ€¦</option>
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div className="portal-input-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label" style={fieldLabel}>Languages Spoken</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {LANGUAGES.map((lang) => {
                    const active = languages.includes(lang);
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLanguage(lang)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '999px',
                          border: active
                            ? '1.5px solid var(--color-gold-base, #DFAB62)'
                            : '1.5px solid rgba(223,171,98,0.25)',
                          backgroundColor: active ? 'rgba(223,171,98,0.14)' : 'transparent',
                          color: active ? 'var(--color-chocolate-base, #2A170F)' : 'var(--color-cream-text-muted, #6B5E55)',
                          fontSize: '0.78rem',
                          fontWeight: active ? 700 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        {lang}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="portal-input-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label" style={fieldLabel}>Qualifications</label>
                <input
                  type="text"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                  placeholder="e.g. MBChB (Wits), MMed Family Medicine (UP)"
                  className="portal-input"
                  style={fieldInput}
                />
              </div>

              <div className="portal-input-group" style={{ marginBottom: '16px' }}>
                <label className="portal-label" style={fieldLabel}>Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="dr.thabo@practice.co.za" className="portal-input" style={fieldInput} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label className="portal-label" style={fieldLabel}>Phone (WhatsApp ok)</label>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 82 000 0000" className="portal-input" style={fieldInput} />
                </div>
                <div>
                  <label className="portal-label" style={fieldLabel}>Password</label>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" className="portal-input" style={fieldInput} />
                </div>
              </div>

              <div className="portal-input-group" style={{ marginBottom: '20px' }}>
                <label className="portal-label" style={fieldLabel}>Confirm Password</label>
                <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" className="portal-input" style={fieldInput} />
              </div>

              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', height: '48px', fontWeight: 800, fontSize: '0.92rem', border: 'none', borderRadius: '12px', cursor: 'pointer', backgroundColor: 'var(--color-gold-base, #DFAB62)', color: 'var(--color-chocolate-base, #2A170F)' }}>
                {loading ? 'Creating accountâ€¦' : 'Create Account & Send Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.875rem', lineHeight: 1.5, marginBottom: '18px' }}>
                We sent a 6-digit code to <strong style={{ color: 'var(--color-chocolate-base, #2A170F)' }}>{verifyEmail}</strong>.
              </p>

              <div className="portal-input-group" style={{ marginBottom: '20px' }}>
                <label className="portal-label" style={fieldLabel}>6-Digit Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢"
                  className="portal-input"
                  style={{ ...fieldInput, letterSpacing: '0.4em', fontWeight: 700, textAlign: 'center' }}
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', height: '48px', fontWeight: 800, fontSize: '0.92rem', border: 'none', borderRadius: '12px', cursor: 'pointer', backgroundColor: 'var(--color-gold-base, #DFAB62)', color: 'var(--color-chocolate-base, #2A170F)' }}>
                {loading ? 'Verifyingâ€¦' : 'Verify & Continue'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '14px', fontSize: '0.8rem' }}>
                {resendCountdown > 0 ? (
                  <span style={{ color: 'var(--color-cream-text-muted, #6B5E55)' }}>Resend code in {resendCountdown}s</span>
                ) : (
                  <span style={{ color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                    Didn&apos;t receive it?{' '}
                    <button type="button" onClick={handleResend} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gold-base, #DFAB62)', fontWeight: 700, textDecoration: 'underline', padding: 0 }}>
                      Resend
                    </button>
                  </span>
                )}
              </div>
            </form>
          )}

          <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
            Already a Chekup247 doctor?{' '}
            <Link href="/login" style={{ color: 'var(--color-gold-base, #DFAB62)', fontWeight: 700, textDecoration: 'underline' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
