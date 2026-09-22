import type { Metadata } from 'next';
import ForDoctorsClient from './ForDoctorsClient';

export const metadata: Metadata = {
  title: 'Join as a Healthcare Provider — Earn More, Work Flexibly | ChekUp247',
  description:
    'HPCSA-registered doctors and specialists earn more with flexible online video consultations. Set your own rates and hours and reach patients across South Africa.',
  alternates: { canonical: '/for-doctors' },
  openGraph: {
    title: 'Join as a Healthcare Provider — Earn More, Work Flexibly | ChekUp247',
    description:
      'Practise flexibly and earn more with online video consultations on ChekUp247. For HPCSA-registered GPs and specialists.',
    url: '/for-doctors',
    type: 'website',
  },
};

export default function ForDoctorsPage() {
  return <ForDoctorsClient />;
}
