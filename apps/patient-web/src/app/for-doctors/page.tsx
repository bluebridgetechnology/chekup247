import { redirect } from 'next/navigation';

export default function ForDoctorsPage() {
  const doctorPortalUrl = process.env.NEXT_PUBLIC_DOCTOR_PORTAL_URL || 'http://localhost:3001';
  redirect(`${doctorPortalUrl}/login`);
}
