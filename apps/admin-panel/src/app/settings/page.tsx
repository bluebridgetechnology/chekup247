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
  CreditCard,
  Eye,
  EyeOff,
  Copy,
  Check,
  Zap,
  AlertTriangle,
  ExternalLink,
  Calculator,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

type SettingsTab = 'gateway' | 'financial' | 'scheduling';

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

  const [activeTab, setActiveTab] = useState<SettingsTab>('gateway');

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
  const [copiedCard, setCopiedCard] = useState<string | null>(null);
  const [simFee, setSimFee] = useState<number>(500);

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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

  const copyCardNumber = (cardNum: string, id: string) => {
    navigator.clipboard.writeText(cardNum.replace(/\s+/g, ''));
    setCopiedCard(id);
    setTimeout(() => setCopiedCard(null), 2500);
  };

  // Preview calculations based on interactive simFee
  const activeFee = Number(simFee) > 0 ? Number(simFee) : 500;
  const doctorCancellationFee = (activeFee * settings.late_cancellation_deduction_percent) / 100;
  const patientRefundAmount = activeFee - doctorCancellationFee;
  const platformCommissionAmount = (activeFee * settings.commission_percent) / 100;
  const doctorEarnings = activeFee - platformCommissionAmount;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', color: '#201712' }}>
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
          <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>
            Configure payment gateway environments, platform commissions, late cancellation fees, and consultation schedules.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={fetchSettings}
            disabled={isLoading}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Reload</span>
          </button>
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px' }}
          >
            <Save size={15} />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Global Alerts */}
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

      {/* Quick Summary Stats Ribbon */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
        }}
      >
        <div
          className="stat-card"
          onClick={() => setActiveTab('gateway')}
          style={{ cursor: 'pointer', border: activeTab === 'gateway' ? '2px solid #DFA34F' : '1px solid #E9E0D5' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Payment Gateway</span>
            <CreditCard size={18} color={settings.paystack_mode === 'live' ? '#166534' : '#B98232'} />
          </div>
          <div className="stat-number" style={{ fontSize: '1.25rem', color: settings.paystack_mode === 'live' ? '#166534' : '#B98232' }}>
            {settings.paystack_mode === 'live' ? 'Live Mode' : 'Sandbox (Test)'}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            {settings.paystack_mode === 'live' ? 'Real payments active' : 'Simulated test cards'}
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => setActiveTab('financial')}
          style={{ cursor: 'pointer', border: activeTab === 'financial' ? '2px solid #DFA34F' : '1px solid #E9E0D5' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Platform Commission</span>
            <Percent size={18} color="#B98232" />
          </div>
          <div className="stat-number">{settings.commission_percent}%</div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Retained per consultation
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => setActiveTab('financial')}
          style={{ cursor: 'pointer', border: activeTab === 'financial' ? '2px solid #DFA34F' : '1px solid #E9E0D5' }}
        >
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

        <div
          className="stat-card"
          onClick={() => setActiveTab('scheduling')}
          style={{ cursor: 'pointer', border: activeTab === 'scheduling' ? '2px solid #DFA34F' : '1px solid #E9E0D5' }}
        >
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

        <div
          className="stat-card"
          onClick={() => setActiveTab('scheduling')}
          style={{ cursor: 'pointer', border: activeTab === 'scheduling' ? '2px solid #DFA34F' : '1px solid #E9E0D5' }}
        >
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

      {/* Tabs Navigation Bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '2px solid #E9E0D5',
          paddingBottom: '2px',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('gateway')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            borderBottom: activeTab === 'gateway' ? '3px solid #B98232' : '3px solid transparent',
            background: activeTab === 'gateway' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'gateway' ? '#201712' : '#766C64',
            fontWeight: activeTab === 'gateway' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <CreditCard size={18} color={activeTab === 'gateway' ? '#B98232' : '#766C64'} />
          <span>Payment Gateway (Paystack)</span>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '12px',
              background: settings.paystack_mode === 'live' ? '#DCFCE7' : '#FEF3C7',
              color: settings.paystack_mode === 'live' ? '#166534' : '#92400E',
              border: `1px solid ${settings.paystack_mode === 'live' ? '#86EFAC' : '#FCD34D'}`,
              textTransform: 'uppercase',
            }}
          >
            {settings.paystack_mode === 'live' ? 'Live' : 'Sandbox'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('financial')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            borderBottom: activeTab === 'financial' ? '3px solid #B98232' : '3px solid transparent',
            background: activeTab === 'financial' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'financial' ? '#201712' : '#766C64',
            fontWeight: activeTab === 'financial' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Coins size={18} color={activeTab === 'financial' ? '#B98232' : '#766C64'} />
          <span>Financial Policies & Fees</span>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '12px',
              background: '#FAF5EB',
              color: '#B98232',
              border: '1px solid #E9E0D5',
            }}
          >
            {settings.commission_percent}% Cut
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scheduling')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '8px 8px 0 0',
            border: 'none',
            borderBottom: activeTab === 'scheduling' ? '3px solid #B98232' : '3px solid transparent',
            background: activeTab === 'scheduling' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'scheduling' ? '#201712' : '#766C64',
            fontWeight: activeTab === 'scheduling' ? 700 : 500,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
        >
          <Clock size={18} color={activeTab === 'scheduling' ? '#B98232' : '#766C64'} />
          <span>Scheduling & Timing</span>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '12px',
              background: '#FAF5EB',
              color: '#0F8F72',
              border: '1px solid #E9E0D5',
            }}
          >
            {settings.default_slot_duration_minutes}m Slots
          </span>
        </button>
      </div>

      <form onSubmit={handleSave}>
        {/* ==================================================================== */}
        {/* TAB 1: PAYMENT GATEWAY (PAYSTACK)                                    */}
        {/* ==================================================================== */}
        {activeTab === 'gateway' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Mode Selector Card */}
            <div
              className="admin-card"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
                <div>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#201712', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Gateway Operating Environment</span>
                  </h2>
                  <div style={{ fontSize: '0.8rem', color: '#766C64', marginTop: '4px' }}>
                    Select whether the application uses Paystack in Sandbox (Test Mode) or Live Production.
                  </div>
                </div>

                <div style={{ display: 'flex', background: '#F7EFE3', padding: '4px', borderRadius: '8px', border: '1px solid #E9E0D5' }}>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, paystack_mode: 'test' })}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      background: settings.paystack_mode === 'test' ? '#2B170F' : 'transparent',
                      color: settings.paystack_mode === 'test' ? '#ECC27E' : '#766C64',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Shield size={14} />
                    <span>Sandbox (Test Mode)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, paystack_mode: 'live' })}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '6px',
                      border: 'none',
                      background: settings.paystack_mode === 'live' ? '#2B170F' : 'transparent',
                      color: settings.paystack_mode === 'live' ? '#ECC27E' : '#766C64',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Zap size={14} />
                    <span>Live (Production Mode)</span>
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {settings.paystack_mode === 'test' ? (
                <div
                  style={{
                    background: '#FFFBEB',
                    border: '1px solid #FDE68A',
                    borderRadius: '8px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    color: '#92400E',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Shield size={18} />
                    <div>
                      <strong>Sandbox Mode is Active:</strong> All consultation bookings, time extensions, and refunds are simulated using Paystack Test keys. No real bank accounts are charged.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    className="btn-secondary"
                    style={{
                      fontSize: '0.8rem',
                      padding: '6px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#FFFFFF',
                    }}
                  >
                    <Zap size={14} color="#B98232" />
                    <span>{isTestingConnection ? 'Testing...' : 'Test Paystack Connection'}</span>
                  </button>
                </div>
              ) : (
                <div
                  style={{
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '8px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    color: '#991B1B',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertTriangle size={18} />
                    <div>
                      <strong>Caution — Live Production Mode is Active:</strong> Real ZAR transactions will be processed via Paystack. Ensure you have valid South African live Paystack credentials configured.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                    className="btn-secondary"
                    style={{
                      fontSize: '0.8rem',
                      padding: '6px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#FFFFFF',
                    }}
                  >
                    <Zap size={14} color="#B91C1C" />
                    <span>{isTestingConnection ? 'Testing...' : 'Test Live Connection'}</span>
                  </button>
                </div>
              )}

              {/* Test Connection Output */}
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
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  {testConnectionResult.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                  <div>
                    <strong>Paystack API Test Result:</strong> {testConnectionResult.message}
                    {testConnectionResult.details?.banks_count && (
                      <span style={{ marginLeft: '6px', fontWeight: 'normal' }}>
                        ({testConnectionResult.details.banks_count} South African banks verified)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* API Credentials Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
              {/* Column 1: Sandbox (Test) Keys */}
              <div
                className="admin-card"
                style={{
                  border: settings.paystack_mode === 'test' ? '2px solid #DFA34F' : '1px solid #E9E0D5',
                  padding: '22px',
                  background: settings.paystack_mode === 'test' ? '#FCF9F3' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E9E0D5', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#201712', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Sandbox (Test) API Keys</span>
                      {settings.paystack_mode === 'test' && (
                        <span style={{ fontSize: '0.72rem', color: '#B98232', fontWeight: 600, background: '#FEF3C7', padding: '1px 8px', borderRadius: '6px' }}>Active</span>
                      )}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '2px' }}>
                      Keys used for local development and QA sandbox testing
                    </div>
                  </div>
                  {settings.has_paystack_test_secret && (
                    <span style={{ fontSize: '0.72rem', color: '#0F8F72', background: '#DCFCE7', padding: '2px 8px', borderRadius: '4px', border: '1px solid #86EFAC', fontWeight: 600 }}>
                      Configured
                    </span>
                  )}
                </div>

                {/* Test Secret Key */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
                    Test Secret Key (<code style={{ fontSize: '0.78rem' }}>sk_test_...</code>)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showTestSecret ? 'text' : 'password'}
                      value={settings.paystack_test_secret_key || ''}
                      onChange={(e) => setSettings({ ...settings, paystack_test_secret_key: e.target.value })}
                      placeholder="sk_test_..."
                      style={{
                        width: '100%',
                        padding: '9px 38px 9px 12px',
                        borderRadius: '6px',
                        border: '1px solid #D1C7BD',
                        fontSize: '0.85rem',
                        fontFamily: 'monospace',
                        background: '#FFFFFF',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowTestSecret(!showTestSecret)}
                      style={{
                        position: 'absolute',
                        right: '10px',
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
                  <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
                    Backend secret key for sandbox transactions, card tokenization, and webhooks.
                  </div>
                </div>

                {/* Test Public Key */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
                    Test Public Key (<code style={{ fontSize: '0.78rem' }}>pk_test_...</code>)
                  </label>
                  <input
                    type="text"
                    value={settings.paystack_test_public_key || ''}
                    onChange={(e) => setSettings({ ...settings, paystack_test_public_key: e.target.value })}
                    placeholder="pk_test_..."
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D1C7BD',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      background: '#FFFFFF',
                    }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
                    Public key for frontend popup and inline checkout in test mode.
                  </div>
                </div>
              </div>

              {/* Column 2: Live (Production) Keys */}
              <div
                className="admin-card"
                style={{
                  border: settings.paystack_mode === 'live' ? '2px solid #0F8F72' : '1px solid #E9E0D5',
                  padding: '22px',
                  background: settings.paystack_mode === 'live' ? '#F0FDF4' : '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E9E0D5', paddingBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#201712', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Live (Production) API Keys</span>
                      {settings.paystack_mode === 'live' && (
                        <span style={{ fontSize: '0.72rem', color: '#0F8F72', fontWeight: 600, background: '#DCFCE7', padding: '1px 8px', borderRadius: '6px' }}>Active</span>
                      )}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '2px' }}>
                      Keys used for live production ZAR transactions
                    </div>
                  </div>
                  {settings.has_paystack_live_secret && (
                    <span style={{ fontSize: '0.72rem', color: '#0F8F72', background: '#DCFCE7', padding: '2px 8px', borderRadius: '4px', border: '1px solid #86EFAC', fontWeight: 600 }}>
                      Configured
                    </span>
                  )}
                </div>

                {/* Live Secret Key */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
                    Live Secret Key (<code style={{ fontSize: '0.78rem' }}>sk_live_...</code>)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showLiveSecret ? 'text' : 'password'}
                      value={settings.paystack_live_secret_key || ''}
                      onChange={(e) => setSettings({ ...settings, paystack_live_secret_key: e.target.value })}
                      placeholder="sk_live_..."
                      style={{
                        width: '100%',
                        padding: '9px 38px 9px 12px',
                        borderRadius: '6px',
                        border: '1px solid #D1C7BD',
                        fontSize: '0.85rem',
                        fontFamily: 'monospace',
                        background: '#FFFFFF',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLiveSecret(!showLiveSecret)}
                      style={{
                        position: 'absolute',
                        right: '10px',
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
                  <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
                    Live secret key for real ZAR transaction billing and webhooks.
                  </div>
                </div>

                {/* Live Public Key */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
                    Live Public Key (<code style={{ fontSize: '0.78rem' }}>pk_live_...</code>)
                  </label>
                  <input
                    type="text"
                    value={settings.paystack_live_public_key || ''}
                    onChange={(e) => setSettings({ ...settings, paystack_live_public_key: e.target.value })}
                    placeholder="pk_live_..."
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D1C7BD',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      background: '#FFFFFF',
                    }}
                  />
                  <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
                    Public key for live patient checkout.
                  </div>
                </div>
              </div>
            </div>

            {/* Webhooks & Testing Cheatsheet Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
              {/* Webhook Endpoint Card */}
              <div
                className="admin-card"
                style={{
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#201712', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ExternalLink size={16} color="#B98232" />
                  <span>Paystack Webhook Endpoint</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#766C64', lineHeight: 1.4 }}>
                  Copy this URL and register it in your Paystack Dashboard under <strong>Settings &gt; API Keys &amp; Webhooks</strong> so our server automatically receives <code style={{ fontSize: '0.75rem' }}>charge.success</code> and <code style={{ fontSize: '0.75rem' }}>refund.processed</code> events.
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                  <input
                    type="text"
                    readOnly
                    value={`${API_BASE}/payments/webhook`}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #D1C7BD',
                      fontSize: '0.825rem',
                      fontFamily: 'monospace',
                      background: '#FAF8F5',
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
                      gap: '6px',
                      padding: '8px 14px',
                      fontSize: '0.825rem',
                    }}
                  >
                    {copiedWebhook ? <Check size={14} color="#0F8F72" /> : <Copy size={14} />}
                    <span>{copiedWebhook ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Sandbox Test Cards Cheatsheet */}
              <div
                className="admin-card"
                style={{
                  padding: '22px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#201712', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CreditCard size={16} color="#B98232" />
                    <span>Sandbox Test Cards Cheatsheet</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#766C64' }}>Click to copy</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#766C64' }}>
                  Use these card numbers on checkout to simulate different banking outcomes:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Card 1: Success */}
                  <div
                    onClick={() => copyCardNumber('4084 0840 8408 4081', 'success')}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '7px 10px',
                      background: '#FAF8F4',
                      borderRadius: '6px',
                      border: '1px solid #E9E0D5',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#0F8F72', fontSize: '0.78rem' }}>Successful Charge: </span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#201712' }}>4084 0840 8408 4081</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#766C64' }}>
                      <span>CVV: <strong>408</strong></span>
                      {copiedCard === 'success' ? <Check size={14} color="#0F8F72" /> : <Copy size={13} />}
                    </div>
                  </div>

                  {/* Card 2: Decline */}
                  <div
                    onClick={() => copyCardNumber('4084 0800 0000 5408', 'declined')}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '7px 10px',
                      background: '#FAF8F4',
                      borderRadius: '6px',
                      border: '1px solid #E9E0D5',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#B91C1C', fontSize: '0.78rem' }}>Declined (Do Not Honor): </span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#201712' }}>4084 0800 0000 5408</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#766C64' }}>
                      <span>CVV: <strong>001</strong></span>
                      {copiedCard === 'declined' ? <Check size={14} color="#0F8F72" /> : <Copy size={13} />}
                    </div>
                  </div>

                  {/* Card 3: Insufficient Funds */}
                  <div
                    onClick={() => copyCardNumber('4084 0800 0067 0037', 'funds')}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '7px 10px',
                      background: '#FAF8F4',
                      borderRadius: '6px',
                      border: '1px solid #E9E0D5',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 700, color: '#D97706', fontSize: '0.78rem' }}>Insufficient Funds: </span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#201712' }}>4084 0800 0067 0037</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#766C64' }}>
                      <span>CVV: <strong>787</strong></span>
                      {copiedCard === 'funds' ? <Check size={14} color="#0F8F72" /> : <Copy size={13} />}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#766C64' }}>
                  Expiry: any future date (e.g. 12/30) • PIN: 0000 or 1234
                </div>
              </div>
            </div>

            {/* Bottom Save Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
              >
                <Save size={16} />
                <span>{isSaving ? 'Saving Changes...' : 'Save Payment Gateway Settings'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 2: FINANCIAL POLICIES & FEES                                     */}
        {/* ==================================================================== */}
        {activeTab === 'financial' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '20px' }}>
              {/* Controls Column */}
              <div
                className="admin-card"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '22px',
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
                      Fee Percentages & Deductions
                    </h2>
                    <div style={{ fontSize: '0.78rem', color: '#766C64' }}>
                      Governs platform revenue cuts and patient late cancellation deductions
                    </div>
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
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#B98232',
                        background: '#FAF5EB',
                        padding: '2px 10px',
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
                    Percentage retained by ChekUp247 on completed consultations to cover LiveKit video rooms, Brevo communications, and payment gateway costs.
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
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#B91C1C',
                        background: '#FEF2F2',
                        padding: '2px 10px',
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
                    Applied when a patient cancels less than 24 hours before the consultation. Transferred directly to the doctor as compensation for reserved clinical time.
                  </div>
                </div>
              </div>

              {/* Simulation Column */}
              <div
                className="admin-card"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E9E0D5', paddingBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                      <Calculator size={18} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#201712' }}>
                        Live Policy Simulation
                      </h2>
                      <div style={{ fontSize: '0.78rem', color: '#766C64' }}>
                        Test financial outcomes across different consultation amounts
                      </div>
                    </div>
                  </div>
                </div>

                {/* Consultation Fee Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
                    Simulated Consultation Fee (ZAR)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#766C64' }}>R</span>
                    <input
                      type="number"
                      min="50"
                      step="50"
                      value={simFee}
                      onChange={(e) => setSimFee(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '9px 12px 9px 30px',
                        borderRadius: '6px',
                        border: '1px solid #D1C7BD',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        background: '#FFFFFF',
                      }}
                    />
                  </div>
                </div>

                {/* Breakdown List */}
                <div
                  style={{
                    background: '#FAF8F4',
                    border: '1px solid #E9E0D5',
                    borderRadius: '10px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    fontSize: '0.825rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#766C64' }}>
                    <span>≥ 24 Hours Cancellation:</span>
                    <span style={{ color: '#0F8F72', fontWeight: 700 }}>100% Refund (R{activeFee.toFixed(2)})</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#766C64' }}>
                    <span>&lt; 24 Hours Doctor Compensation:</span>
                    <span style={{ color: '#B91C1C', fontWeight: 700 }}>R{doctorCancellationFee.toFixed(2)} ({settings.late_cancellation_deduction_percent}%)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#766C64' }}>
                    <span>&lt; 24 Hours Patient Refund:</span>
                    <span style={{ color: '#B98232', fontWeight: 700 }}>R{patientRefundAmount.toFixed(2)} ({(100 - settings.late_cancellation_deduction_percent)}%)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#766C64', borderTop: '1px solid #E9E0D5', paddingTop: '8px', marginTop: '4px' }}>
                    <span style={{ fontWeight: 600, color: '#201712' }}>Platform Commission Retained:</span>
                    <span style={{ color: '#201712', fontWeight: 700 }}>R{platformCommissionAmount.toFixed(2)} ({settings.commission_percent}%)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#766C64' }}>
                    <span style={{ fontWeight: 600, color: '#201712' }}>Doctor Net Payout on Completion:</span>
                    <span style={{ color: '#0F8F72', fontWeight: 700 }}>R{doctorEarnings.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Save Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
              >
                <Save size={16} />
                <span>{isSaving ? 'Saving Changes...' : 'Save Financial Settings'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* TAB 3: SCHEDULING & TIMING                                           */}
        {/* ==================================================================== */}
        {activeTab === 'scheduling' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '20px' }}>
              {/* Controls Column */}
              <div
                className="admin-card"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '22px',
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
                            fontSize: '0.85rem',
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
                    Base duration applied when doctors batch-generate availability slots on their calendar.
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
                            fontSize: '0.85rem',
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
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        color: '#B98232',
                        background: '#FAF5EB',
                        padding: '2px 10px',
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
                    Time window after scheduled appointment start before a missing doctor or patient is officially declared a no-show.
                  </div>
                </div>
              </div>

              {/* Schedule Timeline Preview */}
              <div
                className="admin-card"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '18px',
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
                      color: '#0F8F72',
                    }}
                  >
                    <CalendarCheck size={18} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#201712' }}>
                      Calendar Slicing & Timeline Preview
                    </h2>
                    <div style={{ fontSize: '0.78rem', color: '#766C64' }}>
                      Visual representation of an appointment block on practitioner calendars
                    </div>
                  </div>
                </div>

                {/* Visual Timeline Bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#201712' }}>
                    Consecutive Consultation Block:
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      height: '48px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid #E9E0D5',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)',
                    }}
                  >
                    <div
                      style={{
                        flex: settings.default_slot_duration_minutes,
                        background: '#2B170F',
                        color: '#ECC27E',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        gap: '6px',
                      }}
                    >
                      <Clock size={14} />
                      <span>Consultation ({settings.default_slot_duration_minutes}m)</span>
                    </div>

                    {settings.default_buffer_minutes > 0 && (
                      <div
                        style={{
                          flex: settings.default_buffer_minutes,
                          background: '#DFA34F',
                          color: '#2B170F',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        <span>Buffer ({settings.default_buffer_minutes}m)</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#766C64' }}>
                    <span>0:00 (Call Start)</span>
                    <span>{settings.default_slot_duration_minutes}m (Call End)</span>
                    <span>{settings.default_slot_duration_minutes + settings.default_buffer_minutes}m (Next Slot)</span>
                  </div>
                </div>

                {/* HPCSA Guidelines Note */}
                <div
                  style={{
                    background: '#FAF8F4',
                    border: '1px solid #E9E0D5',
                    borderRadius: '8px',
                    padding: '14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '0.78rem',
                    color: '#766C64',
                    lineHeight: 1.5,
                  }}
                >
                  <Info size={18} color="#B98232" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong style={{ color: '#201712' }}>HPCSA Telehealth Ethical Standards:</strong> Ensure practitioners have adequate clinical turnaround buffer (recommended minimum 5 mins) to complete e-prescribing, review previous medical history, and complete ICD-10 clinical notes.
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Save Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 22px' }}
              >
                <Save size={16} />
                <span>{isSaving ? 'Saving Changes...' : 'Save Scheduling Settings'}</span>
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
