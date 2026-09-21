import React from 'react';

export default function DoctorAppointmentsLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: '32px',
        backgroundColor: 'var(--color-cream-base, #FAF6EE)',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      {/* Header skeleton */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ width: '260px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(42, 23, 15, 0.1)', marginBottom: '8px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ width: '380px', height: '16px', borderRadius: '4px', backgroundColor: 'rgba(42, 23, 15, 0.05)', animation: 'pulse 1.5s infinite' }} />
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        {[130, 110, 120, 100].map((w, idx) => (
          <div
            key={idx}
            style={{
              width: `${w}px`,
              height: '38px',
              borderRadius: '9999px',
              backgroundColor: idx === 0 ? 'var(--color-gold-pale, #F0E5D3)' : 'rgba(42, 23, 15, 0.04)',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
              animation: 'pulse 1.5s infinite',
            }}
          />
        ))}
      </div>

      {/* Appointment Queue Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
              borderRadius: '16px',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-gold-pale, #F0E5D3)',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ width: '180px', height: '18px', borderRadius: '6px', backgroundColor: 'rgba(42, 23, 15, 0.1)', animation: 'pulse 1.5s infinite' }} />
                <div style={{ width: '130px', height: '14px', borderRadius: '4px', backgroundColor: 'rgba(42, 23, 15, 0.05)', animation: 'pulse 1.5s infinite' }} />
                <div style={{ width: '150px', height: '12px', borderRadius: '4px', backgroundColor: 'rgba(223, 171, 98, 0.25)', animation: 'pulse 1.5s infinite' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ width: '100px', height: '40px', borderRadius: '10px', backgroundColor: 'rgba(42, 23, 15, 0.05)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: '130px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--color-gold-pale, #F0E5D3)', animation: 'pulse 1.5s infinite' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
