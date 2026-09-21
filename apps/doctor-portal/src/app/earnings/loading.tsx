import React from 'react';

export default function DoctorEarningsLoading() {
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
        <div style={{ width: '220px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(42, 23, 15, 0.1)', marginBottom: '8px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ width: '380px', height: '16px', borderRadius: '4px', backgroundColor: 'rgba(42, 23, 15, 0.05)', animation: 'pulse 1.5s infinite' }} />
      </div>

      {/* 3 Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
              borderRadius: '16px',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ width: '120px', height: '14px', borderRadius: '4px', backgroundColor: 'rgba(42, 23, 15, 0.08)', animation: 'pulse 1.5s infinite' }} />
            <div style={{ width: '140px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(42, 23, 15, 0.12)', animation: 'pulse 1.5s infinite' }} />
            <div style={{ width: '180px', height: '12px', borderRadius: '4px', backgroundColor: 'rgba(42, 23, 15, 0.05)', animation: 'pulse 1.5s infinite' }} />
          </div>
        ))}
      </div>

      {/* Ledger Table Skeleton */}
      <div
        style={{
          backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
          borderRadius: '18px',
          border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
          padding: '24px',
        }}
      >
        <div style={{ width: '180px', height: '20px', borderRadius: '6px', backgroundColor: 'rgba(42, 23, 15, 0.1)', marginBottom: '20px', animation: 'pulse 1.5s infinite' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              style={{
                height: '52px',
                borderRadius: '10px',
                backgroundColor: 'rgba(42, 23, 15, 0.03)',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
