import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MedicalService } from './medical.service';
import { Icd10Code } from '../../database/operational/entities';

describe('MedicalService (Unit)', () => {
  let service: MedicalService;
  let mockIcd10Repo: any;

  const sampleCodes = [
    {
      id: 'icd-1',
      code: 'I10',
      description: 'Essential (primary) hypertension',
      chapter: 'IX',
      is_valid_primary: true,
    },
    {
      id: 'icd-2',
      code: 'J06.9',
      description: 'Acute upper respiratory infection, unspecified',
      chapter: 'X',
      is_valid_primary: true,
    },
  ];

  beforeEach(async () => {
    const qb: any = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([sampleCodes[0]]),
    };

    mockIcd10Repo = {
      count: jest.fn().mockResolvedValue(50),
      find: jest.fn().mockResolvedValue(sampleCodes),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((c) => c),
      save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalService,
        {
          provide: getRepositoryToken(Icd10Code, 'operational'),
          useValue: mockIcd10Repo,
        },
      ],
    }).compile();

    service = module.get<MedicalService>(MedicalService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should search ICD-10 codes by query string', async () => {
    const results = await service.searchIcd10('hypertension', 10);
    expect(results).toHaveLength(1);
    expect(results[0].code).toBe('I10');
  });

  it('should return default list when query is empty', async () => {
    const results = await service.searchIcd10('', 10);
    expect(results).toHaveLength(2);
    expect(mockIcd10Repo.find).toHaveBeenCalled();
  });
});
