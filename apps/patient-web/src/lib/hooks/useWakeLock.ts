import { useEffect, useRef } from 'react';

/**
 * Screen Wake Lock hook for telehealth video consultations.
 * Prevents mobile and tablet screens from dimming or turning off during active video calls.
 */
export function useWakeLock(enabled: boolean = true) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }

    let isMounted = true;

    const requestLock = async () => {
      try {
        if (!wakeLockRef.current) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch (err) {
        // Wake lock can fail if battery saver is active or tab is hidden
        console.warn('[WakeLock] Unable to acquire screen wake lock:', err);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled && isMounted) {
        requestLock();
      }
    };

    requestLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);
}
