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
}

export class GetAvailabilityQueryDto {
  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
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
