import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { AuthModule } from '../auth/auth.module';
import { PatientDocument } from '../../database/patient/entities';

@Global()
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([PatientDocument], 'patient'),
  ],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
