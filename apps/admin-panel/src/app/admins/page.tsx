'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  Shield,
  ShieldAlert,
  Mail,
  User,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Key,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function AdminUsersManagementPage() {
  const router = useRouter();
  const { admin, token, isAuthenticated, isLoading } = useAdminAuth();

  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Invite form
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviting, setInviting] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchAdmins = async () => {
    if (!token) return;
    setLoadingList(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAdminsList(data);
      }
    } catch (e) {
      console.error('Failed to fetch admins:', e);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (token) fetchAdmins();
  }, [token]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;

    setInviting(true);
    setFeedback(null);

    try {
      const res = await fetch(`${API_BASE}/admin/users/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: inviteName.trim(),
          email: inviteEmail.trim(),
          password: invitePassword.trim() || undefined,
        }),
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to invite administrator');

      setFeedback({
        type: 'success',
        message: `Admin account created for ${inviteEmail}.${
          data.temporaryPassword ? ` Temporary password: ${data.temporaryPassword}` : ''
        }`,
      });
      setInviteName('');
      setInviteEmail('');
      setInvitePassword('');
      setInviteModalOpen(false);
      fetchAdmins();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error creating administrator' });
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (adminId: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke administrator access for ${email}?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/admin/users/${adminId}/revoke`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to revoke admin');

      setFeedback({ type: 'success', message: data.message });
      fetchAdmins();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error revoking administrator' });
    }
  };

  if (isLoading || !admin) {
    return (
      <div style={{ color: '#94a3b8', textAlign: 'center', padding: '60px' }}>
        Verifying administrator credentials...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', color: '#ffffff' }}>
      {/* Header Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Administrator User Management
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Privileged access controls and admin audit logs. Public registration is strictly disabled.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setInviteModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-brand-500)',
            color: '#ffffff',
            border: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(14, 147, 132, 0.3)',
          }}
        >
          <UserPlus size={18} />
          <span>Provision New Administrator</span>
        </button>
      </div>

      {feedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${feedback.type === 'success' ? '#059669' : '#dc2626'}`,
            color: feedback.type === 'success' ? '#34d399' : '#f87171',
            fontSize: '0.9rem',
            marginBottom: '24px',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Admins Table */}
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '1.05rem' }}>
            <Shield size={20} style={{ color: 'var(--color-brand-400)' }} />
            <span>Active System Administrators ({adminsList.length})</span>
          </div>

          <button
            onClick={fetchAdmins}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem',
            }}
          >
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
        </div>

        {loadingList ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            Loading administrators...
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: 'rgba(15, 23, 42, 0.6)', color: '#94a3b8', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <th style={{ padding: '14px 24px' }}>Administrator</th>
                <th style={{ padding: '14px 20px' }}>Email Address</th>
                <th style={{ padding: '14px 20px' }}>Status</th>
                <th style={{ padding: '14px 20px' }}>Provisioned Date</th>
                <th style={{ padding: '14px 24px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminsList.map((adm) => (
                <tr
                  key={adm.id}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    transition: 'background 0.2s',
                  }}
                >
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'rgba(14, 147, 132, 0.25)',
                          color: '#57c7bc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                        }}
                      >
                        {adm.full_name ? adm.full_name[0].toUpperCase() : 'A'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{adm.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Role: {adm.role}</div>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '16px 20px', color: '#cbd5e1' }}>{adm.email}</td>

                  <td style={{ padding: '16px 20px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: adm.status === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                        color: adm.status === 'active' ? '#34d399' : '#f87171',
                      }}
                    >
                      {adm.status.toUpperCase()}
                    </span>
                  </td>

                  <td style={{ padding: '16px 20px', color: '#94a3b8', fontSize: '0.85rem' }}>
                    {adm.created_at ? new Date(adm.created_at).toLocaleDateString() : 'Initial Seed'}
                  </td>

                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    {adm.email !== admin.email && adm.status === 'active' ? (
                      <button
                        onClick={() => handleRevoke(adm.id, adm.email)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={14} />
                        <span>Revoke Access</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {adm.email === admin.email ? 'Current User' : 'Revoked'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Provision New Admin Modal */}
      {inviteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '480px',
              background: '#1e293b',
              borderRadius: 'var(--radius-xl)',
              padding: '32px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            }}
          >
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, marginBottom: '6px', color: '#ffffff' }}>
              Provision New Administrator
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px' }}>
              Administrators hold elevated permissions over platform settings, financials, and doctor verification.
            </p>

            <form onSubmit={handleInvite}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Nomvula Dlamini"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #334155',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Official Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="nomvula@chekup247.co.za"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #334155',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Initial Password (leave empty for auto-generated secure key)
                </label>
                <input
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid #334155',
                    background: '#0f172a',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'transparent',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-brand-500)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {inviting ? 'Provisioning...' : 'Confirm Provisioning'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
