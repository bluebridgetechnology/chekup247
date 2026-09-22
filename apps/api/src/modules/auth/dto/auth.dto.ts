import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsDateString,
  Matches,
} from 'class-validator';

export class RegisterPatientDto {
  @IsNotEmpty({ message: 'Full name is required' })
  @IsString()
  full_name: string;

  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Date of birth must be a valid date' })
  date_of_birth?: string;
}

export class LoginDto {
  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password: string;

  @IsOptional()
  remember_me?: boolean;

  @IsOptional()
  @IsString()
  totpCode?: string;
}

export class VerifyEmailDto {
  @IsNotEmpty({ message: 'Verification token is required' })
  @IsString()
  token: string;
}

export class ForgotPasswordDto {
  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;
}

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Reset token is required' })
  @IsString()
  token: string;

  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  new_password: string;
}

export class LocumStaffCallbackDto {
  @IsNotEmpty({ message: 'Authorization code is required' })
  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  code_verifier?: string;

  // Contract §2 always returns state on the callback URL; it is used for
  // CSRF protection and is required for a genuine handshake.
  @IsNotEmpty({ message: 'OIDC state is required' })
  @IsString()
  state: string;
}

export class GoogleAuthDto {
  @IsNotEmpty({ message: 'Google credential or token is required' })
  @IsString()
  credential: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  picture?: string;
}

export class VerifyOtpDto {
  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @IsNotEmpty({ message: 'OTP code is required' })
  @IsString()
  otp: string;
}

export class ResendOtpDto {
  @IsNotEmpty({ message: 'Email address is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;
}
