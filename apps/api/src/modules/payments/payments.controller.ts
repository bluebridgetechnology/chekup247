import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService, InitiatePaymentDto } from './payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, Public } from '../../common/decorators/auth.decorators';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Initiate Paystack checkout for a booking (BE-502).
   */
  @UseGuards(JwtAuthGuard)
  @Post('initiate')
  initiatePayment(@Body() dto: InitiatePaymentDto, @CurrentUser('id') patientId: string) {
    return this.paymentsService.initiatePayment(dto, patientId);
  }

  /**
   * Paystack Webhook Handler (BE-503).
   * Note: @Public() allows Paystack servers to post events directly without bearer auth.
   */
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Body() body: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const rawBody = (req as any).rawBody || JSON.stringify(body);
    return this.paymentsService.handleWebhook(rawBody, signature, body);
  }

  /**
   * Verify transaction callback from client redirect (PA-502).
   */
  @Public()
  @Get('verify/:reference')
  verifyPayment(@Param('reference') reference: string) {
    return this.paymentsService.verifyPayment(reference);
  }

  /**
   * Retrieve vaulted card authorizations for patient (BE-504).
   */
  @UseGuards(JwtAuthGuard)
  @Get('saved-cards')
  getSavedCards(@CurrentUser('id') patientId: string) {
    return this.paymentsService.getSavedCards(patientId);
  }

  /**
   * Retrieve patient wallet balance (BE-505).
   */
  @UseGuards(JwtAuthGuard)
  @Get('wallet/balance')
  getWalletBalance(@CurrentUser('id') patientId: string) {
    return this.paymentsService.getWalletBalance(patientId);
  }

  /**
   * Retrieve patient wallet credit ledger history (BE-505).
   */
  @UseGuards(JwtAuthGuard)
  @Get('wallet/ledger')
  getWalletLedger(@CurrentUser('id') patientId: string) {
    return this.paymentsService.getWalletLedger(patientId);
  }

  /**
   * Automated refund endpoint (BE-507).
   */
  @UseGuards(JwtAuthGuard)
  @Post('refund')
  processRefund(
    @Body()
    dto: {
      bookingId: string;
      amount?: number;
      reason?: string;
      refundToWallet?: boolean;
    },
  ) {
    return this.paymentsService.processRefund(dto);
  }

  /**
   * Get payments for a specific booking.
   */
  @UseGuards(JwtAuthGuard)
  @Get('booking/:bookingId')
  getBookingPayments(@Param('bookingId') bookingId: string) {
    return this.paymentsService.getPaymentsByBooking(bookingId);
  }
}
