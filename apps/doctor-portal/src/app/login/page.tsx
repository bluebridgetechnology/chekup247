'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Smartphone,
  Eye,
  EyeOff,
  Stethoscope,
  Clock,
  Award,
} from 'lucide-react';
import { ChekupCrossLogo } from '../../components/common/ChekupCrossLogo';
import { SolarIcon } from '../../components/common/SolarIcon';
import { useDoctorAuth } from '../../context/DoctorAuthContext';

export default function DoctorLoginPage() {
  const router = useRouter();
  const { login } = useDoctorAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or doctor access restricted');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-layout">
      {/* LEFT COLUMN: Deep Chocolate Brand Visual Panel */}
      <div className="auth-visual-pane">
        {/* Top Brand Mark */}
        <div>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              marginBottom: '48px',
            }}
          >
            <ChekupCrossLogo size={32} />
            <span
              style={{
                fontFamily: 'var(--font-heading), sans-serif',
                fontSize: '1.45rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              <span style={{ color: '#ffffff' }}>Chekup</span>
              <span style={{ color: 'var(--color-gold-base, #DFAB62)' }}>247</span>
            </span>
          </Link>

          {/* Hero Content */}
          <div style={{ maxWidth: '440px', position: 'relative', zIndex: 2 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 14px',
                borderRadius: 'var(--radius-full, 9999px)',
                backgroundColor: 'rgba(223, 171, 98, 0.16)',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
                color: 'var(--color-gold-base, #DFAB62)',
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '16px',
              }}
            >
              <ShieldCheck size={14} />
              <span>HPCSA Certified Telemedicine</span>
            </span>

            <h1
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.15,
                letterSpacing: '-0.025em',
                marginBottom: '16px',
                fontFamily: 'var(--font-heading), sans-serif',
              }}
            >
              South Africa&apos;s Digital Clinical Practice
            </h1>

            <p
              style={{
                color: 'rgba(255, 255, 255, 0.75)',
                fontSize: '1rem',
                lineHeight: 1.6,
                marginBottom: '32px',
              }}
            >
              Connect with patients nationwide, issue compliant e-prescriptions with ICD-10 diagnostic codes, and automate medical practice earnings.
            </p>
          </div>
        </div>

        {/* Doctor Trust Badges */}
        <div className="auth-social-proof-grid">
          <div className="auth-social-badge">
            <div className="auth-social-badge-val">
              <Award size={18} style={{ color: 'var(--color-gold-primary, #E2B467)' }} />
              <span>100%</span>
            </div>
            <div className="auth-social-badge-lbl">HPCSA Act 101/1965 Compliant</div>
          </div>

          <div className="auth-social-badge">
            <div className="auth-social-badge-val">
              <Clock size={18} style={{ color: 'var(--color-gold-primary, #E2B467)' }} />
              <span>R850+</span>
            </div>
            <div className="auth-social-badge-lbl">Average Hourly Rate</div>
          </div>

          <div className="auth-social-badge">
            <div className="auth-social-badge-val">
              <Stethoscope size={18} style={{ color: 'var(--color-gold-primary, #E2B467)' }} />
              <span>Zero</span>
            </div>
            <div className="auth-social-badge-lbl">Admin Overhead</div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Warm Cream Form Panel */}
      <div className="auth-form-pane">
        <div className="auth-form-wrapper">
          {/* Header */}
          <div style={{ marginBottom: '32px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full, 9999px)',
                backgroundColor: 'var(--color-gold-pale, #F0E5D3)',
                color: 'var(--color-chocolate-base, #2A170F)',
                border: '1px solid rgba(223, 171, 98, 0.3)',
                fontSize: '0.75rem',
                fontWeight: 700,
                marginBottom: '12px',
              }}
            >
              <span>Doctor Practice Suite</span>
            </span>
            <h2
              style={{
                fontSize: '2rem',
                color: 'var(--color-chocolate-base, #2A170F)',
                marginBottom: '8px',
                fontWeight: 800,
                fontFamily: 'var(--font-heading), sans-serif',
                letterSpacing: '-0.02em',
              }}
            >
              Doctor Sign In
            </h2>
            <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.925rem' }}>
              Access your clinical consultations queue, schedule shifts, and manage prescriptions.
            </p>
          </div>

          {/* LocumStaff Fast SSO Banner */}
          <div
            style={{
              backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
              border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              borderRadius: '16px',
              padding: '16px',
              marginBottom: '24px',
              boxShadow: '0 2px 8px rgba(42, 23, 15, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-chocolate-base, #2A170F)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '4px' }}>
              <Smartphone size={16} style={{ color: 'var(--color-gold-bronze, #B88647)' }} />
              <span>LocumStaff Verified Doctor?</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginBottom: '12px' }}>
              One-tap federated sign in with your mobile LocumStaff medical provider credentials.
            </p>
            <Link
              href="/callback?code=mock-locumstaff-sso-verified"
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}
            >
              <span>Sign In with LocumStaff SSO</span>
              <ArrowRight size={15} />
            </Link>
          </div>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '24px 0',
              color: 'var(--color-cream-text-muted, #6B5E55)',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-gold-border, rgba(223, 171, 98, 0.2))' }} />
            <span style={{ padding: '0 12px', fontWeight: 600 }}>or sign in directly</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-gold-border, rgba(223, 171, 98, 0.2))' }} />
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
                marginBottom: '20px',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Direct Login Form */}
          <form onSubmit={handleSubmit}>
            <div className="auth-input-group">
              <label className="auth-label">Practice Email Address</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dr.smith@example.co.za"
                  className="auth-input"
                />
              </div>
            </div>

            <div className="auth-input-group" style={{ marginBottom: '28px' }}>
              <label className="auth-label">Password</label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="auth-input"
                  style={{ paddingRight: '44px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-cream-text-muted, #6B5E55)',
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', height: '48px', fontSize: '0.95rem' }}
            >
              {loading ? 'Signing In...' : 'Sign In to Practice Suite'}
              <SolarIcon name="arrow-right-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
            </button>
          </form>

          {/* Footer Navigation */}
          <div style={{ marginTop: '28px', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
            New medical practitioner?{' '}
            <Link href="/register" style={{ color: 'var(--color-chocolate-base, #2A170F)', fontWeight: 700, textDecoration: 'underline' }}>
              Register HPCSA Practice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
