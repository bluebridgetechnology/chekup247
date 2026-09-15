'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Award,
  DollarSign,
  FileText,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  Building,
  UserCheck,
} from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';

export default function DoctorProfilePage() {
  const router = useRouter();
  const { doctor, profile, isAuthenticated, isLoading, updateProfile } = useDoctorAuth();

  const [specialty, setSpecialty] = useState('');
  const [ratePerHour, setRatePerHour] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (profile) {
      setSpecialty(profile.specialty || 'General Practitioner');
      setRatePerHour(profile.ratePerHour ? String(profile.ratePerHour) : '850');
      setBio(profile.bio || '');
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const rate = parseFloat(ratePerHour);
    if (isNaN(rate) || rate < 0) {
      setMessage({ type: 'error', text: 'Please provide a valid hourly consultation rate' });
      setSaving(false);
      return;
    }

    try {
      await updateProfile({
        specialty,
        ratePerHour: rate,
        bio,
      });
      setMessage({ type: 'success', text: 'Practice profile updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !doctor) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-slate-500)' }}>Loading doctor profile...</p>
      </div>
    );
  }

  const isVerified = profile?.verificationStatus === 'verified';

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.85rem', color: 'var(--color-slate-900)', marginBottom: '6px' }}>
          Doctor Practice Profile
        </h1>
        <p style={{ color: 'var(--color-slate-500)', fontSize: '0.95rem' }}>
          Manage your clinical specialty, consultation rates, and public directory information.
        </p>
      </div>

      {message && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '0.9rem',
            marginBottom: '24px',
          }}
        >
          {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Verification & Identity Banner */}
      <div
        className="portal-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '20px',
          marginBottom: '28px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-700) 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: 800,
            }}
          >
            {doctor.fullName ? doctor.fullName[0].toUpperCase() : 'D'}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h2 style={{ fontSize: '1.35rem', color: 'var(--color-slate-900)' }}>
                {doctor.fullName}
              </h2>
              {isVerified ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: '#ecfdf5',
                    color: '#059669',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={12} />
                  <span>VERIFIED</span>
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: '#fffbeb',
                    color: '#d97706',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  <AlertCircle size={12} />
                  <span>PENDING VERIFICATION</span>
                </span>
              )}
            </div>
            <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem' }}>
              {doctor.email} • HPCSA: <strong>{profile?.hpcsaNumber || 'Pending'}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-brand-50)',
              color: 'var(--color-brand-700)',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Source: {profile?.verificationSource === 'locumstaff' ? 'LocumStaff SSO' : 'Direct Platform'}
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="portal-card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--color-slate-900)' }}>
          Clinical Practice Information
        </h2>
        <p style={{ color: 'var(--color-slate-500)', fontSize: '0.875rem', marginBottom: '24px' }}>
          Update the credentials and rates presented to patients searching for virtual doctors.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                Primary Specialty
              </label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. General Practitioner"
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
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
              Clinical Biography & Experience
            </label>
            <textarea
              rows={5}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Detail your clinical training, experience, and consultation philosophy..."
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-slate-300)',
                fontSize: '0.9rem',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <Save size={18} />
            <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
