import * as jwt from 'jsonwebtoken';
import { envConfig } from '../../config/env.config';
import { buildJoinUrl, patientJoinWindow, signJoinLinkToken, verifyJoinLinkToken } from './join-link';

describe('join link tokens', () => {
  it('round-trips a booking and patient', () => {
    const t = signJoinLinkToken('booking-1', 'patient-1');
    expect(verifyJoinLinkToken(t)).toEqual({ bookingId: 'booking-1', patientId: 'patient-1' });
  });

  it('rejects garbage and tokens signed with the normal login secret', () => {
    expect(verifyJoinLinkToken('nope')).toBeNull();
    const login = jwt.sign({ typ: 'consult_join', bid: 'b', sub: 'p' }, envConfig.JWT_SECRET);
    expect(verifyJoinLinkToken(login)).toBeNull();
  });

  it('a join-link token is not valid as a login token', () => {
    const t = signJoinLinkToken('booking-1', 'patient-1');
    expect(() => jwt.verify(t, envConfig.JWT_SECRET)).toThrow();
  });

  it('rejects a token of the wrong type', () => {
    const wrong = jwt.sign({ typ: 'other', bid: 'b', sub: 'p' }, `${envConfig.JWT_SECRET}:consult-join-link`);
    expect(verifyJoinLinkToken(wrong)).toBeNull();
  });

  it('builds a url on the patient site', () => {
    const url = buildJoinUrl('b', 'p');
    expect(url.startsWith(`${envConfig.PATIENT_WEB_URL.replace(/\/+$/, '')}/join/`)).toBe(true);
  });
});

describe('patientJoinWindow', () => {
  const start = new Date('2026-10-14T18:00:00Z');
  const end = new Date('2026-10-14T18:30:00Z');
  it('opens 15 minutes before the start and closes at the end', () => {
    const w = patientJoinWindow(start, end);
    expect(w.opensAt.toISOString()).toBe('2026-10-14T17:45:00.000Z');
    expect(w.closesAt.toISOString()).toBe('2026-10-14T18:30:00.000Z');
  });
  it('adds paid extensions; grace only when the consultation is in progress', () => {
    expect(patientJoinWindow(start, end, 15).closesAt.toISOString()).toBe('2026-10-14T18:45:00.000Z');
    expect(patientJoinWindow(start, end, 0, 10, false).closesAt.toISOString()).toBe('2026-10-14T18:30:00.000Z');
    expect(patientJoinWindow(start, end, 15, 10, true).closesAt.toISOString()).toBe('2026-10-14T18:55:00.000Z');
  });
});
