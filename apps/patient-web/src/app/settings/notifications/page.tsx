'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  Mail,
  MessageSquare,
  Phone,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Save,
  Loader2,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Breadcrumbs } from '../../../components/Breadcrumbs';

export default function NotificationPreferencesPage() {
  const { user, token, isAuthenticated } = useAuth();
  const [channels, setChannels] = useState<string[]>(['email', 'whatsapp']);
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  useEffect(() => {
    async function loadPreferences() {
      if (!token || !user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const res = await fetch(`${API_BASE}/notifications/preferences`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.channels) setChannels(data.channels);
          if (data.reminders_enabled !== undefined) setRemindersEnabled(data.reminders_enabled);
        }
      } catch (err) {
        console.warn('Could not load preferences, using defaults:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadPreferences();
  }, [token, user, API_BASE]);

  const toggleChannel = (channelKey: string) => {
    setErrorMsg(null);
    setSaveSuccess(false);

    if (channels.includes(channelKey)) {
      // Trying to unselect
      if (channels.length === 1) {
        setErrorMsg('You must maintain at least 1 active notification channel.');
        return;
      }
      setChannels(channels.filter((c) => c !== channelKey));
    } else {
      // Trying to select
      if (channels.length >= 2) {
        setErrorMsg('In accordance with platform policy, you may select a maximum of 2 notification channels.');
        return;
      }
      setChannels([...channels, channelKey]);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    setIsSaving(true);
    setErrorMsg(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`${API_BASE}/notifications/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          channels,
          reminders_enabled: remindersEnabled,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to save preferences');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving notification preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const channelOptions = [
    {
      id: 'email',
      name: 'Email Notifications',
      description: 'Receive rich HTML booking receipts, prescription downloads, and pre-consultation reminders via Brevo.',
      icon: Mail,
      target: user?.email || 'Your verified email',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Alerts',
      description: 'Get instant interactive appointment alerts with direct "Join Consultation" buttons on your phone.',
      icon: MessageSquare,
      target: user?.phone || 'Your verified mobile phone',
    },
    {
      id: 'sms',
      name: 'SMS Text Messages',
      description: 'Concise SMS alerts sent directly to your phone for short-notice reminders (15 mins prior).',
      icon: Phone,
      target: user?.phone || 'Your cellular number',
    },
  ];

  return (
    <div style={{ minHeight: '85vh', background: 'var(--color-slate-50)', padding: '32px 0 64px' }}>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '0 16px' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: '20px' }}>
          <Link
            href="/profile"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--color-slate-600)',
              fontSize: '0.875rem',
              fontWeight: 600,
              textDecoration: 'none',
              marginBottom: '12px',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Profile</span>
          </Link>
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Settings', href: '/settings/notifications' },
              { label: 'Notification Channels' },
            ]}
          />
        </div>

        {/* Header Title */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '28px 32px',
            border: '1px solid var(--color-slate-200)',
            marginBottom: '24px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-brand-600)', marginBottom: '4px' }}>
                <Bell size={20} />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Patient Communication Settings
                </span>
              </div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: '0 0 6px' }}>
                Notification Preferences
              </h1>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-slate-500)' }}>
                Customize which channels ChekUp247 uses to send booking confirmations and automated reminders.
              </p>
            </div>

            {/* Selected Count Indicator (Max 2 Rule) */}
            <div
              style={{
                padding: '8px 16px',
                borderRadius: '999px',
                background: channels.length === 2 ? '#ecfdf5' : 'var(--color-slate-100)',
                border: channels.length === 2 ? '1px solid #a7f3d0' : '1px solid var(--color-slate-200)',
                color: channels.length === 2 ? '#059669' : 'var(--color-slate-700)',
                fontWeight: 700,
                fontSize: '0.85rem',
              }}
            >
              Active Channels: {channels.length} of 2 max
            </div>
          </div>
        </div>

        {/* Feedback Banners */}
        {saveSuccess && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '14px 18px',
              borderRadius: '14px',
              fontSize: '0.9rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <CheckCircle2 size={18} />
            <span>Your notification preferences have been saved successfully.</span>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              padding: '14px 18px',
              borderRadius: '14px',
              fontSize: '0.9rem',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Channels Selection Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {channelOptions.map((opt) => {
            const isSelected = channels.includes(opt.id);
            const isMaxReached = channels.length >= 2 && !isSelected;
            const Icon = opt.icon;

            return (
              <div
                key={opt.id}
                onClick={() => !isMaxReached && toggleChannel(opt.id)}
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  border: isSelected ? '2px solid var(--color-brand-600)' : '1px solid var(--color-slate-200)',
                  padding: '24px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                  cursor: isMaxReached ? 'not-allowed' : 'pointer',
                  opacity: isMaxReached ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '20px',
                }}
              >
                <div style={{ display: 'flex', gap: '18px', alignItems: 'flex-start' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      background: isSelected ? 'var(--color-brand-50)' : 'var(--color-slate-100)',
                      color: isSelected ? 'var(--color-brand-600)' : 'var(--color-slate-500)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={24} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-slate-900)', margin: 0 }}>
                        {opt.name}
                      </h3>
                      {isSelected && (
                        <span
                          style={{
                            background: 'var(--color-brand-100)',
                            color: 'var(--color-brand-800)',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                          }}
                        >
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '6px 0 8px', fontSize: '0.85rem', color: 'var(--color-slate-600)', lineHeight: 1.4 }}>
                      {opt.description}
                    </p>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-slate-400)' }}>
                      Destination: <strong style={{ color: 'var(--color-slate-600)' }}>{opt.target}</strong>
                    </div>
                  </div>
                </div>

                {/* Switch Control */}
                <div style={{ marginTop: '4px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '26px',
                      borderRadius: '13px',
                      background: isSelected ? 'var(--color-brand-600)' : 'var(--color-slate-300)',
                      padding: '2px',
                      boxSizing: 'border-box',
                      transition: 'background 0.2s ease',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        transform: isSelected ? 'translateX(22px)' : 'translateX(0px)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reminder Settings Box (BE-808) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '18px',
            border: '1px solid var(--color-slate-200)',
            padding: '24px',
            marginBottom: '32px',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
          }}
        >
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '14px',
                background: remindersEnabled ? '#f0fdfa' : 'var(--color-slate-100)',
                color: remindersEnabled ? 'var(--color-brand-600)' : 'var(--color-slate-500)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clock size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-slate-900)', margin: 0 }}>
                Automated Consultation Reminders
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
                Dispatch timely countdown reminders at 24 hours, 1 hour, and 15 minutes before your scheduled call.
              </p>
            </div>
          </div>

          <div
            onClick={() => setRemindersEnabled(!remindersEnabled)}
            style={{
              width: '48px',
              height: '26px',
              borderRadius: '13px',
              background: remindersEnabled ? 'var(--color-brand-600)' : 'var(--color-slate-300)',
              padding: '2px',
              boxSizing: 'border-box',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#ffffff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transform: remindersEnabled ? 'translateX(22px)' : 'translateX(0px)',
                transition: 'transform 0.2s ease',
              }}
            />
          </div>
        </div>

        {/* Save Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '14px' }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '12px 32px',
              borderRadius: '12px',
              border: 'none',
              background: 'var(--color-brand-600)',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.95rem',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(14, 147, 132, 0.35)',
            }}
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Saving Preferences...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Notification Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
