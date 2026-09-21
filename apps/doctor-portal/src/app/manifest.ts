import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ChekUp247 Doctor Practice Portal',
    short_name: 'ChekUp Doctor',
    description: 'Clinical practice management, video consultations, and ICD-10 e-prescriptions for HPCSA medical practitioners.',
    start_url: '/calendar',
    display: 'standalone',
    background_color: '#FAF6EE',
    theme_color: '#2A170F',
    orientation: 'any',
    categories: ['medical', 'productivity', 'business'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Clinical Calendar',
        short_name: 'Calendar',
        description: 'Manage doctor availability and consultation slots',
        url: '/calendar',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Appointments',
        short_name: 'Appointments',
        description: 'View patient bookings and waiting room queue',
        url: '/appointments',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Prescriptions',
        short_name: 'Prescribe',
        description: 'Create and sign electronic prescriptions with ICD-10 codes',
        url: '/prescriptions',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Earnings Ledger',
        short_name: 'Earnings',
        description: 'View consultation payouts and financial statements',
        url: '/earnings',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
