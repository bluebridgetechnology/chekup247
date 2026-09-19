import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorators';
import { TestimonialsService, TestimonialDto } from './testimonials.service';

@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  /**
   * Public Testimonials API (GET /api/v1/testimonials)
   * Fetches verified patient or doctor testimonials stored in the database.
   * Query params:
   *   type: 'patient' | 'doctor' | 'all' (default: 'patient')
   *   limit: number (default: 10)
   */
  @Public()
  @Get()
  async getTestimonials(
    @Query('type') type?: string,
    @Query('limit') limit?: number,
  ): Promise<{ testimonials: TestimonialDto[]; total: number }> {
    const data = await this.testimonialsService.getTestimonials(
      type || 'patient',
      limit ? Number(limit) : 10,
    );
    return {
      testimonials: data,
      total: data.length,
    };
  }
}
