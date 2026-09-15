import { Injectable, Logger } from '@nestjs/common';
import { envConfig } from '../../config/env.config';

export interface DailyRoomResult {
  name: string;
  url: string;
  privacy: string;
  exp: number;
}

export interface DailyMeetingTokenResult {
  token: string;
}

@Injectable()
export class DailyService {
  private readonly logger = new Logger(DailyService.name);
  private readonly apiKey = envConfig.DAILY_API_KEY;
  private readonly apiUrl = envConfig.DAILY_API_URL || 'https://api.daily.co/v1';
  private readonly domain = envConfig.DAILY_DOMAIN || 'chekup247';

  /**
   * Creates a private Daily.co room for a consultation session (BE-601).
   * - Max 2 participants (doctor and patient)
   * - Expiration: slot end time + 15 min buffer
   */
  async createRoom(bookingId: string, slotEndTime: Date): Promise<DailyRoomResult> {
    const cleanId = bookingId.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 20);
    const roomName = `chekup-${cleanId}`;
    const exp = Math.floor(new Date(slotEndTime).getTime() / 1000) + 15 * 60; // 15-minute buffer

    if (!this.apiKey || this.apiKey.startsWith('sk_test_mock') || this.apiKey === '') {
      this.logger.log(`[DailyMock] Generated mock room for booking ${bookingId}: roomName=${roomName}`);
      return {
        name: roomName,
        url: `https://${this.domain}.daily.co/${roomName}`,
        privacy: 'private',
        exp,
      };
    }

    try {
      const res = await fetch(`${this.apiUrl}/rooms`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: roomName,
          privacy: 'private',
          properties: {
            max_participants: 2,
            exp,
            enable_screenshare: true,
            enable_chat: true,
            eject_at_room_exp: true,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        this.logger.warn(`Daily.co API error (${res.status}): ${errText}. Falling back to domain room.`);
        return {
          name: roomName,
          url: `https://${this.domain}.daily.co/${roomName}`,
          privacy: 'private',
          exp,
        };
      }

      const data = await res.json();
      return {
        name: data.name || roomName,
        url: data.url || `https://${this.domain}.daily.co/${roomName}`,
        privacy: data.privacy || 'private',
        exp: data.properties?.exp || exp,
      };
    } catch (err: any) {
      this.logger.error(`Daily.co createRoom failed: ${err.message}. Using fallback.`);
      return {
        name: roomName,
        url: `https://${this.domain}.daily.co/${roomName}`,
        privacy: 'private',
        exp,
      };
    }
  }

  /**
   * Generates a secure participant meeting token for the private room.
   */
  async createMeetingToken(
    roomName: string,
    userName: string,
    isOwner: boolean,
    expTimestamp: number,
  ): Promise<DailyMeetingTokenResult> {
    if (!this.apiKey || this.apiKey.startsWith('sk_test_mock') || this.apiKey === '') {
      return {
        token: `mock_daily_token_${isOwner ? 'doctor' : 'patient'}_${Date.now()}`,
      };
    }

    try {
      const res = await fetch(`${this.apiUrl}/meeting-tokens`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            room_name: roomName,
            user_name: userName,
            is_owner: isOwner,
            exp: expTimestamp,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        this.logger.warn(`Daily.co token API error (${res.status}): ${errText}`);
        return {
          token: `mock_daily_token_${isOwner ? 'doctor' : 'patient'}_${Date.now()}`,
        };
      }

      const data = await res.json();
      return {
        token: data.token || `mock_daily_token_${isOwner ? 'doctor' : 'patient'}_${Date.now()}`,
      };
    } catch (err: any) {
      this.logger.error(`Daily.co createMeetingToken failed: ${err.message}`);
      return {
        token: `mock_daily_token_${isOwner ? 'doctor' : 'patient'}_${Date.now()}`,
      };
    }
  }

  /**
   * Deletes a Daily.co room when consultation is finished or cancelled.
   */
  async deleteRoom(roomName: string): Promise<boolean> {
    if (!this.apiKey || this.apiKey.startsWith('sk_test_mock') || this.apiKey === '') {
      return true;
    }

    try {
      const res = await fetch(`${this.apiUrl}/rooms/${roomName}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });
      return res.ok;
    } catch (err: any) {
      this.logger.warn(`Daily.co deleteRoom failed for ${roomName}: ${err.message}`);
      return false;
    }
  }
}
