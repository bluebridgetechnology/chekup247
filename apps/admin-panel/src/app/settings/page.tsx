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
  RefreshCw,
  Coins,
  CalendarCheck,
  Hourglass,
  Sliders,
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
  const { token, isAuthenticated, isLoading: authLoading } = useAdminAuth();

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
    if (token || !authLoading) {
      fetchSettings();
    }
  }, [token, authLoading]);

  const fetchSettings = async () => {
    const tokenToUse = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!tokenToUse) {
      if (!authLoading) setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        headers: { Authorization: `Bearer ${tokenToUse}` },
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
    const tokenToUse = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!tokenToUse) {
      setErrorMessage('Authentication token missing. Please sign in again.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(null);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenToUse}`,
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
  const doctorEarnings = sampleFee - platformCommissionAmount;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', color: '#201712' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
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
              <Settings size={20} />
            </div>
            Platform Governance & Global Settings
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Configure platform commission, late cancellation compensation, consultation slot lengths, and scheduling buffers.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={isLoading}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Reload</span>
        </button>
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
            <span className="stat-label">Platform Commission</span>
            <Percent size={18} color="#B98232" />
          </div>
          <div className="stat-number">{settings.commission_percent}%</div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Retained per consultation
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Late Cancellation Fee</span>
            <Coins size={18} color="#B91C1C" />
          </div>
          <div className="stat-number" style={{ color: '#B91C1C' }}>
            {settings.late_cancellation_deduction_percent}%
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Doctor compensation on &lt;24h cancel
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Default Slot Duration</span>
            <CalendarCheck size={18} color="#0F8F72" />
          </div>
          <div className="stat-number" style={{ color: '#0F8F72' }}>
            {settings.default_slot_duration_minutes}m
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Standard appointment block
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Clinical Buffer</span>
            <Hourglass size={18} color="#B98232" />
          </div>
          <div className="stat-number">{settings.default_buffer_minutes}m</div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Rest/turnaround between calls
          </div>
        </div>
      </div>

      {/* Alerts */}
      {saveSuccess && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: '#F0FDF4',
            border: '1px solid #86EFAC',
            color: '#166534',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} />
          <div>{saveSuccess}</div>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={16} />
          <div>{errorMessage}</div>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '20px' }}>
          {/* Section 1: Financial & Cancellation Policies */}
          <div
            className="admin-card"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #E9E0D5', paddingBottom: '14px' }}>
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
                <Coins size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#201712' }}>
                  Financial & Cancellation Fees
                </h2>
                <div style={{ fontSize: '0.78rem', color: '#766C64' }}>
                  Governs commissions and short-notice patient cancellation deductions
                </div>
              </div>
            </div>

            {/* Late Cancellation Deduction % */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#201712' }}>
                  Late Cancellation Deduction (%)
                </label>
                <span
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    color: '#B91C1C',
                    background: '#FEF2F2',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid #FECACA',
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
                  accentColor: '#DFA34F',
                  cursor: 'pointer',
                  marginBottom: '6px',
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#766C64', lineHeight: 1.4 }}>
                Applied when patient cancels less than 24 hours before consultation. Transferred directly to the doctor as compensation.
              </div>
            </div>

            {/* Platform Commission % */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#201712' }}>
                  Platform Commission (%)
                </label>
                <span
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    color: '#B98232',
                    background: '#FAF5EB',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid #E9E0D5',
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
                  accentColor: '#2B170F',
                  cursor: 'pointer',
                  marginBottom: '6px',
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#766C64', lineHeight: 1.4 }}>
                Percentage retained by ChekUp247 on completed consultations to cover LiveKit video infrastructure, Brevo communications, and payment gateways.
              </div>
            </div>

            {/* Live Calculation Preview Box */}
            <div
              style={{
                background: '#FAF8F4',
                border: '1px solid #E9E0D5',
                borderRadius: '10px',
                padding: '16px',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#201712', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Percent size={14} color="#B98232" />
                <span>Sample Policy Simulation (R{sampleFee} Consultation)</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#766C64' }}>
                  <span>≥ 24 Hours Cancellation:</span>
                  <span style={{ color: '#0F8F72', fontWeight: 700 }}>100% Refund (R{sampleFee}) / Free Reschedule</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#766C64' }}>
                  <span>&lt; 24 Hours Doctor Compensation:</span>
                  <span style={{ color: '#B91C1C', fontWeight: 700 }}>R{doctorCancellationFee.toFixed(2)} ({settings.late_cancellation_deduction_percent}%)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#766C64' }}>
                  <span>&lt; 24 Hours Patient Refund:</span>
                  <span style={{ color: '#B98232', fontWeight: 700 }}>R{patientRefundAmount.toFixed(2)} ({(100 - settings.late_cancellation_deduction_percent)}%)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#766C64', borderTop: '1px solid #E9E0D5', paddingTop: '6px', marginTop: '2px' }}>
                  <span style={{ fontWeight: 600, color: '#201712' }}>Platform Commission:</span>
                  <span style={{ color: '#201712', fontWeight: 700 }}>R{platformCommissionAmount.toFixed(2)} ({settings.commission_percent}%)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#766C64' }}>
                  <span style={{ fontWeight: 600, color: '#201712' }}>Doctor Net Payout:</span>
                  <span style={{ color: '#0F8F72', fontWeight: 700 }}>R{doctorEarnings.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Consultation Durations & Buffer */}
          <div
            className="admin-card"
            style={{
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #E9E0D5', paddingBottom: '14px' }}>
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
                <Clock size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#201712' }}>
                  Timing & Schedule Parameters
                </h2>
                <div style={{ fontSize: '0.78rem', color: '#766C64' }}>
                  Slot generation lengths, buffer times, and no-show grace thresholds
                </div>
              </div>
            </div>

            {/* Default Slot Duration */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#201712', marginBottom: '8px' }}>
                Default Consultation Slot Duration
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[15, 20, 30, 45, 60].map((mins) => {
                  const isSelected = settings.default_slot_duration_minutes === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSettings({ ...settings, default_slot_duration_minutes: mins })}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: '6px',
                        border: isSelected ? '1px solid #DFA34F' : '1px solid #E9E0D5',
                        background: isSelected ? '#2B170F' : '#FFFFFF',
                        color: isSelected ? '#ECC27E' : '#766C64',
                        fontWeight: 700,
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {mins}m
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '6px' }}>
                Base length applied when doctors batch generate availability slots on their calendar.
              </div>
            </div>

            {/* Default Buffer Minutes */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#201712', marginBottom: '8px' }}>
                Clinical Buffer Between Consultations
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[0, 5, 10, 15].map((mins) => {
                  const isSelected = settings.default_buffer_minutes === mins;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSettings({ ...settings, default_buffer_minutes: mins })}
                      style={{
                        flex: 1,
                        padding: '8px 0',
                        borderRadius: '6px',
                        border: isSelected ? '1px solid #DFA34F' : '1px solid #E9E0D5',
                        background: isSelected ? '#2B170F' : '#FFFFFF',
                        color: isSelected ? '#ECC27E' : '#766C64',
                        fontWeight: 700,
                        fontSize: '0.825rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {mins}m
                    </button>
                  );
                })}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '6px' }}>
                Rest and clinical charting buffer automatically inserted between consecutive consultations.
              </div>
            </div>

            {/* No-Show Grace Period Minutes */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#201712' }}>
                  No-Show Grace Period (Minutes)
                </label>
                <span
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    color: '#B98232',
                    background: '#FAF5EB',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    border: '1px solid #E9E0D5',
                  }}
                >
                  {settings.no_show_grace_minutes} mins
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="20"
                step="1"
                value={settings.no_show_grace_minutes}
                onChange={(e) =>
                  setSettings({ ...settings, no_show_grace_minutes: Number(e.target.value) })
                }
                style={{
                  width: '100%',
                  accentColor: '#DFA34F',
                  cursor: 'pointer',
                  marginBottom: '6px',
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#766C64', lineHeight: 1.4 }}>
                Time window after scheduled appointment start before a missing participant is declared a no-show.
              </div>
            </div>

            {/* Save Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '10px' }}>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
              >
                <Save size={16} />
                <span>{isSaving ? 'Saving Changes...' : 'Save Platform Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
