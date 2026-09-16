import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  Req,
  Headers,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { DoctorsService } from './doctors.service';
import { OnboardDoctorDto, UpdateDoctorProfileDto, GetDoctorsQueryDto } from './dto/doctor.dto';
import {
  CreateSingleSlotDto,
  CreateRecurringAvailabilityDto,
  GetAvailabilityQueryDto,
  CreateBlackoutDto,
  BatchDeleteSlotsDto,
} from './dto/availability.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Public, CurrentUser } from '../../common/decorators/auth.decorators';
import { UserRole } from '../../database/operational/entities';
import { JwtPayload } from '../auth/token.service';

@Controller(['doctors', 'doctor'])
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Public()
  @Get()
  getDirectory(@Query() query: GetDoctorsQueryDto) {
    return this.doctorsService.getDoctorsDirectory(query);
  }

  @Public()
  @Post('sync')
  triggerSync() {
    return this.doctorsService.triggerSync();
  }

  @Public()
  @Post('sync-availability')
  triggerAvailabilitySync(@Query() query: GetAvailabilityQueryDto) {
    return this.doctorsService.triggerAvailabilitySync(query);
  }

  @Public()
  @Post('seed-test-account')
  seedTestAccount() {
    return this.doctorsService.ensureTestDoctorAccount();
  }

  // ==========================================
  // DOCTOR ME PROFILE & AVAILABILITY (Doctor Role)
  // ==========================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @Get('me/profile')
  async getMyProfile(@CurrentUser() user: JwtPayload) {
    return this.doctorsService.getProfileByUserId(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @Put('me/profile')
  async updateMyProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateDoctorProfileDto,
  ) {
    return this.doctorsService.updateDoctorProfile(user.sub, dto);
  }

  /**
   * BE-903: Doctor Earnings Computation API (GET /doctor/earnings or GET /doctors/me/earnings)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @Get(['me/earnings', 'earnings'])
  async getMyEarnings(
    @CurrentUser() user: JwtPayload,
    @Headers('x-doctor-id') headerDoctorId?: string,
  ) {
    const doctorId = user?.sub || headerDoctorId;
    return this.doctorsService.getDoctorEarnings(doctorId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @Get('me/availability')
  async getMyAvailability(
    @CurrentUser() user: JwtPayload,
    @Query() query: GetAvailabilityQueryDto,
  ) {
    return this.doctorsService.getDoctorOwnAvailability(user.sub, query);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @Get('me/blackouts')
  async getMyBlackouts(@CurrentUser() user: JwtPayload) {
    return this.doctorsService.getDoctorBlackouts(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @Post('me/blackouts')
  async createMyBlackout(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBlackoutDto,
  ) {
    return this.doctorsService.createBlackout(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @Delete('me/blackouts/:id')
  async deleteMyBlackout(
    @CurrentUser() user: JwtPayload,
    @Param('id') blackoutId: string,
  ) {
    return this.doctorsService.deleteBlackout(user.sub, blackoutId);
  }

  // ==========================================
  // AVAILABILITY CRUD (Doctor Role)
  // ==========================================

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @Post('availability')
  async createAvailability(
    @CurrentUser() user: JwtPayload,
    @Body() body: any,
  ) {
    // If daysOfWeek or startDate provided, treat as recurring
    if (body.daysOfWeek && Array.isArray(body.daysOfWeek)) {
      return this.doctorsService.createRecurringAvailability(
        user.sub,
        body as CreateRecurringAvailabilityDto,
      );
    }
    return this.doctorsService.createSingleSlot(user.sub, body as CreateSingleSlotDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @Post('availability/batch-delete')
  async batchDeleteAvailability(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BatchDeleteSlotsDto,
  ) {
    return this.doctorsService.batchDeleteSlots(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR)
  @Delete('availability/:id')
  async deleteAvailability(
    @CurrentUser() user: JwtPayload,
    @Param('id') slotId: string,
  ) {
    return this.doctorsService.deleteSlot(user.sub, slotId);
  }

  // ==========================================
  // ONBOARDING & PUBLIC PROFILE / AVAILABILITY
  // ==========================================

  @Public()
  @Post('onboard')
  async onboardDoctor(
    @Body() dto: OnboardDoctorDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    let authUserId: string | undefined = undefined;
    const authHeader = req.headers?.authorization;
    if (authHeader && (req as any).user) {
      authUserId = (req as any).user.sub;
    }

    const result = await this.doctorsService.onboardDoctor(dto, authUserId);

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
  @Get(':idOrSlug/availability')
  getDoctorAvailability(
    @Param('idOrSlug') idOrSlug: string,
    @Query() query: GetAvailabilityQueryDto,
  ) {
    return this.doctorsService.getPublicDoctorAvailability(idOrSlug, query);
  }

  @Public()
  @Get(':idOrSlug')
  getDoctor(@Param('idOrSlug') idOrSlug: string) {
    return this.doctorsService.getDoctorByIdOrSlug(idOrSlug);
  }
}

