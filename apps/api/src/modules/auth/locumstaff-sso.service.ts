import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import {
  User,
  UserRole,
  UserStatus,
  DoctorProfile,
  VerificationStatus,
  VerificationSource,
} from '../../database/operational/entities';
import { TokenService } from './token.service';
import { envConfig } from '../../config/env.config';

/**
 * Claims returned inside the LocumStaff id_token after a successful
 * authorization-code + PKCE exchange (see DocGenie SSO & Directory Handover §2).
 */
export interface LocumStaffIdTokenClaims {
  sub: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  email: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  /** LocumStaff role, e.g. 'LOCUM'. Only LOCUM is eligible (§1.1). */
  role?: string;
  /** LocumStaff verification status, e.g. 'VERIFIED' | 'PENDING'. */
  status?: string;
  /** Only 'GENERAL_PRACTITIONER' is in scope at launch (§1.1). */
  profession?: string;
  /**
   * Whether the doctor has signified willingness to do virtual
   * consultations (Profile.willingToDoVirtualConsultations). §1.1 requires
   * this to gate SSO into ChekUp247 — a VERIFIED GP who has NOT opted in
   * must not be able to complete SSO.
   */
  willing_virtual?: boolean;
  nonce?: string;
}

export interface OidcExchangeResult {
  user: User;
  doctorProfile: DoctorProfile;
  accessToken: string;
  isNewUser: boolean;
}

/** Professions eligible for SSO at launch (§1.1 — mirrors LocumStaff's ELIGIBLE_PROFESSIONS). */
const ELIGIBLE_PROFESSIONS = ['GENERAL_PRACTITIONER'];

@Injectable()
export class LocumStaffSsoService {
  private readonly logger = new Logger(LocumStaffSsoService.name);

  // LocumStaff OIDC configuration. These must be the values LocumStaff
  // registers for ChekUp247 under Admin → System → Integrations (§4).
  private readonly locumstaffApiUrl = envConfig.LOCUMSTAFF_API_URL;
  private readonly clientId = envConfig.LOCUMSTAFF_OIDC_CLIENT_ID;
  private readonly clientSecret = envConfig.LOCUMSTAFF_OIDC_CLIENT_SECRET;
  private readonly redirectUri =
    envConfig.LOCUMSTAFF_OIDC_REDIRECT_URI ||
    `${envConfig.DOCTOR_PORTAL_URL}/callback`;

  // Cached JWKS public keys, keyed by kid.
  private jwksCache: Map<string, string> = new Map();

