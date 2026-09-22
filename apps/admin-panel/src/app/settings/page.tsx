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
  CreditCard,
  Eye,
  EyeOff,
  Copy,
  Check,
  Zap,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface PlatformSettingsData {
  commission_percent: number;
  late_cancellation_deduction_percent: number;
  no_show_grace_minutes: number;
  default_slot_duration_minutes: number;
  default_buffer_minutes: number;
  paystack_mode: 'test' | 'live';
  paystack_test_secret_key?: string;
  paystack_test_public_key?: string;
  paystack_live_secret_key?: string;
  paystack_live_public_key?: string;
  paystack_test_secret_key_masked?: string | null;
  paystack_live_secret_key_masked?: string | null;
  has_paystack_test_secret?: boolean;
  has_paystack_live_secret?: boolean;
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
    paystack_mode: 'test',
    paystack_test_secret_key: '',
    paystack_test_public_key: '',
    paystack_live_secret_key: '',
    paystack_live_public_key: '',
  });

  const [showTestSecret, setShowTestSecret] = useState(false);
  const [showLiveSecret, setShowLiveSecret] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testConnectionResult, setTestConnectionResult] = useState<{
    success: boolean;
    mode: string;
    message: string;
    details?: any;
  } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

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
            paystack_mode: data.paystack_mode || 'test',
            paystack_test_secret_key: data.paystack_test_secret_key_masked || '',
            paystack_test_public_key: data.paystack_test_public_key || '',
            paystack_live_secret_key: data.paystack_live_secret_key_masked || '',
            paystack_live_public_key: data.paystack_live_public_key || '',
            paystack_test_secret_key_masked: data.paystack_test_secret_key_masked,
            paystack_live_secret_key_masked: data.paystack_live_secret_key_masked,
            has_paystack_test_secret: data.has_paystack_test_secret,
            has_paystack_live_secret: data.has_paystack_live_secret,
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
          paystack_mode: settings.paystack_mode,
          paystack_test_secret_key: settings.paystack_test_secret_key,
          paystack_test_public_key: settings.paystack_test_public_key,
          paystack_live_secret_key: settings.paystack_live_secret_key,
          paystack_live_public_key: settings.paystack_live_public_key,
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
        paystack_mode: updated.paystack_mode || 'test',
        paystack_test_secret_key: updated.paystack_test_secret_key_masked || prev.paystack_test_secret_key,
        paystack_test_public_key: updated.paystack_test_public_key ?? prev.paystack_test_public_key,
        paystack_live_secret_key: updated.paystack_live_secret_key_masked || prev.paystack_live_secret_key,
        paystack_live_public_key: updated.paystack_live_public_key ?? prev.paystack_live_public_key,
        paystack_test_secret_key_masked: updated.paystack_test_secret_key_masked,
        paystack_live_secret_key_masked: updated.paystack_live_secret_key_masked,
        has_paystack_test_secret: updated.has_paystack_test_secret,
        has_paystack_live_secret: updated.has_paystack_live_secret,
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

  const handleTestConnection = async () => {
    const tokenToUse = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!tokenToUse) return;

    setIsTestingConnection(true);
    setTestConnectionResult(null);

    const activeKeyInput = settings.paystack_mode === 'test' ? settings.paystack_test_secret_key : settings.paystack_live_secret_key;
    const secretKeyToSend = (activeKeyInput && !activeKeyInput.includes('••••')) ? activeKeyInput : undefined;

    try {
      const res = await fetch(`${API_BASE}/admin/settings/paystack/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenToUse}`,
        },
        credentials: 'include',
        body: JSON.stringify({ secretKey: secretKeyToSend }),
      });

      const data = await res.json();
      setTestConnectionResult(data);
    } catch (err: any) {
      setTestConnectionResult({
        success: false,
        mode: settings.paystack_mode,
        message: err.message || 'Failed to test connection with Paystack',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const copyWebhookUrl = () => {
    const webhookUrl = `${API_BASE}/payments/webhook`;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 3000);
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

      {/* Stats Ribbon - 5 Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Paystack Gateway</span>
            <CreditCard size={18} color={settings.paystack_mode === 'live' ? '#166534' : '#B98232'} />
          </div>
          <div className="stat-number" style={{ fontSize: '1.2rem', color: settings.paystack_mode === 'live' ? '#166534' : '#B98232' }}>
            {settings.paystack_mode === 'live' ? 'Live Mode' : 'Sandbox (Test)'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            {settings.paystack_mode === 'live' ? 'Real payments active' : 'Simulated payments'}
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

          {/* Section 3: Payment Gateway (Paystack Sandbox & Live Mode) */}
          <div
            className="admin-card"
            style={{
              gridColumn: '1 / -1',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid #E9E0D5', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                  }}
                >
                  <CreditCard size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#201712' }}>
                      Payment Gateway — Paystack Integration
                    </h2>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: settings.paystack_mode === 'live' ? '#DCFCE7' : '#FEF3C7',
                        color: settings.paystack_mode === 'live' ? '#166534' : '#92400E',
                        border: `1px solid ${settings.paystack_mode === 'live' ? '#86EFAC' : '#FCD34D'}`,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {settings.paystack_mode === 'live' ? '● Live Mode Active' : '● Sandbox (Test) Active'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#766C64', marginTop: '2px' }}>
                    Switch between Sandbox (Test Mode) and Live Mode, configure Paystack API keys, and test connectivity.
                  </div>
                </div>
              </div>

              {/* Mode Switcher Buttons */}
              <div style={{ display: 'flex', background: '#F7EFE3', padding: '4px', borderRadius: '8px', border: '1px solid #E9E0D5' }}>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, paystack_mode: 'test' })}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: settings.paystack_mode === 'test' ? '#2B170F' : 'transparent',
                    color: settings.paystack_mode === 'test' ? '#ECC27E' : '#766C64',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Sandbox (Test Mode)
                </button>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, paystack_mode: 'live' })}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: settings.paystack_mode === 'live' ? '#2B170F' : 'transparent',
                    color: settings.paystack_mode === 'live' ? '#ECC27E' : '#766C64',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Live (Production Mode)
                </button>
              </div>
            </div>

            {/* Mode Notification Banner */}
            {settings.paystack_mode === 'test' ? (
              <div
                style={{
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  color: '#92400E',
                  fontSize: '0.825rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} />
                  <span>
                    <strong>Sandbox Mode is Active:</strong> All patient consultation bookings, time extensions, and refunds are simulated using Paystack Test API keys. No real bank accounts are charged.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    className="btn-secondary"
                    style={{
                      fontSize: '0.78rem',
                      padding: '4px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#FFFFFF',
                    }}
                  >
                    <Zap size={13} color="#B98232" />
                    <span>{isTestingConnection ? 'Testing...' : 'Test Paystack Connection'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  color: '#991B1B',
                  fontSize: '0.825rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} />
                  <span>
                    <strong>Caution — Live Production Mode is Active:</strong> Real ZAR transactions will be processed via Paystack. Ensure you have valid South African live Paystack credentials.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    className="btn-secondary"
                    style={{
                      fontSize: '0.78rem',
                      padding: '4px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#FFFFFF',
                    }}
                  >
                    <Zap size={13} color="#B91C1C" />
                    <span>{isTestingConnection ? 'Testing...' : 'Test Live Connection'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Test Connection Result Box */}
            {testConnectionResult && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: testConnectionResult.success ? '#F0FDF4' : '#FEF2F2',
                  border: `1px solid ${testConnectionResult.success ? '#86EFAC' : '#FECACA'}`,
                  color: testConnectionResult.success ? '#166534' : '#991B1B',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                }}
              >
                {testConnectionResult.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <div>
                  <strong>Paystack API Test:</strong> {testConnectionResult.message}
                  {testConnectionResult.details?.banks_count && (
                    <span style={{ marginLeft: '6px', fontWeight: 'normal' }}>
                      ({testConnectionResult.details.banks_count} South African banks verified)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* API Credentials Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
              {/* Column 1: Sandbox (Test) Keys */}
              <div
                style={{
                  border: settings.paystack_mode === 'test' ? '2px solid #DFA34F' : '1px solid #E9E0D5',
                  borderRadius: '10px',
                  padding: '18px',
                  background: settings.paystack_mode === 'test' ? '#FCF9F3' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#201712', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Sandbox (Test) API Keys</span>
                    {settings.paystack_mode === 'test' && (
                      <span style={{ fontSize: '0.7rem', color: '#B98232', fontWeight: 600 }}>(Active)</span>
                    )}
                  </div>
                  {settings.has_paystack_test_secret && (
                    <span style={{ fontSize: '0.72rem', color: '#0F8F72', background: '#DCFCE7', padding: '1px 6px', borderRadius: '4px', border: '1px solid #86EFAC' }}>
                      Configured
                    </span>
                  )}
                </div>

                {/* Test Secret Key */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
                    Test Secret Key (<code style={{ fontSize: '0.75rem' }}>sk_test_...</code>)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showTestSecret ? 'text' : 'password'}
                      value={settings.paystack_test_secret_key || ''}
                      onChange={(e) => setSettings({ ...settings, paystack_test_secret_key: e.target.value })}
                      placeholder="sk_test_..."
                      style={{
                        width: '100%',
                        padding: '8px 36px 8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #D1C7BD',
                        fontSize: '0.825rem',
                        fontFamily: 'monospace',
                        background: '#FFFFFF',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowTestSecret(!showTestSecret)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#766C64',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showTestSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#766C64', marginTop: '4px' }}>
                    Backend API secret key for test payments, card tokenization, and webhooks.
                  </div>
                </div>

                {/* Test Public Key */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
                    Test Public Key (<code style={{ fontSize: '0.75rem' }}>pk_test_...</code>)
                  </label>
                  <input
                    type="text"
                    value={settings.paystack_test_public_key || ''}
                    onChange={(e) => setSettings({ ...settings, paystack_test_public_key: e.target.value })}
                    placeholder="pk_test_..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #D1C7BD',
                      fontSize: '0.825rem',
                      fontFamily: 'monospace',
                      background: '#FFFFFF',
                    }}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#766C64', marginTop: '4px' }}>
                    Public key for frontend popup and inline checkout in test mode.
                  </div>
                </div>
              </div>

              {/* Column 2: Live (Production) Keys */}
              <div
                style={{
                  border: settings.paystack_mode === 'live' ? '2px solid #0F8F72' : '1px solid #E9E0D5',
                  borderRadius: '10px',
                  padding: '18px',
                  background: settings.paystack_mode === 'live' ? '#F0FDF4' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#201712', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>Live (Production) API Keys</span>
                    {settings.paystack_mode === 'live' && (
                      <span style={{ fontSize: '0.7rem', color: '#0F8F72', fontWeight: 600 }}>(Active)</span>
                    )}
                  </div>
                  {settings.has_paystack_live_secret && (
                    <span style={{ fontSize: '0.72rem', color: '#0F8F72', background: '#DCFCE7', padding: '1px 6px', borderRadius: '4px', border: '1px solid #86EFAC' }}>
                      Configured
                    </span>
                  )}
                </div>

                {/* Live Secret Key */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
                    Live Secret Key (<code style={{ fontSize: '0.75rem' }}>sk_live_...</code>)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showLiveSecret ? 'text' : 'password'}
                      value={settings.paystack_live_secret_key || ''}
                      onChange={(e) => setSettings({ ...settings, paystack_live_secret_key: e.target.value })}
                      placeholder="sk_live_..."
                      style={{
                        width: '100%',
                        padding: '8px 36px 8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #D1C7BD',
                        fontSize: '0.825rem',
                        fontFamily: 'monospace',
                        background: '#FFFFFF',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLiveSecret(!showLiveSecret)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#766C64',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      {showLiveSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#766C64', marginTop: '4px' }}>
                    Live secret key for real ZAR transaction billing and webhooks.
                  </div>
                </div>

                {/* Live Public Key */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
                    Live Public Key (<code style={{ fontSize: '0.75rem' }}>pk_live_...</code>)
                  </label>
                  <input
                    type="text"
                    value={settings.paystack_live_public_key || ''}
                    onChange={(e) => setSettings({ ...settings, paystack_live_public_key: e.target.value })}
                    placeholder="pk_live_..."
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid #D1C7BD',
                      fontSize: '0.825rem',
                      fontFamily: 'monospace',
                      background: '#FFFFFF',
                    }}
                  />
                  <div style={{ fontSize: '0.72rem', color: '#766C64', marginTop: '4px' }}>
                    Public key for live patient checkout.
                  </div>
                </div>
              </div>
            </div>

            {/* Webhook Configuration & Sandbox Testing Guide */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
              {/* Webhook Helper Box */}
              <div
                style={{
                  background: '#FAF8F4',
                  border: '1px solid #E9E0D5',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#201712', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ExternalLink size={14} color="#B98232" />
                  <span>Paystack Webhook Endpoint</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#766C64', lineHeight: 1.4 }}>
                  Copy this URL and register it in your Paystack Dashboard under <strong>Settings &gt; API Keys &amp; Webhooks</strong> for automated payment confirmation.
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    readOnly
                    value={`${API_BASE}/payments/webhook`}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: '1px solid #D1C7BD',
                      fontSize: '0.78rem',
                      fontFamily: 'monospace',
                      background: '#FFFFFF',
                      color: '#201712',
                    }}
                  />
                  <button
                    type="button"
                    onClick={copyWebhookUrl}
                    className="btn-secondary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                    }}
                  >
                    {copiedWebhook ? <Check size={14} color="#0F8F72" /> : <Copy size={14} />}
                    <span>{copiedWebhook ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Paystack Test Cards Reference */}
              <div
                style={{
                  background: '#FAF8F4',
                  border: '1px solid #E9E0D5',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#201712', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={14} color="#B98232" />
                  <span>Sandbox Test Cards Cheatsheet</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#766C64' }}>
                  Use these test cards on the checkout page when in Sandbox mode:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: '#FFFFFF', borderRadius: '4px', border: '1px solid #E9E0D5' }}>
                    <span style={{ fontWeight: 600, color: '#0F8F72' }}>Successful Charge:</span>
                    <span style={{ fontFamily: 'monospace' }}>4084 0840 8408 4081 | CVV 408</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: '#FFFFFF', borderRadius: '4px', border: '1px solid #E9E0D5' }}>
                    <span style={{ fontWeight: 600, color: '#B91C1C' }}>Declined (Do Not Honor):</span>
                    <span style={{ fontFamily: 'monospace' }}>4084 0800 0000 5408 | CVV 001</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', background: '#FFFFFF', borderRadius: '4px', border: '1px solid #E9E0D5' }}>
                    <span style={{ fontWeight: 600, color: '#D97706' }}>Insufficient Funds:</span>
                    <span style={{ fontFamily: 'monospace' }}>4084 0800 0067 0037 | CVV 787</span>
                  </div>
                </div>
                <div style={{ fontSize: '0.7rem', color: '#766C64', marginTop: '2px' }}>
                  Expiry: any future date (e.g. 12/30) • PIN: 0000 or 1234
                </div>
              </div>
            </div>

            {/* Bottom Save Button for Section 3 */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid #E9E0D5' }}>
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
