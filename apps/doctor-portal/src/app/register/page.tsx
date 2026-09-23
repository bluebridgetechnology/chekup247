'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChekupCrossLogo } from '../../components/common/ChekupCrossLogo';
import { SolarIcon } from '../../components/common/SolarIcon';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { toastSuccess, errorMessage } from '../../lib/toast';

type Step = 1 | 2;

export default function DoctorRegisterPage() {
  const router = useRouter();
  const { registerDoctor, verifyOtp, resendOtp } = useDoctorAuth();
  const [step, setStep] = useState<Step>(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (!resendCountdown) return;
    const timer = window.setTimeout(() => setResendCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCountdown]);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '13px 14px',
    borderRadius: '12px',
    border: '1px solid rgba(42, 23, 15, 0.14)',
    background: '#fffdf9',
    color: 'var(--color-chocolate-base)',
    fontSize: '0.95rem',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '7px',
    color: 'var(--color-chocolate-base)',
    fontSize: '0.82rem',
    fontWeight: 700,
  };

  const startResendCountdown = () => setResendCountdown(30);

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!firstName.trim() || !lastName.trim()) {
      setError('Enter your first and last name to continue.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Use at least 8 characters for your password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await registerDoctor({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
      });
      setStep(2);
      startResendCountdown();
      toastSuccess('Account started', 'Check your inbox for your 6-digit verification code.');
    } catch (err: any) {
      setError(errorMessage(err, 'We could not create your account. Please check your details.'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(email.trim(), otp);
      toastSuccess('Email verified', 'Now let’s build your professional profile.');
      router.push('/onboard');
    } catch (err: any) {
      setError(errorMessage(err, 'That code is not valid. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    setError(null);
    try {
      await resendOtp(email.trim());
      startResendCountdown();
      toastSuccess('New code sent', 'Check your inbox for the latest verification code.');
    } catch (err: any) {
      setError(errorMessage(err, 'We could not resend the code right now.'));
    }
  };

  const steps = [
    { number: '01', label: 'Your account' },
    { number: '02', label: 'Verify email' },
    { number: '03', label: 'Professional profile' },
  ];

  return (
    <main className="auth-split-layout" style={{ minHeight: '100vh' }}>
      <section className="auth-visual-pane" style={{ padding: '36px 42px' }}>
        <Link href="/" aria-label="Chekup247 home" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <ChekupCrossLogo size={32} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>
            Chekup<span style={{ color: 'var(--color-gold-base)' }}>247</span>
          </span>
        </Link>
        <div style={{ maxWidth: 430, marginTop: 'auto', marginBottom: 'auto' }}>
          <p style={{ color: 'var(--color-gold-base)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>
            For healthcare professionals
          </p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 3.2vw, 3.1rem)', lineHeight: 1.08, marginBottom: 18 }}>
            Make more room for the care that matters.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, maxWidth: 380 }}>
            Join a verified network that lets you set your availability, meet patients online, and grow your practice on your terms.
          </p>
          <div style={{ display: 'flex', gap: 24, marginTop: 34, color: 'rgba(255,255,255,0.68)', fontSize: '0.8rem' }}>
            <span><strong style={{ color: '#fff', display: 'block', fontSize: '1.15rem' }}>120+</strong> verified doctors</span>
            <span><strong style={{ color: '#fff', display: 'block', fontSize: '1.15rem' }}>POPIA</strong> compliant care</span>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.76rem' }}>Your account details are encrypted and kept private.</p>
      </section>

      <section className="auth-form-pane" style={{ justifyContent: 'center' }}>
        <div className="auth-form-wrapper" style={{ maxWidth: 560, width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 36 }}>
            {steps.map((item, index) => {
              const active = index + 1 <= (step === 2 ? 2 : 1);
              return (
                <div key={item.number} style={{ flex: 1, color: active ? 'var(--color-chocolate-base)' : '#a49b91', fontSize: '0.74rem', fontWeight: 700 }}>
                  <div style={{ height: 4, borderRadius: 8, background: active ? 'var(--color-gold-base)' : '#e8e0d5', marginBottom: 9 }} />
                  <span>{item.number} </span>{item.label}
                </div>
              );
            })}
          </div>

          <div style={{ marginBottom: 26 }}>
            <p style={{ color: 'var(--color-gold-bronze)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
              Step {step} of 3
            </p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.35rem)', marginBottom: 8 }}>
              {step === 1 ? 'Start with the basics' : 'Confirm your email'}
            </h2>
            <p style={{ color: 'var(--color-cream-text-muted)', lineHeight: 1.55 }}>
              {step === 1 ? 'Create your secure account first. Your professional details come after verification.' : <>We sent a 6-digit code to <strong style={{ color: 'var(--color-chocolate-base)' }}>{email}</strong>.</>}
            </p>
          </div>

          {error && (
            <div role="alert" style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 14px', borderRadius: 12, background: '#fff3f1', color: '#a7372d', marginBottom: 20, fontSize: '0.86rem' }}>
              <SolarIcon name="danger-circle-linear" size={18} color="#a7372d" />
              <span>{error}</span>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRegister}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle} htmlFor="doctor-first-name">First name</label><input id="doctor-first-name" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Thabo" style={inputStyle} /></div>
                <div><label style={labelStyle} htmlFor="doctor-last-name">Last name</label><input id="doctor-last-name" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Mthembu" style={inputStyle} /></div>
              </div>
              <div style={{ marginTop: 16 }}><label style={labelStyle} htmlFor="doctor-email">Work email</label><input id="doctor-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@practice.co.za" style={inputStyle} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
                <div><label style={labelStyle} htmlFor="doctor-password">Password</label><input id="doctor-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" style={inputStyle} /></div>
                <div><label style={labelStyle} htmlFor="doctor-confirm-password">Confirm password</label><input id="doctor-confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" style={inputStyle} /></div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', height: 50, marginTop: 24, borderRadius: 12 }}>{loading ? 'Creating your account…' : 'Continue to email verification →'}</button>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <label style={labelStyle} htmlFor="doctor-otp">Verification code</label>
              <input id="doctor-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" style={{ ...inputStyle, fontSize: '1.5rem', letterSpacing: '0.28em', textAlign: 'center' }} />
              <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', height: 50, marginTop: 18, borderRadius: 12 }}>{loading ? 'Verifying…' : 'Verify and continue →'}</button>
              <button type="button" onClick={handleResend} disabled={resendCountdown > 0} style={{ width: '100%', border: 0, background: 'transparent', color: 'var(--color-gold-bronze)', fontWeight: 700, marginTop: 18, cursor: resendCountdown > 0 ? 'not-allowed' : 'pointer' }}>
                {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend code'}
              </button>
              <button type="button" onClick={() => { setStep(1); setError(null); }} style={{ width: '100%', border: 0, background: 'transparent', color: 'var(--color-cream-text-muted)', fontSize: '0.82rem', marginTop: 10, cursor: 'pointer' }}>← Change email address</button>
            </form>
          )}

          <p style={{ textAlign: 'center', color: 'var(--color-cream-text-muted)', fontSize: '0.84rem', marginTop: 30 }}>
            Already have an account? <Link href="/login" style={{ color: 'var(--color-gold-bronze)', fontWeight: 800 }}>Sign in</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
