import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chekup247.co.za';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/doctors',
          '/doctors/*',
          '/how-it-works',
          '/for-doctors',
          '/pricing',
          '/about',
          '/faq',
          '/contact',
          '/terms',
          '/privacy',
        ],
        disallow: [
          '/api/*',
          '/consultation/*',
          '/consultations/*',
          '/checkout/*',
          '/bookings/*',
          '/wallet/*',
          '/profile/*',
          '/settings/*',
          '/prescriptions/*',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
