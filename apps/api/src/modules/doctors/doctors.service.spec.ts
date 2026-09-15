import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { DirectorySyncService } from './directory-sync.service';
import { AvailabilitySyncService } from './availability-sync.service';
import { TokenService } from '../auth/token.service';
import {
  DoctorProfile,
  AvailabilitySlot,
  User,
  DoctorBlackout,
  PlatformSetting,
  VerificationStatus,
  VerificationSource,
} from '../../database/operational/entities';

describe('DoctorsService (Unit)', () => {
  let service: DoctorsService;
  let mockDoctorRepo: any;
  let mockSlotRepo: any;
  let mockBlackoutRepo: any;
  let mockPlatformSettingRepo: any;
  let mockUserRepo: any;
  let mockTokenService: any;
  let mockDirectorySyncService: any;
  let mockAvailabilitySyncService: any;

  const mockDoctor: Partial<DoctorProfile> = {
    id: 'b8e967a1-3001-4475-8167-91a5db4b4231',
    user_id: 'u-1',
    slug: 'dr-thabo-molefe',
    hpcsa_number: 'MP 0689432',
    specialty: 'General Practitioner',
    rate_per_hour: 850,
    rating_avg: 4.9,
    reviews_count: 58,
    verification_status: VerificationStatus.VERIFIED,
    verification_source: VerificationSource.LOCUMSTAFF,
    user: {
      id: 'u-1',
      full_name: 'Dr. Thabo Molefe',
      email: 'thabo.molefe@locumstaff.co.za',
    } as any,
  };

  beforeEach(async () => {
    const qb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockDoctor], 1]),
      getOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
    };

    mockDoctorRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      findOne: jest.fn().mockResolvedValue(mockDoctor),
      find: jest.fn().mockResolvedValue([mockDoctor]),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
      create: jest.fn().mockImplementation((d) => d),
    };

    mockSlotRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(qb),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((d) => Promise.resolve(Array.isArray(d) ? d : { id: 'slot-uuid', ...d })),
      create: jest.fn().mockImplementation((d) => ({ id: 'slot-uuid', ...d })),
      remove: jest.fn().mockResolvedValue(true),
    };

    mockBlackoutRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ id: 'blackout-uuid', ...d })),
      create: jest.fn().mockImplementation((d) => ({ id: 'blackout-uuid', ...d })),
      remove: jest.fn().mockResolvedValue(true),
    };

    mockPlatformSettingRepo = {
      findOne: jest.fn().mockResolvedValue({
        default_slot_duration_minutes: 30,
        default_buffer_minutes: 5,
      }),
    };

    mockUserRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
    };

    mockTokenService = {
      hashPassword: jest.fn().mockResolvedValue('hash'),
      generateAccessToken: jest.fn().mockReturnValue('token'),
    };

    mockDirectorySyncService = {
      syncDoctors: jest.fn().mockResolvedValue({ created: 6, updated: 0 }),
    };

    mockAvailabilitySyncService = {
      syncAvailability: jest.fn().mockResolvedValue({ totalSlotsGenerated: 12 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorsService,
        {
          provide: getRepositoryToken(DoctorProfile, 'operational'),
          useValue: mockDoctorRepo,
        },
        {
          provide: getRepositoryToken(AvailabilitySlot, 'operational'),
          useValue: mockSlotRepo,
        },
        {
          provide: getRepositoryToken(DoctorBlackout, 'operational'),
          useValue: mockBlackoutRepo,
        },
        {
          provide: getRepositoryToken(PlatformSetting, 'operational'),
          useValue: mockPlatformSettingRepo,
        },
        {
          provide: getRepositoryToken(User, 'operational'),
          useValue: mockUserRepo,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        {
          provide: DirectorySyncService,
          useValue: mockDirectorySyncService,
        },
        {
          provide: AvailabilitySyncService,
          useValue: mockAvailabilitySyncService,
        },
      ],
    }).compile();

    service = module.get<DoctorsService>(DoctorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should query doctors directory with pagination and filters', async () => {
    const result = await service.getDoctorsDirectory({
      specialty: 'General Practitioner',
      ratingMin: 4,
      page: 1,
      limit: 10,
    });

    expect(result.doctors).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.totalPages).toBe(1);
    expect(mockDoctorRepo.createQueryBuilder).toHaveBeenCalledWith('doctor');
  });

  describe('BE-402 & BE-404: Slot creation & overlap validation', () => {
    it('should successfully create a single unbooked direct slot in the future', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotStart = new Date(tomorrow);
      slotStart.setHours(9, 0, 0, 0);
      const slotEnd = new Date(tomorrow);
      slotEnd.setHours(9, 30, 0, 0);

      const created = await service.createSingleSlot('u-1', {
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
      });

      expect(created).toBeDefined();
      expect(created.source).toBe('direct');
      expect(created.is_booked).toBe(false);
      expect(created.is_locked).toBe(false);
      expect(mockSlotRepo.save).toHaveBeenCalled();
    });

    it('should reject slot creation if startTime >= endTime', async () => {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const slotStart = new Date(tomorrow);
      slotStart.setHours(10, 0, 0, 0);
      const slotEnd = new Date(tomorrow);
      slotEnd.setHours(9, 30, 0, 0);

      await expect(
        service.createSingleSlot('u-1', {
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject creating a slot in the past', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const slotStart = new Date(yesterday);
      slotStart.setHours(9, 0, 0, 0);
      const slotEnd = new Date(yesterday);
      slotEnd.setHours(9, 30, 0, 0);

      await expect(
        service.createSingleSlot('u-1', {
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject creating a slot that conflicts with an active blackout (BE-405)', async () => {
      mockBlackoutRepo.findOne.mockResolvedValueOnce({
        id: 'b-1',
        reason: 'Annual Leave',
      });

      const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const slotStart = new Date(futureDate);
      slotStart.setHours(9, 0, 0, 0);
      const slotEnd = new Date(futureDate);
      slotEnd.setHours(9, 30, 0, 0);

      await expect(
        service.createSingleSlot('u-1', {
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject creating a slot that overlaps with an existing slot (BE-404)', async () => {
      const mockQb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValueOnce({
          id: 'existing-slot',
          start_time: new Date(),
          end_time: new Date(),
        }),
      };
      mockSlotRepo.createQueryBuilder.mockReturnValueOnce(mockQb);

      const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const slotStart = new Date(futureDate);
      slotStart.setHours(9, 0, 0, 0);
      const slotEnd = new Date(futureDate);
      slotEnd.setHours(9, 30, 0, 0);

      await expect(
        service.createSingleSlot('u-1', {
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('BE-402: Slot deletion rules', () => {
    it('should successfully delete an unbooked future direct slot', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      mockSlotRepo.findOne.mockResolvedValueOnce({
        id: 'slot-1',
        doctor_id: mockDoctor.id,
        start_time: futureDate,
        is_booked: false,
        source: 'direct',
        is_locked: false,
      });

      const res = await service.deleteSlot('u-1', 'slot-1');
      expect(res.deletedSlotId).toBe('slot-1');
      expect(mockSlotRepo.remove).toHaveBeenCalled();
    });

    it('should refuse to delete an already booked slot', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      mockSlotRepo.findOne.mockResolvedValueOnce({
        id: 'slot-booked',
        doctor_id: mockDoctor.id,
        start_time: futureDate,
        is_booked: true,
        source: 'direct',
      });

      await expect(service.deleteSlot('u-1', 'slot-booked')).rejects.toThrow(BadRequestException);
    });

    it('should refuse to delete a LocumStaff-synced locked slot (DP-404)', async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
      mockSlotRepo.findOne.mockResolvedValueOnce({
        id: 'slot-locum',
        doctor_id: mockDoctor.id,
        start_time: futureDate,
        is_booked: false,
        source: 'locumstaff',
        is_locked: true,
      });

      await expect(service.deleteSlot('u-1', 'slot-locum')).rejects.toThrow(BadRequestException);
    });
  });

  describe('BE-403: Public doctor availability query API', () => {
    it('should return normalized UTC slots grouped by date', async () => {
      const future1 = new Date(Date.now() + 24 * 60 * 60 * 1000);
      future1.setHours(10, 0, 0, 0);
      const future1End = new Date(future1.getTime() + 30 * 60 * 1000);

      mockSlotRepo.find.mockResolvedValueOnce([
        {
          id: 'slot-public-1',
          doctor_id: mockDoctor.id,
          start_time: future1,
          end_time: future1End,
          is_booked: false,
          source: 'direct',
          is_locked: false,
        },
      ]);

      const res = await service.getPublicDoctorAvailability('dr-thabo-molefe', {});
      expect(res).toBeDefined();
      expect(res.slug).toBe('dr-thabo-molefe');
      expect(res.totalSlots).toBe(1);
      expect(res.groupedByDate).toBeDefined();
      expect(res.slots[0].startTime).toBe(future1.toISOString());
    });
  });

  describe('BE-405: Doctor holiday and blackout date management', () => {
    it('should create blackout and automatically cancel unbooked slots in the range', async () => {
      const futureStart = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
      const futureEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

      mockSlotRepo.find.mockResolvedValueOnce([
        { id: 'unbooked-slot-1', is_booked: false },
        { id: 'unbooked-slot-2', is_booked: false },
      ]);

      const res = await service.createBlackout('u-1', {
        startTime: futureStart.toISOString(),
        endTime: futureEnd.toISOString(),
        reason: 'Medical Conference in Durban',
      });

      expect(res.blackout).toBeDefined();
      expect(res.cancelledSlotsCount).toBe(2);
      expect(mockSlotRepo.remove).toHaveBeenCalled();
    });
  });
});
