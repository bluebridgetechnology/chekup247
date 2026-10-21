import { UnauthorizedException } from '@nestjs/common';
import { SessionService, SESSION_REPLACED_CODE } from './session.service';
import { TokenService } from './token.service';
import { UserRole } from '../../database/operational/entities';

describe('SessionService (doctor single-device sessions)', () => {
  let rows: Record<string, { active_session_id: string | null }>;
  let service: SessionService;
  const tokens = new TokenService();

  const makeService = () => {
    const repo: any = {
      update: jest.fn(async (id: string, patch: any) => {
        rows[id] = { active_session_id: patch.active_session_id };
      }),
      findOne: jest.fn(async ({ where }: any) => rows[where.id] ?? null),
      query: jest.fn(),
      createQueryBuilder: () => {
        const state: any = {};
        const qb: any = {
          update: () => qb,
          set: () => qb,
          where: (_q: string, p: any) => ((state.userId = p.userId), qb),
          andWhere: (_q: string, p: any) => ((state.sid = p.sid), qb),
          execute: async () => {
            const row = rows[state.userId];
            if (row && (!state.sid || row.active_session_id === state.sid)) row.active_session_id = null;
          },
        };
        return qb;
      },
    };
    return new SessionService(repo, tokens);
  };

  const doctor: any = { id: 'd1', email: 'd@x.com', role: UserRole.DOCTOR, full_name: 'Dr D' };
  const patient: any = { id: 'p1', email: 'p@x.com', role: UserRole.PATIENT, full_name: 'P' };

  beforeEach(() => {
    rows = { d1: { active_session_id: null }, p1: { active_session_id: null } };
    service = makeService();
  });

  it('gives doctors a long-lived token bound to a session id', async () => {
    const payload = tokens.verifyAccessToken(await service.issueAccessToken(doctor));
    expect(payload.sid).toBeTruthy();
    const days = ((payload.exp as number) - (payload.iat as number)) / 86400;
    expect(days).toBeGreaterThan(300);
    await expect(service.assertActive('d1', payload.sid as string)).resolves.toBeUndefined();
  });

  it('does not bind patient tokens to a session', async () => {
    const payload = tokens.verifyAccessToken(await service.issueAccessToken(patient));
    expect(payload.sid).toBeUndefined();
  });

  it('signs the first device out when the doctor logs in on a new device', async () => {
    const first = tokens.verifyAccessToken(await service.issueAccessToken(doctor));
    const secondService = makeService(); // another API instance with a cold cache
    const second = tokens.verifyAccessToken(await secondService.issueAccessToken(doctor));

    await expect(secondService.assertActive('d1', second.sid as string)).resolves.toBeUndefined();
    const fresh = makeService();
    await expect(fresh.assertActive('d1', first.sid as string)).rejects.toMatchObject({
      response: expect.objectContaining({ code: SESSION_REPLACED_CODE }),
    });
  });

  it('ends the session on logout', async () => {
    const token = await service.issueAccessToken(doctor);
    await service.endSessionForToken(token);
    const sid = tokens.verifyAccessToken(token).sid as string;
    await expect(makeService().assertActive('d1', sid)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('an old device logging out does not end the newer session', async () => {
    const old = await service.issueAccessToken(doctor);
    const newer = tokens.verifyAccessToken(await service.issueAccessToken(doctor));
    await service.endSessionForToken(old);
    await expect(makeService().assertActive('d1', newer.sid as string)).resolves.toBeUndefined();
  });
});
