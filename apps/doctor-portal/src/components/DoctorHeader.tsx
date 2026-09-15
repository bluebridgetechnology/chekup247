'use client';

import React, { useState } from 'react';
import { Bell, User, Check, AlertCircle } from 'lucide-react';

export type DoctorStatus = 'active' | 'in_consultation' | 'offline';

export function DoctorHeader() {
  const [status, setStatus] = useState<DoctorStatus>('active');
  const [menuOpen, setMenuOpen] = useState(false);

  const statusColors = {
    active: { bg: '#ecfdf5', text: '#059669', dot: '#10b981', label: 'Active & Available' },
    in_consultation: { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b', label: 'In Consultation' },
    offline: { bg: '#f1f5f9', text: '#475569', dot: '#94a3b8', label: 'Offline' },
  };

  const current = statusColors[status];

  return (
    <header
      style={{
        height: '72px',
        background: '#ffffff',
        borderBottom: '1px solid var(--color-slate-200)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Left Title */}
      <div>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--color-slate-900)' }}>
          Doctor Practice Dashboard
        </h2>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Status Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: current.bg,
              color: current.text,
              border: `1px solid ${current.dot}40`,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: current.dot,
              }}
            />
            <span>{current.label}</span>
          </button>

          {menuOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: '#ffffff',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                width: '180px',
                padding: '6px',
                zIndex: 50,
              }}
            >
              {(['active', 'in_consultation', 'offline'] as DoctorStatus[]).map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatus(st);
                    setMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    background: status === st ? 'var(--color-slate-100)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    color: 'var(--color-slate-700)',
                  }}
                >
                  <span>{statusColors[st].label}</span>
                  {status === st && <Check size={14} color="var(--color-brand-600)" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <button
          style={{
            position: 'relative',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            color: 'var(--color-slate-600)',
            borderRadius: '50%',
          }}
          title="Notifications"
        >
          <Bell size={20} />
          <span
            style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'var(--color-brand-500)',
            }}
          />
        </button>

        {/* Doctor Avatar Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingLeft: '12px',
            borderLeft: '1px solid var(--color-slate-200)',
          }}
        >
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'var(--color-brand-100)',
              color: 'var(--color-brand-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            DR
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-slate-900)' }}>
              Dr. Thabo Ndlovu
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
              HPCSA: MP 0742198
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
