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

export class DailyServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DailyServiceError';
  }
}

@Injectable()
export class DailyService {
  private readonly logger = new Logger(DailyService.name);
  private readonly apiKey = envConfig.DAILY_API_KEY;
  private readonly apiUrl = envConfig.DAILY_API_URL || 'https://api.daily.co/v1';
  private readonly domain = envConfig.DAILY_DOMAIN || 'chekup247';

  private assertConfigured(): void {
    if (!this.apiKey) {
      throw new DailyServiceError(
        'Daily.co API key is not configured (DAILY_API_KEY). Video consultation rooms cannot be created.',
      );
    }
  }

  /**
   * Creates a private, ephemeral Daily.co room for a consultation session (BE-601).
   * In a multi-tenant marketplace, each consultation gets a uniquely generated,
   * isolated room on Daily's global mesh network.
   * - Max 2 participants (doctor and patient)
   * - Expiration: slot end time + 15 min buffer
   * - URL is dynamically generated and returned directly by Daily's REST API.
   *
   * Throws DailyServiceError when Daily is unreachable or rejects the request.
   * Never returns a synthetic room: a fabricated URL would let clients join a
   * room that does not exist and surface as a dead "live" call shell.
   */
  async createRoom(bookingId: string, slotEndTime: Date): Promise<DailyRoomResult> {
    this.assertConfigured();

    const cleanId = bookingId.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 16);
    // Collision-free unique room name for this consultation session
    const roomName = `chekup-${cleanId}-${Date.now().toString(36)}`;
    const exp = Math.floor(new Date(slotEndTime).getTime() / 1000) + 15 * 60; // 15-minute buffer

    let res: Response;
    try {
      res = await fetch(`${this.apiUrl}/rooms`, {
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
    } catch (err: any) {
      throw new DailyServiceError(`Daily.co is unreachable: ${err.message}`);
    }

    if (!res.ok) {
      const errText = await res.text();
      this.logger.warn(`Daily.co API error (${res.status}): ${errText}`);

      // If room name already exists, attempt to fetch its existing details from Daily
      if (res.status === 400) {
        try {
          const getRes = await fetch(`${this.apiUrl}/rooms/${roomName}`, {
            headers: { Authorization: `Bearer ${this.apiKey}` },
          });
          if (getRes.ok) {
            const existingData = await getRes.json();
            return {
              name: existingData.name || roomName,
              url: existingData.url,
              privacy: existingData.privacy || 'private',
              exp: existingData.properties?.exp || exp,
            };
          }
        } catch {
          // fall through
        }
      }

      throw new DailyServiceError(`Daily.co room creation failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    // data.url is the authoritative, live room URL provided by Daily for your account
    return {
      name: data.name || roomName,
      url: data.url,
      privacy: data.privacy || 'private',
      exp: data.properties?.exp || exp,
    };
  }

  /**
   * Generates a secure participant meeting token for the private room.
   * Throws DailyServiceError when Daily cannot issue a real token — callers must
   * not hand clients a token that the Daily network will reject.
   */
  async createMeetingToken(
    roomName: string,
    userName: string,
    isOwner: boolean,
    expTimestamp: number,
  ): Promise<DailyMeetingTokenResult> {
    this.assertConfigured();

    let res: Response;
    try {
      res = await fetch(`${this.apiUrl}/meeting-tokens`, {
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
    } catch (err: any) {
      throw new DailyServiceError(`Daily.co is unreachable: ${err.message}`);
    }

    if (!res.ok) {
      const errText = await res.text();
      this.logger.warn(`Daily.co token API error (${res.status}): ${errText}`);
      throw new DailyServiceError(`Daily.co meeting token failed (${res.status}): ${errText}`);
    }

    const data = await res.json();
    if (!data.token) {
      throw new DailyServiceError('Daily.co meeting token response did not include a token');
    }
    return { token: data.token };
  }

  /**
   * Deletes a Daily.co room when consultation is finished or cancelled.
   * Returns false (no-op) when Daily is not configured or the delete fails.
   */
  async deleteRoom(roomName: string): Promise<boolean> {
    if (!this.apiKey) {
      return false;
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

  /**
   * Extends the expiration timestamp of a Daily.co private room (BE-701).
   * Daily endpoint: POST /rooms/:name with properties: { exp: newExp }
   * Reports failure honestly: the caller has already taken payment, so the
   * extension must be flagged for retry instead of silently claimed as done.
   */
  async extendRoomExpiry(
    roomName: string,
    addedMinutes: number,
  ): Promise<{ success: boolean; newExp: number }> {
    const addedSeconds = addedMinutes * 60;

    if (!this.apiKey) {
      this.logger.error(`Cannot extend room ${roomName}: Daily.co API key is not configured`);
      return { success: false, newExp: 0 };
    }

    try {
      // Fetch current room to check current exp
      const getRes = await fetch(`${this.apiUrl}/rooms/${roomName}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      let currentExp = Math.floor(Date.now() / 1000);
      if (getRes.ok) {
        const roomData = await getRes.json();
        if (roomData.properties?.exp) {
          currentExp = Math.max(roomData.properties.exp, Math.floor(Date.now() / 1000));
        }
      }

      const newExp = currentExp + addedSeconds;

      const updateRes = await fetch(`${this.apiUrl}/rooms/${roomName}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            exp: newExp,
          },
        }),
      });

      if (!updateRes.ok) {
        const errText = await updateRes.text();
        this.logger.error(`Daily.co extendRoomExpiry failed for ${roomName}: ${errText}`);
        return { success: false, newExp: 0 };
      }

      return { success: true, newExp };
    } catch (err: any) {
      this.logger.error(`Daily.co extendRoomExpiry error for ${roomName}: ${err.message}`);
      return { success: false, newExp: 0 };
    }
  }
}
