import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService, CreateReviewDto } from './reviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TokenService, JwtPayload } from '../auth/token.service';
import { UserRole } from '../../database/operational/entities';
import { Reflector } from '@nestjs/core';

describe('ReviewsController (Unit & Guard Resolution)', () => {
  let controller: ReviewsController;

  const mockReviewsService = {
    createReview: jest.fn().mockResolvedValue({ id: 'rev-1', rating: 5 }),
    getDoctorReviews: jest.fn().mockResolvedValue({ reviews: [], total: 0, averageRating: 5 }),
    getPatientReviews: jest.fn().mockResolvedValue([]),
  };

  const mockTokenService = {
    verifyAccessToken: jest.fn().mockReturnValue({
      sub: 'pat-1',
      email: 'pat@example.com',
      role: UserRole.PATIENT,
      fullName: 'Patient Test',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        {
          provide: ReviewsService,
          useValue: mockReviewsService,
        },
        {
          provide: TokenService,
          useValue: mockTokenService,
        },
        JwtAuthGuard,
        RolesGuard,
        Reflector,
      ],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
  });

  it('should compile and resolve JwtAuthGuard with TokenService', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate createReview to reviewsService', async () => {
    const dto: CreateReviewDto = {
      bookingId: 'bkg-1',
      rating: 5,
      comment: 'Excellent consultation',
    };
    const user: JwtPayload = {
      sub: 'pat-1',
      email: 'pat@example.com',
      role: UserRole.PATIENT,
      fullName: 'Patient Test',
    };
    const result = await controller.submitReview(user, dto);
    expect(result).toEqual({ id: 'rev-1', rating: 5 });
    expect(mockReviewsService.createReview).toHaveBeenCalledWith('pat-1', dto);
  });

  it('should delegate getByDoctor to reviewsService', async () => {
    const result = await controller.getByDoctor('doc-1', 1, 10);
    expect(result).toBeDefined();
    expect(mockReviewsService.getDoctorReviews).toHaveBeenCalledWith('doc-1', { page: 1, limit: 10 });
  });
});
