import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Booking, BookingStatus } from '../../database/patient/entities';
import { DoctorProfile, UserRole } from '../../database/operational/entities';

/** The slice of the JWT/request user that access decisions need. */
export interface AccessUser {
  id?: string;
  sub?: string;
  role?: string;
}

/** Bookings that give a doctor a legitimate relationship with the patient (paid / confirmed or done). */
export const TREATING_BOOKING_STATUSES = [BookingStatus.CONFIRMED, BookingStatus.COMPLETED];

/**
 * Single place that answers "may this user see this patient's data?":
 *  - the patient themself,
 *  - admins,
 *  - a doctor who has a confirmed or completed booking with that patient.
 * Everything else, including other logged-in users who merely know a patient id, is refused.
 */
@Injectable()
export class PatientAccessService {
  constructor(
    @InjectRepository(Booking, 'patient')
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(DoctorProfile, 'operational')
    private readonly doctorProfileRepository: Repository<DoctorProfile>,
  ) {}

  userId(user: AccessUser | null | undefined): string | null {
    return user?.id || user?.sub || null;
  }

  isAdmin(user: AccessUser | null | undefined): boolean {
    return user?.role === UserRole.ADMIN;
  }

  isDoctor(user: AccessUser | null | undefined): boolean {
    return user?.role === UserRole.DOCTOR;
  }

  /** Bookings reference a doctor by user id or by doctor-profile id; match on both. */
  async doctorIds(user: AccessUser): Promise<string[]> {
    const userId = this.userId(user);
    if (!userId) return [];
    const profile = await this.doctorProfileRepository.findOne({ where: { user_id: userId } });
    return profile ? [userId, profile.id] : [userId];
  }

  async doctorHasTreated(user: AccessUser, patientId: string): Promise<boolean> {
    const ids = await this.doctorIds(user);
    if (ids.length === 0) return false;
    const count = await this.bookingRepository.count({
      where: { patient_id: patientId, doctor_id: In(ids), status: In(TREATING_BOOKING_STATUSES) },
    });
    return count > 0;
  }

  async canAccessPatient(user: AccessUser, patientId: string): Promise<boolean> {
    if (!user || !patientId) return false;
    if (this.isAdmin(user)) return true;
    if (this.userId(user) === patientId) return true;
    if (this.isDoctor(user)) return this.doctorHasTreated(user, patientId);
    return false;
  }

  async assertPatientAccess(user: AccessUser, patientId: string): Promise<void> {
    if (!(await this.canAccessPatient(user, patientId))) {
      throw new ForbiddenException('You do not have access to this patient\'s records');
    }
  }

  /** Doctors only (admins excluded): used for clinical write actions and the "my patients" chart. */
  async assertTreatingDoctor(user: AccessUser, patientId: string): Promise<void> {
    if (!this.isDoctor(user) || !(await this.doctorHasTreated(user, patientId))) {
      throw new ForbiddenException('Only a doctor treating this patient can do this');
    }
  }

  /** The patient or doctor of a booking, or an admin. */
  async assertBookingParticipant(
    user: AccessUser,
    booking: { patient_id?: string | null; doctor_id?: string | null } | null | undefined,
  ): Promise<void> {
    if (!user || !booking) throw new ForbiddenException('You do not have access to this consultation');
    if (this.isAdmin(user)) return;
    const userId = this.userId(user);
    if (userId && booking.patient_id === userId) return;
    if (this.isDoctor(user) && booking.doctor_id) {
      const ids = await this.doctorIds(user);
      if (ids.includes(booking.doctor_id)) return;
    }
    throw new ForbiddenException('You do not have access to this consultation');
  }

  /** A record written by a doctor (e.g. a prescription): only that doctor (or an admin) may change it. */
  async assertIssuingDoctor(user: AccessUser, recordDoctorId: string | null | undefined): Promise<void> {
    if (this.isAdmin(user)) return;
    if (this.isDoctor(user) && recordDoctorId && (await this.doctorIds(user)).includes(recordDoctorId)) return;
    throw new ForbiddenException('Only the issuing doctor can do this');
  }
}
