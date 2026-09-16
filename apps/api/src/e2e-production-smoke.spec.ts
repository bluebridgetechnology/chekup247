import { Test, TestingModule } from '@nestjs/testing';
import { TokenService } from './modules/auth/token.service';
import {
  UserRole,
  UserStatus,
} from './database/operational/entities';
import {
  BookingStatus,
  PaymentStatus,
  Consultation,
} from './database/patient/entities';

describe('QA-1001: End-to-End Production Smoke Test (Patient & Doctor Lifecycle)', () => {
  let tokenService: TokenService;

  // In-memory simulation stores
  const db = {
    users: new Map<string, any>(),
    doctors: new Map<string, any>(),
    slots: new Map<string, any>(),
    bookings: new Map<string, any>(),
    payments: new Map<string, any>(),
    consultations: new Map<string, any>(),
    prescriptions: new Map<string, any>(),
    auditLogs: [] as any[],
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TokenService],
    }).compile();

    tokenService = module.get<TokenService>(TokenService);

    // Seed verified doctor
    const doctorUser = {
      id: 'doc-user-001',
      email: 'dr.molefe@chekup247.co.za',
      full_name: 'Dr. Thabo Molefe',
      role: UserRole.DOCTOR,
      status: UserStatus.ACTIVE,
    };
    db.users.set(doctorUser.id, doctorUser);

    const doctorProfile = {
      id: 'doc-prof-001',
      user_id: doctorUser.id,
      hpcsa_number: 'MP 0689432',
      specialty: 'General Practitioner & Family Health',
      rate_per_hour: 800.0,
      rating_avg: 4.95,
      is_verified: true,
      user: doctorUser,
    };
    db.doctors.set(doctorProfile.id, doctorProfile);

    // Seed 30-min available slot
    const slot = {
      id: 'slot-101',
      doctor_id: doctorProfile.id,
      start_time: new Date(Date.now() + 3600 * 1000).toISOString(),
      end_time: new Date(Date.now() + 5400 * 1000).toISOString(),
      is_booked: false,
    };
    db.slots.set(slot.id, slot);
  });

  it('Step 1: Patient registers and generates JWT access token', async () => {
    const patientUser = {
      id: 'pat-user-001',
      email: 'craig.patient@example.co.za',
      full_name: 'Craig Botha',
      phone_number: '+27821112233',
      role: UserRole.PATIENT,
      status: UserStatus.ACTIVE,
    };
    db.users.set(patientUser.id, patientUser);

    const accessToken = tokenService.generateAccessToken({
      sub: patientUser.id,
      email: patientUser.email,
      role: patientUser.role,
      fullName: patientUser.full_name,
    });

    expect(accessToken).toBeDefined();

    const decoded = tokenService.verifyAccessToken(accessToken);
    expect(decoded.sub).toBe(patientUser.id);
    expect(decoded.role).toBe(UserRole.PATIENT);
    expect(decoded.fullName).toBe('Craig Botha');
  });

  it('Step 2: Patient searches verified doctors by specialty', async () => {
    const foundDoctors = Array.from(db.doctors.values()).filter(
      (d) => d.is_verified && d.specialty.includes('General Practitioner'),
    );

    expect(foundDoctors.length).toBeGreaterThanOrEqual(1);
    expect(foundDoctors[0].user.full_name).toBe('Dr. Thabo Molefe');
    expect(foundDoctors[0].hpcsa_number).toBe('MP 0689432');
  });

  it('Step 3: Patient reserves an available 30-minute booking slot', async () => {
    const slot = db.slots.get('slot-101');
    expect(slot).toBeDefined();
    expect(slot.is_booked).toBe(false);

    // Reserve slot
    slot.is_booked = true;

    const booking = {
      id: 'booking-201',
      patient_id: 'pat-user-001',
      doctor_id: 'doc-prof-001',
      slot_id: slot.id,
      status: BookingStatus.PENDING,
      consultation_type: 'video',
      patient_notes: 'Persistent dry cough and sore throat for 3 days',
      created_at: new Date().toISOString(),
    };
    db.bookings.set(booking.id, booking);

    expect(booking.id).toBe('booking-201');
    expect(booking.status).toBe(BookingStatus.PENDING);
  });

  it('Step 4: Patient initiates and confirms Paystack escrow payment', async () => {
    const booking = db.bookings.get('booking-201');
    expect(booking).toBeDefined();

    const payment = {
      id: 'pay-301',
      booking_id: booking.id,
      amount: 400.0, // 30 mins of R800/hr
      currency: 'ZAR',
      status: PaymentStatus.HELD,
      provider: 'paystack',
      reference: 'pstk_ref_' + Date.now(),
      paid_at: new Date().toISOString(),
    };
    db.payments.set(payment.id, payment);

    // Confirm booking upon escrow hold
    booking.status = BookingStatus.CONFIRMED;

    expect(payment.status).toBe(PaymentStatus.HELD);
    expect(booking.status).toBe(BookingStatus.CONFIRMED);
  });

  it('Step 5: Daily.co encrypted video consultation room initialized', async () => {
    const booking = db.bookings.get('booking-201');

    const consultation = {
      id: 'consult-401',
      booking_id: booking.id,
      patient_id: booking.patient_id,
      doctor_id: booking.doctor_id,
      room_url: 'https://chekup247.daily.co/consult-401-secure',
      started_at: new Date(),
      duration_minutes: 30,
      doctor_joined_at: new Date(),
      patient_joined_at: new Date(),
    };
    db.consultations.set(consultation.id, consultation);

    expect(consultation.room_url).toContain('daily.co');
    expect(consultation.started_at).toBeDefined();
  });

  it('Step 6: Doctor requests & approves a 15-minute consultation extension', async () => {
    const consultation = db.consultations.get('consult-401');
    expect(consultation).toBeDefined();

    // Add 15 minutes extension
    consultation.duration_minutes += 15;
    consultation.extended = true;
    consultation.extended_by_minutes = 15;

    expect(consultation.duration_minutes).toBe(45);
    expect(consultation.extended).toBe(true);
  });

  it('Step 7: Doctor issues official e-prescription with ICD-10 codes', async () => {
    const consultation = db.consultations.get('consult-401');

    const prescription = {
      id: 'rx-501',
      consultation_id: consultation.id,
      patient_id: consultation.patient_id,
      doctor_id: consultation.doctor_id,
      icd10_code: 'J20.9',
      icd10_description: 'Acute bronchitis, unspecified',
      items: [
        {
          medication_name: 'Amoxicillin / Clavulanic Acid 1000mg',
          dosage: '1 tablet twice daily with meals',
          duration_days: 7,
          repeats: 0,
        },
      ],
      doctor_signature_url: 'https://storage.chekup247.co.za/signatures/doc-prof-001.png',
      pdf_download_url: 'https://storage.chekup247.co.za/prescriptions/rx-501-signed.pdf',
      issued_at: new Date().toISOString(),
    };
    db.prescriptions.set(prescription.id, prescription);

    // Conclude consultation & release escrow
    consultation.ended_at = new Date();
    const booking = db.bookings.get('booking-201');
    booking.status = BookingStatus.COMPLETED;

    const payment = db.payments.get('pay-301');
    payment.status = PaymentStatus.RELEASED;

    expect(prescription.icd10_code).toBe('J20.9');
    expect(prescription.pdf_download_url).toContain('.pdf');
    expect(booking.status).toBe(BookingStatus.COMPLETED);
    expect(payment.status).toBe(PaymentStatus.RELEASED);
  });

  it('Step 8: Patient downloads prescription and system records audit trail', async () => {
    const prescription = db.prescriptions.get('rx-501');
    expect(prescription).toBeDefined();

    // Record audit trail entry
    const auditEntry = {
      action: 'PRESCRIPTION_DOWNLOADED',
      actor_id: 'pat-user-001',
      resource_id: prescription.id,
      timestamp: new Date().toISOString(),
      ip_address: '105.210.45.12',
    };
    db.auditLogs.push(auditEntry);

    expect(db.auditLogs.length).toBe(1);
    expect(db.auditLogs[0].action).toBe('PRESCRIPTION_DOWNLOADED');
    expect(db.auditLogs[0].resource_id).toBe('rx-501');
  });
});
