import React from 'react';

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: '80vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--color-cream-base, #FAF6EE)',
        padding: '32px 16px',
        boxSizing: 'border-box',
      }}
    >
      {/* Brand Medical Cross with pulsating gold glow */}
      <div
        style={{
          position: 'relative',
          width: '64px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: -8,
            borderRadius: '50%',
            background: 'radial-gradient(circle, var(--color-gold-glow, rgba(223, 171, 98, 0.35)) 0%, transparent 70%)',
            animation: 'chekupPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          }}
        />
        <svg
          width="48"
          height="48"
          viewBox="0 0 28 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'relative', zIndex: 1 }}
        >
          <defs>
            <linearGradient id="crossGoldGradLoading" x1="3" y1="2" x2="25" y2="26" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ECC27E" />
              <stop offset="50%" stopColor="#DFAB62" />
              <stop offset="100%" stopColor="#C9944A" />
            </linearGradient>
            <clipPath id="crossClipShapeLoading">
              <rect x="9.5" y="1.5" width="9" height="25" rx="4.5" />
              <rect x="1.5" y="9.5" width="25" height="9" rx="4.5" />
            </clipPath>
          </defs>
          <g clipPath="url(#crossClipShapeLoading)">
            <rect x="0" y="0" width="28" height="28" fill="url(#crossGoldGradLoading)" />
            <line x1="5" y1="23" x2="23" y2="5" stroke="#2A170F" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M8.5 21L21 8.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.85" />
            <ellipse cx="17.5" cy="12" rx="3.5" ry="1.8" transform="rotate(-45 17.5 12)" fill="#FFFFFF" fillOpacity="0.3" />
          </g>
        </svg>
      </div>

      {/* Brand Typography */}
      <h2
        style={{
          fontFamily: 'var(--font-heading, "Lora", serif)',
          fontSize: '1.25rem',
          fontWeight: 600,
          color: 'var(--color-chocolate-base, #2A170F)',
          margin: '0 0 8px 0',
          letterSpacing: '-0.01em',
        }}
      >
        ChekUp247 Healthcare
      </h2>

      <p
        style={{
          fontFamily: 'var(--font-sans, system-ui, sans-serif)',
          fontSize: '0.875rem',
          color: 'var(--color-cream-text-muted, #6B5E55)',
          margin: '0 0 20px 0',
        }}
      >
        Connecting you with certified HPCSA practitioners...
      </p>

      {/* Shimmer loading bar */}
      <div
        style={{
          width: '180px',
          height: '4px',
          borderRadius: '9999px',
          backgroundColor: 'rgba(223, 171, 98, 0.2)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            width: '45%',
            borderRadius: '9999px',
            background: 'linear-gradient(90deg, #DFAB62 0%, #ECC27E 50%, #DFAB62 100%)',
            animation: 'chekupShimmerBar 1.4s ease-in-out infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes chekupPulse {
          0%, 100% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0.9; }
        }
        @keyframes chekupShimmerBar {
          0% { left: -45%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
