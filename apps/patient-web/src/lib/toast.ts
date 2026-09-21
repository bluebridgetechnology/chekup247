'use client';

import { toast } from 'sonner';

/**
 * ChekUp247 toast helpers — a thin, semantic wrapper over Sonner so every call
 * site is a one-liner and the styling/behaviour stays centralized. Import these
 * instead of calling `toast` directly.
 *
 *   import { toastSuccess, toastError, toastPromise } from '@/lib/toast';
 *   toastSuccess('Booking confirmed', 'Your consultation is scheduled.');
 *   toastError('Login failed', err.message);
 *   await toastPromise(saveNotes(), { loading: 'Saving…', success: 'Saved', error: 'Could not save' });
 */

export function toastSuccess(title: string, description?: string) {
  return toast.success(title, { description });
}

export function toastError(title: string, description?: string) {
  return toast.error(title, { description });
}

export function toastInfo(title: string, description?: string) {
  return toast(title, { description });
}

export function toastLoading(title: string, description?: string) {
  return toast.loading(title, { description });
}

/**
 * Wrap an async action: shows a loading toast, then resolves to success or error.
 * `error` may be a string or a function that maps the thrown error to a message.
 */
export function toastPromise<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((err: unknown) => string);
  },
): Promise<T> {
  toast.promise(promise, messages);
  return promise;
}

/** Extracts a human-readable message from a thrown error / API failure. */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}

export { toast };
