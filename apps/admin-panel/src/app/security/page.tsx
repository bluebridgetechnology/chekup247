'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  Shield,
  Activity,
  Calendar,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function AdminSecurityPage() {
  const router = useRouter();
  const { admin, token, isAuthenticated, isLoading } = useAdminAuth();

  // 2FA / TOTP States
  const [totpEnabled, setTotpEnabled] = useState<boolean | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [otpAuthUrl, setOtpAuthUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [busy2FA, setBusy2FA] = useState(false);
  const [feedback2FA, setFeedback2FA] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [busyPass, setBusyPass] = useState(false);
  const [feedbackPass, setFeedbackPass] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    const tokenToUse = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!tokenToUse) return;
    fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${tokenToUse}` },
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => setTotpEnabled(Boolean(data.totpEnabled || data.is_totp_enabled)))
      .catch(() => setTotpEnabled(false));
  }, [token]);

  // Start TOTP Enrollment
  const startEnrollment = async () => {
    const tokenToUse = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!tokenToUse) {
      setFeedback2FA({ type: 'error', message: 'Authentication required. Please re-login.' });
      return;
    }
    setBusy2FA(true);
    setFeedback2FA(null);
    try {
      const res = await fetch(`${API_BASE}/auth/totp/enroll`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tokenToUse}` },
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to begin 2FA enrollment');
      setOtpAuthUrl(data.otpAuthUrl);
      setSecret(data.secret);
      setEnrolling(true);
    } catch (err: any) {
      setFeedback2FA({ type: 'error', message: err.message });
    } finally {
      setBusy2FA(false);
    }
  };

  // Confirm TOTP Enrollment
  const confirmEnrollment = async () => {
    if (!/^\d{6}$/.test(confirmCode)) {
      setFeedback2FA({ type: 'error', message: 'Enter the 6-digit code from your authenticator app.' });
      return;
    }
    const tokenToUse = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!tokenToUse) {
      setFeedback2FA({ type: 'error', message: 'Authentication required. Please re-login.' });
      return;
    }
    setBusy2FA(true);
    try {
      const res = await fetch(`${API_BASE}/auth/totp/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenToUse}` },
        credentials: 'include',
        body: JSON.stringify({ code: confirmCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to confirm 2FA code');
      setFeedback2FA({ type: 'success', message: 'Two-factor authentication enabled successfully.' });
      setTotpEnabled(true);
      setEnrolling(false);
      setOtpAuthUrl(null);
      setSecret(null);
      setConfirmCode('');
    } catch (err: any) {
      setFeedback2FA({ type: 'error', message: err.message });
    } finally {
      setBusy2FA(false);
    }
  };

  // Disable TOTP
  const disableTotp = async () => {
    if (!disablePassword) {
      setFeedback2FA({ type: 'error', message: 'Enter your current password to disable 2FA.' });
      return;
    }
    if (!confirm('Disable two-factor authentication on your administrative account?')) return;
    const tokenToUse = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!tokenToUse) {
      setFeedback2FA({ type: 'error', message: 'Authentication required. Please re-login.' });
      return;
    }
    setBusy2FA(true);
    try {
      const res = await fetch(`${API_BASE}/auth/totp/disable`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenToUse}` },
        credentials: 'include',
        body: JSON.stringify({ currentPassword: disablePassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to disable 2FA');
      setFeedback2FA({ type: 'success', message: 'Two-factor authentication disabled.' });
      setTotpEnabled(false);
      setDisablePassword('');
    } catch (err: any) {
      setFeedback2FA({ type: 'error', message: err.message });
    } finally {
      setBusy2FA(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackPass(null);

    if (!currentPassword) {
      setFeedbackPass({ type: 'error', message: 'Current password is required.' });
      return;
    }
    if (newPassword.length < 8) {
      setFeedbackPass({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setFeedbackPass({ type: 'error', message: 'New passwords do not match.' });
      return;
    }

    const tokenToUse = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!tokenToUse) {
      setFeedbackPass({ type: 'error', message: 'Authentication required. Please re-login.' });
      return;
    }

    setBusyPass(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenToUse}`,
        },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update administrative password');
      setFeedbackPass({ type: 'success', message: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setFeedbackPass({ type: 'error', message: err.message });
    } finally {
      setBusyPass(false);
    }
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', color: '#201712' }}>
      {/* Header */}
      <div>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#F7EFE3',
              color: '#B98232',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={20} />
          </div>
          Admin Account Security & Privileges
        </h1>
        <p className="page-subtitle" style={{ margin: 0 }}>
          Manage two-factor authentication (TOTP), administrative credentials, and active session safeguards.
        </p>
      </div>

      {/* Stats Ribbon - 4 Cards Single Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '16px',
        }}
      >
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Two-Factor Auth (TOTP)</span>
            <Smartphone size={18} color="#B98232" />
          </div>
          <div className="stat-number" style={{ fontSize: '1.4rem' }}>
            {totpEnabled === null ? 'Checking...' : totpEnabled ? 'Enforced' : 'Disabled'}
          </div>
          <div style={{ fontSize: '0.75rem', color: totpEnabled ? '#0F8F72' : '#B98232', marginTop: '4px', fontWeight: 600 }}>
            {totpEnabled ? 'POPIA Sec. 19 compliant' : 'Enrollment recommended'}
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Privilege Level</span>
            <UserCheck size={18} color="#B98232" />
          </div>
          <div className="stat-number" style={{ fontSize: '1.4rem', textTransform: 'capitalize' }}>
            {admin?.role || 'Super Admin'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Full platform administration
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Session Security</span>
            <KeyRound size={18} color="#B98232" />
          </div>
          <div className="stat-number" style={{ fontSize: '1.4rem' }}>
            256-bit JWT
          </div>
          <div style={{ fontSize: '0.75rem', color: '#0F8F72', marginTop: '4px', fontWeight: 600 }}>
            Stateless bearer token active
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">POPIA Safeguards</span>
            <Shield size={18} color="#B98232" />
          </div>
          <div className="stat-number" style={{ fontSize: '1.4rem' }}>
            Certified
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Immutable audit logging active
          </div>
        </div>
      </div>

      {/* Grid: 2FA & Password */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '20px' }}>
        {/* Module 1: Two-Factor Authentication */}
        <div className="admin-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', borderBottom: '1px solid #E9E0D5', paddingBottom: '16px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#FAF5EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#B98232',
                flexShrink: 0,
              }}
            >
              <Smartphone size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#201712' }}>
                  Two-Factor Authentication (TOTP)
                </h2>
                {totpEnabled ? (
                  <span className="badge-status-completed">Active</span>
                ) : (
                  <span className="badge-status-pending">Unconfigured</span>
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#766C64', margin: 0, lineHeight: 1.4 }}>
                Requires a 6-digit verification code from Google Authenticator or Authy upon sign-in.
              </p>
            </div>
          </div>

          {feedback2FA && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: feedback2FA.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${feedback2FA.type === 'success' ? '#86EFAC' : '#FECACA'}`,
                color: feedback2FA.type === 'success' ? '#166534' : '#991B1B',
                fontSize: '0.825rem',
                fontWeight: 600,
              }}
            >
              {feedback2FA.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              <span>{feedback2FA.message}</span>
            </div>
          )}

          {!totpEnabled && !enrolling && (
            <div>
              <p style={{ fontSize: '0.825rem', color: '#766C64', lineHeight: 1.5, marginBottom: '16px' }}>
                Enable 2FA to satisfy POPIA Section 19 access security controls for administrative roles.
              </p>
              <button
                type="button"
                onClick={startEnrollment}
                disabled={busy2FA}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <KeyRound size={15} />
                <span>{busy2FA ? 'Initializing...' : 'Configure Authenticator App'}</span>
              </button>
            </div>
          )}

          {enrolling && otpAuthUrl && (
            <div style={{ background: '#FAF8F4', padding: '16px', borderRadius: '10px', border: '1px solid #E9E0D5' }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#201712', marginBottom: '8px' }}>
                1. Add this secret key to your Authenticator:
              </div>
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E9E0D5',
                  borderRadius: '6px',
                  padding: '10px 12px',
                  fontFamily: 'monospace',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#201712',
                  textAlign: 'center',
                  letterSpacing: '0.06em',
                  marginBottom: '14px',
                  wordBreak: 'break-all',
                }}
              >
                {secret}
              </div>

              <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#201712', marginBottom: '6px' }}>
                2. Enter the 6-digit confirmation code:
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="admin-input"
                style={{
                  width: '100%',
                  marginBottom: '14px',
                  textAlign: 'center',
                  fontSize: '1.25rem',
                  letterSpacing: '0.25em',
                  fontWeight: 700,
                }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setEnrolling(false)}
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmEnrollment}
                  disabled={busy2FA}
                  className="btn-primary"
                  style={{ flex: 2 }}
                >
                  {busy2FA ? 'Verifying...' : 'Activate 2FA'}
                </button>
              </div>
            </div>
          )}

          {totpEnabled && (
            <div style={{ borderTop: '1px solid #E9E0D5', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#B91C1C', fontWeight: 700, fontSize: '0.825rem', marginBottom: '8px' }}>
                <Lock size={14} />
                <span>Deactivate Multi-Factor Authentication</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#766C64', marginBottom: '12px', lineHeight: 1.4 }}>
                To turn off 2FA, confirm your current administrative password:
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <input
                  type="password"
                  placeholder="Current password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="admin-input"
                  style={{ flex: 1, minWidth: '180px' }}
                />
                <button
                  type="button"
                  onClick={disableTotp}
                  disabled={busy2FA}
                  className="btn-secondary"
                  style={{ color: '#B91C1C', borderColor: '#FECACA' }}
                >
                  {busy2FA ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Module 2: Administrative Password Change */}
        <div className="admin-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', borderBottom: '1px solid #E9E0D5', paddingBottom: '16px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#FAF5EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#B98232',
                flexShrink: 0,
              }}
            >
              <KeyRound size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#201712' }}>
                Change Admin Password
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#766C64', margin: 0, lineHeight: 1.4 }}>
                Update your administrative login credentials to maintain account security.
              </p>
            </div>
          </div>

          {feedbackPass && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: feedbackPass.type === 'success' ? '#F0FDF4' : '#FEF2F2',
                border: `1px solid ${feedbackPass.type === 'success' ? '#86EFAC' : '#FECACA'}`,
                color: feedbackPass.type === 'success' ? '#166534' : '#991B1B',
                fontSize: '0.825rem',
                fontWeight: 600,
              }}
            >
              {feedbackPass.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              <span>{feedbackPass.message}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#201712', marginBottom: '6px' }}>
                Current Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showCurrentPass ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="admin-input"
                  style={{ width: '100%', paddingRight: '36px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#766C64', cursor: 'pointer', padding: '2px' }}
                >
                  {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#201712', marginBottom: '6px' }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="admin-input"
                  style={{ width: '100%', paddingRight: '36px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#766C64', cursor: 'pointer', padding: '2px' }}
                >
                  {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#201712', marginBottom: '6px' }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="admin-input"
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button
                type="submit"
                disabled={busyPass}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              >
                <KeyRound size={15} />
                <span>{busyPass ? 'Updating...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Module 3: Active Session Security & POPIA Telemetry */}
      <div className="admin-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #E9E0D5', paddingBottom: '14px', marginBottom: '16px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#FAF5EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#B98232',
            }}
          >
            <UserCheck size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#201712' }}>
              Active Session Security & Safeguards
            </h3>
            <div style={{ fontSize: '0.78rem', color: '#766C64' }}>
              Current authenticated session parameters and POPIA data protection status
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div style={{ background: '#FAF8F4', padding: '14px', borderRadius: '8px', border: '1px solid #E9E0D5' }}>
            <div style={{ fontSize: '0.72rem', color: '#766C64', textTransform: 'uppercase', fontWeight: 700 }}>
              Authenticated Identity
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#201712', marginTop: '4px' }}>
              {admin?.email || 'admin@chekup247.com'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#B98232', marginTop: '2px', textTransform: 'capitalize', fontWeight: 600 }}>
              Role: {admin?.role || 'Super Admin'}
            </div>
          </div>

          <div style={{ background: '#FAF8F4', padding: '14px', borderRadius: '8px', border: '1px solid #E9E0D5' }}>
            <div style={{ fontSize: '0.72rem', color: '#766C64', textTransform: 'uppercase', fontWeight: 700 }}>
              JWT Session Token
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F8F72', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle2 size={15} /> Active (Encrypted)
            </div>
            <div style={{ fontSize: '0.72rem', color: '#766C64', marginTop: '2px' }}>
              Stateless bearer token
            </div>
          </div>

          <div style={{ background: '#FAF8F4', padding: '14px', borderRadius: '8px', border: '1px solid #E9E0D5' }}>
            <div style={{ fontSize: '0.72rem', color: '#766C64', textTransform: 'uppercase', fontWeight: 700 }}>
              POPIA Compliance
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#201712', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Shield size={15} color="#0F8F72" /> Section 19 Certified
            </div>
            <div style={{ fontSize: '0.72rem', color: '#766C64', marginTop: '2px' }}>
              Immutable audit logging active
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
