import type { Metadata } from 'next';
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: 'Contact Us — Patient & Doctor Support | ChekUp247',
  description:
    'Reach the ChekUp247 24/7 clinical support team via chat, email, or phone for help with bookings, consultations, prescriptions and account questions.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: 'Contact Us — Patient & Doctor Support | ChekUp247',
    description:
      'Get help from the ChekUp247 24/7 support team via chat, email or phone.',
    url: '/contact',
    type: 'website',
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
