import {
  Controller,
  Get,
  Post,
  Query,
  Body,
} from '@nestjs/common';
import { MedicalService } from './medical.service';
import { Public } from '../../common/decorators/auth.decorators';

@Controller('medical')
export class MedicalController {
  constructor(private readonly medicalService: MedicalService) {}

  /**
   * Search ICD-10 Master Industry Table (BE-306, BE-704)
   * Accessible for typeahead lookups during booking / diagnosis entry
   */
  @Public()
  @Get('icd10')
  searchIcd10(
    @Query('q') q = '',
    @Query('limit') limit = 20,
  ) {
    return this.medicalService.searchIcd10(q, Number(limit) || 20);
  }

  /**
   * Search MediKredit NAPPI & South African Medicines Catalog (BE-705)
   * Supports Schedules S0 through S6 with NAPPI codes.
   */
  @Public()
  @Get('medications')
  searchMedications(
    @Query('q') q = '',
    @Query('limit') limit = 20,
    @Query('include_inactive') includeInactive?: string,
    @Query('include_non_meds') includeNonMeds?: string,
    @Query('schedule') schedule?: string,
  ) {
    return this.medicalService.searchMedications(q, {
      limit: Number(limit) || 20,
      includeInactive: includeInactive === 'true',
      includeNonMeds: includeNonMeds === 'true',
      schedule,
    });
  }

  /**
   * Synchronize / query WHO ICD API for specific term
   */
  @Public()
  @Post('icd10/sync')
  syncWithWho(@Body() body: { query: string }) {
    return this.medicalService.fetchAndCacheFromWhoApi(body?.query || '');
  }

  /**
   * Seed SA DoH core ICD-10 codes
   */
  @Public()
  @Post('icd10/seed')
  seedCodes() {
    return this.medicalService.seedSouthAfricanIcd10Table();
  }
}
