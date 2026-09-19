'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SolarIcon } from '../../components/SolarIcon';
import { useAuth } from '../../context/AuthContext';
import { PatientPortalLayout } from '../../components/portal/PatientPortalLayout';

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
      router.push('/login?redirect=/appointments');
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
      setFeedback({ type: 'success', message: 'Personal demographics updated successfully!' });
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
      <PatientPortalLayout activeNavKey="settings">
        <div
          style={{
            minHeight: '60vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#B88647',
          }}
        >
          <p style={{ color: '#6B5E55', fontSize: '0.95rem' }}>Loading patient profile...</p>
        </div>
      </PatientPortalLayout>
    );
  }

  return (
    <PatientPortalLayout activeNavKey="settings">
      <div
        style={{
          flex: 1,
          backgroundColor: '#F8F4EC',
          minHeight: 'calc(100vh - 72px)',
          padding: '36px 40px 60px 40px',
          boxSizing: 'border-box',
        }}
        className="portal-workspace"
      >
        <div style={{ maxWidth: '920px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: '28px' }}>
            <div
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: '#B88647',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              ACCOUNT SETTINGS
            </div>
            <h1
              style={{
                fontSize: '2.1rem',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                color: '#2A170F',
                margin: '0 0 8px 0',
                fontFamily: 'var(--font-heading), sans-serif',
                lineHeight: 1.15,
              }}
            >
              Profile & Settings
            </h1>
            <p style={{ fontSize: '0.94rem', color: '#6B5E55', margin: 0, lineHeight: 1.5 }}>
              Manage your personal demographics, contact details, and multi-channel notification preferences.
            </p>
          </div>

          {/* Patient Overview Card without giant avatar */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '18px',
              border: '1px solid #EDE4D4',
              padding: '22px 26px',
              boxShadow: '0 4px 16px rgba(42, 23, 15, 0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  backgroundColor: '#EAD2B2',
                  color: '#2A170F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.92rem',
                }}
              >
                {user.fullName
                  ?.split(' ')
                  .filter(Boolean)
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'LK'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2A170F' }}>
                    {user.fullName || 'Lerato Khumalo'}
                  </span>
                  {user.isEmailVerified ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 9px',
                        borderRadius: '12px',
                        backgroundColor: '#ECFDF5',
                        color: '#1B8755',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                      }}
                    >
                      <SolarIcon name="check-circle-bold" size={13} color="#1B8755" />
                      <span>Verified Patient</span>
                    </span>
                  ) : (
                    <Link
                      href="/verify-email"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 9px',
                        borderRadius: '12px',
                        backgroundColor: '#FFFBEB',
                        color: '#D97706',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <SolarIcon name="danger-circle-linear" size={13} color="#D97706" />
                      <span>Verify Email</span>
                    </Link>
                  )}
                </div>
                <div style={{ fontSize: '0.84rem', color: '#7A6A5E', marginTop: '2px' }}>
                  {user.email} • South Africa (POPIA Protected)
                </div>
              </div>
            </div>

            <Link
              href="/appointments"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.84rem',
                fontWeight: 600,
                color: '#2A170F',
                backgroundColor: '#F8F3EA',
                padding: '8px 16px',
                borderRadius: '20px',
                textDecoration: 'none',
                border: '1px solid #EDE4D4',
              }}
            >
              <span>Back to Appointments</span>
              <SolarIcon name="arrow-right-linear" size={14} color="#2A170F" />
            </Link>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '20px',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('profile');
                setFeedback(null);
              }}
              style={{
                padding: '9px 18px',
                borderRadius: '20px',
                fontSize: '0.88rem',
                fontWeight: activeTab === 'profile' ? 600 : 500,
                color: activeTab === 'profile' ? '#2A170F' : '#6B5E55',
                backgroundColor: activeTab === 'profile' ? '#EEDCC5' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.18s ease',
              }}
            >
              <SolarIcon name="user-linear" size={16} color={activeTab === 'profile' ? '#2A170F' : '#6B5E55'} />
              <span>Personal Demographics</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('notifications');
                setFeedback(null);
              }}
              style={{
                padding: '9px 18px',
                borderRadius: '20px',
                fontSize: '0.88rem',
                fontWeight: activeTab === 'notifications' ? 600 : 500,
                color: activeTab === 'notifications' ? '#2A170F' : '#6B5E55',
                backgroundColor: activeTab === 'notifications' ? '#EEDCC5' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.18s ease',
              }}
            >
              <SolarIcon name="bell-linear" size={16} color={activeTab === 'notifications' ? '#2A170F' : '#6B5E55'} />
              <span>Notification Preferences</span>
            </button>
          </div>

          {/* Feedback Banner */}
          {feedback && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 18px',
                borderRadius: '12px',
                backgroundColor: feedback.type === 'success' ? '#ECFDF5' : '#FEF2F2',
                border: `1px solid ${feedback.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
                color: feedback.type === 'success' ? '#065F46' : '#DC2626',
                fontSize: '0.86rem',
                marginBottom: '20px',
              }}
            >
              {feedback.type === 'success' ? (
                <SolarIcon name="check-circle-bold" size={18} color="#065F46" />
              ) : (
                <SolarIcon name="danger-circle-bold" size={18} color="#DC2626" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Tab 1: Personal Demographics */}
          {activeTab === 'profile' && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '18px',
                padding: '28px 30px',
                border: '1px solid #EDE4D4',
                boxShadow: '0 4px 16px rgba(42, 23, 15, 0.03)',
              }}
            >
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px', color: '#2A170F' }}>
                Personal Demographics
              </h2>
              <p style={{ color: '#7A6A5E', fontSize: '0.85rem', marginBottom: '24px' }}>
                This information is shared with consulting doctors for clinical record keeping and valid prescriptions.
              </p>

              <form onSubmit={handleProfileSubmit}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                    gap: '20px',
                    marginBottom: '26px',
                  }}
                >
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#2A170F',
                        marginBottom: '6px',
                      }}
                    >
                      Full Legal Name
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#A08F83',
                        }}
                      >
                        <SolarIcon name="user-linear" size={16} color="#A08F83" />
                      </span>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 38px',
                          borderRadius: '10px',
                          border: '1px solid #EDE4D4',
                          fontSize: '0.88rem',
                          color: '#2A170F',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#2A170F',
                        marginBottom: '6px',
                      }}
                    >
                      Email Address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#A08F83',
                        }}
                      >
                        <SolarIcon name="letter-linear" size={16} color="#A08F83" />
                      </span>
                      <input
                        type="email"
                        disabled
                        value={user.email}
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 38px',
                          borderRadius: '10px',
                          border: '1px solid #EDE4D4',
                          backgroundColor: '#F8F4EC',
                          color: '#7A6A5E',
                          fontSize: '0.88rem',
                          cursor: 'not-allowed',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#2A170F',
                        marginBottom: '6px',
                      }}
                    >
                      Mobile Phone (SMS / WhatsApp)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#A08F83',
                        }}
                      >
                        <SolarIcon name="phone-linear" size={16} color="#A08F83" />
                      </span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+27 82 123 4567"
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 38px',
                          borderRadius: '10px',
                          border: '1px solid #EDE4D4',
                          fontSize: '0.88rem',
                          color: '#2A170F',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#2A170F',
                        marginBottom: '6px',
                      }}
                    >
                      Date of Birth
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#A08F83',
                        }}
                      >
                        <SolarIcon name="calendar-linear" size={16} color="#A08F83" />
                      </span>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px 10px 38px',
                          borderRadius: '10px',
                          border: '1px solid #EDE4D4',
                          fontSize: '0.88rem',
                          color: '#2A170F',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#EDD5B3',
                    color: '#2A170F',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    padding: '10px 22px',
                    borderRadius: '22px',
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(223, 171, 98, 0.25)',
                    transition: 'all 0.18s ease',
                  }}
                  className="portal-primary-cta"
                >
                  <SolarIcon name="diskette-linear" size={16} color="#2A170F" />
                  <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Notification Preferences */}
          {activeTab === 'notifications' && (
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '18px',
                padding: '28px 30px',
                border: '1px solid #EDE4D4',
                boxShadow: '0 4px 16px rgba(42, 23, 15, 0.03)',
              }}
            >
              <div style={{ marginBottom: '22px' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#2A170F', marginBottom: '6px' }}>
                  Multi-Channel Reminder Preferences
                </h2>
                <p style={{ color: '#7A6A5E', fontSize: '0.85rem' }}>
                  Per POPIA regulations and platform rules, select <strong>1 or 2 preferred communication channels</strong> for
                  booking confirmations and appointment reminders.
                </p>
              </div>

              <form onSubmit={handlePreferencesSubmit}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '16px',
                    marginBottom: '26px',
                  }}
                >
                  {/* Channel 1: Email */}
                  <div
                    onClick={() => toggleChannel('email')}
                    style={{
                      padding: '18px',
                      borderRadius: '14px',
                      border: `1.5px solid ${channels.includes('email') ? '#C59550' : '#EDE4D4'}`,
                      backgroundColor: channels.includes('email') ? '#FAF2E4' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <div
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: channels.includes('email') ? '#EDD5B3' : '#F8F4EC',
                        color: '#2A170F',
                      }}
                    >
                      <SolarIcon name="letter-linear" size={20} color="#2A170F" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#2A170F' }}>Email</div>
                        {channels.includes('email') && <SolarIcon name="check-read-linear" size={16} color="#C17D3C" />}
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#7A6A5E', marginTop: '4px', lineHeight: 1.4 }}>
                        Includes calendar invites (.ics) and prescription download links.
                      </p>
                    </div>
                  </div>

                  {/* Channel 2: WhatsApp */}
                  <div
                    onClick={() => toggleChannel('whatsapp')}
                    style={{
                      padding: '18px',
                      borderRadius: '14px',
                      border: `1.5px solid ${channels.includes('whatsapp') ? '#C59550' : '#EDE4D4'}`,
                      backgroundColor: channels.includes('whatsapp') ? '#FAF2E4' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <div
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: channels.includes('whatsapp') ? '#EDD5B3' : '#F8F4EC',
                        color: '#2A170F',
                      }}
                    >
                      <SolarIcon name="chat-dots-linear" size={20} color="#2A170F" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#2A170F' }}>WhatsApp</div>
                        {channels.includes('whatsapp') && <SolarIcon name="check-read-linear" size={16} color="#C17D3C" />}
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#7A6A5E', marginTop: '4px', lineHeight: 1.4 }}>
                        Instant interactive reminders with one-tap video room join buttons.
                      </p>
                    </div>
                  </div>

                  {/* Channel 3: SMS */}
                  <div
                    onClick={() => toggleChannel('sms')}
                    style={{
                      padding: '18px',
                      borderRadius: '14px',
                      border: `1.5px solid ${channels.includes('sms') ? '#C59550' : '#EDE4D4'}`,
                      backgroundColor: channels.includes('sms') ? '#FAF2E4' : '#FFFFFF',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <div
                      style={{
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: channels.includes('sms') ? '#EDD5B3' : '#F8F4EC',
                        color: '#2A170F',
                      }}
                    >
                      <SolarIcon name="smartphone-linear" size={20} color="#2A170F" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem', color: '#2A170F' }}>SMS Text</div>
                        {channels.includes('sms') && <SolarIcon name="check-read-linear" size={16} color="#C17D3C" />}
                      </div>
                      <p style={{ fontSize: '0.78rem', color: '#7A6A5E', marginTop: '4px', lineHeight: 1.4 }}>
                        Direct cellular reminders for patients with limited mobile data connectivity.
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
                    padding: '14px 18px',
                    borderRadius: '12px',
                    backgroundColor: '#FAF6EE',
                    border: '1px solid #EDE4D4',
                    marginBottom: '26px',
                  }}
                >
                  <input
                    type="checkbox"
                    id="remindersToggle"
                    checked={remindersEnabled}
                    onChange={(e) => setRemindersEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#C59550' }}
                  />
                  <label htmlFor="remindersToggle" style={{ fontSize: '0.86rem', color: '#5F4D41', cursor: 'pointer' }}>
                    Receive automated consultation reminders at <strong>T-24 hours, T-1 hour, and T-15 minutes</strong>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#EDD5B3',
                    color: '#2A170F',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    padding: '10px 22px',
                    borderRadius: '22px',
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(223, 171, 98, 0.25)',
                    transition: 'all 0.18s ease',
                  }}
                  className="portal-primary-cta"
                >
                  <SolarIcon name="diskette-linear" size={16} color="#2A170F" />
                  <span>{saving ? 'Saving...' : 'Update Notification Settings'}</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </PatientPortalLayout>
  );
}
