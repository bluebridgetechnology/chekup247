import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { BadRequestException } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionPdfService } from './prescription-pdf.service';
import { StorageService } from '../storage/storage.service';
import { ConsultationGateway } from '../consultations/consultation.gateway';
import { QUEUES } from '../queues/queue.constants';
import {
  Prescription,
  Consultation,
  Booking,
  BookingStatus,
} from '../../database/patient/entities';
import { DoctorProfile, User, AuditLog } from '../../database/operational/entities';

describe('PrescriptionsService (Sprint 7 E-Prescriptions & S5/S6 Compliance)', () => {
  let service: PrescriptionsService;
  let pdfService: PrescriptionPdfService;
  let storageService: StorageService;
  let gateway: ConsultationGateway;

  const mockPrescriptionRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn().mockImplementation((dto) => ({ id: 'rx-test-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'rx-test-1', ...entity })),
  };

  const mockConsultationRepo = {
    findOne: jest.fn(),
  };

  const mockBookingRepo = {
    findOne: jest.fn(),
  };

  const mockDoctorProfileRepo = {
    findOne: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockAuditLogRepo = {
    create: jest.fn().mockImplementation((dto) => ({ id: 'audit-1', ...dto })),
    save: jest.fn().mockImplementation((entity) => Promise.resolve({ id: 'audit-1', ...entity })),
  };

  const mockStorageService = {
    uploadBuffer: jest.fn().mockResolvedValue({
      key: 'prescriptions/rx-test-1.pdf',
      location: 'http://minio:9000/chekup-documents/prescriptions/rx-test-1.pdf',
    }),
  };

  const mockGateway = {
    broadcastPrescriptionIssued: jest.fn(),
  };

  const mockNotificationQueue = {
    add: jest.fn().mockResolvedValue({ id: 'job-notif-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionsService,
        PrescriptionPdfService,
        {
          provide: getRepositoryToken(Prescription, 'patient'),
          useValue: mockPrescriptionRepo,
        },
        {
          provide: getRepositoryToken(Consultation, 'patient'),
          useValue: mockConsultationRepo,
        },
        {
          provide: getRepositoryToken(Booking, 'patient'),
          useValue: mockBookingRepo,
        },
        {
          provide: getRepositoryToken(DoctorProfile, 'operational'),
          useValue: mockDoctorProfileRepo,
        },
        {
          provide: getRepositoryToken(User, 'operational'),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(AuditLog, 'operational'),
          useValue: mockAuditLogRepo,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
        {
          provide: ConsultationGateway,
          useValue: mockGateway,
        },
        {
          provide: getQueueToken(QUEUES.NOTIFICATIONS),
          useValue: mockNotificationQueue,
        },
      ],
    }).compile();

    service = module.get<PrescriptionsService>(PrescriptionsService);
    pdfService = module.get<PrescriptionPdfService>(PrescriptionPdfService);
    storageService = module.get<StorageService>(StorageService);
    gateway = module.get<ConsultationGateway>(ConsultationGateway);

    jest.clearAllMocks();
  });

  describe('BE-702 & BE-703: E-Prescription Creation & S5/S6 Compliance', () => {
    it('should reject prescription if ICD-10 code is missing', async () => {
      mockConsultationRepo.findOne.mockResolvedValue({
        id: 'cons-1',
        booking: { id: 'b-1', doctor_id: 'doc-1', patient_id: 'pat-1' },
      });

      await expect(
        service.createPrescription('doc-1', {
          consultationId: 'cons-1',
          icd10Code: '',
          medications: [
            { name: 'Panado 500mg', dosage: '2 tabs', duration: '5 days', instructions: 'Oral' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject prescription if medications list is empty', async () => {
      mockConsultationRepo.findOne.mockResolvedValue({
        id: 'cons-1',
        booking: { id: 'b-1', doctor_id: 'doc-1', patient_id: 'pat-1' },
      });

      await expect(
        service.createPrescription('doc-1', {
          consultationId: 'cons-1',
          icd10Code: 'J06.9',
          medications: [],
        }),
      ).rejects.toThrow('at least one prescribed medication');
    });

    it('should strictly require supervision declaration for Schedule 5 & 6 substances (BE-703)', async () => {
      mockConsultationRepo.findOne.mockResolvedValue({
        id: 'cons-1',
        booking: { id: 'b-1', doctor_id: 'doc-1', patient_id: 'pat-1' },
      });

      // Prescription contains Schedule 5 drug without supervision declaration!
      await expect(
        service.createPrescription('doc-1', {
          consultationId: 'cons-1',
          icd10Code: 'F41.1',
          medications: [
            {
              name: 'Xanax 0.5mg',
              dosage: '1 tab',
              duration: '7 days',
              instructions: 'Nocte',
              schedule_flag: 'S5',
            },
          ],
          scheduleFlag: 'S5',
          supervisionDeclaration: '', // Missing!
        }),
      ).rejects.toThrow('Telehealth Supervision Declaration in compliance with HPCSA');
    });

    it('should log audit record and issue S5/S6 prescription when supervision declaration is present (BE-703)', async () => {
      mockConsultationRepo.findOne.mockResolvedValue({
        id: 'cons-1',
        booking: { id: 'b-1', doctor_id: 'doc-1', patient_id: 'pat-1' },
      });

      mockDoctorProfileRepo.findOne.mockResolvedValue({
        hpcsa_number: 'MP 0765432',
        specialty: 'Family Physician',
        user: { full_name: 'Dr. John Doe' },
      });

      mockUserRepo.findOne.mockResolvedValue({
        id: 'pat-1',
        full_name: 'Jane Patient',
        email: 'jane@example.com',
        phone: '0821234567',
      });

      const declaration =
        'I hereby declare that this Schedule 5 prescription follows an interactive video assessment in accordance with HPCSA regulations.';

      const result = await service.createPrescription('doc-1', {
        consultationId: 'cons-1',
        icd10Code: 'F41.1',
        medications: [
          {
            name: 'Valium 5mg',
            dosage: '1 tab',
            duration: '5 days',
            instructions: 'Take 1 tablet at night',
            schedule_flag: 'S5',
          },
        ],
        scheduleFlag: 'S5',
        supervisionDeclaration: declaration,
      });

      expect(result).toBeDefined();
      expect(result.schedule_flag).toBe('S5');
      expect(result.supervision_declaration).toBe(declaration);
      expect(mockAuditLogRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SCHEDULE_5_6_PRESCRIPTION_ISSUED',
        }),
      );
      expect(mockStorageService.uploadBuffer).toHaveBeenCalled();
      expect(mockGateway.broadcastPrescriptionIssued).toHaveBeenCalled();
    });

    it('should successfully generate tamper-evident PDF buffer (BE-706)', async () => {
      const mockPrescription: any = {
        id: 'rx-pdf-test',
        icd10_code: 'J06.9',
        schedule_flag: 'S4',
        medications: [
          {
            name: 'Augmentin 625mg',
            dosage: '1 tablet 12-hourly',
            duration: '5 days',
            instructions: 'Take with food',
            nappi_code: '706035001',
            schedule_flag: 'S4',
          },
        ],
        issued_at: new Date(),
      };

      const buffer = await pdfService.generatePrescriptionPdf(
        mockPrescription,
        {
          name: 'Dr. Thabo Mokoena',
          hpcsa_number: 'MP 0987654',
          specialty: 'General Practitioner',
        },
        {
          name: 'Sarah Smith',
          email: 'sarah@test.com',
          phone: '0712345678',
        },
      );

      expect(buffer).toBeDefined();
      expect(Buffer.isBuffer(buffer)).toBe(true);
      expect(buffer.length).toBeGreaterThan(1000);
      // PDF magic bytes %PDF
      expect(buffer.toString('utf8', 0, 4)).toBe('%PDF');
    });
  });
});
