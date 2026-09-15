import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, CurrentUser } from '../../common/decorators/auth.decorators';
import { UserRole, VerificationStatus } from '../../database/operational/entities';
import { JwtPayload } from '../auth/token.service';


@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('settings')
  getSettings() {
    return this.adminService.getPlatformSettings();
  }

  @Get('verifications/pending')
  getPendingVerifications() {
    return this.adminService.getPendingDoctorVerifications();
  }

  // BE-305: Admin pending doctor list query
  @Get('doctors/pending')
  getPendingDoctors(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.adminService.getPendingDoctorVerifications(Number(page), Number(limit));
  }

  // BE-304: Admin verify doctor endpoint
  @Post('doctors/:id/verify')
  verifyDoctor(
    @Param('id') id: string,
    @CurrentUser() admin: JwtPayload,
    @Body() dto: { notes?: string },
  ) {
    return this.adminService.verifyDoctor(id, admin?.sub, dto?.notes);
  }

  // BE-304: Admin reject doctor endpoint
  @Post('doctors/:id/reject')
  rejectDoctor(
    @Param('id') id: string,
    @CurrentUser() admin: JwtPayload,
    @Body() dto: { reason: string },
  ) {
    return this.adminService.rejectDoctor(id, dto?.reason, admin?.sub);
  }

  // AP-303: Global Doctor Management Table
  @Get('doctors')
  getAllDoctors(
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 15,
  ) {
    return this.adminService.getAllDoctors({
      status,
      source,
      search,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Put('verifications/:id')
  updateVerification(
    @Param('id') id: string,
    @Body() dto: { status: VerificationStatus; notes?: string },
  ) {
    return this.adminService.updateDoctorVerification(id, dto.status, dto.notes);
  }


  @Get('users')
  listAdmins() {
    return this.adminService.listAdmins();
  }

  @Post('users/invite')
  inviteAdmin(
    @Body() dto: { email: string; full_name: string; password?: string },
  ) {
    return this.adminService.createAdmin(dto);
  }

  @Put('users/:id/revoke')
  revokeAdmin(@Param('id') id: string) {
    return this.adminService.revokeAdmin(id);
  }

  @Get('audit-logs')
  getAuditLogs() {
    return this.adminService.getRecentAuditLogs();
  }
}