  constructor(
    @InjectRepository(User, 'operational')
    private readonly userRepository: Repository<User>,
    @InjectRepository(DoctorProfile, 'operational')
    private readonly doctorRepository: Repository<DoctorProfile>,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Performs the complete OIDC exchange (§2):
   * 1. Exchange authorization code (+ code_verifier) for an id_token
   * 2. Verify id_token signature (RS256 / JWKS) and claims
   * 3. Enforce eligibility (LOCUM + VERIFIED + eligible profession + willing_virtual)
   * 4. Match or create user + doctor_profile
   * 5. Issue a ChekUp access token
   *
   * There is deliberately NO mock/sandbox short-circuit and NO
   * "endpoint unreachable → fabricated claims" fallback: a real handshake
   * must fail CLOSED. If LocumStaff is unreachable or the token/signature
   * is invalid, this throws rather than minting a session.
   */
  async handleCallback(params: {
    code: string;
    codeVerifier?: string;
    state?: string;
  }): Promise<OidcExchangeResult> {
    const { code, codeVerifier } = params;

    if (!code) {
      throw new BadRequestException('Missing authorization code');
    }
    if (!this.clientId || !this.clientSecret) {
      this.logger.error(
        'LocumStaff OIDC is not configured (missing client id/secret). ' +
          'Set LOCUMSTAFF_OIDC_CLIENT_ID / LOCUMSTAFF_OIDC_CLIENT_SECRET (§4).',
      );
      throw new UnauthorizedException('LocumStaff SSO is not configured on this server.');
    }

    const claims = await this.exchangeCodeForToken(code, codeVerifier);

    this.assertEligible(claims);

    return this.matchOrCreateDoctor(claims);
  }

  /**
   * Enforces SSO eligibility (§1.1):
   *   role = LOCUM, status = VERIFIED, profession ∈ ELIGIBLE_PROFESSIONS,
   *   AND willing_virtual = true.
   * Called after token exchange AND is safe to re-call before session issue.
   */
  private assertEligible(claims: LocumStaffIdTokenClaims): void {
    const role = (claims.role || '').toUpperCase();
    const status = (claims.status || '').toUpperCase();
    const profession = (claims.profession || '').toUpperCase();

    if (role && role !== 'LOCUM') {
      throw new ForbiddenException('This LocumStaff account is not eligible for ChekUp247 SSO.');
    }
    // status is authoritative; a missing status is NOT treated as verified
    // (fail closed — the mock used to default undefined → VERIFIED).
    if (status !== 'VERIFIED') {
      throw new ForbiddenException(
        'Your LocumStaff account is not yet verified. Verification must complete before SSO.',
      );
    }
    if (profession && !ELIGIBLE_PROFESSIONS.includes(profession)) {
      throw new ForbiddenException(
        'Your LocumStaff profession is not in scope for ChekUp247 at this time.',
      );
    }
    // §1.1 willingness gate — a VERIFIED GP who has not opted in to virtual
    // consultations must not complete SSO into ChekUp247.
    if (claims.willing_virtual !== true) {
      throw new ForbiddenException(
        'To sign in to ChekUp247 you must first enable virtual consultations in your LocumStaff profile.',
      );
    }
  }

  /**
   * Calls LocumStaff POST /v1/oidc/token (§2.4) and returns the verified claims.
   * Throws (fails closed) if the endpoint is unreachable or returns an error —
   * no fabricated fallback claims.
   */
  private async exchangeCodeForToken(
    code: string,
    codeVerifier?: string,
  ): Promise<LocumStaffIdTokenClaims> {
    const tokenUrl = `${this.locumstaffApiUrl}/v1/oidc/token`;

    const requestBody = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    };

    let response: Response;
    try {
      response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    } catch (err: any) {
      this.logger.error(`LocumStaff token endpoint unreachable: ${err.message}`);
      throw new UnauthorizedException(
        'Could not reach LocumStaff to complete sign-in. Please try again shortly.',
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      this.logger.error(`LocumStaff token exchange failed: ${response.status} - ${errorText}`);
      throw new UnauthorizedException(
        `LocumStaff authorization code exchange failed (${response.status})`,
      );
    }

    const data = (await response.json()) as { id_token?: string };
    if (!data.id_token) {
      throw new UnauthorizedException('LocumStaff token endpoint did not return an id_token');
    }

    return this.verifyIdToken(data.id_token);
  }

  /**
   * Verifies the RS256 signature and standard claims of the LocumStaff
   * id_token against LocumStaff's JWKS. Fails closed if no verifying key
   * can be resolved — an unverifiable token is rejected, never trusted.
   */
  private async verifyIdToken(idToken: string): Promise<LocumStaffIdTokenClaims> {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || !decoded.header) {
      throw new UnauthorizedException('Malformed LocumStaff id_token');
    }

    const kid = decoded.header.kid;
    let publicKey: string | undefined;

    if (kid && this.jwksCache.has(kid)) {
      publicKey = this.jwksCache.get(kid);
    } else {
      publicKey = await this.fetchJwksKey(kid);
    }

    if (!publicKey) {
      // No verifying key — do NOT fall back to decoding an unverified token.
      throw new UnauthorizedException(
        'Unable to verify LocumStaff id_token signature (no matching JWKS key).',
      );
    }

    try {
      return jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'],
        audience: this.clientId,
        issuer: this.locumstaffApiUrl,
      }) as LocumStaffIdTokenClaims;
    } catch (err: any) {
      throw new UnauthorizedException(
        `LocumStaff id_token signature verification failed: ${err.message}`,
      );
    }
  }

  /**
   * Fetches RS256 public keys from LocumStaff's JWKS endpoint and caches them.
   */
  private async fetchJwksKey(targetKid?: string): Promise<string | undefined> {
    try {
      const jwksUrl = `${this.locumstaffApiUrl}/v1/oidc/jwks.json`;
      const res = await fetch(jwksUrl);
      if (!res.ok) return undefined;

      const jwks = (await res.json()) as { keys: any[] };
      if (!jwks.keys || !Array.isArray(jwks.keys)) return undefined;

      for (const key of jwks.keys) {
        if (key.x5c && key.x5c[0] && key.kid) {
          const cert = `-----BEGIN CERTIFICATE-----\n${key.x5c[0]}\n-----END CERTIFICATE-----`;
          this.jwksCache.set(key.kid, cert);
        }
      }

      if (targetKid) return this.jwksCache.get(targetKid);
      return undefined;
    } catch (err: any) {
      this.logger.warn(`Could not fetch LocumStaff JWKS: ${err.message}`);
      return undefined;
    }
  }

  /**
   * Match-or-create logic for doctor accounts. Keys on sso_external_id (the
   * only identifier guaranteed to belong to THIS LocumStaff record) so a
   * shared HPCSA number can never hijack a platform-seeded profile.
   */
  async matchOrCreateDoctor(
    claims: LocumStaffIdTokenClaims,
  ): Promise<OidcExchangeResult> {
    const ssoExternalId = claims.sub;
    const email = (
      claims.email || `doctor.${ssoExternalId.slice(0, 8)}@locumstaff.co.za`
    ).toLowerCase();
    const fullName =
      claims.name ||
      [claims.given_name, claims.family_name].filter(Boolean).join(' ') ||
      'Dr. LocumStaff Doctor';

    // 1. Find by sso_external_id in doctor_profiles.
    let doctorProfile = await this.doctorRepository.findOne({
      where: { sso_external_id: ssoExternalId, sso_provider: 'locumstaff' },
      relations: ['user'],
    });

    let user: User | null = null;
    let isNewUser = false;

    if (doctorProfile) {
      user = doctorProfile.user;
    } else {
      // 2. Try finding user by email.
      user = await this.userRepository.findOne({ where: { email } });

      if (!user) {
        isNewUser = true;
        user = this.userRepository.create({
          email,
          full_name: fullName,
          role: UserRole.DOCTOR,
          status: UserStatus.ACTIVE,
          is_email_verified: true,
          email_verified_at: new Date(),
        });
        user = await this.userRepository.save(user);
      } else if (user.role !== UserRole.DOCTOR) {
        user.role = UserRole.DOCTOR;
        user = await this.userRepository.save(user);
      }

      // Does the user already have a profile not yet linked to SSO?
      doctorProfile = await this.doctorRepository.findOne({
        where: { user_id: user.id },
      });

      // At this point eligibility (incl. VERIFIED) is already asserted upstream.
      if (!doctorProfile) {
        doctorProfile = this.doctorRepository.create({
          user_id: user.id,
          sso_provider: 'locumstaff',
          sso_external_id: ssoExternalId,
          hpcsa_number: `MP-${ssoExternalId.slice(0, 7).toUpperCase()}`,
          specialty: 'General Practitioner',
          rate_per_hour: 850.0,
          bio: 'General Practitioner verified via LocumStaff Medical Staffing Network.',
          verification_status: VerificationStatus.VERIFIED,
          verification_source: VerificationSource.LOCUMSTAFF,
          offers_video: true,
        });
        doctorProfile = await this.doctorRepository.save(doctorProfile);
      } else {
        // Link the existing profile to this LocumStaff SSO identity.
        doctorProfile.sso_provider = 'locumstaff';
        doctorProfile.sso_external_id = ssoExternalId;
        if (doctorProfile.verification_status === VerificationStatus.PENDING) {
          doctorProfile.verification_status = VerificationStatus.VERIFIED;
          doctorProfile.verification_source = VerificationSource.LOCUMSTAFF;
        }
        doctorProfile = await this.doctorRepository.save(doctorProfile);
      }
    }

    doctorProfile.user = user;

    const accessToken = this.tokenService.generateAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    });

    return {
      user,
      doctorProfile,
      accessToken,
      isNewUser,
    };
  }
}
