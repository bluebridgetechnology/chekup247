import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { envConfig } from '../../config/env.config';
import { UserRole } from '../../database/operational/entities';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  fullName: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class TokenService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly saltRounds = 10;

  constructor() {
    this.jwtSecret = envConfig.JWT_SECRET;
    this.jwtExpiresIn = envConfig.JWT_EXPIRES_IN || '7d';
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(
      {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        fullName: payload.fullName,
      },
      this.jwtSecret,
      {
        expiresIn: this.jwtExpiresIn as jwt.SignOptions['expiresIn'],
      },
    );
  }

  verifyAccessToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as JwtPayload;
    } catch (err: any) {
      throw new UnauthorizedException(
        err.name === 'TokenExpiredError'
          ? 'Authentication token has expired'
          : 'Invalid authentication token',
      );
    }
  }

  generateSecureToken(bytes = 32): { token: string; hash: string } {
    const token = crypto.randomBytes(bytes).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return { token, hash };
  }

  generateOtp(): { otp: string; hash: string } {
    const otp = crypto.randomInt(100000, 999999).toString();
    const hash = this.hashToken(otp);
    return { otp, hash };
  }

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
