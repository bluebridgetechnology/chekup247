import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AvailabilitySyncService } from './availability-sync.service';
import {
  DoctorProfile,
  AvailabilitySlot,
  DoctorBlackout,
  PlatformSetting,
} from '../../database/operational/entities';

describe('AvailabilitySyncService (BE-401)', () => {
  let service: AvailabilitySyncService;
  let mockDoctorRepo: any;
  let mockSlotRepo: any;
  let mockBlackoutRepo: any;
  let mockPlatformSettingRepo: any;

  const mockDoctor: Partial<DoctorProfile> = {
    id: 'doc-uuid-1',
    sso_external_id: 'locum-doc-ext-1',
    user_id: 'user-uuid-1',
  };

  beforeEach(async () => {
    mockDoctorRepo = {
      findOne: jest.fn().mockResolvedValue(mockDoctor),
      find: jest.fn().mockResolvedValue([mockDoctor]),
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockDoctor),
      }),
    };

    mockSlotRepo = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockImplementation((s) => Promise.resolve(s)),
      create: jest.fn().mockImplementation((s) => s),
    };

    mockBlackoutRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    mockPlatformSettingRepo = {
      findOne: jest.fn().mockResolvedValue({
        default_slot_duration_minutes: 30,
        default_buffer_minutes: 5,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilitySyncService,
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
      ],
    }).compile();

    service = module.get<AvailabilitySyncService>(AvailabilitySyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Slot Slicing Engine (BE-401)', () => {
    it('should correctly slice a 2-hour window into 30m slots with 5m buffers', () => {
      const start = new Date('2026-10-01T08:00:00.000Z');
      const end = new Date('2026-10-01T10:00:00.000Z');

      const slots = service.sliceTimeWindow(start, end, 30, 5);

      // 08:00 - 08:30 (Slot 1)
      // buffer: 08:30 - 08:35
      // 08:35 - 09:05 (Slot 2)
      // buffer: 09:05 - 09:10
      // 09:10 - 09:40 (Slot 3)
      // Next: 09:45 - 10:15 (exceeds 10:00, not created)
      expect(slots).toHaveLength(3);

      expect(slots[0].startTime.toISOString()).toBe('2026-10-01T08:00:00.000Z');
      expect(slots[0].endTime.toISOString()).toBe('2026-10-01T08:30:00.000Z');

      expect(slots[1].startTime.toISOString()).toBe('2026-10-01T08:35:00.000Z');
      expect(slots[1].endTime.toISOString()).toBe('2026-10-01T09:05:00.000Z');

      expect(slots[2].startTime.toISOString()).toBe('2026-10-01T09:10:00.000Z');
      expect(slots[2].endTime.toISOString()).toBe('2026-10-01T09:40:00.000Z');
    });

    it('should process virtual duty window and save locked locumstaff slots', async () => {
      const futureStart = new Date(Date.now() + 48 * 60 * 60 * 1000);
      futureStart.setHours(8, 0, 0, 0);
      const futureEnd = new Date(futureStart.getTime() + 4 * 60 * 60 * 1000); // 4 hours

      const window = {
        doctorId: 'locum-doc-ext-1',
        start: futureStart.toISOString(),
        end: futureEnd.toISOString(),
        virtual: true,
      };

      const result = await service.processDutyWindow(window, 30, 5);

      expect(result.generated).toBeGreaterThan(0);
      expect(mockSlotRepo.create).toHaveBeenCalled();
      const createArgs = mockSlotRepo.create.mock.calls[0][0];
      expect(createArgs.source).toBe('locumstaff');
      expect(createArgs.is_locked).toBe(true);
      expect(createArgs.is_booked).toBe(false);
    });

    it('should skip slots that fall inside a blackout period during slicing', async () => {
      const futureStart = new Date(Date.now() + 48 * 60 * 60 * 1000);
      futureStart.setHours(8, 0, 0, 0);
      const futureEnd = new Date(futureStart.getTime() + 4 * 60 * 60 * 1000);

      // Blackout from 08:30 to 12:00
      mockBlackoutRepo.find.mockResolvedValueOnce([
        {
          id: 'b-1',
          start_time: new Date(futureStart.getTime() + 30 * 60 * 1000),
          end_time: futureEnd,
        },
      ]);

      const window = {
        doctorId: 'locum-doc-ext-1',
        start: futureStart.toISOString(),
        end: futureEnd.toISOString(),
        virtual: true,
      };

      const result = await service.processDutyWindow(window, 30, 5);

      expect(result.generated).toBe(1); // Only 08:00 - 08:30 was generated
      expect(result.skippedBlackout).toBeGreaterThan(0);
    });
  });
});
