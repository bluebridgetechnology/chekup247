import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class UpdatePatientProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  blood_group?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  genotype?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  allergies?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  chronic_conditions?: string | null;
}

export class CreateVitalDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(40) @Max(300)
  bp_systolic?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(20) @Max(200)
  bp_diastolic?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(20) @Max(300)
  heart_rate?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(4) @Max(80)
  respiratory_rate?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(25) @Max(45)
  temperature_c?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(40) @Max(100)
  spo2?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(500)
  weight_kg?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(30) @Max(260)
  height_cm?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.5) @Max(80)
  glucose_mmol?: number;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;

  @IsOptional() @IsUUID()
  booking_id?: string;

  @IsOptional() @IsDateString()
  recorded_at?: string;
}

export class CreateProblemDto {
  @IsString() @MaxLength(255)
  description: string;

  @IsOptional() @IsString() @MaxLength(20)
  icd10_code?: string;

  @IsOptional() @IsDateString()
  onset_date?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}

export class UpdateProblemDto {
  @IsOptional() @IsString() @MaxLength(255)
  description?: string;

  @IsOptional() @IsString() @MaxLength(20)
  icd10_code?: string;

  @IsOptional() @IsIn(['active', 'resolved'])
  status?: 'active' | 'resolved';

  @IsOptional() @IsDateString()
  onset_date?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  notes?: string;
}
