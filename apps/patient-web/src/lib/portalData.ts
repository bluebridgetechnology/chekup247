export interface PortalDoctor {
  id: string;
  name: string;
  specialty: string;
  qualifications: string;
  location: string;
  facilityName?: string;
  photoUrl: string;
  tags: string[];
  ratePerHour: number;
  ratingAvg: number;
  reviewsCount: number;
}

export interface PortalBooking {
  id: string;
  doctor: PortalDoctor;
  dateRaw: string; // e.g. 2025-09-17
  dateFormatted: string; // e.g. "THU, 17 SEPT"
  fullDateFormatted: string; // e.g. "Thu, 17 Sep 2025"
  startTime: string; // e.g. "13:36"
  endTime: string; // e.g. "14:21"
  durationFormatted: string; // e.g. "45 mins"
  status: 'confirmed' | 'completed' | 'cancelled' | 'pending';
  consultationType: 'video' | 'in_person';
  reason?: string;
  price: number;
  paymentStatus: 'held' | 'released' | 'refunded' | 'unpaid';
  joinUrl?: string;
  startTimeRaw: string;
  endTimeRaw: string;
  isPast: boolean;
}

export interface PortalSummaryStats {
  upcomingCount: number;
  completedCount: number;
  activePrescriptionsCount: number;
}

/**
 * Verified Demo Doctor records from the database seed & directory sync
 * (apps/api/src/modules/doctors/directory-sync.service.ts and FeaturedDoctorsSection)
 */
export const DEMO_DATABASE_DOCTORS: Record<string, PortalDoctor> = {
  sarah: {
    id: 'doc-sarah-vdm',
    name: 'Dr. Sarah Van Der Merwe',
    specialty: 'Specialist Paediatrician',
    qualifications: 'MBChB (UCT), MMed (Paed)',
    location: 'Claremont, Cape Town',
    facilityName: 'Mediclinic Cape Town Medical Suites',
    photoUrl: '/images/doctor_sarah.jpg',
    tags: ['Infant Nutrition', 'Child Health', 'Asthma'],
    ratePerHour: 650.0,
    ratingAvg: 4.98,
    reviewsCount: 84,
  },
  kevin: {
    id: 'doc-kevin-pillay',
    name: 'Dr. Kevin Pillay',
    specialty: 'Family Physician & Sports Medicine',
    qualifications: 'MBChB (UKZN), Dip Obst',
    location: 'Umhlanga, Durban',
    facilityName: 'Umhlanga Medical Centre',
    photoUrl: '/images/doctor_kevin.jpg',
    tags: ['Joint Injuries', 'Hypertension', "Men's Health"],
    ratePerHour: 420.0,
    ratingAvg: 4.92,
    reviewsCount: 42,
  },
  thabo: {
    id: 'doc-thabo-molefe',
    name: 'Dr. Thabo Molefe',
    specialty: 'General Practitioner & Family Health',
    qualifications: 'MBChB (Wits), FCFP(SA)',
    location: 'Sandton, Johannesburg',
    facilityName: 'Netcare Sunninghill Hospital Suites',
    photoUrl: '/images/doctor_thabo.jpg',
    tags: ['Flu & Infections', 'Chronic Script Renewal', 'Wellness'],
    ratePerHour: 450.0,
    ratingAvg: 4.95,
    reviewsCount: 58,
  },
};

/**
 * Standard default demo bookings reflecting the database patient appointments
 * matching the reference design layout
 */
