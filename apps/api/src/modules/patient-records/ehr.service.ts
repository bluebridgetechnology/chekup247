import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import {
  Booking,
  Consultation,
  Prescription,
  PatientMedicalProfile,
  PatientDocument,
  PatientVital,
  PatientProblem,
  PatientProblemStatus,
} from '../../database/patient/entities';
import { AvailabilitySlot, User } from '../../database/operational/entities';
import { PATIENT_RECORDS_DDL } from '../../database/patient/patient-records.schema';
import { envConfig } from '../../config/env.config';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import { AccessUser, PatientAccessService, TREATING_BOOKING_STATUSES } from './patient-access.service';
import { CreateProblemDto, CreateVitalDto, UpdatePatientProfileDto, UpdateProblemDto } from './ehr.dto';

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

const VITAL_FIELDS = [
  'bp_systolic',
  'bp_diastolic',
  'heart_rate',
  'respiratory_rate',
  'temperature_c',
  'spo2',
  'weight_kg',
  'height_cm',
  'glucose_mmol',
] as const;

/** Parses the SOAP JSON the consultation screen saves; falls back to plain text. */
export function parseClinicalNotes(raw: string | null | undefined) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        chief_complaint: parsed.chiefComplaint || '',
        history: parsed.hpi || '',
        assessment: parsed.assessment || '',
        plan: parsed.plan || '',
        patient_instructions: parsed.patientInstructions || '',
      };
    }
  } catch {
    /* not JSON */
  }
  return { chief_complaint: raw, history: '', assessment: '', plan: '', patient_instructions: '' };
}

/**
 * Electronic health record for doctors.
 *  - Patient-level data (profile, problems, vitals, documents) is visible to any doctor who has a
 *    confirmed/completed booking with the patient.
 *  - Encounter-level data (visit notes, prescriptions) is limited to the viewing doctor's own visits.
 * Every read and write is audit-logged (POPIA).
 */
@Injectable()
export class EhrService implements OnModuleInit {
  private readonly logger = new Logger(EhrService.name);

  constructor(
    @InjectRepository(Booking, 'patient') private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Consultation, 'patient') private readonly consultationRepository: Repository<Consultation>,
    @InjectRepository(Prescription, 'patient') private readonly prescriptionRepository: Repository<Prescription>,
    @InjectRepository(PatientMedicalProfile, 'patient') private readonly profileRepository: Repository<PatientMedicalProfile>,
    @InjectRepository(PatientDocument, 'patient') private readonly documentRepository: Repository<PatientDocument>,
    @InjectRepository(PatientVital, 'patient') private readonly vitalRepository: Repository<PatientVital>,
    @InjectRepository(PatientProblem, 'patient') private readonly problemRepository: Repository<PatientProblem>,
    @InjectRepository(User, 'operational') private readonly userRepository: Repository<User>,
    @InjectRepository(AvailabilitySlot, 'operational') private readonly slotRepository: Repository<AvailabilitySlot>,
    private readonly access: PatientAccessService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  async onModuleInit() {
    // Safety net mirroring migration 1761350000000 (prod may run neither migrations nor synchronize)
    try {
      for (const statement of PATIENT_RECORDS_DDL) await this.vitalRepository.query(statement);
    } catch (err: any) {
      this.logger.warn(`EHR table check failed: ${err.message}`);
    }
  }

  private log(user: AccessUser, patientId: string | undefined, action: string, meta: RequestMeta, metadata?: Record<string, any>) {
    return this.audit.logHealthRecordAccess({
      userId: this.access.userId(user) || undefined,
      userRole: user.role || 'doctor',
      patientId,
      action,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata,
    });
  }

  // ───────────────────────── My patients ─────────────────────────

  async listMyPatients(user: AccessUser, query: string | undefined, meta: RequestMeta) {
    if (!this.access.isDoctor(user)) throw new ForbiddenException('Only doctors have a patient list');
    const doctorIds = await this.access.doctorIds(user);

    const bookings = await this.bookingRepository.find({
      where: { doctor_id: In(doctorIds), status: In(TREATING_BOOKING_STATUSES) },
      order: { created_at: 'DESC' },
      take: 5000,
    });
    if (bookings.length === 0) return [];

    const [consultations, slots, users] = await Promise.all([
      this.consultationRepository.find({ where: { booking_id: In(bookings.map((b) => b.id)) } }),
      this.slotRepository.find({ where: { id: In([...new Set(bookings.map((b) => b.slot_id))]) } }),
      this.userRepository.find({ where: { id: In([...new Set(bookings.map((b) => b.patient_id))]) } }),
    ]);
    const consultByBooking = new Map(consultations.map((c) => [c.booking_id, c]));
    const slotById = new Map(slots.map((s) => [s.id, s]));
    const userById = new Map(users.map((u) => [u.id, u]));
    const now = Date.now();

    const byPatient = new Map<string, any>();
    for (const b of bookings) {
      const when = (consultByBooking.get(b.id)?.started_at || slotById.get(b.slot_id)?.start_time || b.created_at) as Date;
      const u = userById.get(b.patient_id);
      const row =
        byPatient.get(b.patient_id) ||
        {
          patient_id: b.patient_id,
          full_name: u?.full_name || 'Patient',
          email: u?.email || '',
          phone: u?.phone || '',
          date_of_birth: u?.date_of_birth || null,
          visits: 0,
          last_visit_at: null as Date | null,
          next_appointment_at: null as Date | null,
        };
      const t = new Date(when).getTime();
      if (b.status === 'completed') {
        row.visits += 1;
        if (!row.last_visit_at || t > new Date(row.last_visit_at).getTime()) row.last_visit_at = when;
      } else if (t >= now && (!row.next_appointment_at || t < new Date(row.next_appointment_at).getTime())) {
        row.next_appointment_at = when;
      }
      byPatient.set(b.patient_id, row);
    }

    const q = (query || '').trim().toLowerCase();
    const rows = [...byPatient.values()].filter(
      (r) => !q || r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || (r.phone || '').includes(q),
    );
    rows.sort((a, b) => {
      const ta = new Date(a.last_visit_at || a.next_appointment_at || 0).getTime();
      const tb = new Date(b.last_visit_at || b.next_appointment_at || 0).getTime();
      return tb - ta;
    });

    await this.log(user, undefined, 'VIEW_MY_PATIENTS_LIST', meta, { count: rows.length });
    return rows;
  }

