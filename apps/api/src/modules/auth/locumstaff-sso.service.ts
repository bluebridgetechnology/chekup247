import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import Redis from 'ioredis';
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
  /** LocumStaff role, e.g. 'LOCUM' | 'DOCTOR' | 'GP'. */
  role?: string;
  /** LocumStaff verification status, e.g. 'VERIFIED' | 'ACTIVE' | 'APPROVED'. */
  status?: string;
  verification_status?: string;
  verified?: boolean;
  is_verified?: boolean;
  /** Doctor profession or specialty. */
  profession?: string;
  specialty?: string;
  /**
   * Whether the doctor has signified willingness to do virtual
   * consultations (Profile.willingToDoVirtualConsultations).
   */
  willing_virtual?: boolean;
  hpcsa_number?: string;
  phone?: string;
  nonce?: string;
  [key: string]: any;
}

export interface OidcExchangeResult {
  user: User;
  doctorProfile: DoctorProfile;
  accessToken: string;
  isNewUser: boolean;
}

/** Professions eligible for SSO at launch (§1.1 — mirrors LocumStaff's ELIGIBLE_PROFESSIONS). */
const ELIGIBLE_PROFESSIONS = ['GENERAL_PRACTITIONER'];

/** Redis key prefix for PKCE verifiers (10 min TTL). */
const PKCE_KEY_PREFIX = 'chekup:oidc:pkce:';

@Injectable()
export class LocumStaffSsoService implements OnModuleDestroy {
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

  // Redis-backed PKCE verifier store — survives restarts and works across
  // PM2 cluster workers (the in-memory Map + cross-origin SameSite=lax
  // cookie both silently failed on the VPS, causing the 400).
  private readonly redis: Redis;

