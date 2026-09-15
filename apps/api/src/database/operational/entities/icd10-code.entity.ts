import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('icd10_codes')
export class Icd10Code {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_icd10_code', { unique: true })
  @Column({ type: 'varchar', length: 20, unique: true })
  code: string;

  @Index('idx_icd10_description')
  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  chapter: string | null;

  @Column({ type: 'boolean', default: true })
  is_valid_primary: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}
