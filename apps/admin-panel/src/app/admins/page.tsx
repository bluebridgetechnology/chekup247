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
  const [inviteSubRole, setInviteSubRole] = useState<'support' | 'super_admin'>('support');
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
          subRole: inviteSubRole,
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
      setInviteSubRole('support');
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={26} color="var(--color-gold-dark)" />
            Administrator User Management
          </h1>
          <p className="page-subtitle">
            Privileged access controls and admin audit logs. Public registration is strictly disabled.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setInviteModalOpen(true)}
          className="btn-primary"
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
            borderRadius: '10px',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(220, 38, 38, 0.1)',
            border: `1px solid ${feedback.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(220, 38, 38, 0.35)'}`,
            color: feedback.type === 'success' ? '#047857' : '#DC2626',
            fontSize: '0.9rem',
            fontWeight: 600,
            marginBottom: '24px',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Admins Table */}
      <div className="admin-table-container">
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(42, 23, 15, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--color-cream-canvas)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 700, fontSize: '1rem', color: 'var(--color-chocolate)' }}>
            <Shield size={20} color="var(--color-gold-dark)" />
            <span>Active System Administrators ({adminsList.length})</span>
          </div>

          <button
            onClick={fetchAdmins}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            <RefreshCw size={14} style={{ animation: loadingList ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>
        </div>

        {loadingList ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-chocolate-muted)' }}>
            Loading administrators...
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Administrator</th>
                <th>Email Address</th>
                <th>Status</th>
                <th>Provisioned Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adminsList.map((adm) => (
                <tr key={adm.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'rgba(223, 171, 98, 0.15)',
                          color: 'var(--color-chocolate)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                        }}
                      >
                        {adm.full_name ? adm.full_name[0].toUpperCase() : 'A'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-chocolate)' }}>{adm.full_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-chocolate-muted)' }}>
                          Role: {adm.role}
                          {adm.admin_sub_role && (
                            <span style={{ marginLeft: '8px', padding: '2px 8px', borderRadius: '999px', fontSize: '0.68rem', fontWeight: 700, background: adm.admin_sub_role === 'super_admin' ? 'rgba(42, 23, 15, 0.1)' : 'rgba(223, 171, 98, 0.15)', color: adm.admin_sub_role === 'super_admin' ? 'var(--color-chocolate)' : 'var(--color-gold-dark)' }}>
                              {adm.admin_sub_role === 'super_admin' ? 'Super Admin' : 'Support'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={{ color: 'var(--color-chocolate)' }}>{adm.email}</td>

                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 9px',
                        borderRadius: '999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: adm.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                        color: adm.status === 'active' ? '#047857' : '#DC2626',
                      }}
                    >
                      {adm.status.toUpperCase()}
                    </span>
                  </td>

                  <td style={{ color: 'var(--color-chocolate-muted)', fontSize: '0.85rem' }}>
                    {adm.created_at ? new Date(adm.created_at).toLocaleDateString() : 'Initial Seed'}
                  </td>

                  <td style={{ textAlign: 'right' }}>
                    {adm.email !== admin.email && adm.status === 'active' ? (
                      <button
                        onClick={() => handleRevoke(adm.id, adm.email)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: 'rgba(220, 38, 38, 0.1)',
                          color: '#DC2626',
                          border: '1px solid rgba(220, 38, 38, 0.35)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Revoke Access</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-chocolate-muted)' }}>
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
            background: 'rgba(42, 23, 15, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 100,
          }}
        >
          <div
            className="admin-card"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '32px',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <h2 className="section-title" style={{ fontSize: '1.35rem', marginBottom: '6px' }}>
              Provision New Administrator
            </h2>
            <p style={{ color: 'var(--color-chocolate-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
              Administrators hold elevated permissions over platform settings, financials, and doctor verification.
            </p>

            <form onSubmit={handleInvite}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-chocolate)', marginBottom: '6px' }}>
                  Full Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Nomvula Dlamini"
                  className="admin-input"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-chocolate)', marginBottom: '6px' }}>
                  Official Email Address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="nomvula@chekup247.co.za"
                  className="admin-input"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-chocolate)', marginBottom: '6px' }}>
                  Initial Password (leave empty for auto-generated secure key)
                </label>
                <input
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Leave blank to auto-generate"
                  className="admin-input"
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-chocolate)', marginBottom: '6px' }}>
                  Admin Sub-Role
                </label>
                <select
                  value={inviteSubRole}
                  onChange={(e) => setInviteSubRole(e.target.value as 'support' | 'super_admin')}
                  className="admin-select"
                  style={{ width: '100%' }}
                >
                  <option value="support">Support (read + case-work — bookings, disputes, patients)</option>
                  <option value="super_admin">Super Admin (full access — settings, admin accounts, payouts)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setInviteModalOpen(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="btn-primary"
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
