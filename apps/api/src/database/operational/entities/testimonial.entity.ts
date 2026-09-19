import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type TestimonialType = 'patient' | 'doctor';

@Entity('testimonials')
export class Testimonial {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  quote: string;

  @Column({ type: 'varchar', length: 150 })
  author: string;

  @Column({ type: 'varchar', length: 10 })
  initials: string;

  @Column({ type: 'varchar', length: 150 })
  city: string;

  @Column({ type: 'varchar', length: 150 })
  doctor: string;

  @Column({ type: 'int', default: 5 })
  rating: number;

  @Column({ type: 'varchar', length: 50, default: 'patient' })
  type: TestimonialType;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
