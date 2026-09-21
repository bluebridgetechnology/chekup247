import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
  IsBoolean,
  IsEmail,
  Min,
  MinLength,
} from 'class-validator';

export class OnboardDoctorDto {
  @IsNotEmpty({ message: 'HPCSA registration number is required' })
  @IsString()
  hpcsa_number: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsNotEmpty({ message: 'Hourly consultation rate is required' })
  @IsNumber()
  @Min(0, { message: 'Hourly rate must be a positive value' })
  rate_per_hour: number;

  @IsNotEmpty({ message: 'Doctor clinical biography is required' })
  @IsString()
  bio: string;

  @IsArray()
  @IsOptional()
  documents_url?: string[];

  @IsOptional()
  @IsBoolean()
  offers_in_clinic?: boolean;

  @IsOptional()
  @IsString()
  facility_name?: string;

  @IsOptional()
  @IsString()
  facility_address?: string;

  // If registering as a new user directly:
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid email address' })
  email?: string;

  @IsOptional()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class UpdateDoctorProfileDto {
  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rate_per_hour?: number;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsArray()
  documents_url?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  consultation_types?: string[];

  @IsOptional()
  @IsBoolean()
  offers_video?: boolean;

  @IsOptional()
  @IsBoolean()
  offers_audio?: boolean;

  @IsOptional()
  @IsBoolean()
  offers_in_clinic?: boolean;

  @IsOptional()
  @IsString()
  facility_name?: string;

  @IsOptional()
  @IsString()
  facility_address?: string;

  @IsOptional()
  @IsBoolean()
  accepts_medical_aid?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  experience_years?: number;

  @IsOptional()
  @IsBoolean()
  is_board_certified?: boolean;

  @IsOptional()
  @IsString()
  board_certification_title?: string;

  @IsOptional()
  @IsBoolean()
  is_on_holiday?: boolean;

  @IsOptional()
  @IsString()
  signature_url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  secondary_specialties?: string[];

  @IsOptional()
  @IsString()
  bank_name?: string;

  @IsOptional()
  @IsString()
  account_number?: string;

  @IsOptional()
  @IsString()
  branch_code?: string;

  @IsOptional()
  @IsString()
  account_type?: string;

  @IsOptional()
  @IsString()
  account_holder?: string;

  @IsOptional()
  @IsString()
  photo_url?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;
}

export class GetDoctorsQueryDto {
  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  ratingMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @IsOptional()
  @IsString()
  searchQuery?: string;

  @IsOptional()
  @IsString()
  sort?: 'rating_desc' | 'price_asc' | 'price_desc' | 'name_asc';

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

