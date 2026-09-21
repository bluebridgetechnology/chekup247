import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ChekUp247 — Telehealth & Virtual Doctor',
    short_name: 'ChekUp247',
    description: 'Consult verified HPCSA doctors in South Africa 24/7. Instant video consultations, sick notes, and valid e-prescriptions.',
    start_url: '/portal',
    display: 'standalone',
    background_color: '#FAF6EE',
    theme_color: '#2A170F',
    orientation: 'portrait-primary',
    categories: ['medical', 'health', 'lifestyle'],
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
        name: 'Book a Doctor',
        short_name: 'Book Doctor',
        description: 'Find verified doctors and schedule an online consultation',
        url: '/doctors',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'My Appointments',
        short_name: 'Appointments',
        description: 'View upcoming and past consultations',
        url: '/appointments',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Prescriptions',
        short_name: 'Rx & Notes',
        description: 'Access digital sick notes and e-prescriptions',
        url: '/prescriptions',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Health Wallet',
        short_name: 'Wallet',
        description: 'Manage credits and consultation payments',
        url: '/wallet',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
