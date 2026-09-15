import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './modules/health/health.controller';
import { StorageService } from './modules/storage/storage.service';
import { DataSource } from 'typeorm';

describe('HealthController (Unit)', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: 'operationalDataSource',
          useValue: { isInitialized: true, query: jest.fn().mockResolvedValue([1]) },
        },
        {
          provide: 'patientDataSource',
          useValue: { isInitialized: true, query: jest.fn().mockResolvedValue([1]) },
        },
        {
          provide: StorageService,
          useValue: { ping: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return live status ok', () => {
    const live = controller.getLive();
    expect(live.status).toBe('ok');
    expect(typeof live.uptime).toBe('number');
  });
});
