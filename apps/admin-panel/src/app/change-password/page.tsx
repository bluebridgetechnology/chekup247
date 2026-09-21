'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldAlert, AlertCircle } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { ChekupCrossLogo } from '../../components/ChekupCrossLogo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { token, refreshAdmin, logout } = useAdminAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must differ from the current password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update password');
      }

      await refreshAdmin();
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to update password');
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
        padding: '32px 16px',
        background: 'radial-gradient(circle at 50% 25%, rgba(223, 171, 98, 0.12) 0%, #1E100A 80%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
          borderRadius: '24px',
          padding: '44px 36px',
          border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.35))',
          boxShadow: '0 25px 60px -12px rgba(0, 0, 0, 0.6), 0 0 40px var(--color-gold-glow)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'var(--color-chocolate-base, #2A170F)',
              border: '1.5px solid var(--color-gold-base, #DFAB62)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 4px 16px rgba(42, 23, 15, 0.2)',
            }}
          >
            <ShieldAlert size={28} color="var(--color-gold-primary, #E2B467)" />
          </div>
          <h1
            className="page-title"
            style={{
              fontSize: '1.45rem',
              marginBottom: '6px',
            }}
          >
            Credential Rotation Required
          </h1>
          <p className="page-subtitle">
            This is a bootstrap administrator account. You must set a new secure password before continuing to the governance console.
          </p>
        </div>

        {error && (
          <div
            className="badge-status-danger"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              marginBottom: '20px',
            }}
          >
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {[
            { label: 'Current Password', value: currentPassword, setter: setCurrentPassword },
            { label: 'New Password (min. 8 characters)', value: newPassword, setter: setNewPassword },
            { label: 'Confirm New Password', value: confirmPassword, setter: setConfirmPassword },
          ].map((f, i) => (
            <div key={i} style={{ marginBottom: i === 2 ? '24px' : '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--color-chocolate-base, #2A170F)',
                  marginBottom: '6px',
                }}
              >
                {f.label}
              </label>
              <input
                type="password"
                required
                value={f.value}
                onChange={(e) => f.setter(e.target.value)}
                className="admin-input"
                style={{
                  width: '100%',
                }}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '13px',
              fontSize: '0.95rem',
              borderRadius: '12px',
            }}
          >
            <KeyRound size={18} />
            <span>{loading ? 'Updating Credentials...' : 'Set New Password & Enter Console'}</span>
          </button>

          <button
            type="button"
            onClick={() => logout()}
            style={{
              width: '100%',
              marginTop: '12px',
              padding: '8px',
              background: 'transparent',
              color: 'var(--color-cream-text-muted, #6B5E55)',
              border: 'none',
              fontSize: '0.825rem',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Sign out of session
          </button>
        </form>
      </div>
    </div>
  );
}
