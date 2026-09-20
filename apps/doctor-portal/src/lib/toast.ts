'use client';

import { toast } from 'sonner';

/**
 * ChekUp247 Doctor Portal toast helpers — a thin, semantic wrapper over Sonner
 * so every call site is a one-liner and styling/behaviour stays centralized.
 *
 *   import { toastSuccess, toastError, toastPromise } from '@/lib/toast';
 *   toastSuccess('Prescription issued', 'The patient has been notified.');
 *   toastError('Could not save notes', err.message);
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

export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err) return err;
  return fallback;
}

export { toast };
