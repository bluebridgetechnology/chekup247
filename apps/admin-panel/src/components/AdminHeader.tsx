'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Clock, LogOut, KeyRound } from 'lucide-react';
import { useAdminAuth } from '../context/AdminAuthContext';

export function AdminHeader() {
  const { admin, logout } = useAdminAuth();
  const [sessionSecondsRemaining, setSessionSecondsRemaining] = useState(1800); // 30 min session

  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const initials = admin?.fullName
    ? admin.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'AD';

  return (
    <header
      style={{
        height: '72px',
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Isolated Domain Badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: '#f87171',
            fontWeight: 700,
          }}
        >
          <KeyRound size={12} />
          <span>admin.chekup247.co.za</span>
        </div>
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Isolated Security Zone
        </span>
      </div>

      {/* Session & Admin Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Session Expiry Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#1e293b',
            border: '1px solid #334155',
            padding: '6px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.8rem',
            color: '#cbd5e1',
          }}
        >
          <Clock size={14} color="#94a3b8" />
          <span>Session: {formatTime(sessionSecondsRemaining)}</span>
        </div>

        {/* Admin Identity */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingLeft: '12px',
            borderLeft: '1px solid #1e293b',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f8fafc',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            {initials}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc' }}>
              {admin?.fullName || 'Admin Operations'}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              Superuser (MFA Active)
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => logout()}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#ef4444')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = '#64748b')}
          title="End Admin Session"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
