'use client';

import React, { useState } from 'react';
import { Download, X, Share2, PlusSquare, RefreshCw, WifiOff } from 'lucide-react';
import { usePwa } from '../../context/PwaContext';
import { ChekupCrossLogo } from '../common/ChekupCrossLogo';

export function PwaInstallBanner() {
  const {
    isInstallable,
    isInstalled,
    isIos,
    isOnline,
    hasUpdate,
    promptInstall,
    applyUpdate,
    dismissInstall,
    isDismissed,
  } = usePwa();

  const [showIosGuide, setShowIosGuide] = useState(false);

  // 1. Offline Alert Banner
  if (!isOnline) {
    return (
      <div
        role="alert"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          backgroundColor: '#DC2626',
          color: '#FFFFFF',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          fontSize: '0.875rem',
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <WifiOff size={18} />
        <span>You are currently offline. Viewing cached content.</span>
      </div>
    );
  }

  // 2. Application Update Available Banner
  if (hasUpdate) {
    return (
      <div
        role="status"
        style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9998,
          backgroundColor: 'var(--color-chocolate-dark, #1E100A)',
          color: '#FFFFFF',
          padding: '14px 22px',
          borderRadius: '16px',
          border: '1px solid var(--color-gold-base, #DFAB62)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          maxWidth: '92vw',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={18} className="animate-spin" color="var(--color-gold-base, #DFAB62)" />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
            A new version of ChekUp247 is ready.
          </span>
        </div>
        <button
          onClick={applyUpdate}
          style={{
            backgroundColor: 'var(--color-gold-primary, #E2B467)',
            color: 'var(--color-chocolate-base, #2A170F)',
            fontWeight: 600,
            fontSize: '0.85rem',
            padding: '8px 16px',
            borderRadius: '10px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Update Now
        </button>
      </div>
    );
  }

  // Don't show install banner if already installed or dismissed
  if (isInstalled || isDismissed) {
    return null;
  }

  // 3. Android / Chromium Native Prompt Banner
  if (isInstallable) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          right: '20px',
          margin: '0 auto',
          maxWidth: '480px',
          zIndex: 9997,
          backgroundColor: 'var(--color-chocolate-base, #2A170F)',
          color: '#FFFFFF',
          borderRadius: '20px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          boxShadow: '0 12px 32px rgba(42, 23, 15, 0.4)',
          border: '1px solid rgba(223, 171, 98, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ChekupCrossLogo size={32} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#FFFFFF' }}>
              Install ChekUp247 App
            </div>
            <div style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.75)' }}>
              1-tap doctor consultations & notifications
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => promptInstall()}
            style={{
              backgroundColor: 'var(--color-gold-primary, #E2B467)',
              color: 'var(--color-chocolate-base, #2A170F)',
              fontWeight: 600,
              fontSize: '0.85rem',
              padding: '8px 16px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Download size={15} />
            <span>Install</span>
          </button>
          <button
            onClick={dismissInstall}
            aria-label="Dismiss install prompt"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  // 4. iOS Safari Guided Instructions
  if (isIos && !isInstalled) {
    return (
      <>
        {!showIosGuide && (
          <div
            style={{
              position: 'fixed',
              bottom: '20px',
              left: '20px',
              right: '20px',
              margin: '0 auto',
              maxWidth: '480px',
              zIndex: 9997,
              backgroundColor: 'var(--color-chocolate-base, #2A170F)',
              color: '#FFFFFF',
              borderRadius: '20px',
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              boxShadow: '0 12px 32px rgba(42, 23, 15, 0.4)',
              border: '1px solid rgba(223, 171, 98, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ChekupCrossLogo size={28} />
              <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                Install app for faster consultations
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setShowIosGuide(true)}
                style={{
                  backgroundColor: 'var(--color-gold-primary, #E2B467)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                How to Install
              </button>
              <button
                onClick={dismissInstall}
                aria-label="Dismiss"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {showIosGuide && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={() => setShowIosGuide(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                maxWidth: '440px',
                backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
                borderRadius: '24px',
                padding: '28px 24px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                border: '1px solid rgba(223, 171, 98, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ChekupCrossLogo size={32} />
                  <div style={{ fontWeight: 600, fontSize: '1.1rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                    Install ChekUp247
                  </div>
                </div>
                <button
                  onClick={() => setShowIosGuide(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} color="var(--color-cream-text-muted, #6B5E55)" />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.9rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(223, 171, 98, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: 'var(--color-chocolate-base, #2A170F)',
                      flexShrink: 0,
                    }}
                  >
                    1
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Tap the <strong>Share</strong> button <Share2 size={16} color="#007AFF" /> in Safari's toolbar.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(223, 171, 98, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: 'var(--color-chocolate-base, #2A170F)',
                      flexShrink: 0,
                    }}
                  >
                    2
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Scroll down and select <strong>Add to Home Screen</strong> <PlusSquare size={16} />.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'rgba(223, 171, 98, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      color: 'var(--color-chocolate-base, #2A170F)',
                      flexShrink: 0,
                    }}
                  >
                    3
                  </div>
                  <div>
                    Tap <strong>Add</strong> in the top right corner. Done!
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIosGuide(false)}
                style={{
                  backgroundColor: 'var(--color-gold-primary, #E2B467)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}
