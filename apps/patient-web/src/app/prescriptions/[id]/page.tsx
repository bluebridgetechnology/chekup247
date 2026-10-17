import { redirect } from 'next/navigation';

/**
 * Email / notification deep link target (`/prescriptions/<id>`).
 * The prescription viewer lives on the list page, so forward there with the id preselected.
 */
export default async function PrescriptionDeepLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/prescriptions?id=${encodeURIComponent(id)}`);
}
