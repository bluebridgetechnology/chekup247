import { Metadata } from 'next';
import { PatientPortalLayout } from '../../components/portal/PatientPortalLayout';
import { PatientPortalView } from '../../components/portal/PatientPortalView';

export const metadata: Metadata = {
  title: 'My Appointments | Chekup247',
  description: 'Manage your upcoming and past medical consultations, prescriptions, and healthcare records on Chekup247.',
};

export default function PatientAppointmentsPage() {
  return (
    <PatientPortalLayout activeNavKey="appointments">
      <PatientPortalView />
    </PatientPortalLayout>
  );
}
