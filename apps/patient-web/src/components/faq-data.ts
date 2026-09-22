export interface FaqItem {
  q: string;
  a: string;
}

export const HOMEPAGE_FAQS: FaqItem[] = [
  {
    q: 'Can I submit my consultation invoice to my Medical Aid?',
    a: 'Yes, absolutely! All doctors on ChekUp247 are HPCSA-registered with active South African practice numbers. Every consultation receipt includes official ICD-10 diagnostic codes and standard tariff codes compatible with Discovery Health, Bonitas, Momentum, Medscheme, and all leading medical schemes.',
  },
  {
    q: 'How do electronic prescriptions work at South African pharmacies?',
    a: 'Following your consultation, your doctor generates an official digital prescription that complies with SAPC (South African Pharmacy Council) guidelines. You can instantly download the tamper-evident PDF or show it directly at Dis-Chem, Clicks, or your local independent pharmacy.',
  },
  {
    q: 'What happens if my internet connection drops during the video call?',
    a: 'You can immediately rejoin the secure consultation room with one tap from your dashboard. If technical issues persist, our platform enables the practitioner to grant complementary time extensions or reschedule at zero extra charge.',
  },
  {
    q: 'Are my medical records and consultations private and secure?',
    a: 'Yes. ChekUp247 is fully compliant with South Africa’s Protection of Personal Information Act (POPIA) and National Health Act regulations. Video consultations are peer-to-peer encrypted and never recorded, and your health records are accessible only by you and your authorized practitioner.',
  },
];