import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Icd10Code } from '../../database/operational/entities';
import { MedicalService } from './medical.service';
import { MedicalController } from './medical.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Icd10Code], 'operational')],
  controllers: [MedicalController],
  providers: [MedicalService],
  exports: [MedicalService],
})
export class MedicalModule {}
