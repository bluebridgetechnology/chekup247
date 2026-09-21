import React from 'react';

export default function DoctorPortalLoading() {
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
      {/* Greeting & Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ width: '280px', height: '32px', borderRadius: '8px', backgroundColor: 'rgba(42, 23, 15, 0.1)', marginBottom: '8px', animation: 'pulse 1.5s infinite' }} />
          <div style={{ width: '380px', height: '16px', borderRadius: '4px', backgroundColor: 'rgba(42, 23, 15, 0.05)', animation: 'pulse 1.5s infinite' }} />
        </div>
        <div style={{ width: '160px', height: '42px', borderRadius: '12px', backgroundColor: 'var(--color-gold-pale, #F0E5D3)', animation: 'pulse 1.5s infinite' }} />
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
              borderRadius: '16px',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 2px 10px rgba(42, 23, 15, 0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ width: '100px', height: '14px', borderRadius: '4px', backgroundColor: 'rgba(42, 23, 15, 0.08)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--color-gold-pale, #F0E5D3)', animation: 'pulse 1.5s infinite' }} />
            </div>
            <div style={{ width: '120px', height: '28px', borderRadius: '6px', backgroundColor: 'rgba(42, 23, 15, 0.12)', animation: 'pulse 1.5s infinite' }} />
            <div style={{ width: '140px', height: '12px', borderRadius: '4px', backgroundColor: 'rgba(42, 23, 15, 0.05)', animation: 'pulse 1.5s infinite' }} />
          </div>
        ))}
      </div>

      {/* Main 2-Column Clinical Section Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Left Schedule Skeleton */}
        <div
          style={{
            backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
            borderRadius: '18px',
            border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ width: '180px', height: '20px', borderRadius: '6px', backgroundColor: 'rgba(42, 23, 15, 0.1)', animation: 'pulse 1.5s infinite' }} />
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                height: '70px',
                borderRadius: '12px',
                backgroundColor: 'rgba(42, 23, 15, 0.03)',
                border: '1px solid rgba(223, 171, 98, 0.15)',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>

        {/* Right Attention Items Skeleton */}
        <div
          style={{
            backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
            borderRadius: '18px',
            border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
          }}
        >
          <div style={{ width: '160px', height: '20px', borderRadius: '6px', backgroundColor: 'rgba(42, 23, 15, 0.1)', animation: 'pulse 1.5s infinite' }} />
          {[1, 2].map((a) => (
            <div
              key={a}
              style={{
                height: '80px',
                borderRadius: '12px',
                backgroundColor: 'rgba(42, 23, 15, 0.03)',
                border: '1px solid rgba(223, 171, 98, 0.15)',
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