export const DEFAULT_PORTAL_BOOKINGS: PortalBooking[] = [
  {
    id: 'bk-sarah-01',
    doctor: DEMO_DATABASE_DOCTORS.sarah,
    dateRaw: '2025-09-17',
    dateFormatted: 'THU, 17 SEPT',
    fullDateFormatted: 'Thu, 17 Sep 2025',
    startTime: '13:36',
    endTime: '14:21',
    durationFormatted: '45 mins',
    status: 'completed',
    consultationType: 'video',
    reason: 'Paediatric follow-up & infant nutrition guidance',
    price: 650.0,
    paymentStatus: 'released',
    joinUrl: '/consultations/bk-sarah-01',
    startTimeRaw: '2025-09-17T13:36:00Z',
    endTimeRaw: '2025-09-17T14:21:00Z',
    isPast: true,
  },
  {
    id: 'bk-kevin-02',
    doctor: DEMO_DATABASE_DOCTORS.kevin,
    dateRaw: '2025-09-17',
    dateFormatted: 'THU, 17 SEPT',
    fullDateFormatted: 'Thu, 17 Sep 2025',
    startTime: '15:51',
    endTime: '16:36',
    durationFormatted: '45 mins',
    status: 'completed',
    consultationType: 'video',
    reason: 'Sports knee injury assessment and exercise rehabilitation plan',
    price: 420.0,
    paymentStatus: 'released',
    joinUrl: '/consultations/bk-kevin-02',
    startTimeRaw: '2025-09-17T15:51:00Z',
    endTimeRaw: '2025-09-17T16:36:00Z',
    isPast: true,
  },
  {
    id: 'bk-thabo-past-01',
    doctor: DEMO_DATABASE_DOCTORS.thabo,
    dateRaw: '2025-08-22',
    dateFormatted: 'FRI, 22 AUG',
    fullDateFormatted: 'Fri, 22 Aug 2025',
    startTime: '10:00',
    endTime: '10:30',
    durationFormatted: '30 mins',
    status: 'completed',
    consultationType: 'video',
    reason: 'Routine health check & blood pressure review',
    price: 450.0,
    paymentStatus: 'released',
    joinUrl: '/consultations/bk-thabo-past-01',
    startTimeRaw: '2025-08-22T10:00:00Z',
    endTimeRaw: '2025-08-22T10:30:00Z',
    isPast: true,
  },
  {
    id: 'bk-sarah-past-02',
    doctor: DEMO_DATABASE_DOCTORS.sarah,
    dateRaw: '2025-07-15',
    dateFormatted: 'TUE, 15 JUL',
    fullDateFormatted: 'Tue, 15 Jul 2025',
    startTime: '14:00',
    endTime: '14:45',
    durationFormatted: '45 mins',
    status: 'completed',
    consultationType: 'video',
    reason: 'Childhood vaccination advice and growth milestones',
    price: 650.0,
    paymentStatus: 'released',
    joinUrl: '/consultations/bk-sarah-past-02',
    startTimeRaw: '2025-07-15T14:00:00Z',
    endTimeRaw: '2025-07-15T14:45:00Z',
    isPast: true,
  },
  {
    id: 'bk-kevin-past-03',
    doctor: DEMO_DATABASE_DOCTORS.kevin,
    dateRaw: '2025-06-04',
    dateFormatted: 'WED, 04 JUN',
    fullDateFormatted: 'Wed, 04 Jun 2025',
    startTime: '11:15',
    endTime: '12:00',
    durationFormatted: '45 mins',
    status: 'completed',
    consultationType: 'video',
    reason: 'Rotator cuff strain rehabilitation review',
    price: 420.0,
    paymentStatus: 'released',
    joinUrl: '/consultations/bk-kevin-past-03',
    startTimeRaw: '2025-06-04T11:15:00Z',
    endTimeRaw: '2025-06-04T12:00:00Z',
    isPast: true,
  },
  {
    id: 'bk-thabo-cancelled-01',
    doctor: DEMO_DATABASE_DOCTORS.thabo,
    dateRaw: '2025-05-19',
    dateFormatted: 'MON, 19 MAY',
    fullDateFormatted: 'Mon, 19 May 2025',
    startTime: '16:00',
    endTime: '16:30',
    durationFormatted: '30 mins',
    status: 'cancelled',
    consultationType: 'video',
    reason: 'Rescheduled due to travel conflict',
    price: 450.0,
    paymentStatus: 'refunded',
    startTimeRaw: '2025-05-19T16:00:00Z',
    endTimeRaw: '2025-05-19T16:30:00Z',
    isPast: true,
  },
];

