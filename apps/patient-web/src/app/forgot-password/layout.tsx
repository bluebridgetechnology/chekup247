import { redirect } from 'next/navigation';
import { SHOW_PATIENT_AUTH } from '../../lib/featureFlags';
import { QUICK_BOOK_URL } from '../../lib/quickBook';

// Quick-Book-only mode: patient password reset is hidden along with sign-in
export default function Layout({ children }: { children: React.ReactNode }) {
  if (!SHOW_PATIENT_AUTH) redirect(QUICK_BOOK_URL);
  return <>{children}</>;
}
