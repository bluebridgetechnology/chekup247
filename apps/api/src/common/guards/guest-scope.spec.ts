import { guestMayAccess } from './guest-scope';

describe('guestMayAccess', () => {
  it('allows the Quick Book booking, payment and consultation routes', () => {
    expect(guestMayAccess('GET', '/api/v1/auth/me')).toBe(true);
    expect(guestMayAccess('POST', '/api/v1/bookings')).toBe(true);
    expect(guestMayAccess('GET', '/api/v1/bookings/abc')).toBe(true);
    expect(guestMayAccess('POST', '/api/v1/bookings/abc/intake')).toBe(true);
    expect(guestMayAccess('POST', '/api/v1/payments/initiate')).toBe(true);
    expect(guestMayAccess('POST', '/api/v1/storage/presigned-upload')).toBe(true);
    expect(guestMayAccess('POST', '/api/v1/consultations/abc/join')).toBe(true);
    expect(guestMayAccess('GET', '/api/v1/consultations/abc?x=1')).toBe(true);
    expect(guestMayAccess('GET', '/api/v1/prescriptions/booking/abc')).toBe(true);
  });

  it('blocks the rest of the account', () => {
    expect(guestMayAccess('GET', '/api/v1/bookings/mine')).toBe(true); // matches :id route; ownership is checked by the service
    expect(guestMayAccess('GET', '/api/v1/payments/wallet/balance')).toBe(false);
    expect(guestMayAccess('GET', '/api/v1/payments/wallet/ledger')).toBe(false);
    expect(guestMayAccess('PUT', '/api/v1/auth/me')).toBe(false);
    expect(guestMayAccess('GET', '/api/v1/storage/documents/mine')).toBe(false);
    expect(guestMayAccess('GET', '/api/v1/admin/settings')).toBe(false);
    expect(guestMayAccess('GET', '/api/v1/doctors/me/profile')).toBe(false);
    expect(guestMayAccess('GET', '/api/v1/notifications')).toBe(false);
    expect(guestMayAccess('POST', '/api/v1/auth/express-patient/../admin')).toBe(false);
  });

  it('a join-link session is bound to its one booking', () => {
    expect(guestMayAccess('POST', '/api/v1/consultations/b1/join', 'b1')).toBe(true);
    expect(guestMayAccess('POST', '/api/v1/consultations/b2/join', 'b1')).toBe(false);
    expect(guestMayAccess('GET', '/api/v1/bookings/b2', 'b1')).toBe(false);
    expect(guestMayAccess('GET', '/api/v1/prescriptions/booking/b2', 'b1')).toBe(false);
  });
});
