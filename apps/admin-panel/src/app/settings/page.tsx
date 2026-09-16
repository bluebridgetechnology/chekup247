'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Percent,
  Clock,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  HelpCircle,
  RefreshCw,
  Coins,
  CalendarCheck,
  Hourglass,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface PlatformSettingsData {
  commission_percent: number;
  late_cancellation_deduction_percent: number;
  no_show_grace_minutes: number;
  default_slot_duration_minutes: number;
  default_buffer_minutes: number;
  updated_at?: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { admin, token, isAuthenticated, isLoading: authLoading } = useAdminAuth();

  const [settings, setSettings] = useState<PlatformSettingsData>({
    commission_percent: 15,
    late_cancellation_deduction_percent: 30,
    no_show_grace_minutes: 10,
    default_slot_duration_minutes: 30,
    default_buffer_minutes: 5,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (token) {
      fetchSettings();
    }
  }, [token]);

  const fetchSettings = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data) {
          setSettings({
            commission_percent: Number(data.commission_percent ?? 15),
            late_cancellation_deduction_percent: Number(data.late_cancellation_deduction_percent ?? 30),
            no_show_grace_minutes: Number(data.no_show_grace_minutes ?? 10),
            default_slot_duration_minutes: Number(data.default_slot_duration_minutes ?? 30),
            default_buffer_minutes: Number(data.default_buffer_minutes ?? 5),
            updated_at: data.updated_at,
          });
        }
      }
    } catch (err: any) {
      console.warn('Could not fetch settings from API, using default values:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          commission_percent: Number(settings.commission_percent),
          late_cancellation_deduction_percent: Number(settings.late_cancellation_deduction_percent),
          no_show_grace_minutes: Number(settings.no_show_grace_minutes),
          default_slot_duration_minutes: Number(settings.default_slot_duration_minutes),
          default_buffer_minutes: Number(settings.default_buffer_minutes),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to update platform settings');
      }

      const updated = await res.json();
      setSettings((prev) => ({
        ...prev,
        commission_percent: Number(updated.commission_percent),
        late_cancellation_deduction_percent: Number(updated.late_cancellation_deduction_percent),
        no_show_grace_minutes: Number(updated.no_show_grace_minutes),
        default_slot_duration_minutes: Number(updated.default_slot_duration_minutes),
        default_buffer_minutes: Number(updated.default_buffer_minutes),
        updated_at: updated.updated_at,
      }));

      setSaveSuccess('Platform settings have been successfully updated and recorded in audit logs.');
      setTimeout(() => setSaveSuccess(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error updating platform settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Preview calculations based on sample R500 consultation
  const sampleFee = 500;
  const doctorCancellationFee = (sampleFee * settings.late_cancellation_deduction_percent) / 100;
  const patientRefundAmount = sampleFee - doctorCancellationFee;
  const platformCommissionAmount = (sampleFee * settings.commission_percent) / 100;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', color: '#f8fafc' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Settings size={20} />
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
              Platform Governance & Settings
            </h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
            Configure global financial deductions, cancellation penalties, and consultation timing policies.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={isLoading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#cbd5e1',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          <span>Reload</span>
        </button>
      </div>

      {/* Alerts */}
      {saveSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#34d399',
            marginBottom: '24px',
          }}
        >
          <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{saveSuccess}</div>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            marginBottom: '24px',
          }}
        >
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '24px' }}>
          {/* Section 1: Financial & Cancellation Policies */}
          <div
            style={{
              background: '#131c2e',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #1e293b', paddingBottom: '14px' }}>
              <Coins size={18} style={{ color: '#ef4444' }} />
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                  Financial & Cancellation Fees
                </h2>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Governs commissions and short-notice patient deductions
                </div>
              </div>
            </div>

            {/* Late Cancellation Deduction % */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0' }}>
                  Late Cancellation Deduction (%)
                </label>
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#ef4444',
                    background: 'rgba(239, 68, 68, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {settings.late_cancellation_deduction_percent}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={settings.late_cancellation_deduction_percent}
                onChange={(e) =>
                  setSettings({ ...settings, late_cancellation_deduction_percent: Number(e.target.value) })
                }
                style={{
                  width: '100%',
                  accentColor: '#ef4444',
                  cursor: 'pointer',
                  marginBottom: '8px',
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
                Applied when patient cancels less than 24 hours before consultation. This percentage is directly transferred to the doctor as a late compensation fee.
              </div>
            </div>

            {/* Platform Commission % */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0' }}>
                  Platform Commission (%)
                </label>
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: '#38bdf8',
                    background: 'rgba(56, 189, 248, 0.12)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {settings.commission_percent}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={settings.commission_percent}
                onChange={(e) =>
                  setSettings({ ...settings, commission_percent: Number(e.target.value) })
                }
                style={{
                  width: '100%',
                  accentColor: '#38bdf8',
                  cursor: 'pointer',
                  marginBottom: '8px',
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.4 }}>
                Percentage retained by ChekUp247 on completed consultations to cover video infrastructure, Brevo emails, and SMS dispatchers.
              </div>
            </div>

            {/* Live Calculation Preview Box */}
            <div
              style={{
                background: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0', marginBottom: '10px' }}>
                Sample Policy Breakdown (R{sampleFee} Consultation)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>≥ 24 Hours Cancellation:</span>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>100% Refund (R{sampleFee}) / Free Reschedule</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>&lt; 24 Hours Doctor Fee:</span>
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>R{doctorCancellationFee.toFixed(2)} ({settings.late_cancellation_deduction_percent}%)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8' }}>
                  <span>&lt; 24 Hours Patient Refund/Credit:</span>
                  <span style={{ color: '#38bdf8', fontWeight: 600 }}>R{patientRefundAmount.toFixed(2)} ({(100 - settings.late_cancellation_deduction_percent)}%)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', borderTop: '1px solid #1e293b', paddingTop: '6px', marginTop: '4px' }}>
                  <span>Platform Commission on Completion:</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 600 }}>R{platformCommissionAmount.toFixed(2)} ({settings.commission_percent}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Consultation Durations & Buffer */}
          <div
            style={{
              background: '#131c2e',
              border: '1px solid #1e293b',
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #1e293b', paddingBottom: '14px' }}>
              <Clock size={18} style={{ color: '#3b82f6' }} />
              <div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                  Timing & Schedule Parameters
                </h2>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  Slot generation lengths, buffer times, and no-show thresholds
                </div>
              </div>
            </div>

            {/* Default Slot Duration */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
                Default Consultation Slot Duration (Minutes)
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[15, 20, 30, 45, 60].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setSettings({ ...settings, default_slot_duration_minutes: mins })}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: '8px',
                      border: settings.default_slot_duration_minutes === mins ? '1px solid #3b82f6' : '1px solid #334155',
                      background: settings.default_slot_duration_minutes === mins ? 'rgba(59, 130, 246, 0.2)' : '#090d16',
                      color: settings.default_slot_duration_minutes === mins ? '#60a5fa' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px' }}>
                Base length applied when doctors batch generate availability slots on their calendar.
              </div>
            </div>

            {/* Default Buffer Minutes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
                Clinical Buffer Between Consultations (Minutes)
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[0, 5, 10, 15].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setSettings({ ...settings, default_buffer_minutes: mins })}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: '8px',
                      border: settings.default_buffer_minutes === mins ? '1px solid #10b981' : '1px solid #334155',
                      background: settings.default_buffer_minutes === mins ? 'rgba(16, 185, 129, 0.2)' : '#090d16',
                      color: settings.default_buffer_minutes === mins ? '#34d399' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px' }}>
                Rest & medical charting window automatically inserted between back-to-back consultation slots.
              </div>
            </div>

            {/* No-show grace minutes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '8px' }}>
                No-Show Grace Period (Minutes)
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {[5, 10, 15, 20].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setSettings({ ...settings, no_show_grace_minutes: mins })}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: '8px',
                      border: settings.no_show_grace_minutes === mins ? '1px solid #f59e0b' : '1px solid #334155',
                      background: settings.no_show_grace_minutes === mins ? 'rgba(245, 158, 11, 0.2)' : '#090d16',
                      color: settings.no_show_grace_minutes === mins ? '#fbbf24' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                    }}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '8px' }}>
                Allowed elapsed time into appointment before patient or doctor can be flagged as no-show.
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div
          style={{
            marginTop: '28px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            background: '#131c2e',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.8rem' }}>
            <Shield size={16} style={{ color: '#ef4444' }} />
            <span>Updates are audited under Admin ID: <strong style={{ color: '#cbd5e1' }}>{admin?.email || 'admin'}</strong></span>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.95rem',
              fontWeight: 700,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
            }}
          >
            <Save size={18} />
            <span>{isSaving ? 'Saving Changes...' : 'Save Platform Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
