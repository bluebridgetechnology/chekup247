import { ForbiddenException } from '@nestjs/common';
import { PatientAccessService } from './patient-access.service';
import { BookingStatus } from '../../database/patient/entities';

describe('PatientAccessService', () => {
  const PATIENT = 'patient-1';
  const OTHER_PATIENT = 'patient-2';
  const DOCTOR_USER = 'doctor-user-1';
  const DOCTOR_PROFILE = 'doctor-profile-1';

  type B = { patient_id: string; doctor_id: string; status: BookingStatus };
  let bookings: B[];
  let service: PatientAccessService;

  beforeEach(() => {
    bookings = [];
    const bookingRepo: any = {
      count: jest.fn(async ({ where }: any) => {
        const doctorIds: string[] = where.doctor_id._value;
        const statuses: string[] = where.status._value;
        return bookings.filter(
          (b) => b.patient_id === where.patient_id && doctorIds.includes(b.doctor_id) && statuses.includes(b.status),
        ).length;
      }),
    };
    const profileRepo: any = {
      findOne: jest.fn(async ({ where }: any) =>
        where.user_id === DOCTOR_USER ? { id: DOCTOR_PROFILE, user_id: DOCTOR_USER } : null,
      ),
    };
    service = new PatientAccessService(bookingRepo, profileRepo);
  });

  const doctor = { id: DOCTOR_USER, role: 'doctor' };

  it('lets a patient see their own records only', async () => {
    await expect(service.canAccessPatient({ id: PATIENT, role: 'patient' }, PATIENT)).resolves.toBe(true);
    await expect(service.canAccessPatient({ id: PATIENT, role: 'patient' }, OTHER_PATIENT)).resolves.toBe(false);
  });

  it('lets admins see any patient', async () => {
    await expect(service.canAccessPatient({ id: 'a1', role: 'admin' }, PATIENT)).resolves.toBe(true);
  });

  it('refuses a doctor with no booking with the patient', async () => {
    await expect(service.assertPatientAccess(doctor, PATIENT)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a doctor with a confirmed or completed booking (by user id or profile id)', async () => {
    bookings.push({ patient_id: PATIENT, doctor_id: DOCTOR_PROFILE, status: BookingStatus.COMPLETED });
    await expect(service.assertPatientAccess(doctor, PATIENT)).resolves.toBeUndefined();

    bookings = [{ patient_id: OTHER_PATIENT, doctor_id: DOCTOR_USER, status: BookingStatus.CONFIRMED }];
    await expect(service.assertPatientAccess(doctor, OTHER_PATIENT)).resolves.toBeUndefined();
  });

  it('refuses a doctor whose only bookings are pending or cancelled', async () => {
    bookings.push({ patient_id: PATIENT, doctor_id: DOCTOR_USER, status: BookingStatus.PENDING });
    bookings.push({ patient_id: PATIENT, doctor_id: DOCTOR_USER, status: BookingStatus.CANCELLED });
    await expect(service.assertPatientAccess(doctor, PATIENT)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a doctor for patients that only another doctor treated', async () => {
    bookings.push({ patient_id: PATIENT, doctor_id: 'someone-else', status: BookingStatus.COMPLETED });
    await expect(service.assertPatientAccess(doctor, PATIENT)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a different patient or an anonymous caller', async () => {
    bookings.push({ patient_id: PATIENT, doctor_id: DOCTOR_USER, status: BookingStatus.COMPLETED });
    await expect(service.assertPatientAccess({ id: OTHER_PATIENT, role: 'patient' }, PATIENT)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.assertPatientAccess(null as any, PATIENT)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assertTreatingDoctor excludes admins and patients', async () => {
    bookings.push({ patient_id: PATIENT, doctor_id: DOCTOR_USER, status: BookingStatus.COMPLETED });
    await expect(service.assertTreatingDoctor(doctor, PATIENT)).resolves.toBeUndefined();
    await expect(service.assertTreatingDoctor({ id: 'a1', role: 'admin' }, PATIENT)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.assertTreatingDoctor({ id: PATIENT, role: 'patient' }, PATIENT)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('assertBookingParticipant allows the patient, the doctor, and admins only', async () => {
    const booking = { patient_id: PATIENT, doctor_id: DOCTOR_PROFILE };
    await expect(service.assertBookingParticipant({ id: PATIENT, role: 'patient' }, booking)).resolves.toBeUndefined();
    await expect(service.assertBookingParticipant(doctor, booking)).resolves.toBeUndefined();
    await expect(service.assertBookingParticipant({ id: 'a1', role: 'admin' }, booking)).resolves.toBeUndefined();
    await expect(service.assertBookingParticipant({ id: OTHER_PATIENT, role: 'patient' }, booking)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.assertBookingParticipant({ id: 'doc-2', role: 'doctor' }, booking)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('assertIssuingDoctor only allows the doctor who issued the record', async () => {
    await expect(service.assertIssuingDoctor(doctor, DOCTOR_USER)).resolves.toBeUndefined();
    await expect(service.assertIssuingDoctor(doctor, DOCTOR_PROFILE)).resolves.toBeUndefined();
    await expect(service.assertIssuingDoctor(doctor, 'other-doctor')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.assertIssuingDoctor({ id: PATIENT, role: 'patient' }, DOCTOR_USER)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
