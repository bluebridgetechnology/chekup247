import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { NappiProduct } from './nappi-product.entity';

@Entity('nappi_prices')
export class NappiPrice {
  @PrimaryColumn({ type: 'text' })
  nappi_code: string;

  @PrimaryColumn({ type: 'text' })
  price_type: string;

  @Column({ type: 'numeric' })
  price: string;

  @Column({ type: 'date', nullable: true })
  effective_date: string | null;

  @ManyToOne(() => NappiProduct, (product) => product.prices, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'nappi_code', referencedColumnName: 'nappi_code' })
  product?: NappiProduct;
}
