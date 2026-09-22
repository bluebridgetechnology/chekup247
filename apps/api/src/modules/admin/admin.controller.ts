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
} from '@nestjs/common';
import { Response } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminIpAllowlistGuard } from '../../common/guards/admin-ip-allowlist.guard';
import { Roles, CurrentUser, AdminSubRoles } from '../../common/decorators/auth.decorators';
import { UserRole, VerificationStatus, AdminSubRole } from '../../database/operational/entities';
import { DisputeResolutionType } from '../../database/patient/entities';
import { JwtPayload } from '../auth/token.service';
import { AdminSubRolesGuard } from '../../common/guards/admin-sub-roles.guard';

@Controller('admin')
@UseGuards(AdminIpAllowlistGuard, JwtAuthGuard, RolesGuard)
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
    await this.adminService.streamTransactionsCsv(query, res);
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

  // ------------------------------------------
  // Dispute lifecycle (Sprint B, P1-1) — a real Dispute entity with
  // open→investigating→resolved/rejected states, distinct from the
  // booking-status-derived list above (kept for backward compatibility
  // with the existing Dispute Resolution Workspace page).
  // ------------------------------------------

  @Get('disputes/lifecycle')
  getDisputesLifecycle(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getDisputesLifecycle({ status, search, page, limit });
  }

  @Get('disputes/lifecycle/:id')
  getDisputeDetail(@Param('id') id: string) {
    return this.adminService.getDisputeDetail(id);
  }

  @Post('disputes/lifecycle/:id/assign')
  assignDispute(@Param('id') id: string, @CurrentUser() admin: JwtPayload) {
    return this.adminService.assignDispute(id, admin?.sub);
  }

  @Post('disputes/lifecycle/:id/resolve')
  resolveDisputeLifecycle(
    @Param('id') id: string,
    @Body() dto: { resolutionType: DisputeResolutionType; amount?: number; notes: string },
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.resolveDisputeLifecycle(id, dto, admin?.sub);
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
  @UseGuards(AdminSubRolesGuard)
  @AdminSubRoles(AdminSubRole.SUPER_ADMIN)
  updateSettings(
    @Body()
    dto: {
      commission_percent?: number;
      late_cancellation_deduction_percent?: number;
      no_show_grace_minutes?: number;
      default_slot_duration_minutes?: number;
      default_buffer_minutes?: number;
      paystack_mode?: 'test' | 'live';
      paystack_test_secret_key?: string;
      paystack_test_public_key?: string;
      paystack_live_secret_key?: string;
      paystack_live_public_key?: string;
    },
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.updatePlatformSettings(dto, admin?.sub);
  }

  @Post('settings/paystack/test-connection')
  @UseGuards(AdminSubRolesGuard)
  @AdminSubRoles(AdminSubRole.SUPER_ADMIN)
  testPaystackConnection(@Body() body: { secretKey?: string }) {
    return this.adminService.testPaystackConnection(body?.secretKey);
  }

  @Post('settings/brevo/test-connection')
  @UseGuards(AdminSubRolesGuard)
  @AdminSubRoles(AdminSubRole.SUPER_ADMIN)
  testBrevoConnection(@Body() body: { recipientEmail?: string }) {
    return this.adminService.testBrevoConnection(body?.recipientEmail);
  }

  @Get('verifications/pending')
  getPendingVerifications() {
    return this.adminService.getPendingDoctorVerifications();
  }

  @Get('doctors/pending')
  getPendingDoctors(
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.adminService.getPendingDoctorVerifications(Number(page), Number(limit), search);
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

  @Put('doctors/:id/suspend')
  suspendDoctor(
    @Param('id') id: string,
    @Body() dto: { suspend: boolean; reason?: string },
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.suspendDoctor(id, dto?.suspend !== false, admin?.sub, dto?.reason);
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
  @UseGuards(AdminSubRolesGuard)
  @AdminSubRoles(AdminSubRole.SUPER_ADMIN)
  inviteAdmin(
    @Body() dto: { email: string; full_name: string; password?: string; subRole?: AdminSubRole },
  ) {
    return this.adminService.createAdmin(dto);
  }

  @Put('users/:id/revoke')
  @UseGuards(AdminSubRolesGuard)
  @AdminSubRoles(AdminSubRole.SUPER_ADMIN)
  revokeAdmin(@Param('id') id: string) {
    return this.adminService.revokeAdmin(id);
  }

  // ==========================================
  // PATIENT USER MANAGEMENT (Sprint B, P1-3)
  // ==========================================

  @Get('patients')
  getPatients(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getPatients({ search, status, page, limit });
  }

  @Get('patients/:id')
  getPatientDetail(@Param('id') id: string) {
    return this.adminService.getPatientDetail(id);
  }

  @Put('patients/:id/suspend')
  suspendPatient(
    @Param('id') id: string,
    @Body() dto: { suspend: boolean; reason?: string },
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.suspendPatient(id, dto?.suspend !== false, admin?.sub, dto?.reason);
  }

  @Post('patients/:id/popia-export')
  exportPatientPopiaData(@Param('id') id: string, @CurrentUser() admin: JwtPayload) {
    return this.adminService.exportPatientPopiaData(id, admin?.sub);
  }

  @Delete('patients/:id')
  deletePatient(
    @Param('id') id: string,
    @Query('reason') reason: string | undefined,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.deletePatient(id, admin?.sub, reason);
  }

  @Delete('doctors/:id')
  deleteDoctor(
    @Param('id') id: string,
    @Query('reason') reason: string | undefined,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.deleteDoctor(id, admin?.sub, reason);
  }

  @Get('deleted-users')
  getDeletedUsers(
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 15,
  ) {
    return this.adminService.getDeletedUsers({
      role,
      search,
      page: Number(page),
      limit: Number(limit),
    });
  }

  // ==========================================
  // DOCTOR PAYOUT MANAGEMENT (Sprint C, P1-2)
  // ==========================================

  @Get('payouts')
  getPayouts(
    @Query('status') status?: string,
    @Query('doctorId') doctorId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getPayouts({ status, doctorId, search, page, limit });
  }

  @Post('payouts/:id/approve')
  approvePayout(@Param('id') id: string, @CurrentUser() admin: JwtPayload) {
    return this.adminService.approvePayout(id, admin?.sub);
  }

  @Post('payouts/:id/hold')
  holdPayout(
    @Param('id') id: string,
    @Body() dto: { reason: string },
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.holdPayout(id, dto?.reason, admin?.sub);
  }

  @Post('payouts/:id/mark-paid')
  @UseGuards(AdminSubRolesGuard)
  @AdminSubRoles(AdminSubRole.SUPER_ADMIN)
  markPayoutPaid(
    @Param('id') id: string,
    @Body() dto: { transactionReference: string },
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.markPayoutPaid(id, dto?.transactionReference, admin?.sub);
  }

  // ==========================================
  // LIVE CONSULTATION OVERSIGHT (Sprint C, P1-4)
  // ==========================================

  @Get('consultations')
  getConsultations(
    @Query('inFlightOnly') inFlightOnly?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getConsultations({ inFlightOnly: inFlightOnly === 'true', page, limit });
  }

  @Get('consultations/:id')
  getConsultationDetail(@Param('id') id: string) {
    return this.adminService.getConsultationDetail(id);
  }

  // ==========================================
  // NOTIFICATIONS / BROADCAST CONSOLE (Sprint D, P1-5)
  // ==========================================

  @Get('notifications')
  getNotifications(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getNotifications({ status, page, limit });
  }

  @Post('notifications/:id/resend')
  resendNotification(@Param('id') id: string, @CurrentUser() admin: JwtPayload) {
    return this.adminService.resendNotification(id, admin?.sub);
  }

  @Post('notifications/broadcast')
  broadcastNotification(
    @Body() dto: { targetRole: 'patient' | 'doctor' | 'all'; title: string; message: string; deepLink?: string },
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.broadcastNotification(dto, admin?.sub);
  }

  // ==========================================
  // REVIEW MODERATION (Sprint D, P1-6)
  // ==========================================

  @Get('reviews')
  getReviews(
    @Query('hidden') hidden?: string,
    @Query('doctorId') doctorId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getReviews({
      hidden: hidden === undefined ? undefined : hidden === 'true',
      doctorId,
      page,
      limit,
    });
  }

  @Put('reviews/:id/hide')
  hideReview(
    @Param('id') id: string,
    @Body() dto: { hidden: boolean; reason?: string },
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.adminService.setReviewHidden(id, dto?.hidden !== false, dto?.reason, admin?.sub);
  }
}
