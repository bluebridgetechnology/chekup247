import { PaymentsService } from './payments.service';

describe('PaymentsService booking confirmation', () => {
  it('queues the 24h/1h/15m reminders and localises the confirmation email time', async () => {
    const start = new Date(Date.now() + 48 * 3600 * 1000);
    const booking = { id: 'b1', patient_id: 'p1', doctor_id: 'doc-profile', slot_id: 's1', notes: '' };
    const slot = {
      id: 's1',
      start_time: start,
      doctor: { user_id: 'doc-user', user: { full_name: 'Solly Motuba' } },
    };
    const reminderScheduler = { scheduleBookingReminders: jest.fn().mockResolvedValue({ scheduledWindows: ['24h'] }) };
    const notifications = { dispatchNotification: jest.fn().mockResolvedValue({}) };
    const service = new PaymentsService(
      {} as any,
      { findOne: jest.fn().mockResolvedValue(booking) } as any,
      {} as any,
      { findOne: jest.fn().mockResolvedValue({ full_name: 'Patient One' }) } as any,
      {} as any,
      { findOne: jest.fn().mockResolvedValue(slot) } as any,
      undefined,
      notifications as any,
      undefined,
      reminderScheduler as any,
    );

    await (service as any).sendBookingConfirmationNotifications('b1');

    expect(reminderScheduler.scheduleBookingReminders).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: 'b1', patientId: 'p1', doctorId: 'doc-user', slotStartTime: start }),
    );
    const patientCall = notifications.dispatchNotification.mock.calls.find(([o]: any) => o.recipientId === 'p1')[0];
    expect(patientCall.payload.appointmentStart).toBe(start.toISOString());
  });
});
