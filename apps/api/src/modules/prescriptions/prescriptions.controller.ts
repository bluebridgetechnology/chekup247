import { Controller, Get, Param } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Get('patient/:patientId')
  getPatientPrescriptions(@Param('patientId') patientId: string) {
    return this.prescriptionsService.getPatientPrescriptions(patientId);
  }

  @Get(':id')
  getPrescription(@Param('id') id: string) {
    return this.prescriptionsService.getPrescriptionById(id);
  }
}
