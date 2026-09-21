import React from 'react';

export default function DoctorsLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        backgroundColor: 'var(--color-cream-base, #FAF6EE)',
        minHeight: '100vh',
        paddingBottom: '80px',
      }}
    >
      {/* Hero Skeleton */}
      <div
        style={{
          backgroundColor: 'var(--color-chocolate-base, #2A170F)',
          padding: '48px 24px 72px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Eyebrow badge skeleton */}
        <div
          style={{
            width: '180px',
            height: '28px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(223, 171, 98, 0.2)',
            marginBottom: '16px',
            animation: 'pulse 1.5s infinite',
          }}
        />

        {/* Title skeleton */}
        <div
          style={{
            width: 'min(90%, 540px)',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.12)',
            marginBottom: '14px',
            animation: 'pulse 1.5s infinite',
          }}
        />

        {/* Subtitle skeleton */}
        <div
          style={{
            width: 'min(80%, 420px)',
            height: '20px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            marginBottom: '32px',
            animation: 'pulse 1.5s infinite',
          }}
        />

        {/* Search input skeleton */}
        <div
          style={{
            width: 'min(100%, 640px)',
            height: '56px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(223, 171, 98, 0.3)',
            animation: 'pulse 1.5s infinite',
          }}
        />
      </div>

      {/* Filter Bar Skeleton */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '-24px auto 32px',
          padding: '0 24px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {[140, 120, 130, 150].map((width, idx) => (
          <div
            key={idx}
            style={{
              width: `${width}px`,
              height: '44px',
              borderRadius: '12px',
              backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
              animation: 'pulse 1.5s infinite',
              boxShadow: '0 2px 8px rgba(42, 23, 15, 0.06)',
            }}
          />
        ))}
      </div>

      {/* Doctor Cards Grid Skeleton */}
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '28px',
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
                borderRadius: '20px',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                padding: '24px',
                boxShadow: '0 4px 16px rgba(42, 23, 15, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              {/* Doctor Avatar + Header */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div
                  style={{
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-gold-pale, #F0E5D3)',
                    animation: 'pulse 1.5s infinite',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      width: '70%',
                      height: '20px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(42, 23, 15, 0.08)',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                  <div
                    style={{
                      width: '50%',
                      height: '14px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(42, 23, 15, 0.05)',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                  <div
                    style={{
                      width: '40%',
                      height: '12px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(223, 171, 98, 0.25)',
                      animation: 'pulse 1.5s infinite',
                    }}
                  />
                </div>
              </div>

              {/* Bio snippet skeleton */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ width: '100%', height: '12px', borderRadius: '4px', backgroundColor: 'rgba(42, 23, 15, 0.05)', animation: 'pulse 1.5s infinite' }} />
                <div style={{ width: '85%', height: '12px', borderRadius: '4px', backgroundColor: 'rgba(42, 23, 15, 0.05)', animation: 'pulse 1.5s infinite' }} />
              </div>

              {/* Tags skeleton */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ width: '80px', height: '22px', borderRadius: '9999px', backgroundColor: 'rgba(223, 171, 98, 0.15)', animation: 'pulse 1.5s infinite' }} />
                <div style={{ width: '95px', height: '22px', borderRadius: '9999px', backgroundColor: 'rgba(223, 171, 98, 0.15)', animation: 'pulse 1.5s infinite' }} />
              </div>

              {/* Bottom fee & button */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(223, 171, 98, 0.15)',
                }}
              >
                <div style={{ width: '70px', height: '24px', borderRadius: '6px', backgroundColor: 'rgba(42, 23, 15, 0.08)', animation: 'pulse 1.5s infinite' }} />
                <div style={{ width: '120px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--color-gold-pale, #F0E5D3)', animation: 'pulse 1.5s infinite' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
