import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Testimonial } from '../../database/operational/entities';
import { TestimonialsService } from './testimonials.service';
import { TestimonialsController } from './testimonials.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Testimonial], 'operational')],
  controllers: [TestimonialsController],
  providers: [TestimonialsService],
  exports: [TestimonialsService],
})
export class TestimonialsModule {}
