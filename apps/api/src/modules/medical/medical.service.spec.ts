import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MedicalService } from './medical.service';
import {
  Icd10Code,
  NappiProduct,
  NappiPrice,
} from '../../database/operational/entities';
import { envConfig } from '../../config/env.config';

describe('MedicalService (Unit)', () => {
  let service: MedicalService;
  let mockIcd10Repo: any;
  let mockNappiProductRepo: any;
  let mockNappiPriceRepo: any;

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

  const sampleNappiProduct: any = {
    nappi_code: '080824002',
    product_code: '080824',
    pack_code: '002',
    product_name: 'PROPRANOLOL NAM 4MG/ML SUSP',
    strength: '4',
    strength_unit: 'MG/ML',
    dosage_form: 'Suspension',
    pack_size: '100',
    pack_uom: 'ML',
    schedule: '4',
    generic_ind: 'N',
    manuf_desc: 'Intersana',
    route: 'OR',
    is_medicine: true,
    is_active: true,
    new_nappi_code: null,
    replacement: null,
    prices: [
      {
        nappi_code: '080824002',
        price_type: 'lstx',
        price: '75.50',
        effective_date: '2021-01-01',
      },
    ],
  };

  const sampleSupersededProduct: any = {
    nappi_code: '3000353001',
    product_code: '3000353',
    pack_code: '001',
    product_name: 'PROPRANOLOL NAM ONLY 10MG TABS',
    strength: '10',
    strength_unit: 'MG',
    dosage_form: 'Tab',
    pack_size: '28',
    pack_uom: 'EA',
    schedule: '3',
    generic_ind: 'N',
    manuf_desc: 'Novartis',
    route: 'OR',
    is_medicine: true,
    is_active: false,
    new_nappi_code: '080824002',
    replacement: sampleNappiProduct,
  };

  beforeEach(async () => {
    const icdQb: any = {
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([sampleCodes[0]]),
    };

    mockIcd10Repo = {
      count: jest.fn().mockResolvedValue(50),
      find: jest.fn().mockResolvedValue(sampleCodes),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((c) => c),
      save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
      createQueryBuilder: jest.fn().mockReturnValue(icdQb),
    };

    const nappiQb: any = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockImplementation(async () => [sampleNappiProduct]),
    };

    mockNappiProductRepo = {
      count: jest.fn().mockResolvedValue(740000),
      createQueryBuilder: jest.fn().mockReturnValue(nappiQb),
    };

    mockNappiPriceRepo = {
      find: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalService,
        {
          provide: getRepositoryToken(Icd10Code, 'operational'),
          useValue: mockIcd10Repo,
        },
        {
          provide: getRepositoryToken(NappiProduct, 'operational'),
          useValue: mockNappiProductRepo,
        },
        {
          provide: getRepositoryToken(NappiPrice, 'operational'),
          useValue: mockNappiPriceRepo,
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

  it('should return default list when ICD-10 query is empty', async () => {
    const results = await service.searchIcd10('', 10);
    expect(results).toHaveLength(2);
    expect(mockIcd10Repo.find).toHaveBeenCalled();
  });

  it('should search medicines by fuzzy name matching propranolol (BE-705)', async () => {
    const results = await service.searchMedications('propranolol', 10);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].product_name).toContain('PROPRANOLOL');
    expect(results[0].nappi_code).toBe('080824002');
    expect(results[0].strength).toBe('4 MG/ML');
    expect(results[0].schedule).toBe('S4');
    expect(results[0].dosage_form).toBe('Suspension');
    expect(results[0].pack_size).toBe('100');
    expect(results[0].pack_uom).toBe('ML');
    expect(results[0].manufacturer).toBe('Intersana');
    expect(results[0].is_medicine).toBe(true);
    expect(results[0].is_active).toBe(true);
  });

  it('should lookup medicine by exact NAPPI code', async () => {
    const results = await service.searchMedications('080824002', 1);
    expect(results.length).toBe(1);
    expect(results[0].nappi_code).toBe('080824002');
  });

  it('should surface replacement product when item is superseded', async () => {
    const qb = mockNappiProductRepo.createQueryBuilder();
    qb.getMany.mockResolvedValueOnce([sampleSupersededProduct]);

    const results = await service.searchMedications('3000353001', {
      includeInactive: true,
    });
    expect(results.length).toBe(1);
    expect(results[0].nappi_code).toBe('3000353001');
    expect(results[0].new_nappi_code).toBe('080824002');
    expect(results[0].replacement).toBeDefined();
    expect(results[0].replacement.nappi_code).toBe('080824002');
    expect(results[0].replacement.product_name).toBe(
      'PROPRANOLOL NAM 4MG/ML SUSP',
    );
    expect(results[0].replacement.is_active).toBe(true);
  });

  it('should not expose prices when SHOW_NAPPI_PRICES config is false', async () => {
    const results = await service.searchMedications('propranolol', 1);
    expect(results.length).toBe(1);
    expect((results[0] as any).prices).toBeUndefined();
  });

  it('should filter controlled S5/S6 medications correctly', async () => {
    const controlledProd: any = {
      ...sampleNappiProduct,
      nappi_code: '702677001',
      product_name: 'CIPRALEX 10MG TABS',
      schedule: '5',
    };
    const qb = mockNappiProductRepo.createQueryBuilder();
    qb.getMany.mockResolvedValueOnce([controlledProd]);

    const results = await service.searchMedications('Cipralex');
    expect(results.length).toBe(1);
    expect(results[0].schedule).toBe('S5');
    expect(results[0].is_controlled).toBe(true);
  });

  it('should fallback to in-memory catalog when database table is unpopulated', async () => {
    mockNappiProductRepo.count.mockResolvedValueOnce(0);

    const results = await service.searchMedications('Amoxicillin');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].generic_name.toLowerCase()).toContain('amoxicillin');
    expect(results[0].nappi_code).toBeDefined();
  });
});
