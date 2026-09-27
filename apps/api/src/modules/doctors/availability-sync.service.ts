import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThan, MoreThan } from 'typeorm';
import {
  DoctorProfile,
  AvailabilitySlot,
  DoctorBlackout,
  PlatformSetting,
} from '../../database/operational/entities';
import { envConfig } from '../../config/env.config';
import { isSlotBookable } from '../bookings/booking.constants';

export interface LocumStaffAvailabilityWindow {
  doctorId: string; // LocumStaff user UUID (maps to doctor.sso_external_id)
  start: string; // ISO timestamp
  end: string; // ISO timestamp
  branch?: {
    id: string;
    name: string;
    address: string;
  };
  inPerson?: boolean;
  virtual: boolean;
}

export interface AvailabilitySyncResult {
  totalWindowsFetched: number;
  virtualWindows: number;
  totalSlotsGenerated: number;
  slotsSkippedExisting: number;
  slotsSkippedBlackout: number;
  errors: number;
  durationMs: number;
}

@Injectable()
export class AvailabilitySyncService {
  private readonly logger = new Logger(AvailabilitySyncService.name);

  constructor(
    @InjectRepository(DoctorProfile, 'operational')
    private readonly doctorRepository: Repository<DoctorProfile>,
    @InjectRepository(AvailabilitySlot, 'operational')
    private readonly slotRepository: Repository<AvailabilitySlot>,
    @InjectRepository(DoctorBlackout, 'operational')
    private readonly blackoutRepository: Repository<DoctorBlackout>,
    @InjectRepository(PlatformSetting, 'operational')
    private readonly platformSettingRepository: Repository<PlatformSetting>,
  ) {}

  /**
   * Main sync orchestration method called by BullMQ processor or manual trigger
   */
  async syncAvailability(options?: {
    startDate?: string;
    endDate?: string;
    doctorId?: string;
  }): Promise<AvailabilitySyncResult> {
    const startTime = Date.now();
    this.logger.log('Starting LocumStaff Partner Availability sync job (BE-401)...');

    let windows: LocumStaffAvailabilityWindow[] = [];

    try {
      windows = await this.fetchFromLocumStaff(options);
    } catch (err: any) {
      const cause = (err as any)?.cause?.message || (err as any)?.cause?.code || '';
      const detailedError = cause ? `${err.message} (${cause})` : err.message;
      this.logger.warn(
        `Failed to fetch live LocumStaff availability (${detailedError}). Falling back to mock partner availability windows.`,
      );
      windows = await this.getMockAvailabilityWindows();
    }

    // Filter strictly for virtual = true
    const virtualWindows = windows.filter((w) => w.virtual === true);
    this.logger.log(
      `LocumStaff returned ${windows.length} availability windows; ${virtualWindows.length} are virtual-enabled.`,
    );

    // Fetch slot slicing configuration from PlatformSettings
    const settings = await this.platformSettingRepository.findOne({ order: { created_at: 'DESC' } });
    const slotDurationMinutes = settings?.default_slot_duration_minutes || 30;
    const bufferMinutes = settings?.default_buffer_minutes || 5;

    let totalSlotsGenerated = 0;
    let slotsSkippedExisting = 0;
    let slotsSkippedBlackout = 0;
    let errors = 0;

    for (const window of virtualWindows) {
      try {
        const result = await this.processDutyWindow(window, slotDurationMinutes, bufferMinutes);
        totalSlotsGenerated += result.generated;
        slotsSkippedExisting += result.skippedExisting;
        slotsSkippedBlackout += result.skippedBlackout;
      } catch (err: any) {
        errors++;
        this.logger.error(
          `Error processing duty window for doctor external id ${window.doctorId}: ${err.message}`,
          err.stack,
        );
      }
    }

    const durationMs = Date.now() - startTime;
    this.logger.log(
      `Availability sync finished in ${durationMs}ms: ${totalSlotsGenerated} slots created, ${slotsSkippedExisting} skipped existing, ${slotsSkippedBlackout} skipped blackout, ${errors} errors.`,
    );

    return {
      totalWindowsFetched: windows.length,
      virtualWindows: virtualWindows.length,
      totalSlotsGenerated,
      slotsSkippedExisting,
      slotsSkippedBlackout,
      errors,
      durationMs,
    };
  }

