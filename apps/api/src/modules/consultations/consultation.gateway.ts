import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface JoinSessionPayload {
  bookingId: string;
  role: 'doctor' | 'patient';
  userId?: string;
  userName?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/consultations',
})
export class ConsultationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ConsultationGateway.name);

  @WebSocketServer()
  server: Server;

  // Track socket client mappings: socketId -> { bookingId, role, userId }
  private readonly clientMap = new Map<
    string,
    { bookingId: string; role: 'doctor' | 'patient'; userId?: string; userName?: string }
  >();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to consultations WS: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const session = this.clientMap.get(client.id);
    if (session) {
      const { bookingId, role, userId, userName } = session;
      this.clientMap.delete(client.id);
      this.logger.log(`Participant ${role} (${client.id}) disconnected from booking ${bookingId}`);

      if (this.server) {
        this.server.to(`consultation_${bookingId}`).emit('participant_left', {
          role,
          userId,
          userName,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  @SubscribeMessage('join_session')
  handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinSessionPayload,
  ) {
    const { bookingId, role, userId, userName } = payload;
    const roomName = `consultation_${bookingId}`;

    client.join(roomName);
    this.clientMap.set(client.id, { bookingId, role, userId, userName });

    this.logger.log(`[WS] ${role} (${userName || userId || client.id}) joined room ${roomName}`);

    // Broadcast presence event to room
    const eventName = role === 'doctor' ? 'doctor_joined' : 'patient_joined';
    client.to(roomName).emit(eventName, {
      role,
      userId,
      userName,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      room: roomName,
      message: `Successfully joined ${roomName} as ${role}`,
    };
  }

  @SubscribeMessage('ping_timer')
  handlePingTimer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { bookingId: string; startedAt: string; durationSeconds?: number },
  ) {
    const duration = payload.durationSeconds || 1800; // default 30 min
    const started = new Date(payload.startedAt).getTime();
    const elapsed = Math.max(0, Math.floor((Date.now() - started) / 1000));
    const remainingSeconds = Math.max(0, duration - elapsed);

    return {
      startedAt: payload.startedAt,
      durationSeconds: duration,
      remainingSeconds,
      warning:
        remainingSeconds <= 60
          ? 'critical_1min'
          : remainingSeconds <= 300
          ? 'warning_5min'
          : 'normal',
    };
  }

  /**
   * Broadcasts timer synchronization event to all participants in the consultation room (BE-603).
   */
  broadcastTimerSync(
    bookingId: string,
    startedAt: Date,
    durationSeconds: number = 1800,
  ) {
    if (!this.server) return;
    const roomName = `consultation_${bookingId}`;
    const elapsed = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    const remainingSeconds = Math.max(0, durationSeconds - elapsed);

    this.server.to(roomName).emit('timer_sync', {
      startedAt: startedAt.toISOString(),
      durationSeconds,
      remainingSeconds,
      is5MinWarning: remainingSeconds <= 300 && remainingSeconds > 60,
      is1MinWarning: remainingSeconds <= 60 && remainingSeconds > 0,
    });
  }

  /**
   * Broadcasts consultation conclusion to both doctor and patient.
   */
  broadcastConsultationEnded(
    bookingId: string,
    endedAt: Date,
    endedBy: string,
  ) {
    if (!this.server) return;
    const roomName = `consultation_${bookingId}`;
    this.logger.log(`Broadcasting consultation_ended for ${bookingId}`);

    this.server.to(roomName).emit('consultation_ended', {
      bookingId,
      endedAt: endedAt.toISOString(),
      endedBy,
      eligibleForPrescription: true,
      message: 'The consultation has concluded.',
    });
  }

  /**
   * Broadcasts notes saved confirmation.
   */
  broadcastNotesSaved(bookingId: string, timestamp: Date) {
    if (!this.server) return;
    this.server.to(`consultation_${bookingId}`).emit('notes_saved', {
      bookingId,
      timestamp: timestamp.toISOString(),
    });
  }
}
