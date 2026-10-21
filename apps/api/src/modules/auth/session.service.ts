import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User, UserRole } from '../../database/operational/entities';
import { envConfig } from '../../config/env.config';
import { TokenService } from './token.service';

/** Machine-readable marker the apps look for to explain why a session ended. */
export const SESSION_REPLACED_CODE = 'SESSION_REPLACED';

/**
 * Doctors keep a single long-lived session: it lasts until they log out or sign in on another
 * device (which replaces it). The active session id lives on the user row; every doctor token
 * carries it as `sid` and is rejected once it no longer matches.
 */
@Injectable()
export class SessionService implements OnModuleInit {
  private readonly logger = new Logger(SessionService.name);
  /** Short cache so the guard does not hit the DB on every request; dropped on local login/logout. */
  private readonly cache = new Map<string, { sid: string | null; at: number }>();
  private readonly CACHE_TTL_MS = 10_000;

  constructor(
    @InjectRepository(User, 'operational')
    private readonly userRepository: Repository<User>,
    private readonly tokenService: TokenService,
  ) {}

  async onModuleInit() {
    // Safety net mirroring migration 1700000022000, so a deploy never selects columns that aren't there
    try {
      await this.userRepository.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_id uuid;');
      await this.userRepository.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS active_session_started_at timestamptz;');
    } catch (err: any) {
      this.logger.warn(`users.active_session_* column check failed: ${err.message}`);
    }
  }

  /** Cookie lifetime that matches the doctor token lifetime. */
  static get doctorCookieMaxAgeMs(): number {
    return SessionService.parseDurationMs(envConfig.DOCTOR_SESSION_EXPIRES_IN);
  }

  private static parseDurationMs(value: string): number {
    const m = /^(\d+)\s*([smhd])$/.exec(value.trim());
    if (!m) return 365 * 24 * 60 * 60 * 1000;
    const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2] as 's' | 'm' | 'h' | 'd'];
    return Number(m[1]) * unit;
  }

  /**
   * Mints the access token for a freshly authenticated user. Doctors get a long-lived token bound
   * to a new session id, which invalidates whatever device was signed in before.
   */
  async issueAccessToken(user: User): Promise<string> {
    const payload = { sub: user.id, email: user.email, role: user.role, fullName: user.full_name };
    if (user.role !== UserRole.DOCTOR) {
      return this.tokenService.generateAccessToken(payload);
    }

    const sid = crypto.randomUUID();
    await this.userRepository.update(user.id, { active_session_id: sid, active_session_started_at: new Date() });
    this.cache.set(user.id, { sid, at: Date.now() });
    return this.tokenService.generateAccessToken(
      { ...payload, sid },
      { expiresIn: envConfig.DOCTOR_SESSION_EXPIRES_IN },
    );
  }

  /** Throws if this session was ended by logout or replaced by a login on another device. */
  async assertActive(userId: string, sid: string): Promise<void> {
    const cached = this.cache.get(userId);
    let active: string | null;
    if (cached && Date.now() - cached.at < this.CACHE_TTL_MS) {
      active = cached.sid;
    } else {
      const row = await this.userRepository.findOne({ where: { id: userId }, select: ['id', 'active_session_id'] });
      active = row?.active_session_id ?? null;
      this.cache.set(userId, { sid: active, at: Date.now() });
    }

    if (active !== sid) {
      throw new UnauthorizedException({
        statusCode: 401,
        code: SESSION_REPLACED_CODE,
        message: 'You were signed out because your account was used on another device or your password was changed.',
      });
    }
  }

  /** Logout by token: ignores tokens that are invalid, expired or not bound to a session. */
  async endSessionForToken(token: string): Promise<void> {
    try {
      const payload = this.tokenService.verifyAccessToken(token);
      if (payload.sid) await this.endSession(payload.sub, payload.sid);
    } catch {
      /* already signed out */
    }
  }

  /** Logout: ends the session if `sid` is still the active one. */
  async endSession(userId: string, sid?: string): Promise<void> {
    try {
      const qb = this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({ active_session_id: null, active_session_started_at: null })
        .where('id = :userId', { userId });
      if (sid) qb.andWhere('active_session_id = :sid', { sid });
      await qb.execute();
      this.cache.delete(userId);
    } catch (err: any) {
      this.logger.warn(`Could not end session for ${userId}: ${err.message}`);
    }
  }
}
