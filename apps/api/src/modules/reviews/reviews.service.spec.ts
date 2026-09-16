import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { Review, Booking, BookingStatus } from '../../database/patient/entities';
import { DoctorProfile, User } from '../../database/operational/entities';
import { QUEUES } from '../queues/queue.constants';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let reviewRepo: any;
  let bookingRepo: any;
  let doctorRepo: any;
  let userRepo: any;

  beforeEach(async () => {
    reviewRepo = {
      create: jest.fn().mockImplementation((dto) => ({ id: 'rev-1', ...dto, created_at: new Date() })),
      save: jest.fn().mockImplementation(async (r) => r),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ count: '5', avg: '4.80' }),
      }),
    };

    bookingRepo = {
      findOne: jest.fn(),
    };

    doctorRepo = {
      findOne: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    userRepo = {
      createQueryBuilder: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 'pat-1', full_name: 'John Doe' },
        ]),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        {
          provide: getRepositoryToken(Review, 'patient'),
          useValue: reviewRepo,
        },
        {
          provide: getRepositoryToken(Booking, 'patient'),
          useValue: bookingRepo,
        },
        {
          provide: getRepositoryToken(DoctorProfile, 'operational'),
          useValue: doctorRepo,
        },
        {
          provide: getRepositoryToken(User, 'operational'),
          useValue: userRepo,
        },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  describe('createReview (BE-901, BE-902)', () => {
    it('should throw BadRequestException if rating is outside 1-5', async () => {
      await expect(
        service.createReview('pat-1', { bookingId: 'book-1', rating: 6 }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createReview('pat-1', { bookingId: 'book-1', rating: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if booking does not exist', async () => {
      bookingRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createReview('pat-1', { bookingId: 'book-999', rating: 5 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if consultation is not completed', async () => {
      bookingRepo.findOne.mockResolvedValue({
        id: 'book-1',
        status: BookingStatus.CONFIRMED,
        patient_id: 'pat-1',
        doctor_id: 'doc-1',
      });

      await expect(
        service.createReview('pat-1', { bookingId: 'book-1', rating: 5 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if patient is not the consultation owner', async () => {
      bookingRepo.findOne.mockResolvedValue({
        id: 'book-1',
        status: BookingStatus.COMPLETED,
        patient_id: 'different-patient',
        doctor_id: 'doc-1',
      });

      await expect(
        service.createReview('pat-1', { bookingId: 'book-1', rating: 5 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if review already exists for booking', async () => {
      bookingRepo.findOne.mockResolvedValue({
        id: 'book-1',
        status: BookingStatus.COMPLETED,
        patient_id: 'pat-1',
        doctor_id: 'doc-1',
      });
      reviewRepo.findOne.mockResolvedValue({ id: 'existing-rev' });

      await expect(
        service.createReview('pat-1', { bookingId: 'book-1', rating: 5 }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create review and trigger cross-DB doctor rating update', async () => {
      bookingRepo.findOne.mockResolvedValue({
        id: 'book-1',
        status: BookingStatus.COMPLETED,
        patient_id: 'pat-1',
        doctor_id: 'doc-1',
      });
      reviewRepo.findOne.mockResolvedValue(null);

      const result = await service.createReview('pat-1', {
        bookingId: 'book-1',
        rating: 5,
        comment: 'Great consultation!',
      });

      expect(result).toBeDefined();
      expect(result.rating).toBe(5);
      expect(result.comment).toBe('Great consultation!');
      expect(doctorRepo.update).toHaveBeenCalledWith(
        { id: 'doc-1' },
        { rating_avg: 4.8, reviews_count: 5 },
      );
    });
  });

  describe('getDoctorReviews (BE-901)', () => {
    it('should return paginated reviews and distribution breakdown', async () => {
      doctorRepo.findOne.mockResolvedValue({ id: 'doc-1', slug: 'dr-smith' });
      reviewRepo.findAndCount.mockResolvedValue([
        [
          {
            id: 'rev-1',
            doctor_id: 'doc-1',
            patient_id: 'pat-1',
            rating: 5,
            comment: 'Very helpful doctor',
            created_at: new Date(),
          },
        ],
        1,
      ]);
      reviewRepo.find.mockResolvedValue([
        { rating: 5 },
        { rating: 4 },
      ]);

      const result = await service.getDoctorReviews('dr-smith', { page: 1, limit: 10 });

      expect(result.doctorId).toBe('doc-1');
      expect(result.reviewsCount).toBe(2);
      expect(result.ratingAvg).toBe(4.5);
      expect(result.distribution[5].count).toBe(1);
      expect(result.distribution[5].percentage).toBe(50);
      expect(result.reviews[0].patientName).toBe('John D.');
    });
  });
});
