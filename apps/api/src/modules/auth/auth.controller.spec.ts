import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocumStaffSsoService } from './locumstaff-sso.service';
import { AdminLoginRateLimitGuard } from '../../common/guards/admin-login-rate-limit.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<AuthService>;
  let locumStaffSsoService: Partial<LocumStaffSsoService>;
  let originalEnv: string | undefined;

  beforeAll(() => {
    originalEnv = process.env.PUBLIC_DOCTOR_REGISTRATION_ENABLED;
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.PUBLIC_DOCTOR_REGISTRATION_ENABLED;
    } else {
      process.env.PUBLIC_DOCTOR_REGISTRATION_ENABLED = originalEnv;
    }
  });

  beforeEach(async () => {
    authService = {
      registerDoctor: jest.fn().mockResolvedValue({
        id: 'doc-user-1',
        email: 'doctor@example.com',
        role: 'doctor',
      }),
    };
    locumStaffSsoService = {};

    const rateLimitGuard = { canActivate: jest.fn().mockReturnValue(true) };
    controller = new AuthController(
      authService as AuthService,
      locumStaffSsoService as LocumStaffSsoService,
      rateLimitGuard as unknown as AdminLoginRateLimitGuard,
    );
  });

  describe('registerDoctor', () => {
    const mockDto: any = {
      email: 'doctor@example.com',
      password: 'StrongPassword123!',
      full_name: 'Dr. John Doe',
      hpcsa_number: 'MP 0123456',
    };
    const mockRes: any = {
      cookie: jest.fn(),
    };

    it('should throw ForbiddenException if PUBLIC_DOCTOR_REGISTRATION_ENABLED is not true', async () => {
      process.env.PUBLIC_DOCTOR_REGISTRATION_ENABLED = 'false';

      await expect(controller.registerDoctor(mockDto, mockRes)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(controller.registerDoctor(mockDto, mockRes)).rejects.toThrow(
        'Direct doctor registration on ChekUp247 is currently disabled. Please sign in via LocumStaff SSO.',
      );
      expect(authService.registerDoctor).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if PUBLIC_DOCTOR_REGISTRATION_ENABLED is unset', async () => {
      delete process.env.PUBLIC_DOCTOR_REGISTRATION_ENABLED;

      await expect(controller.registerDoctor(mockDto, mockRes)).rejects.toThrow(
        ForbiddenException,
      );
      expect(authService.registerDoctor).not.toHaveBeenCalled();
    });

    it('should succeed when PUBLIC_DOCTOR_REGISTRATION_ENABLED is true', async () => {
      process.env.PUBLIC_DOCTOR_REGISTRATION_ENABLED = 'true';

      const result = await controller.registerDoctor(mockDto, mockRes);

      expect(authService.registerDoctor).toHaveBeenCalledWith(mockDto);
      expect(result).toEqual({
        id: 'doc-user-1',
        email: 'doctor@example.com',
        role: 'doctor',
      });
    });
  });
});