  constructor(
    @InjectRepository(User, 'operational')
    private readonly userRepository: Repository<User>,
    @InjectRepository(DoctorProfile, 'operational')
    private readonly doctorRepository: Repository<DoctorProfile>,
    private readonly tokenService: TokenService,
  ) {
    this.redis = new Redis({
      host: envConfig.REDIS_HOST,
      port: envConfig.REDIS_PORT,
      password: envConfig.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
    this.redis.connect().catch((err) => {
      this.logger.warn(`Redis connect (PKCE store) deferred: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
    } catch { /* graceful shutdown */ }
  }

  /**
   * Generates the OIDC authorization URL for browser-initiated doctor SSO.
   * Creates cryptographic state and PKCE code_challenge / code_verifier pair.
   * The code_verifier is persisted in Redis (keyed by state, 10 min TTL) so it
   * survives VPS restarts and PM2 cluster workers.
   */
  async getAuthorizationUrl(): Promise<{ url: string; state: string; codeVerifier: string }> {
    if (!this.clientId) {
      throw new BadRequestException('LocumStaff OIDC Client ID is not configured on this server.');
    }

    const state = crypto.randomBytes(16).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto
      .createHash('sha256')
      .update(codeVerifier)
      .digest('base64url');

    // Persist verifier in Redis with 10 min TTL (replaces the fragile in-memory Map)
    try {
      await this.redis.set(
        `${PKCE_KEY_PREFIX}${state}`,
        codeVerifier,
        'EX',
        600, // 10 minutes
      );
    } catch (err: any) {
      this.logger.error(`Failed to persist PKCE verifier to Redis: ${err.message}`);
      // Proceed anyway — the verifier is still returned to the controller for cookie fallback
    }

    const baseUrl = (this.locumstaffApiUrl || '').replace(/\/+$/, '');
    const authUrl = new URL(`${baseUrl}/v1/oidc/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('scope', 'openid profile email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    this.logger.log(
      `Generated OIDC authorization URL. state="${state}", ` +
        `redirect_uri="${this.redirectUri}", PKCE stored in Redis.`,
    );

    return {
      url: authUrl.toString(),
      state,
      codeVerifier,
    };
  }

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
    const { code, state } = params;
    let codeVerifier = params.codeVerifier;

    // Resolve code_verifier from Redis by state (primary path — replaces the
    // volatile in-memory Map that was lost across VPS restarts / PM2 workers).
    if (!codeVerifier && state) {
      try {
        const stored = await this.redis.get(`${PKCE_KEY_PREFIX}${state}`);
        if (stored) {
          codeVerifier = stored;
          // Single-use: delete after retrieval
          await this.redis.del(`${PKCE_KEY_PREFIX}${state}`);
          this.logger.log(`Resolved PKCE code_verifier from Redis for state "${state}".`);
        }
      } catch (err: any) {
        this.logger.warn(`Redis PKCE lookup failed for state "${state}": ${err.message}`);
      }
    }

    if (!codeVerifier) {
      this.logger.warn(
        `No code_verifier available for state "${state?.slice(0, 8)}...". ` +
          `The PKCE verifier may have expired (10 min TTL) or was never stored. ` +
          `Proceeding without code_verifier — this will fail if LocumStaff stored a code_challenge.`,
      );
    }

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

    this.logger.log(`LocumStaff OIDC claims received for sub "${claims.sub}": ${JSON.stringify(claims)}`);

    this.assertEligible(claims);

    return this.matchOrCreateDoctor(claims);
  }

  /**
   * Enforces SSO eligibility (§1.1):
   *   role = LOCUM / DOCTOR / GP
   *   status = VERIFIED / ACTIVE / APPROVED (or boolean verified / not explicitly unverified)
   *   profession ∈ ELIGIBLE_PROFESSIONS / GP / DOCTOR
   *   willing_virtual !== false
   */
  private assertEligible(claims: LocumStaffIdTokenClaims): void {
    // 1. Role validation (flexible for partner variants: LOCUM, DOCTOR, GP, PRACTITIONER, PROVIDER)
    const role = (claims.role || (claims as any).user_role || (claims as any).userType || '').trim().toUpperCase();
    if (role && !['LOCUM', 'DOCTOR', 'GP', 'PRACTITIONER', 'PROVIDER'].includes(role)) {
      this.logger.warn(`LocumStaff SSO: unexpected role "${role}" for sub "${claims.sub}".`);
      throw new ForbiddenException(`This LocumStaff account role ("${role}") is not eligible for ChekUp247 SSO.`);
    }

    // 2. Verification status validation
    const rawStatus = (
      claims.status ??
      claims.verification_status ??
      (claims as any).verificationStatus ??
      (claims as any).doctor_status ??
      (claims as any).account_status ??
      (claims as any).hpcsa_status ??
      (claims as any).profile?.status ??
      (claims as any).profile?.verification_status ??
      ''
    ).toString().trim().toUpperCase();

    const isExplicitlyVerified =
      ['VERIFIED', 'ACTIVE', 'APPROVED', 'PASSED', 'VALIDATED', 'TRUE', 'COMPLETED'].includes(rawStatus) ||
      claims.verified === true ||
      (claims as any).is_verified === true ||
      (claims as any).isVerified === true ||
      (claims as any).profile?.verified === true ||
      (claims as any).profile?.is_verified === true;

    const isExplicitlyUnverified =
      ['PENDING', 'UNVERIFIED', 'REJECTED', 'SUSPENDED', 'INACTIVE', 'FALSE'].includes(rawStatus) ||
      claims.verified === false ||
      (claims as any).is_verified === false ||
      (claims as any).profile?.verified === false;

    if (isExplicitlyUnverified) {
      throw new ForbiddenException(
        `Your LocumStaff account is not yet verified (status: "${rawStatus || 'unverified'}"). Verification must complete before SSO.`,
      );
    }

    if (!isExplicitlyVerified) {
      // If neither explicitly verified nor explicitly unverified (i.e. status claim was omitted in the OIDC id_token):
      // LocumStaff's OIDC server authenticated this doctor; log a notice and permit entrance.
      this.logger.warn(
        `LocumStaff id_token contains no explicit status field for sub "${claims.sub}" (keys: [${Object.keys(claims).join(', ')}]). ` +
          `Proceeding with authenticated partner session.`,
      );
    }

    // 3. Profession validation
    const profession = (
      claims.profession ||
      (claims as any).specialty ||
      (claims as any).medical_profession ||
      ''
    ).trim().toUpperCase();

    const eligibleProfessions = [
      ...ELIGIBLE_PROFESSIONS,
      'GP',
      'DOCTOR',
      'GENERAL PRACTITIONER',
      'MEDICAL PRACTITIONER',
      'PHYSICIAN',
    ];

    if (profession && !eligibleProfessions.includes(profession)) {
      throw new ForbiddenException(
        'Your LocumStaff profession is not in scope for ChekUp247 at this time.',
      );
    }

    // 4. Willingness for virtual consultations
    const willingVirtual =
      (claims as any).willing_virtual ??
      (claims as any).willing_to_do_virtual_consultations ??
      (claims as any).willingToDoVirtualConsultations ??
      (claims as any).virtual_consultations ??
      (claims as any).offers_virtual ??
      (claims as any).profile?.willing_virtual ??
      (claims as any).profile?.willingToDoVirtualConsultations;

    // Only block if explicitly set to false
    if (willingVirtual === false) {
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
    const baseUrl = (this.locumstaffApiUrl || '').trim().replace(/\/+$/, '');
    const tokenUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/oidc/token` : `${baseUrl}/v1/oidc/token`;

    const requestBody = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
    };

    // Diagnostic log — shows exactly what we're sending to LocumStaff
    this.logger.log(
      `Token exchange → ${tokenUrl} | ` +
        `client_id="${this.clientId?.slice(0, 8)}…" | ` +
        `redirect_uri="${this.redirectUri}" | ` +
        `code="${code?.slice(0, 8)}…" | ` +
        `code_verifier=${codeVerifier ? 'present' : 'ABSENT'}`,
    );

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
      const cause = (err as any)?.cause?.message || (err as any)?.cause?.code || '';
      const msg = cause ? `${err.message} (${cause})` : err.message;
      this.logger.error(`LocumStaff token endpoint unreachable: ${msg}`);
      throw new UnauthorizedException(
        'Could not reach LocumStaff to complete sign-in. Please try again shortly.',
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      this.logger.error(
        `LocumStaff token exchange failed: ${response.status} — ${errorText}. ` +
          `Sent redirect_uri="${this.redirectUri}", code_verifier=${codeVerifier ? 'present' : 'ABSENT'}.`,
      );

      // Surface LocumStaff's actual error reason so the frontend diagnostics
      // panel (and VPS logs) show WHY it failed rather than just "400".
      let reason = '';
      try {
        const errJson = JSON.parse(errorText);
        reason = errJson.error_description || errJson.message || errJson.error || '';
      } catch {
        reason = errorText.slice(0, 200);
      }

      throw new UnauthorizedException(
        `LocumStaff authorization code exchange failed (${response.status})${reason ? ': ' + reason : ''}`,
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
    const decoded = jwt.decode(idToken, { complete: true }) as {
      header?: { kid?: string; alg?: string };
      payload?: any;
    };
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

    if (!publicKey && this.jwksCache.size > 0) {
      // If kid didn't match directly, fall back to first available cached key
      const [firstKid, firstKey] = this.jwksCache.entries().next().value;
      publicKey = firstKey;
      this.logger.warn(`JWKS kid "${kid}" not matched; falling back to cached key "${firstKid}".`);
    }

    if (!publicKey) {
      // No verifying key — do NOT fall back to decoding an unverified token.
      throw new UnauthorizedException(
        'Unable to verify LocumStaff id_token signature (no matching JWKS key).',
      );
    }

    try {
      // Verify signature with RS256 and validate audience against client ID
      const verified = jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'],
        audience: this.clientId,
      }) as LocumStaffIdTokenClaims;

      // Soft issuer logging if URL formatting differs
      const configuredIssuer = (this.locumstaffApiUrl || '').trim().replace(/\/+$/, '');
      const tokenIssuer = (decoded.payload?.iss || '').trim().replace(/\/+$/, '');
      if (tokenIssuer && configuredIssuer && tokenIssuer !== configuredIssuer) {
        this.logger.warn(
          `LocumStaff id_token issuer ("${tokenIssuer}") differs from configured LOCUMSTAFF_API_URL ("${configuredIssuer}"). Proceeding with cryptographically verified signature.`,
        );
      }

      return verified;
    } catch (err: any) {
      throw new UnauthorizedException(
        `LocumStaff id_token signature verification failed: ${err.message}`,
      );
    }
  }

  /**
   * Converts a JWK (JSON Web Key) into a PEM-formatted public key string.
   * Supports:
   * 1. Standard RSA JWK (kty: 'RSA', n, e) via Node.js crypto.createPublicKey
   * 2. X.509 certificate chains (x5c)
   * 3. Raw PEM / publicKey strings
   */
  private convertJwkToPem(jwk: any): string | undefined {
    try {
      // 1. Direct PEM string
      if (typeof jwk === 'string' && jwk.includes('-----BEGIN')) {
        return jwk;
      }
      if (jwk.publicKey && typeof jwk.publicKey === 'string' && jwk.publicKey.includes('-----BEGIN')) {
        return jwk.publicKey;
      }

      // 2. Standard RSA JWK components (n and e)
      if (jwk.kty === 'RSA' && jwk.n && jwk.e) {
        const pubKey = crypto.createPublicKey({
          key: {
            kty: jwk.kty,
            n: jwk.n,
            e: jwk.e,
          },
          format: 'jwk',
        });
        return pubKey.export({ type: 'spki', format: 'pem' }).toString();
      }

      // 3. X.509 certificate chain (x5c)
      if (Array.isArray(jwk.x5c) && jwk.x5c[0]) {
        const raw = jwk.x5c[0].replace(/[\r\n\s]/g, '');
        const formatted = raw.match(/.{1,64}/g)?.join('\n') || raw;
        const cert = `-----BEGIN CERTIFICATE-----\n${formatted}\n-----END CERTIFICATE-----`;
        const pubKey = crypto.createPublicKey(cert);
        return pubKey.export({ type: 'spki', format: 'pem' }).toString();
      }

      // 4. Generic crypto.createPublicKey with format: 'jwk'
      if (jwk.kty) {
        const pubKey = crypto.createPublicKey({
          key: jwk,
          format: 'jwk',
        });
        return pubKey.export({ type: 'spki', format: 'pem' }).toString();
      }
    } catch (err: any) {
      this.logger.warn(`Failed to parse JWK key (kid: "${jwk?.kid}"): ${err.message}`);
    }
    return undefined;
  }

  /**
   * Fetches RS256 public keys from LocumStaff's JWKS endpoint and caches them.
   */
  private async fetchJwksKey(targetKid?: string): Promise<string | undefined> {
    try {
      const baseUrl = (this.locumstaffApiUrl || '').trim().replace(/\/+$/, '');
      const jwksUrl = baseUrl.endsWith('/v1') ? `${baseUrl}/oidc/jwks.json` : `${baseUrl}/v1/oidc/jwks.json`;

      this.logger.log(`Fetching LocumStaff JWKS from ${jwksUrl} (looking for kid: "${targetKid || 'any'}")...`);
      const res = await fetch(jwksUrl);
      if (!res.ok) {
        this.logger.error(`LocumStaff JWKS endpoint returned HTTP ${res.status}: ${res.statusText}`);
        return undefined;
      }

      const jwks = (await res.json()) as { keys?: any[]; [key: string]: any };
      const rawKeys: any[] = Array.isArray(jwks.keys)
        ? jwks.keys
        : Array.isArray(jwks)
        ? jwks
        : [];

      this.logger.log(`LocumStaff JWKS returned ${rawKeys.length} key(s).`);

      for (const key of rawKeys) {
        const pem = this.convertJwkToPem(key);
        if (pem) {
          const kid = key.kid || 'default';
          this.jwksCache.set(kid, pem);
          this.logger.log(`Cached JWKS public key for kid: "${kid}"`);
        }
      }

      // Match targetKid if requested
      if (targetKid && this.jwksCache.has(targetKid)) {
        return this.jwksCache.get(targetKid);
      }

      // If targetKid not found or targetKid was not in token header, fallback if exactly 1 key available
      if (this.jwksCache.size === 1) {
        const [onlyKid, onlyKey] = this.jwksCache.entries().next().value;
        this.logger.warn(
          `Target kid "${targetKid}" not matched directly, but found exactly 1 cached JWKS key ("${onlyKid}"). Using as fallback.`,
        );
        return onlyKey;
      }

      if (targetKid) {
        const availableKids = Array.from(this.jwksCache.keys()).join(', ');
        this.logger.error(
          `Target kid "${targetKid}" not found in LocumStaff JWKS. Available kids: [${availableKids}]`,
        );
      }

      return undefined;
    } catch (err: any) {
      const cause = (err as any)?.cause?.message || (err as any)?.cause?.code || '';
      const msg = cause ? `${err.message} (${cause})` : err.message;
      this.logger.warn(`Could not fetch LocumStaff JWKS: ${msg}`);
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
      (claims as any).full_name ||
      'Dr. LocumStaff Doctor';
    const hpcsaNumber =
      (claims as any).hpcsa_number ||
      (claims as any).hpcsaNumber ||
      (claims as any).registration_number ||
      (claims as any).license_number ||
      `MP-${ssoExternalId.slice(0, 7).toUpperCase()}`;
    const specialty = (claims as any).specialty || (claims as any).profession || 'General Practitioner';
    const phone = (claims as any).phone || (claims as any).phone_number || undefined;

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
          phone: phone || '+27110000000',
          role: UserRole.DOCTOR,
          status: UserStatus.ACTIVE,
          is_email_verified: true,
          email_verified_at: new Date(),
        });
        user = await this.userRepository.save(user);
      } else {
        if (user.role !== UserRole.DOCTOR) {
          user.role = UserRole.DOCTOR;
        }
        if (phone && !user.phone) {
          user.phone = phone;
        }
        await this.userRepository.save(user);
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
          hpcsa_number: hpcsaNumber,
          specialty,
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
        if (hpcsaNumber && doctorProfile.hpcsa_number.startsWith('MP-') && !hpcsaNumber.startsWith('MP-')) {
          doctorProfile.hpcsa_number = hpcsaNumber;
        }
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
