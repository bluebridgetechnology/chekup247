import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NappiPrice } from './nappi-price.entity';

@Entity('nappi_products')
@Index('nappi_name_trgm', ['product_name'])
@Index('nappi_med_active', ['is_medicine', 'is_active'])
export class NappiProduct {
  @PrimaryColumn({ type: 'text' })
  nappi_code: string;

  @Column({ type: 'text' })
  product_code: string;

  @Column({ type: 'text' })
  pack_code: string;

  @Column({ type: 'text' })
  product_name: string;

  @Column({ type: 'numeric', nullable: true })
  strength: string | null;

  @Column({ type: 'text', nullable: true })
  strength_unit: string | null;

  @Column({ type: 'text', nullable: true })
  dosage_form_code: string | null;

  @Column({ type: 'text', nullable: true })
  dosage_form: string | null;

  @Column({ type: 'numeric', nullable: true })
  pack_size: string | null;

  @Column({ type: 'text', nullable: true })
  pack_uom: string | null;

  @Column({ type: 'text', nullable: true })
  route: string | null;

  @Column({ type: 'text', nullable: true })
  atc_mims_code: string | null;

  @Column({ type: 'text', nullable: true })
  atc_mims_desc: string | null;

  @Column({ type: 'text', nullable: true })
  generic_ind: string | null;

  @Column({ type: 'text', nullable: true })
  excl_flag: string | null;

  @Column({ type: 'text', nullable: true })
  excl_desc: string | null;

  @Column({ type: 'text', nullable: true })
  single_comb: string | null;

  @Column({ type: 'date', nullable: true })
  product_eff_date: string | null;

  @Column({ type: 'text', nullable: true })
  brand_code: string | null;

  @Column({ type: 'text', nullable: true })
  schedule: string | null;

  @Index('nappi_old_code')
  @Column({ type: 'text', nullable: true })
  old_nappi_code: string | null;

  @Column({ type: 'date', nullable: true })
  old_nappi_eff: string | null;

  @Column({ type: 'text', nullable: true })
  new_nappi_code: string | null;

  @Column({ type: 'date', nullable: true })
  new_nappi_eff: string | null;

  @Column({ type: 'text', nullable: true })
  manuf_code: string | null;

  @Column({ type: 'text', nullable: true })
  manuf_desc: string | null;

  @Column({ type: 'text', nullable: true })
  mmap_ind: string | null;

  @Column({ type: 'date', nullable: true })
  term_date: string | null;

  @Column({ type: 'text', nullable: true })
  status: string | null;

  @Column({ type: 'text', nullable: true })
  who_atc_code: string | null;

  @Column({ type: 'text', nullable: true })
  who_atc_desc: string | null;

  @Column({ type: 'boolean' })
  is_medicine: boolean;

  @Column({ type: 'boolean' })
  is_active: boolean;

  @Column({ type: 'text' })
  row_hash: string;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @OneToMany(() => NappiPrice, (price) => price.product)
  prices?: NappiPrice[];

  @ManyToOne(() => NappiProduct, {
    nullable: true,
    createForeignKeyConstraints: false,
  })
  @JoinColumn({ name: 'new_nappi_code', referencedColumnName: 'nappi_code' })
  replacement?: NappiProduct | null;
}
