import React from 'react';

export default function DoctorCalendarLoading() {
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
      {/* Calendar Top Navigation Header Skeleton */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '200px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(42, 23, 15, 0.1)', animation: 'pulse 1.5s infinite' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--color-cream-surface, #FDFBF7)', border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))', animation: 'pulse 1.5s infinite' }} />
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'var(--color-cream-surface, #FDFBF7)', border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))', animation: 'pulse 1.5s infinite' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ width: '120px', height: '38px', borderRadius: '10px', backgroundColor: 'var(--color-cream-surface, #FDFBF7)', border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))', animation: 'pulse 1.5s infinite' }} />
          <div style={{ width: '150px', height: '38px', borderRadius: '10px', backgroundColor: 'var(--color-gold-pale, #F0E5D3)', animation: 'pulse 1.5s infinite' }} />
        </div>
      </div>

      {/* Calendar Week Columns Skeleton */}
      <div
        style={{
          backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
          borderRadius: '20px',
          border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
          padding: '24px',
          boxShadow: '0 2px 12px rgba(42, 23, 15, 0.04)',
        }}
      >
        {/* Days Header */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[1, 2, 3, 4, 5, 6, 7].map((d) => (
            <div
              key={d}
              style={{
                height: '48px',
                borderRadius: '12px',
                backgroundColor: 'rgba(42, 23, 15, 0.03)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse 1.5s infinite',
              }}
            >
              <div style={{ width: '50%', height: '14px', borderRadius: '4px', backgroundColor: 'rgba(42, 23, 15, 0.08)' }} />
            </div>
          ))}
        </div>

        {/* Schedule Slots Rows */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', minHeight: '400px' }}>
          {[1, 2, 3, 4, 5, 6, 7].map((col) => (
            <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[1, 2, 3, 4].map((slot) => (
                <div
                  key={slot}
                  style={{
                    height: '64px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(223, 171, 98, 0.08)',
                    border: '1px dashed rgba(223, 171, 98, 0.3)',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
