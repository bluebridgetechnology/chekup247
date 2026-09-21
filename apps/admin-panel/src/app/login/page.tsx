'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Mail,
  Lock,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  ArrowRight,
  Shield,
  Activity,
  CheckCircle2,
  FileCheck2,
  LockKeyhole,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { ChekupCrossLogo } from '../../components/ChekupCrossLogo';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login, completeTotpLogin } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 2FA challenge step
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please provide administrator email and master security password.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result?.requiresTotp) {
        setChallengeToken(result.challengeToken);
        return;
      }
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify administrator credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!challengeToken || !/^\d{6}$/.test(totpCode)) {
      setError('Please enter the 6-digit code from your authenticator application.');
      return;
    }
    setLoading(true);
    try {
      await completeTotpLogin(challengeToken, totpCode);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Two-factor verification failed. Code may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-layout">
      {/* ====================================================================
          Left Column: Brand & Security Perimeter Visual Pane
          ==================================================================== */}
      <div className="auth-visual-pane">
        {/* Subtle Background Watermark Grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            opacity: 0.05,
            backgroundImage: `radial-gradient(circle at 1px 1px, #DFAB62 1px, transparent 0)`,
            backgroundSize: '24px 24px',
          }}
          aria-hidden="true"
        />

        {/* Top Header: Logo + Brand */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <ChekupCrossLogo size={34} />
            <span
              style={{
                fontSize: '1.45rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              <span style={{ color: '#ffffff' }}>ChekUp</span>
              <span style={{ color: '#DFAB62' }}>247</span>
              <span style={{ fontSize: '0.8rem', marginLeft: '8px', color: '#DFAB62', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Governance
              </span>
            </span>
          </div>

          {/* Hero Content */}
          <div style={{ maxWidth: '440px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 14px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(223, 171, 98, 0.14)',
                border: '1px solid rgba(223, 171, 98, 0.3)',
                color: '#DFAB62',
                fontSize: '0.74rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: '18px',
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#22C55E',
                  boxShadow: '0 0 8px #22C55E',
                }}
              />
              <span>Isolated Security Perimeter</span>
            </div>

            <h1
              style={{
                fontSize: '2.1rem',
                fontWeight: 700,
                color: '#ffffff',
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
                margin: '0 0 14px',
              }}
            >
              Executive Clinical Oversight & National Control Plane
            </h1>

            <p
              style={{
                color: 'rgba(255, 255, 255, 0.72)',
                fontSize: '0.92rem',
                lineHeight: 1.6,
                margin: '0 0 32px',
              }}
            >
              South Africa&apos;s digital healthcare platform control center. Real-time HPCSA license registry verification, encrypted video consultation telemetry, and dispute arbitration.
            </p>

            {/* Feature Points */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(223, 171, 98, 0.15)',
                    border: '1px solid rgba(223, 171, 98, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: '#DFAB62',
                  }}
                >
                  <FileCheck2 size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ffffff', marginBottom: '2px' }}>
                    HPCSA Registry & Credentialing
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.4 }}>
                    Automated licensing verification against Health Professions Council of South Africa guidelines.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(223, 171, 98, 0.15)',
                    border: '1px solid rgba(223, 171, 98, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: '#DFAB62',
                  }}
                >
                  <Activity size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ffffff', marginBottom: '2px' }}>
                    Live Consultation Telemetry HUD
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.4 }}>
                    Real-time WebRTC room monitoring, audio/video diagnostics, and latency telemetry.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(223, 171, 98, 0.15)',
                    border: '1px solid rgba(223, 171, 98, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: '#DFAB62',
                  }}
                >
                  <LockKeyhole size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#ffffff', marginBottom: '2px' }}>
                    POPIA Section 19 Audit Trail
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.4 }}>
                    Immutable cryptographic audit logs tracking access to Special Personal Health Information.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Proof Grid */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div className="auth-social-proof-grid">
            <div className="auth-social-badge">
              <div className="auth-social-badge-val">Act 56</div>
              <div className="auth-social-badge-lbl">HPCSA Regulated</div>
            </div>
            <div className="auth-social-badge">
              <div className="auth-social-badge-val">Sec 19</div>
              <div className="auth-social-badge-lbl">POPIA Cryptographic</div>
            </div>
            <div className="auth-social-badge">
              <div className="auth-social-badge-val">256-Bit</div>
              <div className="auth-social-badge-lbl">TLS 1.3 Transport</div>
            </div>
          </div>

          <div
            style={{
              fontSize: '0.74rem',
              color: 'rgba(255, 255, 255, 0.5)',
              marginTop: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Shield size={13} color="#DFAB62" />
            <span>ChekUp247 (Pty) Ltd • Unauthorized access attempts are monitored and recorded.</span>
          </div>
        </div>
      </div>

      {/* ====================================================================
          Right Column: Clean Cream Auth Form Pane
          ==================================================================== */}
      <div className="auth-form-pane">
        <div className="auth-form-wrapper">
          {/* Mobile Brand Header */}
          <div style={{ display: 'none', textAlign: 'center', marginBottom: '28px' }} className="mobile-brand-header">
            <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '12px' }}>
              <ChekupCrossLogo size={42} />
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#2A170F' }}>
              ChekUp<span style={{ color: '#DFAB62' }}>247</span> Governance
            </div>
          </div>

          {/* 2FA Challenge View */}
          {challengeToken ? (
            <div>
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    background: '#2A170F',
                    border: '1.5px solid #DFAB62',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                    boxShadow: '0 4px 20px rgba(42, 23, 15, 0.25)',
                  }}
                >
                  <ShieldCheck size={30} color="#E2B467" />
                </div>
                <h2
                  style={{
                    fontSize: '1.5rem',
                    fontWeight: 800,
                    color: '#2A170F',
                    marginBottom: '6px',
                  }}
                >
                  Multi-Factor Authentication
                </h2>
                <p style={{ color: '#6B5E55', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
                  Enter the 6-digit code from your authenticator app (Google Authenticator, Authy, or 1Password).
                </p>
              </div>

              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#991B1B',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '20px',
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleTotpSubmit}>
                <div style={{ marginBottom: '20px' }}>
                  <label className="auth-label" style={{ textAlign: 'center' }}>
                    Security Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="auth-input"
                    style={{
                      height: '56px',
                      padding: '0 16px',
                      fontSize: '1.8rem',
                      textAlign: 'center',
                      letterSpacing: '0.35em',
                      fontWeight: 800,
                      color: '#2A170F',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '50px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #E2B467 0%, #DFAB62 50%, #C9944A 100%)',
                    border: 'none',
                    color: '#2A170F',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 18px rgba(223, 171, 98, 0.4)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <KeyRound size={18} />
                  <span>{loading ? 'Verifying Code...' : 'Verify & Enter Console'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setChallengeToken(null);
                    setTotpCode('');
                    setError(null);
                  }}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    padding: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: '#6B5E55',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Cancel and return to sign in
                </button>
              </form>
            </div>
          ) : (
            /* Primary Sign-In View */
            <div>
              <div style={{ marginBottom: '28px' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(223, 171, 98, 0.15)',
                    border: '1px solid rgba(223, 171, 98, 0.35)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#2A170F',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    marginBottom: '14px',
                  }}
                >
                  <Lock size={12} color="#DFAB62" />
                  <span>Restricted Access Control</span>
                </div>

                <h2
                  style={{
                    fontSize: '1.8rem',
                    fontWeight: 800,
                    color: '#2A170F',
                    margin: '0 0 8px',
                    letterSpacing: '-0.02em',
                  }}
                >
                  Sign In to Console
                </h2>
                <p style={{ color: '#6B5E55', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
                  Enter your official administrative credentials to access the secure clinical governance console.
                </p>
              </div>

              {error && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#991B1B',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    marginBottom: '20px',
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="auth-input-group">
                  <label className="auth-label">
                    Administrator Email Address
                  </label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <Mail size={18} />
                    </span>
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@chekup247.co.za"
                      className="auth-input"
                    />
                  </div>
                </div>

                <div className="auth-input-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                    <label className="auth-label" style={{ margin: 0 }}>
                      Master Security Key / Password
                    </label>
                  </div>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <Lock size={18} />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
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
                        color: '#6B5E55',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0,
                      }}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.84rem', color: '#4B5563' }}>
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ accentColor: '#DFAB62', width: '16px', height: '16px', borderRadius: '4px' }}
                    />
                    <span>Remember this session on trusted device</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    height: '50px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #E2B467 0%, #DFAB62 50%, #C9944A 100%)',
                    border: 'none',
                    color: '#2A170F',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 18px rgba(223, 171, 98, 0.4)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <KeyRound size={18} />
                  <span>{loading ? 'Authenticating...' : 'Sign In to Admin Console'}</span>
                  <ArrowRight size={17} />
                </button>
              </form>

              {/* Statutory Legal Advisory Card */}
              <div
                style={{
                  marginTop: '28px',
                  padding: '16px',
                  borderRadius: '14px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid rgba(223, 171, 98, 0.3)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(42, 23, 15, 0.04)',
                }}
              >
                <Shield size={18} color="#DFAB62" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.78rem', color: '#6B5E55', lineHeight: 1.5 }}>
                  <strong style={{ color: '#2A170F' }}>Statutory Safeguard:</strong> Strict POPIA Section 19 and Electronic Communications Act isolation enforced. Direct access restricted to authorized executive operators.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
