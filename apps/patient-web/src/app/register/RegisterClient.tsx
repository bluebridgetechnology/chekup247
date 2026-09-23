'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, Mail, ShieldCheck, UserRound, CalendarDays, LockKeyhole, Phone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toastSuccess, toastError, errorMessage } from '../../lib/toast';
import { ChekupCrossLogo } from '../../components/Navbar';

type Step = 1 | 2 | 3;

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: 12,
  border: '1px solid rgba(42, 23, 15, 0.14)',
  background: '#fffdf9',
  color: 'var(--color-chocolate-base)',
  fontSize: '0.95rem',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 7,
  color: 'var(--color-chocolate-base)',
  fontSize: '0.82rem',
  fontWeight: 700,
};

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect') || '/appointments';
  const { register } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const continueTo = (nextStep: Step) => {
    setError(null);
    setStep(nextStep);
  };

  const handleNext = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (step === 1) {
      if (fullName.trim().split(/\s+/).length < 2) {
        setError('Please enter your first and last name.');
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        setError('Please enter a valid email address.');
        return;
      }
      continueTo(2);
      return;
    }
    if (step === 2) {
      if (!phone.trim()) {
        setError('A phone number helps us keep your care journey connected.');
        return;
      }
      continueTo(3);
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
    void submitRegistration();
  };

  const submitRegistration = async () => {
    setLoading(true);
    try {
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        date_of_birth: dateOfBirth || undefined,
      });
      setRegisteredEmail(email.trim());
      toastSuccess('Account created', 'Check your email for a verification code.');
    } catch (err: any) {
      const message = errorMessage(err, 'We could not create your account. Please try again.');
      setError(message);
      toastError('Registration failed', message);
    } finally {
      setLoading(false);
    }
  };

  if (registeredEmail) {
    const verifyUrl = `/verify-email?email=${encodeURIComponent(registeredEmail)}${redirectUrl !== '/appointments' ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''}`;
    return (
      <main className="auth-split-layout">
        <section className="auth-visual-pane" style={{ padding: '36px 42px' }}>
          <Link href="/" aria-label="Chekup247 home" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <ChekupCrossLogo size={32} />
            <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>Chekup<span style={{ color: 'var(--color-gold-base)' }}>247</span></span>
          </Link>
          <div style={{ marginTop: 'auto', marginBottom: 'auto', maxWidth: 390 }}>
            <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 3.2vw, 3.1rem)', lineHeight: 1.08, marginBottom: 18 }}>Care that fits your life.</h1>
            <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.65 }}>One simple account for appointments, prescriptions, and your private health record.</p>
          </div>
        </section>
        <section className="auth-form-pane" style={{ justifyContent: 'center' }}>
          <div className="auth-form-wrapper" style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
            <div style={{ width: 68, height: 68, borderRadius: '50%', background: 'var(--color-gold-pale)', color: 'var(--color-gold-dark)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22 }}><Mail size={30} /></div>
            <p style={{ color: 'var(--color-gold-bronze)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>One last step</p>
            <h2 style={{ fontSize: 'clamp(1.9rem, 3vw, 2.45rem)', marginBottom: 12 }}>Check your inbox</h2>
            <p style={{ color: 'var(--color-cream-text-muted)', lineHeight: 1.6, marginBottom: 26 }}>We sent a 6-digit verification code to <strong style={{ color: 'var(--color-chocolate-base)' }}>{registeredEmail}</strong>. Verify your email to start booking care.</p>
            <Link href={verifyUrl} className="btn-primary" style={{ width: '100%', height: 50, borderRadius: 12 }}>Continue to verification <ArrowRight size={18} /></Link>
            <p style={{ marginTop: 22, fontSize: '0.82rem', color: 'var(--color-cream-text-muted)' }}>Can’t find it? Check your spam folder.</p>
          </div>
        </section>
      </main>
    );
  }

  const steps = [
    { icon: UserRound, title: 'Basics' },
    { icon: CalendarDays, title: 'About you' },
    { icon: LockKeyhole, title: 'Secure account' },
  ];

  return (
    <main className="auth-split-layout">
      <section className="auth-visual-pane" style={{ padding: '36px 42px' }}>
        <Link href="/" aria-label="Chekup247 home" style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <ChekupCrossLogo size={32} />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: '1.2rem' }}>Chekup<span style={{ color: 'var(--color-gold-base)' }}>247</span></span>
        </Link>
        <div style={{ marginTop: 'auto', marginBottom: 'auto', maxWidth: 420 }}>
          <p style={{ color: 'var(--color-gold-base)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>Your health, your pace</p>
          <h1 style={{ color: '#fff', fontSize: 'clamp(2rem, 3.2vw, 3.1rem)', lineHeight: 1.08, marginBottom: 18 }}>Better care starts with a simpler first step.</h1>
          <p style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.65 }}>Create your account in a few quick steps, then find the right doctor without the waiting room.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 30, color: 'rgba(255,255,255,0.78)', fontSize: '0.86rem' }}>
            <span><ShieldCheck size={17} style={{ verticalAlign: 'middle', marginRight: 9, color: 'var(--color-gold-base)' }} />Private, POPIA-compliant health records</span>
            <span><CheckCircle2 size={17} style={{ verticalAlign: 'middle', marginRight: 9, color: 'var(--color-gold-base)' }} />Verified doctors, available when you need them</span>
          </div>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.76rem' }}>Takes about 2 minutes. You can update your details anytime.</p>
      </section>

      <section className="auth-form-pane" style={{ justifyContent: 'center' }}>
        <div className="auth-form-wrapper" style={{ maxWidth: 560, width: '100%' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 34 }}>
            {steps.map((item, index) => {
              const Icon = item.icon;
              const active = index + 1 <= step;
              return <div key={item.title} style={{ flex: 1, color: active ? 'var(--color-chocolate-base)' : '#a49b91', fontSize: '0.74rem', fontWeight: 700 }}><div style={{ height: 4, borderRadius: 8, background: active ? 'var(--color-gold-base)' : '#e8e0d5', marginBottom: 9 }} /><Icon size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />{item.title}</div>;
            })}
          </div>
          <div style={{ marginBottom: 26 }}>
            <p style={{ color: 'var(--color-gold-bronze)', fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Step {step} of 3</p>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.35rem)', marginBottom: 8 }}>{step === 1 ? 'Let’s get to know you' : step === 2 ? 'A little about you' : 'Keep your account secure'}</h2>
            <p style={{ color: 'var(--color-cream-text-muted)', lineHeight: 1.55 }}>{step === 1 ? 'Just your name and email to get started.' : step === 2 ? 'These details help us make your care more personal.' : 'Choose a password you’ll remember. Your health information stays private.'}</p>
          </div>
          {error && <div role="alert" style={{ padding: '12px 14px', borderRadius: 12, background: '#fff3f1', color: '#a7372d', marginBottom: 20, fontSize: '0.86rem' }}>{error}</div>}
          <form onSubmit={handleNext}>
            {step === 1 && <><div style={{ marginBottom: 16 }}><label style={labelStyle} htmlFor="patient-full-name">Full name</label><div style={{ position: 'relative' }}><UserRound size={18} style={{ position: 'absolute', left: 14, top: 14, color: '#9b9086' }} /><input id="patient-full-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Sipho Ndlovu" style={{ ...inputStyle, paddingLeft: 42 }} /></div></div><div><label style={labelStyle} htmlFor="patient-email">Email address</label><div style={{ position: 'relative' }}><Mail size={18} style={{ position: 'absolute', left: 14, top: 14, color: '#9b9086' }} /><input id="patient-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={{ ...inputStyle, paddingLeft: 42 }} /></div></div></>}
            {step === 2 && <><div style={{ marginBottom: 16 }}><label style={labelStyle} htmlFor="patient-phone">Phone number</label><div style={{ position: 'relative' }}><Phone size={18} style={{ position: 'absolute', left: 14, top: 14, color: '#9b9086' }} /><input id="patient-phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+27 82 000 0000" style={{ ...inputStyle, paddingLeft: 42 }} /></div><p style={{ color: 'var(--color-cream-text-muted)', fontSize: '0.76rem', marginTop: 7 }}>Used for appointment reminders, never shared.</p></div><div><label style={labelStyle} htmlFor="patient-dob">Date of birth <span style={{ fontWeight: 500, color: '#9b9086' }}>(optional)</span></label><div style={{ position: 'relative' }}><CalendarDays size={18} style={{ position: 'absolute', left: 14, top: 14, color: '#9b9086' }} /><input id="patient-dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} style={{ ...inputStyle, paddingLeft: 42 }} /></div></div></>}
            {step === 3 && <><div style={{ marginBottom: 16 }}><label style={labelStyle} htmlFor="patient-password">Password</label><div style={{ position: 'relative' }}><LockKeyhole size={18} style={{ position: 'absolute', left: 14, top: 14, color: '#9b9086' }} /><input id="patient-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" style={{ ...inputStyle, paddingLeft: 42 }} /></div></div><div><label style={labelStyle} htmlFor="patient-confirm-password">Confirm password</label><input id="patient-confirm-password" type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" style={inputStyle} /></div><p style={{ color: 'var(--color-cream-text-muted)', fontSize: '0.76rem', lineHeight: 1.5, marginTop: 12 }}>By creating an account, you agree to our <Link href="/terms" style={{ color: 'var(--color-gold-bronze)', fontWeight: 700 }}>Terms</Link> and <Link href="/privacy" style={{ color: 'var(--color-gold-bronze)', fontWeight: 700 }}>Privacy Policy</Link>.</p></>}
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}><button type="button" disabled={step === 1 || loading} onClick={() => { setError(null); setStep((step - 1) as Step); }} className="btn-secondary" style={{ flex: '0 0 34%', height: 50, borderRadius: 12 }}>Back</button><button type="submit" disabled={loading} className="btn-primary" style={{ flex: 1, height: 50, borderRadius: 12 }}>{loading ? 'Creating your account…' : step === 3 ? 'Create my account' : 'Continue →'}</button></div>
          </form>
          <p style={{ textAlign: 'center', color: 'var(--color-cream-text-muted)', fontSize: '0.84rem', marginTop: 28 }}>Already have an account? <Link href="/login" style={{ color: 'var(--color-gold-bronze)', fontWeight: 800 }}>Sign in</Link></p>
        </div>
      </section>
    </main>
  );
}

export default function RegisterClient() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: 'var(--color-cream-base)' }} />}><RegisterContent /></Suspense>;
}
