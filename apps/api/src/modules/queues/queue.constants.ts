export const QUEUES = {
  NOTIFICATIONS: 'notifications',
  REMINDERS: 'reminders',
  DIRECTORY_SYNC: 'directory-sync',
  AVAILABILITY_SYNC: 'availability-sync',
  PAYOUT: 'payout',
  RATING_SYNC: 'rating-sync',
  NO_SHOW: 'no-show',
  BOOKING_DLQ: 'booking-dlq',
  RECONCILIATION: 'reconciliation',
} as const;

export type QueueName = typeof QUEUES[keyof typeof QUEUES];
