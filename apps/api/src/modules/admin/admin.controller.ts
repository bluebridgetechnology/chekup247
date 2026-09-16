import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
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

  // ==========================================
  // BE-904: EXECUTIVE ANALYTICS
  // ==========================================

  @Get('analytics')
  getAnalytics() {
    return this.adminService.getAnalytics();
  }

  // ==========================================
  // BE-905: FINANCIAL TRANSACTION LEDGER & CSV
  // ==========================================

  @Get('transactions')
  async getTransactions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    if (format === 'csv') {
      const csv = await this.adminService.exportTransactionsCsv({
        type,
        status,
        startDate,
        endDate,
        search,
      });
      if (res) {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="transactions_${new Date().toISOString().split('T')[0]}.csv"`,
        );
      }
      return csv;
    }

    return this.adminService.getTransactions({
      page,
      limit,
      type,
      status,
      startDate,
      endDate,
      search,
    });
  }

  @Get('transactions/export')
  async exportTransactionsCsv(
    @Query() query: any,
    @Res() res: Response,
  ) {
    const csv = await this.adminService.exportTransactionsCsv(query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="chekup247_transactions_${new Date().toISOString().split('T')[0]}.csv"`,
    );
    return res.end(csv);
  }

  // ==========================================
  // BE-906: BOOKINGS OVERSIGHT
  // ==========================================

  @Get('bookings')
  getBookings(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('doctorId') doctorId?: string,
    @Query('patientId') patientId?: string,
  ) {
    return this.adminService.getBookings({
      page,
      limit,
      status,
      search,
      doctorId,
      patientId,
    });
  }

  @Get('bookings/:id')
  getBookingDetail(@Param('id') id: string) {
    return this.adminService.getBookingDetail(id);
  }

  // ==========================================
  // BE-908: DISPUTE RESOLUTION WORKSPACE
  // ==========================================

  @Get('disputes')
  getDisputes(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getDisputes({ page, limit });
  }

  @Post('disputes/refund')
  resolveDisputeRefund(
    @Body() dto: { bookingId: string; amount?: number; reason: string },
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.resolveDisputeRefund(dto, admin?.sub);
  }

  @Post('disputes/credit')
  resolveDisputeCredit(
    @Body() dto: { bookingId?: string; patientId: string; amount: number; reason: string },
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.resolveDisputeCredit(dto, admin?.sub);
  }

  // ==========================================
  // BE-907: POPIA AUDIT LOGS
  // ==========================================

  @Get('audit-logs')
  getAuditLogs(
    @Query('patientId') patientId?: string,
    @Query('userId') userId?: string,
    @Query('userRole') userRole?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getPopiaAuditLogs({
      patientId,
      userId,
      userRole,
      action,
      startDate,
      endDate,
      page,
      limit,
    });
  }

  // ==========================================
  // SETTINGS & DOCTOR VERIFICATION (Existing)
  // ==========================================

  @Get('settings')
  getSettings() {
    return this.adminService.getPlatformSettings();
  }

  @Put('settings')
  updateSettings(
    @Body()
    dto: {
      commission_percent?: number;
      late_cancellation_deduction_percent?: number;
      no_show_grace_minutes?: number;
      default_slot_duration_minutes?: number;
      default_buffer_minutes?: number;
    },
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.updatePlatformSettings(dto, admin?.sub);
  }

  @Get('verifications/pending')
  getPendingVerifications() {
    return this.adminService.getPendingDoctorVerifications();
  }

  @Get('doctors/pending')
  getPendingDoctors(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.adminService.getPendingDoctorVerifications(Number(page), Number(limit));
  }

  @Post('doctors/:id/verify')
  verifyDoctor(
    @Param('id') id: string,
    @CurrentUser() admin: JwtPayload,
    @Body() dto: { notes?: string },
  ) {
    return this.adminService.verifyDoctor(id, admin?.sub, dto?.notes);
  }

  @Post('doctors/:id/reject')
  rejectDoctor(
    @Param('id') id: string,
    @CurrentUser() admin: JwtPayload,
    @Body() dto: { reason: string },
  ) {
    return this.adminService.rejectDoctor(id, dto?.reason, admin?.sub);
  }

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
}