/**
 * Maps raw backend API booking and doctor responses to the PortalBooking model
 */
export function mapApiBookingToPortalBooking(rawBooking: any, fallbackDoctor?: PortalDoctor): PortalBooking {
  const doc = rawBooking.doctor || {};
  const slot = rawBooking.slot || {};

  const startTimeObj = slot.startTime
    ? new Date(slot.startTime)
    : rawBooking.scheduled_at
    ? new Date(rawBooking.scheduled_at)
    : new Date(rawBooking.created_at || Date.now());
  const endTimeObj = slot.endTime
    ? new Date(slot.endTime)
    : new Date(startTimeObj.getTime() + 45 * 60 * 1000);

  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEPT', 'OCT', 'NOV', 'DEC'];
  const fullMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullDays = ['Sun', 'Mon', 'Wed', 'Thu', 'Fri', 'Sat'];

  const dayName = days[startTimeObj.getDay()];
  const dateNum = startTimeObj.getDate();
  const monthName = months[startTimeObj.getMonth()];
  const dateFormatted = `${dayName}, ${dateNum} ${monthName}`;
  const fullDateFormatted = `${fullDays[startTimeObj.getDay()] || 'Thu'}, ${dateNum} ${fullMonths[startTimeObj.getMonth()]} ${startTimeObj.getFullYear()}`;

  const formatHourMin = (d: Date) => {
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const startTime = formatHourMin(startTimeObj);
  const endTime = formatHourMin(endTimeObj);
  const durationMinutes = Math.max(15, Math.round((endTimeObj.getTime() - startTimeObj.getTime()) / (1000 * 60)));
  const isPast = Date.now() > endTimeObj.getTime();

  // Prioritize real doctor profile data if available
  const matchedDemoDoctor: PortalDoctor = fallbackDoctor || {
    id: doc.id || 'doc-assigned',
    name: doc.fullName || (doc.user?.full_name) || (doc.name) || 'Dr. Medical Practitioner',
    specialty: doc.specialty || 'General Practitioner',
    qualifications: doc.qualifications || doc.hpcsaNumber ? `HPCSA ${doc.hpcsaNumber}` : 'MBChB (HPCSA)',
    location: doc.facilityAddress || doc.facilityName || doc.location || 'South Africa',
    facilityName: doc.facilityName || 'Chekup247 Medical Network',
    photoUrl: doc.avatarUrl || doc.photoUrl || (
      doc.fullName?.toLowerCase().includes('sarah')
        ? '/images/doctor_sarah.jpg'
        : doc.fullName?.toLowerCase().includes('kevin')
        ? '/images/doctor_kevin.jpg'
        : '/images/doctor_thabo.jpg'
    ),
    tags: doc.specialty ? [doc.specialty, 'Telehealth'] : ['General Health', 'Prescriptions'],
    ratePerHour: Number(doc.ratePerHour || doc.rate_per_hour) || 450,
    ratingAvg: 4.9,
    reviewsCount: 45,
  };

  return {
    id: rawBooking.id || `bk-${Date.now()}`,
    doctor: matchedDemoDoctor,
    dateRaw: startTimeObj.toISOString().split('T')[0],
    dateFormatted,
    fullDateFormatted,
    startTime,
    endTime,
    durationFormatted: `${durationMinutes} mins`,
    status: (rawBooking.status as any) || 'confirmed',
    consultationType: 'video',
    reason: rawBooking.notes || 'Telehealth Consultation',
    price: Number(rawBooking.price) || matchedDemoDoctor.ratePerHour,
    paymentStatus: (rawBooking.payment_status as any) || 'held',
    joinUrl: `/consultations/${rawBooking.id}`,
    startTimeRaw: startTimeObj.toISOString(),
    endTimeRaw: endTimeObj.toISOString(),
    isPast,
  };
}
