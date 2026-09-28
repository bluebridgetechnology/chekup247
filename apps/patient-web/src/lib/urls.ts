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

/**
 * @deprecated Doctor onboarding is facilitated exclusively through partner LocumStaff.
 * Public direct registration is disabled. Use getDoctorLoginUrl() instead.
 */
export function getDoctorRegisterUrl(): string {
  return `${getDoctorPortalUrl()}/login`;
}

export function getDoctorLoginUrl(): string {
  return `${getDoctorPortalUrl()}/login`;
}