  // ───────────────────────── Patient chart ─────────────────────────

  async getChart(user: AccessUser, patientId: string, meta: RequestMeta) {
    await this.access.assertTreatingDoctor(user, patientId);

    const patient = await this.userRepository.findOne({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Patient not found');

    const doctorIds = await this.access.doctorIds(user);
    const [profile, problems, vitals, documents, myBookings] = await Promise.all([
      this.profileRepository.findOne({ where: { patient_id: patientId } }),
      this.problemRepository.find({ where: { patient_id: patientId }, order: { created_at: 'DESC' } }),
      this.vitalRepository.find({ where: { patient_id: patientId }, order: { recorded_at: 'DESC' }, take: 50 }),
      this.documentRepository.find({ where: { patient_id: patientId }, order: { created_at: 'DESC' } }),
      this.bookingRepository.find({
        where: { patient_id: patientId, doctor_id: In(doctorIds), status: In(TREATING_BOOKING_STATUSES) },
        order: { created_at: 'DESC' },
        take: 100,
      }),
    ]);

    const bookingIds = myBookings.map((b) => b.id);
    const consultations = bookingIds.length ? await this.consultationRepository.find({ where: { booking_id: In(bookingIds) } }) : [];
    const consultByBooking = new Map(consultations.map((c) => [c.booking_id, c]));
    const prescriptions = consultations.length
      ? await this.prescriptionRepository.find({ where: { consultation_id: In(consultations.map((c) => c.id)) }, order: { issued_at: 'DESC' } })
      : [];
    const slots = myBookings.length ? await this.slotRepository.find({ where: { id: In(myBookings.map((b) => b.slot_id)) } }) : [];
    const slotById = new Map(slots.map((s) => [s.id, s]));

    const encounters = myBookings
      .map((b) => {
        const c = consultByBooking.get(b.id);
        const at = (c?.started_at || slotById.get(b.slot_id)?.start_time || b.created_at) as Date;
        const rx = prescriptions.filter((p) => c && p.consultation_id === c.id);
        return {
          booking_id: b.id,
          at,
          status: b.status,
          mode: b.consultation_mode || 'video',
          reason: b.reason_category || null,
          patient_note: b.notes || null,
          notes: parseClinicalNotes(c?.doctor_notes),
          prescriptions: rx.map((p) => ({
            id: p.id,
            icd10_code: p.icd10_code,
            issued_at: p.issued_at,
            schedule_flag: p.schedule_flag,
            medications: Array.isArray(p.medications) ? p.medications : [],
          })),
        };
      })
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    const documentsWithUrls = await Promise.all(
      documents.map(async (d) => {
        let downloadUrl: string | null = null;
        try {
          downloadUrl = (await this.storage.getPresignedDownloadUrl(envConfig.STORAGE_BUCKET_DOCUMENTS, d.s3_key)).downloadUrl;
        } catch {
          downloadUrl = null;
        }
        return {
          id: d.id,
          title: d.title,
          category: d.category,
          original_filename: d.original_filename,
          created_at: d.created_at,
          downloadUrl,
        };
      }),
    );

    await this.log(user, patientId, 'VIEW_PATIENT_CHART', meta);

    return {
      patient: {
        id: patient.id,
        full_name: patient.full_name,
        email: patient.email,
        phone: patient.phone,
        date_of_birth: patient.date_of_birth,
        gender: (patient as any).gender || null,
      },
      profile: {
        blood_group: profile?.blood_group ?? null,
        genotype: profile?.genotype ?? null,
        allergies: profile?.allergies ?? null,
        chronic_conditions: profile?.chronic_conditions ?? null,
        updated_at: profile?.updated_at ?? null,
      },
      problems,
      vitals,
      encounters,
      documents: documentsWithUrls,
    };
  }

  // ───────────────────────── Writes ─────────────────────────

  async updateProfile(user: AccessUser, patientId: string, dto: UpdatePatientProfileDto, meta: RequestMeta) {
    await this.access.assertTreatingDoctor(user, patientId);
    let profile = await this.profileRepository.findOne({ where: { patient_id: patientId } });
    if (!profile) profile = this.profileRepository.create({ patient_id: patientId });
    const changed: string[] = [];
    for (const key of ['blood_group', 'genotype', 'allergies', 'chronic_conditions'] as const) {
      if (dto[key] !== undefined) {
        const next = typeof dto[key] === 'string' ? (dto[key] as string).trim() || null : null;
        if (profile[key] !== next) changed.push(key);
        profile[key] = next;
      }
    }
    const saved = await this.profileRepository.save(profile);
    await this.log(user, patientId, 'UPDATE_PATIENT_PROFILE', meta, { fields: changed });
    return saved;
  }

  async addVital(user: AccessUser, patientId: string, dto: CreateVitalDto, meta: RequestMeta) {
    await this.access.assertTreatingDoctor(user, patientId);
    if (!VITAL_FIELDS.some((f) => dto[f] !== undefined && dto[f] !== null)) {
      throw new BadRequestException('Enter at least one measurement');
    }
    if ((dto.bp_systolic !== undefined) !== (dto.bp_diastolic !== undefined)) {
      throw new BadRequestException('Blood pressure needs both systolic and diastolic values');
    }
    if (dto.bp_systolic !== undefined && dto.bp_diastolic !== undefined && dto.bp_diastolic >= dto.bp_systolic) {
      throw new BadRequestException('Diastolic pressure must be lower than systolic');
    }
    const vital = this.vitalRepository.create({
      patient_id: patientId,
      recorded_by: this.access.userId(user)!,
      booking_id: dto.booking_id ?? null,
      recorded_at: dto.recorded_at ? new Date(dto.recorded_at) : new Date(),
      notes: dto.notes?.trim() || null,
      ...Object.fromEntries(VITAL_FIELDS.map((f) => [f, dto[f] ?? null])),
    } as Partial<PatientVital>);
    const saved = await this.vitalRepository.save(vital);
    await this.log(user, patientId, 'ADD_PATIENT_VITALS', meta, { vitalId: saved.id });
    return saved;
  }

  async deleteVital(user: AccessUser, patientId: string, vitalId: string, meta: RequestMeta) {
    await this.access.assertTreatingDoctor(user, patientId);
    const vital = await this.vitalRepository.findOne({ where: { id: vitalId, patient_id: patientId } });
    if (!vital) throw new NotFoundException('Vitals entry not found');
    if (vital.recorded_by !== this.access.userId(user)) {
      throw new ForbiddenException('Only the doctor who recorded these vitals can remove them');
    }
    await this.vitalRepository.delete(vital.id);
    await this.log(user, patientId, 'DELETE_PATIENT_VITALS', meta, { vitalId });
    return { deleted: true };
  }

  async addProblem(user: AccessUser, patientId: string, dto: CreateProblemDto, meta: RequestMeta) {
    await this.access.assertTreatingDoctor(user, patientId);
    const description = dto.description?.trim();
    if (!description) throw new BadRequestException('A description is required');
    const problem = await this.problemRepository.save(
      this.problemRepository.create({
        patient_id: patientId,
        added_by: this.access.userId(user)!,
        description,
        icd10_code: dto.icd10_code?.trim().toUpperCase() || null,
        onset_date: dto.onset_date ? dto.onset_date.slice(0, 10) : null,
        notes: dto.notes?.trim() || null,
        status: PatientProblemStatus.ACTIVE,
      }),
    );
    await this.log(user, patientId, 'ADD_PATIENT_PROBLEM', meta, { problemId: problem.id, icd10Code: problem.icd10_code });
    return problem;
  }

  async updateProblem(user: AccessUser, patientId: string, problemId: string, dto: UpdateProblemDto, meta: RequestMeta) {
    await this.access.assertTreatingDoctor(user, patientId);
    const problem = await this.problemRepository.findOne({ where: { id: problemId, patient_id: patientId } });
    if (!problem) throw new NotFoundException('Problem not found');

    if (dto.description !== undefined) {
      const d = dto.description.trim();
      if (!d) throw new BadRequestException('A description is required');
      problem.description = d;
    }
    if (dto.icd10_code !== undefined) problem.icd10_code = dto.icd10_code.trim().toUpperCase() || null;
    if (dto.onset_date !== undefined) problem.onset_date = dto.onset_date ? dto.onset_date.slice(0, 10) : null;
    if (dto.notes !== undefined) problem.notes = dto.notes.trim() || null;
    if (dto.status && dto.status !== problem.status) {
      problem.status = dto.status as PatientProblemStatus;
      problem.resolved_at = dto.status === 'resolved' ? new Date() : null;
    }
    const saved = await this.problemRepository.save(problem);
    await this.log(user, patientId, 'UPDATE_PATIENT_PROBLEM', meta, { problemId, status: saved.status });
    return saved;
  }
}
