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

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to notifications WS: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from notifications WS: ${client.id}`);
  }

  @SubscribeMessage('subscribe_user')
  handleSubscribeUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string },
  ) {
    if (payload?.userId) {
      client.join(`user_${payload.userId}`);
      this.logger.log(`Socket ${client.id} joined notification room user_${payload.userId}`);
      return { status: 'subscribed', room: `user_${payload.userId}` };
    }
  }

  emitNotificationToUser(userId: string, notification: any) {
    if (this.server) {
      this.server.to(`user_${userId}`).emit('new_notification', notification);
      this.logger.log(`Broadcasted in-app notification to user_${userId}`);
    }
  }
}