  /**
   * Fetch availability windows from remote LocumStaff Partner Directory
   */
  private async fetchFromLocumStaff(options?: {
    startDate?: string;
    endDate?: string;
    doctorId?: string;
  }): Promise<LocumStaffAvailabilityWindow[]> {
    const apiUrl = envConfig.LOCUMSTAFF_API_URL;
    const apiKey = envConfig.LOCUMSTAFF_DIRECTORY_API_KEY;

    if (!apiKey || apiUrl.includes('example.com') || apiUrl.includes('.example')) {
      this.logger.debug('No valid LocumStaff API key or live URL. Using mock partner availability dataset.');
      return this.getMockAvailabilityWindows();
    }

    const queryParams = new URLSearchParams();
    if (options?.startDate) queryParams.set('startDate', options.startDate);
    if (options?.endDate) queryParams.set('endDate', options.endDate);
    if (options?.doctorId) queryParams.set('doctorId', options.doctorId);

    const qs = queryParams.toString();
    const base = apiUrl.trim().replace(/\/+$/, '');
    const endpoint = base.endsWith('/v1')
      ? `${base}/partner-directory/availability`
      : `${base}/v1/partner-directory/availability`;
    const url = `${endpoint}${qs ? `?${qs}` : ''}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        headers: {
          'X-API-Key': apiKey,
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: any = await response.json();
      if (Array.isArray(data)) return data;
      if (data?.availability && Array.isArray(data.availability)) return data.availability;
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Slices a duty window into discrete appointment slots and saves them
   */
  async processDutyWindow(
    window: LocumStaffAvailabilityWindow,
    slotDurationMinutes: number = 30,
    bufferMinutes: number = 5,
  ): Promise<{ generated: number; skippedExisting: number; skippedBlackout: number }> {
    // 1. Identify doctor by sso_external_id or direct ID
    let doctor = await this.doctorRepository.findOne({
      where: [{ sso_external_id: window.doctorId }, { id: window.doctorId }],
    });

    if (!doctor) {
      // If doctor not yet matched by sso_external_id, check if any doctor has this external id
      doctor = await this.doctorRepository
        .createQueryBuilder('doc')
        .where('doc.sso_external_id = :extId', { extId: window.doctorId })
        .getOne();
    }

    if (!doctor) {
      this.logger.debug(
        `Doctor with external ID ${window.doctorId} not found locally in ChekUp247 directory. Skipping window.`,
      );
      return { generated: 0, skippedExisting: 0, skippedBlackout: 0 };
    }

    const windowStart = new Date(window.start);
    const windowEnd = new Date(window.end);

    if (isNaN(windowStart.getTime()) || isNaN(windowEnd.getTime()) || windowStart >= windowEnd) {
      this.logger.warn(`Invalid window timeframe: ${window.start} - ${window.end}`);
      return { generated: 0, skippedExisting: 0, skippedBlackout: 0 };
    }

    // 2. Fetch active blackout periods for this doctor overlapping the window
    const blackouts = await this.blackoutRepository.find({
      where: {
        doctor_id: doctor.id,
        start_time: LessThan(windowEnd),
        end_time: MoreThan(windowStart),
      },
    });

    // 3. Fetch existing slots for this doctor overlapping the window
    const existingSlots = await this.slotRepository.find({
      where: {
        doctor_id: doctor.id,
        start_time: LessThan(windowEnd),
        end_time: MoreThan(windowStart),
      },
    });

    const windowId = `${window.doctorId}-${window.start}`;
    let generated = 0;
    let skippedExisting = 0;
    let skippedBlackout = 0;

    const slotDurationMs = slotDurationMinutes * 60 * 1000;
    const bufferMs = bufferMinutes * 60 * 1000;

    let currentSlotStart = new Date(windowStart.getTime());

    while (true) {
      const currentSlotEnd = new Date(currentSlotStart.getTime() + slotDurationMs);

      // Check if candidate slot exceeds the shift boundary
      if (currentSlotEnd.getTime() > windowEnd.getTime()) {
        break;
      }

      // Skip slots with too little bookable time remaining (already started
      // with less than the minimum remaining, or fully in the past)
      if (!isSlotBookable(currentSlotEnd)) {
        currentSlotStart = new Date(currentSlotEnd.getTime() + bufferMs);
        continue;
      }

      // Check BE-405: Check against doctor blackouts
      const isInBlackout = blackouts.some((b) => {
        const bStart = new Date(b.start_time).getTime();
        const bEnd = new Date(b.end_time).getTime();
        return currentSlotStart.getTime() < bEnd && currentSlotEnd.getTime() > bStart;
      });

      if (isInBlackout) {
        skippedBlackout++;
        currentSlotStart = new Date(currentSlotEnd.getTime() + bufferMs);
        continue;
      }

      // Check BE-404: Check against existing slots (overlap prevention)
      const hasOverlap = existingSlots.some((s) => {
        const sStart = new Date(s.start_time).getTime();
        const sEnd = new Date(s.end_time).getTime();
        return currentSlotStart.getTime() < sEnd && currentSlotEnd.getTime() > sStart;
      });

      if (hasOverlap) {
        skippedExisting++;
        currentSlotStart = new Date(currentSlotEnd.getTime() + bufferMs);
        continue;
      }

      // Generate discrete record
      const slot = this.slotRepository.create({
        doctor_id: doctor.id,
        start_time: currentSlotStart,
        end_time: currentSlotEnd,
        is_booked: false,
        is_recurring: false,
        source: 'locumstaff',
        is_locked: true,
        external_window_id: windowId,
      });

      await this.slotRepository.save(slot);
      existingSlots.push(slot); // Update local cache to prevent self-collision
      generated++;

      // Advance by duration + buffer
      currentSlotStart = new Date(currentSlotEnd.getTime() + bufferMs);
    }

    return { generated, skippedExisting, skippedBlackout };
  }

  /**
   * Slices an arbitrary time window into discrete slots (reusable slicing engine utility)
   */
  sliceTimeWindow(
    start: Date,
    end: Date,
    slotDurationMinutes: number = 30,
    bufferMinutes: number = 5,
  ): Array<{ startTime: Date; endTime: Date }> {
    const slots: Array<{ startTime: Date; endTime: Date }> = [];
    const slotDurationMs = slotDurationMinutes * 60 * 1000;
    const bufferMs = bufferMinutes * 60 * 1000;

    let currentStart = new Date(start.getTime());

    while (true) {
      const currentEnd = new Date(currentStart.getTime() + slotDurationMs);
      if (currentEnd.getTime() > end.getTime()) break;

      slots.push({
        startTime: new Date(currentStart),
        endTime: new Date(currentEnd),
      });

      currentStart = new Date(currentEnd.getTime() + bufferMs);
    }

    return slots;
  }

  /**
   * Fallback mock availability windows for development / testing
   */
  async getMockAvailabilityWindows(): Promise<LocumStaffAvailabilityWindow[]> {
    // Look up existing doctors in database
    const doctors = await this.doctorRepository.find({
      take: 5,
      order: { created_at: 'ASC' },
    });

    const windows: LocumStaffAvailabilityWindow[] = [];
    const now = new Date();

    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      const date = new Date(now);
      date.setDate(now.getDate() + dayOffset);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const dd = String(date.getDate()).padStart(2, '0');

      // Schedule morning shift: 08:00 - 12:00
      // Schedule afternoon shift: 13:00 - 17:00
      for (const doctor of doctors) {
        const extId = doctor.sso_external_id || doctor.id;

        // Add morning window
        windows.push({
          doctorId: extId,
          start: `${yyyy}-${mm}-${dd}T08:00:00.000Z`,
          end: `${yyyy}-${mm}-${dd}T12:00:00.000Z`,
          virtual: true,
          inPerson: false,
          branch: {
            id: 'branch-sandton',
            name: 'ChekUp Virtual GP Hub',
            address: 'Sandton, Johannesburg',
          },
        });

        // Add afternoon window
        windows.push({
          doctorId: extId,
          start: `${yyyy}-${mm}-${dd}T13:00:00.000Z`,
          end: `${yyyy}-${mm}-${dd}T17:00:00.000Z`,
          virtual: true,
          inPerson: false,
          branch: {
            id: 'branch-sandton',
            name: 'ChekUp Virtual GP Hub',
            address: 'Sandton, Johannesburg',
          },
        });
      }
    }

    return windows;
  }
}
