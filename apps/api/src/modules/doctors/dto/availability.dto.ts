import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
  IsDateString,
  Matches,
} from 'class-validator';

export class CreateSingleSlotDto {
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @IsNotEmpty()
  @IsDateString()
  endTime: string;
}

export class CreateRecurringAvailabilityDto {
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek: number[]; // 0=Sunday, 1=Monday, ... 6=Saturday

  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm 24-hour format (e.g. 08:30)',
  })
  startTime: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:mm 24-hour format (e.g. 16:30)',
  })
  endTime: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(120)
  slotDurationMinutes?: number = 30;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  bufferMinutes?: number = 5;

  @IsNotEmpty()
  @IsString()
  startDate: string; // YYYY-MM-DD or ISO string

  @IsNotEmpty()
  @IsString()
  endDate: string; // YYYY-MM-DD or ISO string

  /** IANA timezone the HH:mm times are expressed in (e.g. "Africa/Johannesburg"). Defaults to the server's. */
  @IsOptional()
  @IsString()
  timeZone?: string;
}

export class GetAvailabilityQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  /** The viewer's own slot-hold token, so their held time still shows as theirs. */
  @IsOptional()
  @IsString()
  holdToken?: string;
}

export class CreateBlackoutDto {
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @IsNotEmpty()
  @IsDateString()
  endTime: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class BatchDeleteSlotsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  slotIds?: string[];

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
