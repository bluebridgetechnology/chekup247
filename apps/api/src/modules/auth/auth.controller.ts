import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LocumStaffSsoService } from './locumstaff-sso.service';
import {
  RegisterPatientDto,
  LoginDto,
  VerifyEmailDto,
  VerifyOtpDto,
  ResendOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  LocumStaffCallbackDto,
  GoogleAuthDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminLoginRateLimitGuard } from '../../common/guards/admin-login-rate-limit.guard';
import { Public, CurrentUser } from '../../common/decorators/auth.decorators';
import { JwtPayload } from './token.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly locumStaffSsoService: LocumStaffSsoService,
    private readonly rateLimitGuard: AdminLoginRateLimitGuard,
  ) {}

  @Public()
  @Post('register')
  async register(
    @Body() dto: RegisterPatientDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.registerPatient(dto);

    if (result.accessToken) {
      res.cookie('chekup_session', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });
    }

    return result;
  }

  @Public()
  @Post('login')
  @UseGuards(AdminLoginRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    this.rateLimitGuard.recordSuccess(req);

    // Password was correct but 2FA hasn't been satisfied yet — return the
    // challenge as-is, no session cookie, no accessToken issued.
    if ('requiresTotp' in result) {
      return result;
    }

    // Set HTTP-only session cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName =
      result.user.role === 'admin'
        ? 'chekup_admin_session'
        : result.user.role === 'doctor'
        ? 'chekup_doctor_session'
        : 'chekup_session';

    res.cookie(cookieName, result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: dto.remember_me ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  @Public()
  @Post('totp/complete-login')
  @HttpCode(HttpStatus.OK)
  async completeTotpLogin(
    @Body() dto: { challengeToken: string; totpCode: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.completeTotpLogin(dto.challengeToken, dto.totpCode);

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieName =
      result.user.role === 'admin'
        ? 'chekup_admin_session'
        : result.user.role === 'doctor'
        ? 'chekup_doctor_session'
        : 'chekup_session';

    res.cookie(cookieName, result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('totp/enroll')
  async beginTotpEnrollment(@CurrentUser() user: JwtPayload) {
    return this.authService.beginTotpEnrollment(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('totp/confirm')
  async confirmTotpEnrollment(@CurrentUser() user: JwtPayload, @Body() dto: { code: string }) {
    return this.authService.confirmTotpEnrollment(user.sub, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('totp/disable')
  async disableTotp(@CurrentUser() user: JwtPayload, @Body() dto: { currentPassword: string }) {
    return this.authService.disableTotp(user.sub, dto.currentPassword);
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmail(dto);

    res.cookie('chekup_session', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyOtp(dto);

    res.cookie('chekup_session', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  @Public()
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('sso/locumstaff/callback')
  @HttpCode(HttpStatus.OK)
  async locumStaffCallbackPost(
    @Body() dto: LocumStaffCallbackDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.locumStaffSsoService.handleCallback({
      code: dto.code,
      codeVerifier: dto.code_verifier,
      state: dto.state,
    });

    res.cookie('chekup_doctor_session', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  @Public()
  @Get('sso/locumstaff/callback')
  async locumStaffCallbackGet(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('code_verifier') codeVerifier: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.locumStaffSsoService.handleCallback({
        code,
        codeVerifier,
        state,
      });

      res.cookie('chekup_doctor_session', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      const doctorPortalUrl = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3001';
      return res.redirect(`${doctorPortalUrl}/?token=${result.accessToken}`);
    } catch (err: any) {
      const doctorPortalUrl = process.env.DOCTOR_PORTAL_URL || 'http://localhost:3001';
      return res.redirect(`${doctorPortalUrl}/login?error=${encodeURIComponent(err.message)}`);
    }
  }

  @Public()
  @Post('social/google')
  @HttpCode(HttpStatus.OK)
  async googleAuth(
    @Body() dto: GoogleAuthDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.googleAuth(dto);

    res.cookie('chekup_session', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@CurrentUser() user: JwtPayload) {
    return this.authService.getCurrentUser(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Body()
    dto: {
      full_name?: string;
      phone?: string;
      date_of_birth?: string;
      avatar_url?: string;
      blood_group?: string;
      genotype?: string;
      allergies?: string;
      chronic_conditions?: string;
    },
  ) {
    return this.authService.updateProfile(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('preferences')
  async getPreferences(@CurrentUser() user: JwtPayload) {
    const currentUser = await this.authService.getCurrentUser(user.sub);
    return currentUser.notificationPreferences;
  }

  @UseGuards(JwtAuthGuard)
  @Put('preferences')
  async updatePreferences(
    @CurrentUser() user: JwtPayload,
    @Body() dto: { channels: string[]; remindersEnabled?: boolean },
  ) {
    return this.authService.updateNotificationPreferences(user.sub, dto);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('chekup_session', { path: '/' });
    res.clearCookie('chekup_doctor_session', { path: '/' });
    res.clearCookie('chekup_admin_session', { path: '/' });
    return { message: 'Logged out successfully' };
  }
}
