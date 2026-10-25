import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { EhrService, RequestMeta } from './ehr.service';
import { CreateProblemDto, CreateVitalDto, UpdatePatientProfileDto, UpdateProblemDto } from './ehr.dto';

const meta = (req: Request): RequestMeta => ({
  ipAddress: req.ip || (req.headers['x-forwarded-for'] as string),
  userAgent: req.headers['user-agent'],
});

/** Doctor-facing electronic health record. Access rules live in PatientAccessService. */
@UseGuards(JwtAuthGuard)
@Controller('ehr')
export class EhrController {
  constructor(private readonly ehrService: EhrService) {}

  @Get('patients')
  listPatients(@CurrentUser() user: any, @Query('q') q: string | undefined, @Req() req: Request) {
    return this.ehrService.listMyPatients(user, q, meta(req));
  }

  @Get('patients/:patientId/chart')
  getChart(@CurrentUser() user: any, @Param('patientId', ParseUUIDPipe) patientId: string, @Req() req: Request) {
    return this.ehrService.getChart(user, patientId, meta(req));
  }

  @Put('patients/:patientId/profile')
  updateProfile(
    @CurrentUser() user: any,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: UpdatePatientProfileDto,
    @Req() req: Request,
  ) {
    return this.ehrService.updateProfile(user, patientId, dto, meta(req));
  }

  @Post('patients/:patientId/vitals')
  addVital(
    @CurrentUser() user: any,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateVitalDto,
    @Req() req: Request,
  ) {
    return this.ehrService.addVital(user, patientId, dto, meta(req));
  }

  @Delete('patients/:patientId/vitals/:vitalId')
  deleteVital(
    @CurrentUser() user: any,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('vitalId', ParseUUIDPipe) vitalId: string,
    @Req() req: Request,
  ) {
    return this.ehrService.deleteVital(user, patientId, vitalId, meta(req));
  }

  @Post('patients/:patientId/problems')
  addProblem(
    @CurrentUser() user: any,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateProblemDto,
    @Req() req: Request,
  ) {
    return this.ehrService.addProblem(user, patientId, dto, meta(req));
  }

  @Put('patients/:patientId/problems/:problemId')
  updateProblem(
    @CurrentUser() user: any,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Param('problemId', ParseUUIDPipe) problemId: string,
    @Body() dto: UpdateProblemDto,
    @Req() req: Request,
  ) {
    return this.ehrService.updateProblem(user, patientId, problemId, dto, meta(req));
  }
}
