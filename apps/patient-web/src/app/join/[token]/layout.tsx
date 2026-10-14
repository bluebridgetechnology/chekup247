import type { Metadata } from 'next';

// The link carries a personal token: keep it out of search results and out of Referer headers.
export const metadata: Metadata = {
  title: 'Join your consultation',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return children;
}
