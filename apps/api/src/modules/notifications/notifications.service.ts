import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../database/patient/entities';
import { NotificationPreference } from '../../database/operational/entities';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification, 'patient')
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationPreference, 'operational')
    private readonly preferenceRepository: Repository<NotificationPreference>,
  ) {}

  async getUserPreferences(userId: string): Promise<NotificationPreference | null> {
    return this.preferenceRepository.findOne({
      where: { user_id: userId },
    });
  }

  async getRecentNotifications(userId: string): Promise<Notification[]> {
    return this.notificationRepository.find({
      where: { recipient_id: userId },
      order: { created_at: 'DESC' },
      take: 20,
    });
  }
}
