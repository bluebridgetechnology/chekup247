import { redirect } from 'next/navigation';

/**
 * Legacy email / notification deep link (`/prescriptions/<id>`).
 * Sends the PDF straight to the browser as a download, no login needed.
 * (The public /verify/rx/<id> page is reserved for QR-code verification.)
 */
export default async function PrescriptionDeepLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  redirect(`${apiBase}/prescriptions/${encodeURIComponent(id)}/download`);
}
