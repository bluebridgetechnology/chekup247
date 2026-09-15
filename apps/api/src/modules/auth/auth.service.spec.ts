import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { TokenService } from './token.service';
import { LocumStaffSsoService } from './locumstaff-sso.service';
import {
  User,
  UserRole,
  UserStatus,
  DoctorProfile,
  VerificationToken,
  NotificationPreference,
  VerificationStatus,
  VerificationSource,
} from '../../database/operational/entities';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthService & LocumStaffSsoService', () => {
  let authService: AuthService;
  let ssoService: LocumStaffSsoService;
  let tokenService: TokenService;

  const mockUsers: any[] = [];
  const mockTokens: any[] = [];
  const mockDoctorProfiles: any[] = [];
  const mockPreferences: any[] = [];

  const mockUserRepository = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.email) {
        return Promise.resolve(
          mockUsers.find((u) => u.email.toLowerCase() === where.email.toLowerCase()) || null,
        );
      }
      if (where.id) {
        return Promise.resolve(mockUsers.find((u) => u.id === where.id) || null);
      }
      return Promise.resolve(null);
    }),
    create: jest.fn().mockImplementation((dto) => ({
      id: `user-${Date.now()}-${Math.random()}`,
      created_at: new Date(),
      updated_at: new Date(),
      ...dto,
    })),
    save: jest.fn().mockImplementation((user) => {
      const idx = mockUsers.findIndex((u) => u.id === user.id);
      if (idx >= 0) {
        mockUsers[idx] = user;
      } else {
        mockUsers.push(user);
      }
      return Promise.resolve(user);
    }),
  };

  const mockDoctorRepository = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.sso_external_id) {
        return Promise.resolve(
          mockDoctorProfiles.find(
            (p) =>
              p.sso_external_id === where.sso_external_id &&
              p.sso_provider === where.sso_provider,
          ) || null,
        );
      }
      if (where.user_id) {
        return Promise.resolve(
          mockDoctorProfiles.find((p) => p.user_id === where.user_id) || null,
        );
      }
      return Promise.resolve(null);
    }),
    create: jest.fn().mockImplementation((dto) => ({
      id: `doc-${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date(),
      ...dto,
    })),
    save: jest.fn().mockImplementation((doc) => {
      mockDoctorProfiles.push(doc);
      return Promise.resolve(doc);
    }),
  };

  const mockTokenRepository = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      return Promise.resolve(
        mockTokens.find(
          (t) =>
            t.token_hash === where.token_hash &&
            (!where.type || t.type === where.type),
        ) || null,
      );
    }),
    create: jest.fn().mockImplementation((dto) => ({
      id: `token-${Date.now()}`,
      ...dto,
    })),
    save: jest.fn().mockImplementation((tok) => {
      const idx = mockTokens.findIndex((t) => t.id === tok.id);
      if (idx >= 0) {
        mockTokens[idx] = tok;
      } else {
        mockTokens.push(tok);
      }
      return Promise.resolve(tok);
    }),
  };

  const mockPrefRepository = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      return Promise.resolve(
        mockPreferences.find((p) => p.user_id === where.user_id) || null,
      );
    }),
    create: jest.fn().mockImplementation((dto) => ({ id: `pref-${Date.now()}`, ...dto })),
    save: jest.fn().mockImplementation((pref) => {
      mockPreferences.push(pref);
      return Promise.resolve(pref);
    }),
  };

  beforeEach(async () => {
    mockUsers.length = 0;
    mockTokens.length = 0;
    mockDoctorProfiles.length = 0;
    mockPreferences.length = 0;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        TokenService,
        LocumStaffSsoService,
        {
          provide: getRepositoryToken(User, 'operational'),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(DoctorProfile, 'operational'),
          useValue: mockDoctorRepository,
        },
        {
          provide: getRepositoryToken(VerificationToken, 'operational'),
          useValue: mockTokenRepository,
        },
        {
          provide: getRepositoryToken(NotificationPreference, 'operational'),
          useValue: mockPrefRepository,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    ssoService = module.get<LocumStaffSsoService>(LocumStaffSsoService);
    tokenService = module.get<TokenService>(TokenService);
  });

  describe('Patient Registration & Email Verification', () => {
    it('should successfully register a patient and generate verification token', async () => {
      const result = await authService.registerPatient({
        full_name: 'Test Patient',
        email: 'patient@example.com',
        password: 'Password123!',
        phone: '+27821234567',
        date_of_birth: '1990-05-15',
      });

      expect(result.userId).toBeDefined();
      expect(result.verificationToken).toBeDefined();

      const user = mockUsers.find((u) => u.email === 'patient@example.com');
      expect(user).toBeDefined();
      expect(user.role).toBe(UserRole.PATIENT);
      expect(user.is_email_verified).toBe(false);
    });

    it('should reject registration with duplicate email', async () => {
      await authService.registerPatient({
        full_name: 'First User',
        email: 'duplicate@example.com',
        password: 'Password123!',
      });

      await expect(
        authService.registerPatient({
          full_name: 'Second User',
          email: 'duplicate@example.com',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should verify email and return valid session', async () => {
      const reg = await authService.registerPatient({
        full_name: 'Verify User',
        email: 'verify@example.com',
        password: 'Password123!',
      });

      const session = await authService.verifyEmail({
        token: reg.verificationToken,
      });

      expect(session.accessToken).toBeDefined();
      expect(session.user.isEmailVerified).toBe(true);

      const user = mockUsers.find((u) => u.email === 'verify@example.com');
      expect(user.is_email_verified).toBe(true);
    });
  });

  describe('User Login & Password Management', () => {
    it('should authenticate user with valid credentials', async () => {
      await authService.registerPatient({
        full_name: 'Login User',
        email: 'login@example.com',
        password: 'ValidPassword123!',
      });

      const loginRes = await authService.login({
        email: 'login@example.com',
        password: 'ValidPassword123!',
      });

      expect(loginRes.accessToken).toBeDefined();
      expect(loginRes.user.email).toBe('login@example.com');
    });

    it('should fail authentication with invalid password', async () => {
      await authService.registerPatient({
        full_name: 'Bad Pass User',
        email: 'badpass@example.com',
        password: 'ValidPassword123!',
      });

      await expect(
        authService.login({
          email: 'badpass@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('LocumStaff Federated OIDC SSO', () => {
    it('should perform mock OIDC callback and auto-provision verified doctor', async () => {
      const result = await ssoService.handleCallback({
        code: 'mock-sso-verified-code-123',
        codeVerifier: 'mock-verifier-xyz',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.user.role).toBe(UserRole.DOCTOR);
      expect(result.doctorProfile).toBeDefined();
      expect(result.doctorProfile.verification_status).toBe(VerificationStatus.VERIFIED);
      expect(result.doctorProfile.verification_source).toBe(VerificationSource.LOCUMSTAFF);
    });

    it('should set verification_status to PENDING if LocumStaff doctor is not verified', async () => {
      const result = await ssoService.handleCallback({
        code: 'mock-pending-code-456',
        mockVerificationStatus: 'PENDING',
      });

      expect(result.doctorProfile.verification_status).toBe(VerificationStatus.PENDING);
    });
  });
});
