import { redirect } from 'next/navigation';

export default async function PatientPortalPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams && Object.keys(resolvedSearchParams).length > 0
    ? '?' + new URLSearchParams(resolvedSearchParams as Record<string, string>).toString()
    : '';
  redirect(`/appointments${query}`);
}
