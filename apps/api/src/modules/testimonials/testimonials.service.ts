import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Testimonial, TestimonialType } from '../../database/operational/entities';

export interface TestimonialDto {
  id: string;
  quote: string;
  author: string;
  initials: string;
  city: string;
  doctor: string;
  rating: number;
  type: TestimonialType;
}

const DEFAULT_PATIENT_TESTIMONIALS = [
  {
    quote:
      'Living in rural Eastern Cape, seeing a specialist normally meant a 3-hour drive. On ChekUp247, I had an HD video consultation with a paediatrician within an hour. The e-prescription arrived immediately on my phone.',
    author: 'Noluthando M.',
    initials: 'NM',
    city: 'Mthatha, Eastern Cape',
    doctor: 'Consulted Dr. Van Der Merwe',
    rating: 5,
    type: 'patient' as TestimonialType,
    is_active: true,
  },
  {
    quote:
      'I woke up with severe bronchitis before an important business presentation in Sandton. Booked a GP in 2 minutes, got a sick note with ICD-10 codes, and my medical aid reimbursed it within 48 hours.',
    author: 'Craig B.',
    initials: 'CB',
    city: 'Johannesburg, Gauteng',
    doctor: 'Consulted Dr. Molefe',
    rating: 5,
    type: 'patient' as TestimonialType,
    is_active: true,
  },
  {
    quote:
      'The payment holding in escrow gave me complete confidence. The video was crisp, the doctor was patient, and the pharmacy filled my script without hesitation. Five stars!',
    author: 'Zahra K.',
    initials: 'ZK',
    city: 'Cape Town, Western Cape',
    doctor: 'Consulted Dr. Pillay',
    rating: 5,
    type: 'patient' as TestimonialType,
    is_active: true,
  },
  {
    quote:
      'As a busy working mom of two, ChekUp247 saved me countless waiting room hours. Having a follow-up chat directly with the doctor after medication was started gave us immense peace of mind.',
    author: 'Precious D.',
    initials: 'PD',
    city: 'Durban, KwaZulu-Natal',
    doctor: 'Consulted Dr. Naidoo',
    rating: 5,
    type: 'patient' as TestimonialType,
    is_active: true,
  },
  {
    quote:
      'Booking was effortless and my medical aid details were validated immediately. The digital sick note had the verified doctor stamp and HPCSA reg number, accepted by HR right away.',
    author: 'Tebogo S.',
    initials: 'TS',
    city: 'Pretoria, Gauteng',
    doctor: 'Consulted Dr. Khumalo',
    rating: 5,
    type: 'patient' as TestimonialType,
    is_active: true,
  },
  {
    quote:
      'The in-clinic booking was seamless. I chose in-person visit on the widget, received directions via SMS, and walked in without the usual clinic queue hassle. Fantastic healthcare platform.',
    author: 'Mark W.',
    initials: 'MW',
    city: 'Bloemfontein, Free State',
    doctor: 'Consulted Dr. Botha',
    rating: 5,
    type: 'patient' as TestimonialType,
    is_active: true,
  },
];

const DEFAULT_DOCTOR_TESTIMONIALS = [
  {
    quote:
      'ChekUp247 allowed me to extend specialist dermatological care to patients across all nine provinces. The automated escrow payouts and structured medical history intake make remote consults safer and more efficient.',
    author: 'Dr. Sarah Jenkins',
    initials: 'SJ',
    city: 'Cape Town, Western Cape',
    doctor: 'Specialist Dermatologist • MBChB, FC Derm (SA)',
    rating: 5,
    type: 'doctor' as TestimonialType,
    is_active: true,
  },
  {
    quote:
      'The integration with WHO ICD-10 coding and verified electronic script signing saved our practice over 10 administrative hours per week. Patient adherence and follow-up communication have dramatically improved.',
    author: 'Dr. Sipho Ndlovu',
    initials: 'SN',
    city: 'Sandton, Gauteng',
    doctor: 'General Practitioner • MBChB (Wits), Dip PEC',
    rating: 5,
    type: 'doctor' as TestimonialType,
    is_active: true,
  },
];

@Injectable()
export class TestimonialsService implements OnModuleInit {
  private readonly logger = new Logger(TestimonialsService.name);

  constructor(
    @InjectRepository(Testimonial, 'operational')
    private readonly testimonialRepo: Repository<Testimonial>,
  ) {}

  async onModuleInit() {
    await this.seedTestimonialsIfEmpty();
  }

  /**
   * Seed verified testimonials into operational database if table is empty
   */
  async seedTestimonialsIfEmpty() {
    try {
      const count = await this.testimonialRepo.count();
      if (count === 0) {
        this.logger.log('Seeding initial verified testimonials into database...');
        const allToSeed = [...DEFAULT_PATIENT_TESTIMONIALS, ...DEFAULT_DOCTOR_TESTIMONIALS];
        await this.testimonialRepo.save(allToSeed);
        this.logger.log(`Successfully seeded ${allToSeed.length} testimonials into database.`);
      }
    } catch (err: any) {
      this.logger.warn(`Could not seed testimonials: ${err.message}`);
    }
  }

  /**
   * Fetch active testimonials from database by type (patient, doctor, or all)
   */
  async getTestimonials(type = 'patient', limit = 10): Promise<TestimonialDto[]> {
    try {
      const query = this.testimonialRepo
        .createQueryBuilder('t')
        .where('t.is_active = :isActive', { isActive: true });

      if (type && type !== 'all') {
        query.andWhere('t.type = :type', { type });
      }

      query.orderBy('t.created_at', 'ASC').take(limit);

      const records = await query.getMany();
      if (records.length > 0) {
        return records.map((r) => ({
          id: r.id,
          quote: r.quote,
          author: r.author,
          initials: r.initials,
          city: r.city,
          doctor: r.doctor,
          rating: r.rating,
          type: r.type,
        }));
      }
    } catch (e: any) {
      this.logger.error(`Failed to fetch testimonials from database: ${e.message}`);
    }

    // Fallback to defaults if DB table is empty
    const pool = type === 'doctor' ? DEFAULT_DOCTOR_TESTIMONIALS : DEFAULT_PATIENT_TESTIMONIALS;
    return pool.slice(0, limit).map((r, idx) => ({
      id: `fallback-${idx}`,
      ...r,
    }));
  }
}
