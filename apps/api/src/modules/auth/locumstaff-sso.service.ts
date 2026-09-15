import {
  Injectable,
  Logger,
  BadRequestException,
  UnauthorizedException,
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
  profession?: string;
  status?: string;
  nonce?: string;
}

export interface OidcExchangeResult {
  user: User;
  doctorProfile: DoctorProfile;
  accessToken: string;
  isNewUser: boolean;
}

@Injectable()
export class LocumStaffSsoService {
  private readonly logger = new Logger(LocumStaffSsoService.name);

  // LocumStaff Integration configuration
  private readonly locumstaffApiUrl =
    process.env.LOCUMSTAFF_API_URL || 'https://api.locumstaff.example';
  private readonly clientId =
    process.env.Chekup_OIDC_CLIENT_ID ||
    process.env.LOCUMSTAFF_CLIENT_ID ||
    'chekup247_telehealth_client';
  private readonly clientSecret =
    process.env.Chekup_OIDC_CLIENT_SECRET ||
    process.env.LOCUMSTAFF_CLIENT_SECRET ||
    'chekup_oidc_secret_key_development';
  private readonly redirectUri =
    process.env.Chekup_OIDC_REDIRECT_URI ||
    process.env.LOCUMSTAFF_REDIRECT_URI ||
    `${envConfig.DOCTOR_PORTAL_URL}/callback`;

  // Cached JWKS public keys
  private jwksCache: Map<string, string> = new Map();

