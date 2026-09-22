export interface FaqItem {
  q: string;
  a: string;
  category: string;
}

export const ALL_FAQS: FaqItem[] = [
  // Booking
  {
    category: 'Booking',
    q: 'How do I book an online doctor consultation?',
    a: 'Simply browse our verified doctor directory at /doctors, filter by specialty or language, choose an available 30-minute time slot that fits your schedule, and complete the secure payment through Paystack or your platform credits.',
  },
  {
    category: 'Booking',
    q: 'Can I choose between a General Practitioner (GP) and a Specialist?',
    a: 'Yes. You can book an appointment with any verified HPCSA GP or Medical Specialist (such as Paediatricians, Dermatologists, Psychiatrists). Every practitioner displays their qualifications, bio, and hourly rate.',
  },
  {
    category: 'Booking',
    q: 'Can I book an appointment for my child or dependent?',
    a: 'Yes. You can book a consultation on behalf of a minor dependent. You will be asked to enter the dependent’s name and date of birth during the clinical intake step so the doctor has accurate demographic details for the e-prescription.',
  },

  // Payments & Medical Aid
  {
    category: 'Payments & Medical Aid',
    q: 'Can I claim my consultation back from my medical aid?',
    a: 'Yes. All doctors on ChekUp247 have registered practice numbers with the Board of Healthcare Funders (BHF). Once your consultation is finished, you can download an itemized receipt containing your doctor’s practice number and the ICD-10 diagnostic code to submit directly to Discovery, Bonitas, Momentum, Medscheme, or any other South African scheme.',
  },
  {
    category: 'Payments & Medical Aid',
    q: 'What payment methods do you accept?',
    a: 'We accept Visa and Mastercard credit/debit cards via Paystack, Instant EFT (including Capitec Pay and Ozow), and ChekUp247 platform credits stored in your digital wallet.',
  },
  {
    category: 'Payments & Medical Aid',
    q: 'How does payment escrow protect me?',
    a: 'When you book an appointment, your payment is safely held in escrow. Funds are only disbursed to the doctor after the consultation has successfully concluded. If the doctor fails to attend, a 100% full refund is automatically reversed to your original card.',
  },

  // Prescriptions & Sick Notes
  {
    category: 'Prescriptions & Sick Notes',
    q: 'Will pharmacies accept my ChekUp247 electronic prescription?',
    a: 'Yes. Prescriptions generated on ChekUp247 comply with South African Pharmacy Council (SAPC) standards and the Medicines and Related Substances Act. They include the doctor’s digital signature, HPCSA registration number, and official ICD-10 diagnostic code. You can present the PDF on your phone or forward it directly to Dis-Chem, Clicks, or community pharmacies.',
  },
  {
    category: 'Prescriptions & Sick Notes',
    q: 'Can online doctors issue medical sick certificates?',
    a: 'Yes. If clinically indicated following your consultation, the attending doctor can issue an official medical sick note complying with Ethical Rules of the HPCSA. The certificate is stored securely in your dashboard for download.',
  },
  {
    category: 'Prescriptions & Sick Notes',
    q: 'Can doctors prescribe Schedule 5 or 6 medications online?',
    a: 'Prescribing of Schedule 5 and 6 controlled substances via telemedicine is subject to strict clinical governance under SAHPRA and HPCSA guidelines. Prescriptions are issued solely at the independent professional discretion of the physician where clinically justified.',
  },

  // Privacy & Security
  {
    category: 'Privacy & Security',
    q: 'Is ChekUp247 POPIA compliant?',
    a: 'Yes. ChekUp247 strictly adheres to the Protection of Personal Information Act 4 of 2013 (POPIA). All patient health records and clinical notes are end-to-end encrypted, and servers reside within certified South African data centers ensuring national data residency.',
  },
  {
    category: 'Privacy & Security',
    q: 'Are the video consultations recorded?',
    a: 'No. Video and audio streams are encrypted peer-to-peer WebRTC connections powered by Daily.co. We never record, store, or monitor your private medical consultation video.',
  },

  // Cancellations & Rescheduling
  {
    category: 'Cancellations & Refunds',
    q: 'What is the appointment cancellation policy?',
    a: 'You receive a 100% full refund if you cancel more than 24 hours prior to your scheduled consultation. Cancellations between 2 and 24 hours receive an 80% refund in platform credits. Cancellations under 2 hours receive a 50% refund to compensate the doctor for their reserved clinical slot.',
  },
  {
    category: 'Cancellations & Refunds',
    q: 'Can I reschedule my consultation to another time slot?',
    a: 'Yes. You can reschedule your booking free of charge up to 2 hours before the appointment by choosing another open slot on your doctor’s calendar directly from your dashboard.',
  },
  {
    category: 'Cancellations & Refunds',
    q: 'What if the doctor does not show up?',
    a: 'Doctors have a 10-minute grace period to enter the room. If a doctor fails to join, the appointment is marked as a doctor no-show and our automated system immediately initiates a 100% full refund to your original payment method.',
  },
];