import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsArray,
  IsOptional,
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

