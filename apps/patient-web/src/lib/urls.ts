'use client';

import { useEffect, useState } from 'react';

/**
 * Centralized platform URL resolution for Chekup247.
 * Resolves doctor portal, registration, and login URLs consistently
 * across production domains and local development.
 */

export function getDoctorPortalUrl(): string {
  if (process.env.NEXT_PUBLIC_DOCTOR_PORTAL_URL) {
    return process.env.NEXT_PUBLIC_DOCTOR_PORTAL_URL;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host.includes('chekup247.com')) {
      return 'https://doctor.chekup247.com';
    }
  }
  return 'http://localhost:3001';
}

export function getDoctorRegisterUrl(): string {
  return `${getDoctorPortalUrl()}/register`;
}

export function getDoctorLoginUrl(): string {
  return `${getDoctorPortalUrl()}/login`;
}

/**
 * Doctor portal URLs for client components. The first render uses the env/default value so server and
 * client markup match; it then re-resolves on the browser's hostname (production domain vs local dev).
 */
export function useDoctorAuthUrls(): { register: string; login: string } {
  const [urls, setUrls] = useState({ register: getDoctorRegisterUrl(), login: getDoctorLoginUrl() });
  useEffect(() => {
    setUrls({ register: getDoctorRegisterUrl(), login: getDoctorLoginUrl() });
  }, []);
  return urls;
}
