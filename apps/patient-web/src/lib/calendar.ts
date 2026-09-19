import { PortalBooking } from './portalData';

function formatIsoForCalendar(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d+/g, '');
}

export function parseBookingDates(booking: PortalBooking): { start: Date; end: Date } {
  let startDate: Date;
  let endDate: Date;

  try {
    if (booking.dateRaw && booking.dateRaw.includes('T')) {
      startDate = new Date(booking.dateRaw);
    } else if (booking.dateRaw && booking.startTime) {
      startDate = new Date(`${booking.dateRaw}T${booking.startTime}:00+02:00`);
    } else {
      startDate = new Date();
    }

    if (isNaN(startDate.getTime())) {
      startDate = new Date();
    }

    if (booking.dateRaw && booking.endTime) {
      const datePart = booking.dateRaw.includes('T') ? booking.dateRaw.split('T')[0] : booking.dateRaw;
      endDate = new Date(`${datePart}T${booking.endTime}:00+02:00`);
    } else {
      endDate = new Date(startDate.getTime() + 45 * 60 * 1000);
    }

    if (isNaN(endDate.getTime())) {
      endDate = new Date(startDate.getTime() + 45 * 60 * 1000);
    }
  } catch {
    startDate = new Date();
    endDate = new Date(startDate.getTime() + 45 * 60 * 1000);
  }

  return { start: startDate, end: endDate };
}

/**
 * Generates a direct Google Calendar event creation URL
 */
export function getGoogleCalendarUrl(booking: PortalBooking): string {
  const { start, end } = parseBookingDates(booking);
  const startStr = formatIsoForCalendar(start);
  const endStr = formatIsoForCalendar(end);

  const title = encodeURIComponent(`Chekup247 Consultation — ${booking.doctor.name}`);
  const details = encodeURIComponent(
    `Virtual Telehealth Consultation\n\nDoctor: ${booking.doctor.name} (${booking.doctor.specialty})\nPractice/Facility: ${booking.doctor.facilityName || booking.doctor.location}\n\nJoin Video Room: ${booking.joinUrl || 'https://chekup247.com/appointments'}\nBooking Reference: #${booking.id}\n\nChekup247 • Virtual care. Real people. A healthier South Africa.`
  );
  const location = encodeURIComponent('Chekup247 Encrypted Telehealth Video Room');

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${location}`;
}

/**
 * Generates and triggers download of a universal RFC-5545 .ics iCalendar file
 * compatible with Apple Calendar (iOS/macOS), Microsoft Outlook, and device calendars.
 */
export function downloadIcsForBooking(booking: PortalBooking): void {
  const { start, end } = parseBookingDates(booking);
  const startStr = formatIsoForCalendar(start);
  const endStr = formatIsoForCalendar(end);
  const nowStr = formatIsoForCalendar(new Date());

  const summary = `Chekup247 Consultation — ${booking.doctor.name}`;
  const description = `Virtual Telehealth Consultation\\nDoctor: ${booking.doctor.name} (${booking.doctor.specialty})\\nFacility: ${booking.doctor.facilityName || booking.doctor.location}\\nJoin Link: ${booking.joinUrl || 'https://chekup247.com/appointments'}\\nBooking ID: #${booking.id}`;
  const location = 'Chekup247 Encrypted Telehealth Video Room';
  const uid = `chk-consultation-${booking.id}@chekup247.co.za`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Chekup247//Telehealth Consultation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    `URL:${booking.joinUrl || 'https://chekup247.com/appointments'}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Your Chekup247 Consultation starts in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const icsBlob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const downloadUrl = window.URL.createObjectURL(icsBlob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `Chekup247_Consultation_${booking.id.substring(0, 8)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(downloadUrl);
}
