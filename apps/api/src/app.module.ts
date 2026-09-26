import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { QueuesModule } from './modules/queues/queues.module';
import { StorageModule } from './modules/storage/storage.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ConsultationsModule } from './modules/consultations/consultations.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { MedicalModule } from './modules/medical/medical.module';
import { NappiModule } from './modules/nappi/nappi.module';
import { AuditModule } from './modules/audit/audit.module';
import { TestimonialsModule } from './modules/testimonials/testimonials.module';

@Module({
  imports: [
    DatabaseModule,
    QueuesModule,
    AuditModule,
    StorageModule,
    HealthModule,
    AuthModule,
    DoctorsModule,
    BookingsModule,
    PaymentsModule,
    ConsultationsModule,
    PrescriptionsModule,
    ReviewsModule,
    NotificationsModule,
    AdminModule,
    MedicalModule,
    NappiModule,
    TestimonialsModule,
  ],
})

export class AppModule {}
