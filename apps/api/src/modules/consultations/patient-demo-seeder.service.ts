import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Booking,
  BookingStatus,
  PaymentStatus,
  Consultation,
  Prescription,
  PatientDocument,
  PatientDocumentCategory,
  PatientMedicalProfile,
} from '../../database/patient/entities';
import {
  DoctorProfile,
  User,
  UserRole,
  UserStatus,
  VerificationStatus,
  VerificationSource,
} from '../../database/operational/entities';

@Injectable()
export class PatientDemoSeederService implements OnModuleInit {
  private readonly logger = new Logger(PatientDemoSeederService.name);

  constructor(
    @InjectRepository(Booking, 'patient')
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Consultation, 'patient')
    private readonly consultationRepo: Repository<Consultation>,
    @InjectRepository(Prescription, 'patient')
    private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(PatientDocument, 'patient')
    private readonly documentRepo: Repository<PatientDocument>,
    @InjectRepository(PatientMedicalProfile, 'patient')
    private readonly medicalProfileRepo: Repository<PatientMedicalProfile>,
    @InjectRepository(DoctorProfile, 'operational')
    private readonly doctorProfileRepo: Repository<DoctorProfile>,
    @InjectRepository(User, 'operational')
    private readonly userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    // Demo patient seeder disabled to keep system clean
  }

  /**
   * Seeds demo consultations, health notes, official e-prescriptions,
   * medical profile, and uploaded test documents for a patient into the live database.
   */
  async seedPatientDemoData(patientId: string): Promise<void> {
    try {
      // Guard: ONLY seed demo data for the designated sandbox test patient (patient@chekup247.com)
      const user = await this.userRepo.findOne({ where: { id: patientId } });
      if (!user || user.email !== 'patient@chekup247.com') {
        return;
      }

      // 1. Check if patient already has bookings
      const bookingCount = await this.bookingRepo.count({
        where: { patient_id: patientId },
      });

      // Find or establish doctor profiles
      const doctors = await this.ensureSeedDoctors();

      // Seed Medical Profile if missing
      await this.ensurePatientMedicalProfile(patientId);

      // Seed Medical Documents if missing
      await this.ensurePatientDocuments(patientId);

      if (bookingCount > 0) {
        return;
      }

      this.logger.log(`Seeding demo clinical consultations & prescriptions for patient ${patientId}...`);

      const doc1 = doctors[0]; // Dr. Thabo Molefe (GP)
      const doc2 = doctors[1] || doctors[0]; // Dr. Sarah Van Der Merwe (Paediatrics & Family)
      const doc3 = doctors[2] || doctors[0]; // Dr. Kevin Pillay (Sports Medicine)

      const now = Date.now();
      const twoDaysAgo = new Date(now - 86400000 * 2);
      const fourteenDaysAgo = new Date(now - 86400000 * 14);
      const twentyEightDaysAgo = new Date(now - 86400000 * 28);

      // ──────────────────────────────────────────────────────────────────────────
      // Consultation 1: Acute Respiratory Infection + E-Prescription (S4)
      // ──────────────────────────────────────────────────────────────────────────
      const booking1 = this.bookingRepo.create({
        patient_id: patientId,
        doctor_id: doc1.user_id || doc1.id,
        slot_id: 'a0000000-0000-0000-0000-000000000001',
        status: BookingStatus.COMPLETED,
        price: 450.0,
        commission_amount: 67.5,
        payment_status: PaymentStatus.RELEASED,
        notes: 'Telehealth Consultation - Acute cough, nasal congestion and fever',
        created_at: twoDaysAgo,
      });
      const savedBooking1 = await this.bookingRepo.save(booking1);

      const patientNote1 =
        'Complete the full 5-day course of Amoxicillin even if you feel significantly better before then. Take capsules with food to prevent stomach discomfort. Rest well, hydrate with at least 2-3 liters of warm water and herbal tea daily, and avoid air conditioning draughts. Seek medical review if high fever (>38.5°C) persists past 48 hours or if any breathing difficulty occurs.';

      const consultation1 = this.consultationRepo.create({
        booking_id: savedBooking1.id,
        video_room_id: `room-${savedBooking1.id.slice(0, 8)}`,
        room_url: `https://chekup247.daily.co/cons-${savedBooking1.id.slice(0, 8)}`,
        started_at: twoDaysAgo,
        ended_at: new Date(twoDaysAgo.getTime() + 35 * 60 * 1000),
        doctor_notes: JSON.stringify({
          chiefComplaint: 'Persistent cough, sore throat, and low-grade pyrexia for 4 days.',
          hpi: 'Adult patient presenting with productive cough, yellow sputum, nasal congestion. Denies hemoptysis or dyspnea.',
          assessment: 'Acute upper respiratory tract infection (ICD-10: J06.9). Secondary mild acute bronchitis.',
          plan: 'Course of Amoxicillin 500mg, Paracetamol 1000mg for analgesia/pyrexia. Increase warm oral fluid intake.',
          patientInstructions: patientNote1,
        }),
        patient_notes: patientNote1,
        created_at: twoDaysAgo,
      });
      const savedConsultation1 = await this.consultationRepo.save(consultation1);

      const prescription1 = this.prescriptionRepo.create({
        consultation: savedConsultation1,
        consultation_id: savedConsultation1.id,
        doctor_id: doc1.user_id || doc1.id,
        patient_id: patientId,
        icd10_code: 'J06.9',
        schedule_flag: 'S4',
        supervision_declaration: null,
        pdf_url: null,
        issued_at: twoDaysAgo,
        medications: [
          {
            name: 'Amoxicillin 500mg capsules',
            dosage: '500mg',
            frequency: 'Three times daily (8-hourly)',
            duration: '5 days',
            instructions: 'Take with food and finish the entire course.',
            nappi_code: '703412001',
          },
          {
            name: 'Paracetamol 500mg tablets',
            dosage: '1000mg',
            frequency: 'Every 6 hours as needed for pain/fever',
            duration: '5 days',
            instructions: 'Do not exceed 4000mg in 24 hours.',
            nappi_code: '824102001',
          },
        ],
        created_at: twoDaysAgo,
      } as any);
      await this.prescriptionRepo.save(prescription1);

      // ──────────────────────────────────────────────────────────────────────────
      // Consultation 2: Generalized Anxiety & Sleep Disturbance + E-Prescription (S5)
      // ──────────────────────────────────────────────────────────────────────────
      const booking2 = this.bookingRepo.create({
        patient_id: patientId,
        doctor_id: doc2.user_id || doc2.id,
        slot_id: 'a0000000-0000-0000-0000-000000000002',
        status: BookingStatus.COMPLETED,
        price: 650.0,
        commission_amount: 97.5,
        payment_status: PaymentStatus.RELEASED,
        notes: 'Follow-up Consultation - Episodic anxiety flare-ups and sleep disruption',
        created_at: fourteenDaysAgo,
      });
      const savedBooking2 = await this.bookingRepo.save(booking2);

      const patientNote2 =
        'Take Escitalopram 10mg consistently every morning with breakfast. Reserve Lorazepam strictly for acute agitation before bed—do not consume alcohol or operate heavy machinery while taking it. Practice 10 minutes of 4-7-8 diaphragmatic breathing exercises twice daily. Eliminate caffeine after 14:00 and keep a regular bedtime routine. Follow-up consultation scheduled in 14 days.';

      const consultation2 = this.consultationRepo.create({
        booking_id: savedBooking2.id,
        video_room_id: `room-${savedBooking2.id.slice(0, 8)}`,
        room_url: `https://chekup247.daily.co/cons-${savedBooking2.id.slice(0, 8)}`,
        started_at: fourteenDaysAgo,
        ended_at: new Date(fourteenDaysAgo.getTime() + 45 * 60 * 1000),
        doctor_notes: JSON.stringify({
          chiefComplaint: 'Episodes of acute anxiety, palpitations, and sleep-onset insomnia.',
          hpi: 'Work-related stress leading to persistent tension and interrupted sleep cycles for 6 weeks.',
          assessment: 'Generalized anxiety disorder (ICD-10: F41.1). Associated acute insomnia.',
          plan: 'Initiate SSRI maintenance therapy (Escitalopram 10mg) with short-term benzodiazepine bridging (Lorazepam 1mg). Sleep hygiene and breathing exercises counseling provided.',
          patientInstructions: patientNote2,
        }),
        patient_notes: patientNote2,
        created_at: fourteenDaysAgo,
      });
      const savedConsultation2 = await this.consultationRepo.save(consultation2);

      const prescription2 = this.prescriptionRepo.create({
        consultation: savedConsultation2,
        consultation_id: savedConsultation2.id,
        doctor_id: doc2.user_id || doc2.id,
        patient_id: patientId,
        icd10_code: 'F41.1',
        schedule_flag: 'S5',
        supervision_declaration:
          'Patient counseled on sedation risks, avoidance of alcohol, and dependency precautions. Supervised short-term bridging protocol.',
        pdf_url: null,
        issued_at: fourteenDaysAgo,
        medications: [
          {
            name: 'Escitalopram 10mg tablets',
            dosage: '10mg',
            frequency: 'Once daily in the morning',
            duration: '30 days',
            instructions: 'Take consistently with breakfast.',
            nappi_code: '710041001',
          },
          {
            name: 'Lorazepam 1mg tablets',
            dosage: '1mg',
            frequency: 'Once daily at bedtime as needed',
            duration: '7 days',
            instructions: 'Take at bedtime. Strictly avoid alcohol and driving.',
            nappi_code: '741299002',
          },
        ],
        created_at: fourteenDaysAgo,
      } as any);
      await this.prescriptionRepo.save(prescription2);

      // ──────────────────────────────────────────────────────────────────────────
      // Consultation 3: Knee Strain Rehabilitation & Lifestyle Guidance (No Script)
      // ──────────────────────────────────────────────────────────────────────────
      const booking3 = this.bookingRepo.create({
        patient_id: patientId,
        doctor_id: doc3.user_id || doc3.id,
        slot_id: 'a0000000-0000-0000-0000-000000000003',
        status: BookingStatus.COMPLETED,
        price: 420.0,
        commission_amount: 63.0,
        payment_status: PaymentStatus.RELEASED,
        notes: 'Sports injury assessment - Right knee joint strain and rehabilitation review',
        created_at: twentyEightDaysAgo,
      });
      const savedBooking3 = await this.bookingRepo.save(booking3);

      const patientNote3 =
        'Apply ice packs wrapped in a damp towel for 15 minutes, 3-4 times daily for the next 72 hours. Wear a supportive elastic knee brace during walking. Perform gentle straight-leg quadriceps raises (3 sets of 10 reps) twice daily without added weight. Avoid high-impact running, sudden pivoting, or jumping sports for 3 weeks.';

      const consultation3 = this.consultationRepo.create({
        booking_id: savedBooking3.id,
        video_room_id: `room-${savedBooking3.id.slice(0, 8)}`,
        room_url: `https://chekup247.daily.co/cons-${savedBooking3.id.slice(0, 8)}`,
        started_at: twentyEightDaysAgo,
        ended_at: new Date(twentyEightDaysAgo.getTime() + 40 * 60 * 1000),
        doctor_notes: JSON.stringify({
          chiefComplaint: 'Knee soreness following weekend padel match.',
          hpi: 'Twisting injury with localized medial joint line tenderness. Negative McMurray, no joint effusion.',
          assessment: 'Medial collateral ligament sprain, grade 1 (ICD-10: M25.56).',
          plan: 'Conservative physical therapy regimen, ice packs, isometric quadriceps strengthening. No pharmacotherapy required.',
          patientInstructions: patientNote3,
        }),
        patient_notes: patientNote3,
        created_at: twentyEightDaysAgo,
      });
      await this.consultationRepo.save(consultation3);

      this.logger.log(`Successfully seeded 3 consultations and 2 prescriptions for patient ${patientId}`);
    } catch (err: any) {
      this.logger.warn(`Could not seed patient demo data: ${err.message}`);
    }
  }

  /**
   * Ensures patient documents exist in database
   */
  async ensurePatientDocuments(patientId: string): Promise<void> {
    try {
      const count = await this.documentRepo.count({
        where: { patient_id: patientId },
      });
      if (count > 0) return;

      const docs = [
        {
          patient_id: patientId,
          title: 'PathCare Haematology & CRP Panel',
          original_filename: 'PathCare_FBC_CRP_Report_2026.pdf',
          category: PatientDocumentCategory.LAB_REPORT,
          file_size: 245760, // ~240 KB
          mime_type: 'application/pdf',
          s3_key: `patient-records/${patientId}/lab_report/PathCare_FBC_CRP_Report_2026.pdf`,
          notes: 'Full blood count, differential white cell count, and C-reactive protein panel.',
        },
        {
          patient_id: patientId,
          title: 'Right Knee Diagnostic MRI Scan Report',
          original_filename: 'Right_Knee_MRI_Diagnostic.pdf',
          category: PatientDocumentCategory.IMAGING,
          file_size: 1428500, // ~1.36 MB
          mime_type: 'application/pdf',
          s3_key: `patient-records/${patientId}/imaging/Right_Knee_MRI_Diagnostic.pdf`,
          notes: 'High-resolution coronal and sagittal MRI views with radiologist findings.',
        },
        {
          patient_id: patientId,
          title: 'Mediclinic Cape Town Day-Ward Discharge Summary',
          original_filename: 'Mediclinic_Discharge_Summary.pdf',
          category: PatientDocumentCategory.DISCHARGE_SUMMARY,
          file_size: 512000, // ~500 KB
          mime_type: 'application/pdf',
          s3_key: `patient-records/${patientId}/discharge_summary/Mediclinic_Discharge_Summary.pdf`,
          notes: 'Day-ward observation chart and clinical discharge recommendations.',
        },
        {
          patient_id: patientId,
          title: 'Lancet Laboratories Fasting Lipogram & HbA1c',
          original_filename: 'Lancet_Lipid_HbA1c_Panel.pdf',
          category: PatientDocumentCategory.LAB_REPORT,
          file_size: 184320, // ~180 KB
          mime_type: 'application/pdf',
          s3_key: `patient-records/${patientId}/lab_report/Lancet_Lipid_HbA1c_Panel.pdf`,
          notes: 'Fasting lipid profile, cholesterol breakdown, and HbA1c glycemic control check.',
        },
      ];

      for (const d of docs) {
        const item = this.documentRepo.create(d);
        await this.documentRepo.save(item);
      }

      this.logger.log(`Seeded 4 medical documents for patient ${patientId}`);
    } catch (err: any) {
      this.logger.warn(`Could not seed patient documents: ${err.message}`);
    }
  }

  /**
   * Ensures patient clinical medical profile exists
   */
  async ensurePatientMedicalProfile(patientId: string): Promise<void> {
    try {
      const existing = await this.medicalProfileRepo.findOne({
        where: { patient_id: patientId },
      });
      if (existing) return;

      const profile = this.medicalProfileRepo.create({
        patient_id: patientId,
        blood_group: 'O+',
        genotype: 'AA',
        allergies: 'Penicillin, Peanuts',
        chronic_conditions: 'Mild Seasonal Asthma',
      });
      await this.medicalProfileRepo.save(profile);
      this.logger.log(`Seeded medical profile for patient ${patientId}`);
    } catch (err: any) {
      this.logger.warn(`Could not seed patient medical profile: ${err.message}`);
    }
  }

  /**
   * Retrieves or creates seed doctor profiles in operational DB
   */
  private async ensureSeedDoctors(): Promise<DoctorProfile[]> {
    // The three demo doctors this seeder's consultations/notes are written against,
    // in the exact order doc1/doc2/doc3 expect them. Their specialties MUST line up
    // with the clinical content of each seeded note (GP -> respiratory infection,
    // etc.), so we resolve them by their known seed emails rather than by an
    // unordered "first 3 doctors in the DB" query, which previously stapled the
    // notes onto whichever unrelated doctors (dentist/dermatologist/dietician)
    // happened to be returned first.
    const doctorDefinitions = [
      {
        email: 'doctor@chekup247.com',
        name: 'Dr. Thabo Molefe',
        specialty: 'General Practitioner & Family Health',
        hpcsa: 'MP 0689432',
        practice: 'PR 0148291',
        rate: 450,
      },
      {
        email: 'dr.sarah@chekup247.com',
        name: 'Dr. Sarah Van Der Merwe',
        specialty: 'Specialist Paediatrician & Family Medicine',
        hpcsa: 'MP 0712345',
        practice: 'PR 0831102',
        rate: 650,
      },
      {
        email: 'dr.kevin@chekup247.com',
        name: 'Dr. Kevin Pillay',
        specialty: 'Family Physician & Sports Medicine',
        hpcsa: 'MP 0594321',
        practice: 'PR 0321190',
        rate: 420,
      },
    ];

    // Ensure each named demo doctor exists, then collect them IN DEFINITION ORDER.
    const orderedDoctors: DoctorProfile[] = [];

    for (const def of doctorDefinitions) {
      let user = await this.userRepo.findOne({ where: { email: def.email } });
      if (!user) {
        user = this.userRepo.create({
          email: def.email,
          password_hash: '$2b$10$wE43rLg/T/zC8w4K5q5NdeYlFm0.z5wX/5B4.2Q5O2Y1K5B4.2Q5O', // dummy hash
          full_name: def.name,
          role: UserRole.DOCTOR,
          status: UserStatus.ACTIVE,
          is_email_verified: true,
          email_verified_at: new Date(),
        });
        user = await this.userRepo.save(user);
      }

      let profile = await this.doctorProfileRepo.findOne({ where: { user_id: user.id } });
      if (!profile) {
        profile = this.doctorProfileRepo.create({
          user_id: user.id,
          hpcsa_number: def.hpcsa,
          specialty: def.specialty,
          slug: def.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          rate_per_hour: def.rate,
          rating_avg: 4.95,
          reviews_count: 54,
          experience_years: 10,
          verification_status: VerificationStatus.VERIFIED,
          verification_source: VerificationSource.PLATFORM,
        });
        profile = await this.doctorProfileRepo.save(profile);
      }
      profile.user = user;
      orderedDoctors.push(profile);
    }

    return orderedDoctors;
  }
}
