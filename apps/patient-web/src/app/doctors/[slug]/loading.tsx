import React from 'react';

export default function DoctorDetailLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        backgroundColor: 'var(--color-cream-base, #FAF6EE)',
        minHeight: '100vh',
        padding: '32px 24px 80px',
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Breadcrumbs skeleton */}
        <div
          style={{
            width: '240px',
            height: '16px',
            borderRadius: '4px',
            backgroundColor: 'rgba(42, 23, 15, 0.08)',
            marginBottom: '28px',
            animation: 'pulse 1.5s infinite',
          }}
        />

        {/* Profile Header Card */}
        <div
          style={{
            backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
            borderRadius: '24px',
            border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
            padding: '32px',
            marginBottom: '32px',
            display: 'flex',
            gap: '28px',
            alignItems: 'center',
            flexWrap: 'wrap',
            boxShadow: '0 4px 20px rgba(42, 23, 15, 0.05)',
          }}
        >
          <div
            style={{
              width: '110px',
              height: '110px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-gold-pale, #F0E5D3)',
              flexShrink: 0,
              animation: 'pulse 1.5s infinite',
            }}
          />
          <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ width: '45%', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(42, 23, 15, 0.1)', animation: 'pulse 1.5s infinite' }} />
            <div style={{ width: '30%', height: '18px', borderRadius: '6px', backgroundColor: 'rgba(42, 23, 15, 0.06)', animation: 'pulse 1.5s infinite' }} />
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <div style={{ width: '130px', height: '26px', borderRadius: '9999px', backgroundColor: 'rgba(223, 171, 98, 0.2)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: '100px', height: '26px', borderRadius: '9999px', backgroundColor: 'rgba(34, 197, 94, 0.15)', animation: 'pulse 1.5s infinite' }} />
            </div>
          </div>
        </div>

        {/* 2-Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '32px' }}>
          {/* Left Column: Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              style={{
                backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
                borderRadius: '20px',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                padding: '28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ width: '30%', height: '20px', borderRadius: '6px', backgroundColor: 'rgba(42, 23, 15, 0.1)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: '100%', height: '14px', borderRadius: '4px', backgroundColor: 'rgba(42, 23, 15, 0.05)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: '90%', height: '14px', borderRadius: '4px', backgroundColor: 'rgba(42, 23, 15, 0.05)', animation: 'pulse 1.5s infinite' }} />
              <div style={{ width: '80%', height: '14px', borderRadius: '4px', backgroundColor: 'rgba(42, 23, 15, 0.05)', animation: 'pulse 1.5s infinite' }} />
            </div>
          </div>

          {/* Right Column: Calendar Skeleton */}
          <div
            style={{
              backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
              borderRadius: '20px',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              padding: '28px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            <div style={{ width: '50%', height: '22px', borderRadius: '6px', backgroundColor: 'rgba(42, 23, 15, 0.1)', animation: 'pulse 1.5s infinite' }} />
            {/* Days row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((d) => (
                <div key={d} style={{ height: '60px', borderRadius: '12px', backgroundColor: 'var(--color-gold-pale, #F0E5D3)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
            {/* Time slots */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <div key={s} style={{ height: '40px', borderRadius: '8px', backgroundColor: 'rgba(42, 23, 15, 0.05)', animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