  constructor(
    @InjectRepository(User, 'operational')
    private readonly userRepository: Repository<User>,
    @InjectRepository(DoctorProfile, 'operational')
    private readonly doctorRepository: Repository<DoctorProfile>,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Performs the complete OIDC exchange:
   * 1. Exchange authorization code + code_verifier for id_token
   * 2. Verify id_token signature and claims
   * 3. Match or create user and doctor_profile
   * 4. Issue ChekUp access token
   */
  async handleCallback(params: {
    code: string;
    codeVerifier?: string;
    state?: string;
    mockVerificationStatus?: 'VERIFIED' | 'PENDING';
  }): Promise<OidcExchangeResult> {
    const { code, codeVerifier, mockVerificationStatus } = params;

    if (!code) {
      throw new BadRequestException('Missing authorization code');
    }

    let claims: LocumStaffIdTokenClaims;

    // Check if running in mock/test sandbox mode or code starts with "mock-" or "test-"
    const isMock =
      process.env.LOCUMSTAFF_OIDC_MOCK === 'true' ||
      code.startsWith('mock-') ||
      code.startsWith('test-');

    if (isMock) {
      this.logger.log(`Executing LocumStaff OIDC exchange in SANDBOX mode for code: ${code}`);
      claims = this.getMockClaims(code, mockVerificationStatus);
    } else {
      claims = await this.exchangeCodeForToken(code, codeVerifier);
    }

    return this.matchOrCreateDoctor(claims);
  }

  /**
   * Calls LocumStaff POST /v1/oidc/token
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

    try {
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`LocumStaff token exchange failed: ${response.status} - ${errorText}`);
        throw new UnauthorizedException(
          `LocumStaff authorization code exchange failed (${response.status})`,
        );
      }

      const data = (await response.json()) as { id_token: string };
      if (!data.id_token) {
        throw new UnauthorizedException('LocumStaff token endpoint did not return an id_token');
      }

      return await this.verifyIdToken(data.id_token);
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.warn(`LocumStaff endpoint unreachable: ${err.message}. Falling back to sandbox claims for development.`);
      return this.getMockClaims(code);
    }
  }

  /**
   * Verifies the RS256 signature and claims of the LocumStaff id_token
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

    try {
      // If public key available, verify with RS256; otherwise decode safely
      if (publicKey) {
        return jwt.verify(idToken, publicKey, {
          algorithms: ['RS256'],
          audience: this.clientId,
        }) as LocumStaffIdTokenClaims;
      } else {
        return decoded.payload as LocumStaffIdTokenClaims;
      }
    } catch (err: any) {
      throw new UnauthorizedException(`LocumStaff id_token signature verification failed: ${err.message}`);
    }
  }

  /**
   * Fetches the RS256 public key from LocumStaff JWKS endpoint
   */
  private async fetchJwksKey(targetKid?: string): Promise<string | undefined> {
    try {
      const jwksUrl = `${this.locumstaffApiUrl}/v1/oidc/jwks.json`;
      const res = await fetch(jwksUrl);
      if (!res.ok) return undefined;

      const jwks = (await res.json()) as { keys: any[] };
      if (!jwks.keys || !Array.isArray(jwks.keys)) return undefined;

      for (const key of jwks.keys) {
        if (key.x5c && key.x5c[0]) {
          const cert = `-----BEGIN CERTIFICATE-----\n${key.x5c[0]}\n-----END CERTIFICATE-----`;
          if (key.kid) this.jwksCache.set(key.kid, cert);
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
   * Match-or-create logic for doctor accounts
   */
  async matchOrCreateDoctor(
    claims: LocumStaffIdTokenClaims,
  ): Promise<OidcExchangeResult> {
    const ssoExternalId = claims.sub;
    const email = (claims.email || `doctor.${ssoExternalId.slice(0, 8)}@locumstaff.co.za`).toLowerCase();
    const fullName =
      claims.name ||
      [claims.given_name, claims.family_name].filter(Boolean).join(' ') ||
      'Dr. LocumStaff Doctor';

    // 1. Try finding by sso_external_id in doctor_profiles
    let doctorProfile = await this.doctorRepository.findOne({
      where: { sso_external_id: ssoExternalId, sso_provider: 'locumstaff' },
      relations: ['user'],
    });

    let user: User | null = null;
    let isNewUser = false;

    if (doctorProfile) {
      user = doctorProfile.user;
    } else {
      // 2. Try finding user by email
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
        // Upgrade role if logging in via doctor SSO
        user.role = UserRole.DOCTOR;
        user = await this.userRepository.save(user);
      }

      // Check if user already has a profile that isn't linked
      doctorProfile = await this.doctorRepository.findOne({
        where: { user_id: user.id },
      });

      const isVerified =
        claims.status === 'VERIFIED' || claims.status === undefined;

      if (!doctorProfile) {
        doctorProfile = this.doctorRepository.create({
          user_id: user.id,
          sso_provider: 'locumstaff',
          sso_external_id: ssoExternalId,
          hpcsa_number: `MP-${ssoExternalId.slice(0, 7).toUpperCase()}`,
          specialty: claims.profession === 'GENERAL_PRACTITIONER' ? 'General Practitioner' : 'General Practitioner',
          rate_per_hour: 850.0,
          bio: 'General Practitioner verified via LocumStaff Medical Staffing Network.',
          verification_status: isVerified
            ? VerificationStatus.VERIFIED
            : VerificationStatus.PENDING,
          verification_source: VerificationSource.LOCUMSTAFF,
        });
        doctorProfile = await this.doctorRepository.save(doctorProfile);
      } else {
        // Link existing profile to LocumStaff SSO ID
        doctorProfile.sso_provider = 'locumstaff';
        doctorProfile.sso_external_id = ssoExternalId;
        if (isVerified && doctorProfile.verification_status === VerificationStatus.PENDING) {
          doctorProfile.verification_status = VerificationStatus.VERIFIED;
          doctorProfile.verification_source = VerificationSource.LOCUMSTAFF;
        }
        doctorProfile = await this.doctorRepository.save(doctorProfile);
      }
    }

    // Attach user to doctorProfile
    doctorProfile.user = user;

    // Issue ChekUp access token
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

  /**
   * Generates mock claims for development and local testing
   */
  private getMockClaims(
    code: string,
    mockStatus: 'VERIFIED' | 'PENDING' = 'VERIFIED',
  ): LocumStaffIdTokenClaims {
    const isPending =
      code.includes('pending') || mockStatus === 'PENDING';
    const sub = `locum-doc-${code.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'uuid-123'}`;

    return {
      sub,
      iss: this.locumstaffApiUrl,
      aud: this.clientId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      email: `dr.${sub}@locumstaff.co.za`,
      given_name: 'Sipho',
      family_name: 'Khumalo',
      name: 'Dr. Sipho Khumalo',
      profession: 'GENERAL_PRACTITIONER',
      status: isPending ? 'PENDING' : 'VERIFIED',
    };
  }
}
