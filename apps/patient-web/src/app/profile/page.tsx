'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Bell,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  MessageSquare,
  Smartphone,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function PatientProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, updateProfile, updatePreferences } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'notifications'>('profile');

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Notification fields (1 or 2 channels constraint)
  const [channels, setChannels] = useState<string[]>(['email', 'whatsapp']);
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/profile');
    }
  }, [isLoading, isAuthenticated, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhone(user.phone || '');
      if (user.dateOfBirth) {
        setDateOfBirth(new Date(user.dateOfBirth).toISOString().split('T')[0]);
      }
      if (user.notificationPreferences?.channels) {
        setChannels(user.notificationPreferences.channels);
      }
      if (user.notificationPreferences?.remindersEnabled !== undefined) {
        setRemindersEnabled(user.notificationPreferences.remindersEnabled);
      }
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      await updateProfile({
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        date_of_birth: dateOfBirth || undefined,
      });
      setFeedback({ type: 'success', message: 'Personal profile updated successfully!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update personal details.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (channel: string) => {
    setFeedback(null);
    let updated = [...channels];
    if (updated.includes(channel)) {
      if (updated.length <= 1) {
        setFeedback({
          type: 'error',
          message: 'You must maintain at least 1 preferred communication channel for consultation reminders.',
        });
        return;
      }
      updated = updated.filter((c) => c !== channel);
    } else {
      if (updated.length >= 2) {
        setFeedback({
          type: 'error',
          message: 'Patients may select a maximum of 2 preferred notification channels.',
        });
        return;
      }
      updated.push(channel);
    }
    setChannels(updated);
  };

  const handlePreferencesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    if (channels.length < 1 || channels.length > 2) {
      setFeedback({
        type: 'error',
        message: 'Please choose either 1 or 2 notification channels.',
      });
      setSaving(false);
      return;
    }

    try {
      await updatePreferences(channels, remindersEnabled);
      setFeedback({ type: 'success', message: 'Notification preferences saved successfully!' });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update notification preferences.' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-slate-500)', fontSize: '1rem' }}>Loading patient profile...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 20px' }}>
      {/* Profile Header */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
          border: '1px solid var(--color-slate-200)',
          boxShadow: 'var(--shadow-sm)',
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
              width: '68px',
              height: '68px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-700) 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: 800,
              boxShadow: '0 4px 12px rgba(14, 147, 132, 0.3)',
            }}
          >
            {user.fullName ? user.fullName[0].toUpperCase() : 'P'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <h1 style={{ fontSize: '1.5rem', color: 'var(--color-slate-900)' }}>
                {user.fullName}
              </h1>
              {user.isEmailVerified ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: '#ecfdf5',
                    color: '#059669',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={12} />
                  <span>Verified</span>
                </span>
              ) : (
                <Link
                  href="/verify-email"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: '#fffbeb',
                    color: '#d97706',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  <AlertCircle size={12} />
                  <span>Unverified (Verify Email)</span>
                </Link>
              )}
            </div>
            <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem' }}>{user.email}</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-slate-100)',
              color: 'var(--color-slate-700)',
              fontSize: '0.8rem',
              fontWeight: 600,
            }}
          >
            Role: {user.role.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', borderBottom: '1px solid var(--color-slate-200)' }}>
        <button
          type="button"
          onClick={() => {
            setActiveTab('profile');
            setFeedback(null);
          }}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'profile' ? '2px solid var(--color-brand-600)' : '2px solid transparent',
            color: activeTab === 'profile' ? 'var(--color-brand-600)' : 'var(--color-slate-500)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <User size={18} />
          <span>Personal Details</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('notifications');
            setFeedback(null);
          }}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'notifications' ? '2px solid var(--color-brand-600)' : '2px solid transparent',
            color: activeTab === 'notifications' ? 'var(--color-brand-600)' : 'var(--color-slate-500)',
            fontWeight: 600,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Bell size={18} />
          <span>Notification Preferences</span>
        </button>
      </div>

      {/* Status Feedback banner */}
      {feedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: feedback.type === 'success' ? '#ecfdf5' : 'var(--color-danger-bg)',
            border: `1px solid ${feedback.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: feedback.type === 'success' ? '#065f46' : 'var(--color-danger)',
            fontSize: '0.875rem',
            marginBottom: '24px',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tab 1: Personal Details */}
      {activeTab === 'profile' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            padding: '32px',
            border: '1px solid var(--color-slate-200)',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px', color: 'var(--color-slate-900)' }}>
            Personal Demographics
          </h2>
          <p style={{ color: 'var(--color-slate-500)', fontSize: '0.875rem', marginBottom: '24px' }}>
            This information is shared with consulting doctors for clinical record keeping.
          </p>

          <form onSubmit={handleProfileSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                  Full Legal Name
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }}>
                    <User size={18} />
                  </span>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }}>
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-slate-200)',
                      background: 'var(--color-slate-100)',
                      color: 'var(--color-slate-500)',
                      fontSize: '0.9rem',
                      cursor: 'not-allowed',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                  Mobile Phone (SMS / WhatsApp)
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }}>
                    <Phone size={18} />
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+27 82 123 4567"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                  Date of Birth
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }}>
                    <Calendar size={18} />
                  </span>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
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
      )}

      {/* Tab 2: Notification Preferences (PA-206) */}
      {activeTab === 'notifications' && (
        <div
          style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-xl)',
            padding: '32px',
            border: '1px solid var(--color-slate-200)',
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--color-slate-900)', marginBottom: '6px' }}>
              Multi-Channel Reminder Preferences
            </h2>
            <p style={{ color: 'var(--color-slate-500)', fontSize: '0.875rem' }}>
              Per POPIA regulations and platform rules, select <strong>1 or 2 preferred communication channels</strong> for booking confirmations and appointment reminders.
            </p>
          </div>

          <form onSubmit={handlePreferencesSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              {/* Channel 1: Email */}
              <div
                onClick={() => toggleChannel('email')}
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${channels.includes('email') ? 'var(--color-brand-500)' : 'var(--color-slate-200)'}`,
                  background: channels.includes('email') ? 'var(--color-brand-50)' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: channels.includes('email') ? 'var(--color-brand-500)' : 'var(--color-slate-100)',
                    color: channels.includes('email') ? '#ffffff' : 'var(--color-slate-600)',
                  }}
                >
                  <Mail size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-slate-900)' }}>
                      Email
                    </div>
                    {channels.includes('email') && (
                      <div style={{ color: 'var(--color-brand-600)' }}>
                        <Check size={18} />
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: '4px' }}>
                    Sent via Brevo. Includes booking calendar invites (.ics) and prescription download links.
                  </p>
                </div>
              </div>

              {/* Channel 2: WhatsApp */}
              <div
                onClick={() => toggleChannel('whatsapp')}
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${channels.includes('whatsapp') ? 'var(--color-brand-500)' : 'var(--color-slate-200)'}`,
                  background: channels.includes('whatsapp') ? 'var(--color-brand-50)' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: channels.includes('whatsapp') ? 'var(--color-brand-500)' : 'var(--color-slate-100)',
                    color: channels.includes('whatsapp') ? '#ffffff' : 'var(--color-slate-600)',
                  }}
                >
                  <MessageSquare size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-slate-900)' }}>
                      WhatsApp
                    </div>
                    {channels.includes('whatsapp') && (
                      <div style={{ color: 'var(--color-brand-600)' }}>
                        <Check size={18} />
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: '4px' }}>
                    Instant interactive appointment reminders with one-tap Daily.co video join buttons.
                  </p>
                </div>
              </div>

              {/* Channel 3: SMS */}
              <div
                onClick={() => toggleChannel('sms')}
                style={{
                  padding: '20px',
                  borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${channels.includes('sms') ? 'var(--color-brand-500)' : 'var(--color-slate-200)'}`,
                  background: channels.includes('sms') ? 'var(--color-brand-50)' : '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    padding: '8px',
                    borderRadius: '8px',
                    background: channels.includes('sms') ? 'var(--color-brand-500)' : 'var(--color-slate-100)',
                    color: channels.includes('sms') ? '#ffffff' : 'var(--color-slate-600)',
                  }}
                >
                  <Smartphone size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-slate-900)' }}>
                      SMS Text
                    </div>
                    {channels.includes('sms') && (
                      <div style={{ color: 'var(--color-brand-600)' }}>
                        <Check size={18} />
                      </div>
                    )}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: '4px' }}>
                    Direct cellular reminders for patients in low-data coverage areas.
                  </p>
                </div>
              </div>
            </div>

            {/* Reminders Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-slate-50)',
                marginBottom: '28px',
              }}
            >
              <input
                type="checkbox"
                id="remindersToggle"
                checked={remindersEnabled}
                onChange={(e) => setRemindersEnabled(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-brand-500)' }}
              />
              <label htmlFor="remindersToggle" style={{ fontSize: '0.9rem', color: 'var(--color-slate-700)', cursor: 'pointer' }}>
                Receive automated reminders at <strong>T-24 hours, T-1 hour, and T-15 minutes</strong> before scheduled consultations
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={18} />
              <span>{saving ? 'Saving...' : 'Update Notification Settings'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
