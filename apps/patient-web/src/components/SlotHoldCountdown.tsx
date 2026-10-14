'use client';

import React, { useEffect, useState } from 'react';

interface Props {
  /** ISO time the hold ends. */
  expiresAt: string;
  /** Called once when the countdown reaches zero. */
  onExpire?: () => void;
}

/** "Your time is held for 8:42", ticking each second. */
export function SlotHoldCountdown({ expiresAt, onExpire }: Props) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()));

  useEffect(() => {
    let fired = false;
    const tick = () => {
      const ms = Math.max(0, new Date(expiresAt).getTime() - Date.now());
      setLeft(ms);
      if (ms === 0 && !fired) {
        fired = true;
        onExpire?.();
      }
    };
    tick();
    const t = window.setInterval(tick, 1000);
    return () => window.clearInterval(t);
  }, [expiresAt, onExpire]);

  if (left <= 0) return null;
  const mins = Math.floor(left / 60000);
  const secs = Math.floor((left % 60000) / 1000);
  const urgent = left < 2 * 60 * 1000;
  return (
    <div
      role="status"
      aria-live="off"
      style={{
        background: urgent ? '#FFFBEB' : '#ECFDF5',
        border: `1px solid ${urgent ? '#FDE68A' : '#A7F3D0'}`,
        color: urgent ? '#92400E' : '#065F46',
        padding: '12px 18px',
        borderRadius: '12px',
        marginBottom: '16px',
        fontSize: '0.875rem',
        fontWeight: 600,
      }}
    >
      Your time is reserved for {mins}:{String(secs).padStart(2, '0')}. Complete payment before it ends to keep it.
    </div>
  );
}
