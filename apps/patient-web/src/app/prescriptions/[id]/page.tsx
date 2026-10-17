import { redirect } from 'next/navigation';

/**
 * Legacy email / notification deep link (`/prescriptions/<id>`).
 * Forward to the public prescription page (no login needed) which has the PDF download.
 */
export default async function PrescriptionDeepLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/verify/rx/${encodeURIComponent(id)}`);
}
