import { LocumStaffSsoService } from './locumstaff-sso.service';
import { Repository } from 'typeorm';
import { User, DoctorProfile } from '../../database/operational/entities';
import { TokenService } from './token.service';

describe('LocumStaffSsoService', () => {
  let service: LocumStaffSsoService;
  let mockUserRepo: Partial<Repository<User>>;
  let mockDoctorRepo: Partial<Repository<DoctorProfile>>;
  let mockTokenService: Partial<TokenService>;

  beforeEach(() => {
    mockUserRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    mockDoctorRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    mockTokenService = {
      generateAccessToken: jest.fn().mockReturnValue('mock-token'),
    };

    service = new LocumStaffSsoService(
      mockUserRepo as Repository<User>,
      mockDoctorRepo as Repository<DoctorProfile>,
      mockTokenService as TokenService,
    );
  });

  describe('getAuthorizationUrl', () => {
    it('should generate a valid OIDC authorization URL with PKCE and state parameters', () => {
      // Mock configured clientId on the service instance if not set via env
      (service as any).clientId = 'test-client-id';
      (service as any).locumstaffApiUrl = 'https://api.locumstaff.co.za';

      const result = service.getAuthorizationUrl();

      expect(result).toBeDefined();
      expect(result.url).toContain('https://api.locumstaff.co.za/v1/oidc/authorize');
      expect(result.url).toContain('client_id=test-client-id');
      expect(result.url).toContain('response_type=code');
      expect(result.url).toContain('code_challenge_method=S256');
      expect(result.url).toContain(`state=${result.state}`);
      expect(result.codeVerifier).toBeDefined();
      expect(result.state).toBeDefined();
    });

    it('should throw BadRequestException if clientId is missing', () => {
      (service as any).clientId = '';
      expect(() => service.getAuthorizationUrl()).toThrow();
    });
  });

  describe('convertJwkToPem', () => {
    it('should convert standard RSA JWK with n and e to PEM', () => {
      const crypto = require('crypto');
      const { publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
      const jwk = publicKey.export({ format: 'jwk' });

      const pem = (service as any).convertJwkToPem(jwk);
      expect(pem).toBeDefined();
      expect(pem).toContain('-----BEGIN PUBLIC KEY-----');
    });

    it('should return raw PEM string directly if provided', () => {
      const rawPem = '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA\n-----END PUBLIC KEY-----';
      const result = (service as any).convertJwkToPem(rawPem);
      expect(result).toBe(rawPem);
    });
  });

  describe('assertEligible', () => {
    it('should pass with standard VERIFIED status and LOCUM role', () => {
      expect(() => {
        (service as any).assertEligible({
          sub: 'doc-123',
          role: 'LOCUM',
          status: 'VERIFIED',
          profession: 'GENERAL_PRACTITIONER',
          willing_virtual: true,
        });
      }).not.toThrow();
    });

    it('should pass with ACTIVE or APPROVED status and DOCTOR or GP role', () => {
      expect(() => {
        (service as any).assertEligible({
          sub: 'doc-123',
          role: 'DOCTOR',
          status: 'ACTIVE',
          profession: 'GP',
        });
      }).not.toThrow();

      expect(() => {
        (service as any).assertEligible({
          sub: 'doc-123',
          role: 'GP',
          status: 'APPROVED',
          specialty: 'General Practitioner',
        });
      }).not.toThrow();
    });

    it('should pass with boolean verified: true or verification_status', () => {
      expect(() => {
        (service as any).assertEligible({
          sub: 'doc-123',
          verified: true,
        });
      }).not.toThrow();

      expect(() => {
        (service as any).assertEligible({
          sub: 'doc-123',
          verification_status: 'VERIFIED',
        });
      }).not.toThrow();
    });

    it('should throw ForbiddenException if explicitly PENDING or UNVERIFIED', () => {
      expect(() => {
        (service as any).assertEligible({
          sub: 'doc-123',
          status: 'PENDING',
        });
      }).toThrow(/not yet verified/);

      expect(() => {
        (service as any).assertEligible({
          sub: 'doc-123',
          verified: false,
        });
      }).toThrow(/not yet verified/);
    });

    it('should throw ForbiddenException if willing_virtual is explicitly false', () => {
      expect(() => {
        (service as any).assertEligible({
          sub: 'doc-123',
          status: 'VERIFIED',
          willing_virtual: false,
        });
      }).toThrow(/enable virtual consultations/);
    });
  });
});
