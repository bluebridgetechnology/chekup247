import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import {
  DoctorProfile,
  AvailabilitySlot,
  User,
  DoctorBlackout,
  PlatformSetting,
} from '../../database/operational/entities';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { DirectorySyncService } from './directory-sync.service';
import { DirectorySyncProcessor } from './directory-sync.processor';
import { AvailabilitySyncService } from './availability-sync.service';
import { AvailabilitySyncProcessor } from './availability-sync.processor';
import { AuthModule } from '../auth/auth.module';
import { QUEUES } from '../queues/queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [DoctorProfile, AvailabilitySlot, User, DoctorBlackout, PlatformSetting],
      'operational',
    ),
    BullModule.registerQueue(
      { name: QUEUES.DIRECTORY_SYNC },
      { name: QUEUES.AVAILABILITY_SYNC },
    ),
    AuthModule,
  ],
  controllers: [DoctorsController],
  providers: [
    DoctorsService,
    DirectorySyncService,
    DirectorySyncProcessor,
    AvailabilitySyncService,
    AvailabilitySyncProcessor,
  ],
  exports: [DoctorsService, DirectorySyncService, AvailabilitySyncService],
})
export class DoctorsModule {}


