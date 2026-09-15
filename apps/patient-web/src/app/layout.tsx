import type { Metadata } from 'next';
import '../styles/globals.css';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { AuthProvider } from '../context/AuthContext';

export const metadata: Metadata = {
  title: 'ChekUp247 — Telehealth & Virtual Doctor Consultations in South Africa',
  description:
    'Book online video consultations with verified HPCSA doctors across South Africa. Get medical advice, sick notes, and valid e-prescriptions with ICD-10 codes.',
  keywords: [
    'Telehealth South Africa',
    'Virtual Doctor',
    'Online Consultation',
    'HPCSA Registered Doctors',
    'E-prescription South Africa',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AuthProvider>
          <Navbar />
          <main style={{ flex: 1 }}>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
