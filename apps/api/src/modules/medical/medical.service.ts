import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { Icd10Code } from '../../database/operational/entities';
import { envConfig } from '../../config/env.config';

interface WhoTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

@Injectable()
export class MedicalService implements OnModuleInit {
  private readonly logger = new Logger(MedicalService.name);
  private cachedToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor(
    @InjectRepository(Icd10Code, 'operational')
    private readonly icd10Repository: Repository<Icd10Code>,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.icd10Repository.count();
      if (count === 0) {
        this.logger.log('ICD-10 Master Industry Table is empty. Seeding primary care codes...');
        await this.seedSouthAfricanIcd10Table();
      } else {
        this.logger.log(`ICD-10 table verified with ${count} diagnostic codes.`);
      }
    } catch (err: any) {
      this.logger.warn(`ICD-10 seed check deferred: ${err.message}`);
    }
  }

  /**
   * Search ICD-10 codes with typeahead support (BE-306)
   */
  async searchIcd10(query: string, limit = 20): Promise<Icd10Code[]> {
    if (!query || query.trim().length === 0) {
      return this.icd10Repository.find({
        order: { code: 'ASC' },
        take: limit,
      });
    }

    const cleanQuery = query.trim();

    // Query local indexed Postgres table
    const results = await this.icd10Repository
      .createQueryBuilder('icd')
      .where('icd.code ILIKE :q OR icd.description ILIKE :q', {
        q: `%${cleanQuery}%`,
      })
      .orderBy(
        // Prioritize exact code matches first, then starts-with, then description
        `CASE 
          WHEN icd.code ILIKE '${cleanQuery}' THEN 1
          WHEN icd.code ILIKE '${cleanQuery}%' THEN 2
          WHEN icd.description ILIKE '${cleanQuery}%' THEN 3
          ELSE 4 
        END`,
        'ASC',
      )
      .addOrderBy('icd.code', 'ASC')
      .take(limit)
      .getMany();

    // If local results are sparse and WHO ICD credentials exist, attempt online lookup in background
    if (results.length < 5 && cleanQuery.length >= 3) {
      this.fetchAndCacheFromWhoApi(cleanQuery).catch((err) => {
        this.logger.debug(`WHO ICD API background fetch note: ${err.message}`);
      });
    }

    return results;
  }

  /**
   * Get WHO ICD API Access Token via OAuth2 Client Credentials
   * Token endpoint: https://icdaccessmanagement.who.int/connect/token
   */
  async getWhoApiToken(): Promise<string | null> {
    const clientId = envConfig.WHO_ICD_CLIENT_ID;
    const clientSecret = envConfig.WHO_ICD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return null;
    }

    // Return cached token if valid with 60 second buffer
    if (this.cachedToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.cachedToken;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    try {
      const params = new URLSearchParams();
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('scope', 'icdapi_access');
      params.append('grant_type', 'client_credentials');

      const response = await fetch('https://icdaccessmanagement.who.int/connect/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data: any = await response.json();
      if (data?.access_token) {
        this.cachedToken = data.access_token;
        this.tokenExpiresAt = Date.now() + (data.expires_in || 3600) * 1000;
        this.logger.log('Successfully acquired WHO ICD-10 API OAuth2 Bearer token.');
        return this.cachedToken;
      }
    } catch (err: any) {
      this.logger.warn(`Failed to obtain WHO ICD API token: ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    return null;
  }

  /**
   * Query WHO ICD API and cache returned terms into local database
   */
  async fetchAndCacheFromWhoApi(keyword: string): Promise<number> {
    const token = await this.getWhoApiToken();
    if (!token) return 0;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      const searchUrl = new URL('https://id.who.int/icd/entity/search');
      searchUrl.searchParams.set('q', keyword);
      searchUrl.searchParams.set('subtreeFilterUsesFoundationDescendants', 'false');
      searchUrl.searchParams.set('includeKeywordResult', 'true');
      searchUrl.searchParams.set('useFlexisearch', 'true');
      searchUrl.searchParams.set('flatResults', 'true');

      const response = await fetch(searchUrl.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'API-Version': 'v2',
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        return 0;
      }

      const data: any = await response.json();
      const entities = data?.destinationEntities || [];
      let cachedCount = 0;


      for (const item of entities) {
        const code = item.theCode || item.code;
        const description = item.title?.replace(/<[^>]*>?/gm, '') || item.label;

        if (code && description) {
          const existing = await this.icd10Repository.findOne({ where: { code } });
          if (!existing) {
            const newCode = this.icd10Repository.create({
              code,
              description,
              chapter: item.chapter || null,
              is_valid_primary: true,
            });
            await this.icd10Repository.save(newCode);
            cachedCount++;
          }
        }
      }

      if (cachedCount > 0) {
        this.logger.log(`Cached ${cachedCount} new ICD-10 codes from WHO API for query "${keyword}".`);
      }
      return cachedCount;
    } catch (err: any) {
      this.logger.debug(`WHO API entity search skipped: ${err.message}`);
      return 0;
    }
  }

  /**
   * Seed official South African Master Industry Table (MIT) core codes
   * Covers standard South African primary healthcare and general practice conditions
   */
  async seedSouthAfricanIcd10Table(): Promise<number> {
    const commonCodes: Array<{
      code: string;
      description: string;
      chapter: string;
      is_valid_primary: boolean;
    }> = [
      // Infections (Chapter I)
      { code: 'A09', description: 'Infectious gastroenteritis and colitis, unspecified', chapter: 'I', is_valid_primary: true },
      { code: 'A09.0', description: 'Other and unspecified gastroenteritis and colitis of infectious origin', chapter: 'I', is_valid_primary: true },
      { code: 'A15.0', description: 'Tuberculosis of lung, confirmed by sputum microscopy with or without culture', chapter: 'I', is_valid_primary: true },
      { code: 'A16.2', description: 'Tuberculosis of lung, without mention of bacteriological or histological confirmation', chapter: 'I', is_valid_primary: true },
      { code: 'B20', description: 'Human immunodeficiency virus [HIV] disease resulting in infectious and parasitic diseases', chapter: 'I', is_valid_primary: true },
      { code: 'B24', description: 'Unspecified human immunodeficiency virus [HIV] disease', chapter: 'I', is_valid_primary: true },
      { code: 'B34.9', description: 'Viral infection, unspecified', chapter: 'I', is_valid_primary: true },
      { code: 'B37.3', description: 'Candidiasis of vulva and vagina', chapter: 'I', is_valid_primary: true },
      { code: 'B54', description: 'Unspecified malaria', chapter: 'I', is_valid_primary: true },

      // Endocrine, nutritional and metabolic (Chapter IV)
      { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications', chapter: 'IV', is_valid_primary: true },
      { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', chapter: 'IV', is_valid_primary: true },
      { code: 'E11.65', description: 'Type 2 diabetes mellitus with poor control', chapter: 'IV', is_valid_primary: true },
      { code: 'E03.9', description: 'Hypothyroidism, unspecified', chapter: 'IV', is_valid_primary: true },
      { code: 'E66.9', description: 'Obesity, unspecified', chapter: 'IV', is_valid_primary: true },
      { code: 'E78.0', description: 'Pure hypercholesterolaemia', chapter: 'IV', is_valid_primary: true },
      { code: 'E78.5', description: 'Hyperlipidaemia, unspecified / Dyslipidaemia', chapter: 'IV', is_valid_primary: true },

      // Mental and behavioural disorders (Chapter V)
      { code: 'F32.0', description: 'Mild depressive episode', chapter: 'V', is_valid_primary: true },
      { code: 'F32.1', description: 'Moderate depressive episode', chapter: 'V', is_valid_primary: true },
      { code: 'F32.9', description: 'Depressive episode, unspecified', chapter: 'V', is_valid_primary: true },
      { code: 'F41.1', description: 'Generalized anxiety disorder', chapter: 'V', is_valid_primary: true },
      { code: 'F41.9', description: 'Anxiety disorder, unspecified', chapter: 'V', is_valid_primary: true },
      { code: 'F43.0', description: 'Acute stress reaction', chapter: 'V', is_valid_primary: true },
      { code: 'F51.0', description: 'Nonorganic insomnia', chapter: 'V', is_valid_primary: true },

      // Nervous system (Chapter VI)
      { code: 'G43.9', description: 'Migraine, unspecified', chapter: 'VI', is_valid_primary: true },
      { code: 'G44.2', description: 'Tension-type headache', chapter: 'VI', is_valid_primary: true },

      // Circulatory system (Chapter IX)
      { code: 'I10', description: 'Essential (primary) hypertension', chapter: 'IX', is_valid_primary: true },
      { code: 'I11.9', description: 'Hypertensive heart disease without heart failure', chapter: 'IX', is_valid_primary: true },
      { code: 'I20.9', description: 'Angina pectoris, unspecified', chapter: 'IX', is_valid_primary: true },
      { code: 'I25.1', description: 'Atherosclerotic heart disease', chapter: 'IX', is_valid_primary: true },
      { code: 'I50.9', description: 'Heart failure, unspecified', chapter: 'IX', is_valid_primary: true },

      // Respiratory system (Chapter X)
      { code: 'J00', description: 'Acute nasopharyngitis [common cold]', chapter: 'X', is_valid_primary: true },
      { code: 'J01.9', description: 'Acute sinusitis, unspecified', chapter: 'X', is_valid_primary: true },
      { code: 'J02.9', description: 'Acute pharyngitis, unspecified', chapter: 'X', is_valid_primary: true },
      { code: 'J03.9', description: 'Acute tonsillitis, unspecified', chapter: 'X', is_valid_primary: true },
      { code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', chapter: 'X', is_valid_primary: true },
      { code: 'J11.1', description: 'Influenza with other respiratory manifestations, virus not identified', chapter: 'X', is_valid_primary: true },
      { code: 'J18.9', description: 'Pneumonia, unspecified', chapter: 'X', is_valid_primary: true },
      { code: 'J20.9', description: 'Acute bronchitis, unspecified', chapter: 'X', is_valid_primary: true },
      { code: 'J30.4', description: 'Allergic rhinitis, unspecified', chapter: 'X', is_valid_primary: true },
      { code: 'J40', description: 'Bronchitis, not specified as acute or chronic', chapter: 'X', is_valid_primary: true },
      { code: 'J44.9', description: 'Chronic obstructive pulmonary disease [COPD], unspecified', chapter: 'X', is_valid_primary: true },
      { code: 'J45.9', description: 'Asthma, unspecified', chapter: 'X', is_valid_primary: true },

      // Digestive system (Chapter XI)
      { code: 'K21.9', description: 'Gastro-oesophageal reflux disease without oesophagitis [GERD]', chapter: 'XI', is_valid_primary: true },
      { code: 'K27.9', description: 'Peptic ulcer, site unspecified, unspecified as acute or chronic', chapter: 'XI', is_valid_primary: true },
      { code: 'K29.7', description: 'Gastritis, unspecified', chapter: 'XI', is_valid_primary: true },
      { code: 'K30', description: 'Functional dyspepsia / Indigestion', chapter: 'XI', is_valid_primary: true },
      { code: 'K58.0', description: 'Irritable bowel syndrome with diarrhoea', chapter: 'XI', is_valid_primary: true },
      { code: 'K58.9', description: 'Irritable bowel syndrome without diarrhoea', chapter: 'XI', is_valid_primary: true },
      { code: 'K59.0', description: 'Constipation', chapter: 'XI', is_valid_primary: true },
      { code: 'K64.9', description: 'Haemorrhoids, unspecified', chapter: 'XI', is_valid_primary: true },

      // Skin and subcutaneous tissue (Chapter XII)
      { code: 'L03.9', description: 'Cellulitis, unspecified', chapter: 'XII', is_valid_primary: true },
      { code: 'L20.9', description: 'Atopic dermatitis, unspecified / Eczema', chapter: 'XII', is_valid_primary: true },
      { code: 'L23.9', description: 'Allergic contact dermatitis, unspecified cause', chapter: 'XII', is_valid_primary: true },
      { code: 'L25.9', description: 'Unspecified contact dermatitis, unspecified cause', chapter: 'XII', is_valid_primary: true },
      { code: 'L50.9', description: 'Urticaria, unspecified / Hives', chapter: 'XII', is_valid_primary: true },
      { code: 'L70.0', description: 'Acne vulgaris', chapter: 'XII', is_valid_primary: true },

      // Musculoskeletal system and connective tissue (Chapter XIII)
      { code: 'M19.9', description: 'Osteoarthritis, unspecified site', chapter: 'XIII', is_valid_primary: true },
      { code: 'M54.2', description: 'Cervicalgia / Neck pain', chapter: 'XIII', is_valid_primary: true },
      { code: 'M54.5', description: 'Low back pain / Lumbago', chapter: 'XIII', is_valid_primary: true },
      { code: 'M54.9', description: 'Dorsalgia / Back pain, unspecified', chapter: 'XIII', is_valid_primary: true },
      { code: 'M79.1', description: 'Myalgia / Muscle pain', chapter: 'XIII', is_valid_primary: true },
      { code: 'M79.7', description: 'Fibromyalgia', chapter: 'XIII', is_valid_primary: true },

      // Genitourinary system (Chapter XIV)
      { code: 'N39.0', description: 'Urinary tract infection, site not specified [UTI]', chapter: 'XIV', is_valid_primary: true },
      { code: 'N94.6', description: 'Dysmenorrhoea, unspecified', chapter: 'XIV', is_valid_primary: true },
      { code: 'N95.1', description: 'Menopausal and female climacteric states', chapter: 'XIV', is_valid_primary: true },

      // Symptoms, signs and abnormal clinical findings (Chapter XVIII)
      { code: 'R05', description: 'Cough', chapter: 'XVIII', is_valid_primary: true },
      { code: 'R07.4', description: 'Chest pain, unspecified', chapter: 'XVIII', is_valid_primary: true },
      { code: 'R10.4', description: 'Other and unspecified abdominal pain', chapter: 'XVIII', is_valid_primary: true },
      { code: 'R11', description: 'Nausea and vomiting', chapter: 'XVIII', is_valid_primary: true },
      { code: 'R42', description: 'Dizziness and giddiness / Vertigo', chapter: 'XVIII', is_valid_primary: true },
      { code: 'R50.9', description: 'Fever, unspecified', chapter: 'XVIII', is_valid_primary: true },
      { code: 'R51', description: 'Headache', chapter: 'XVIII', is_valid_primary: true },
      { code: 'R53', description: 'Malaise and fatigue', chapter: 'XVIII', is_valid_primary: true },

      // Injury, poisoning (Chapter XIX)
      { code: 'S93.4', description: 'Sprain and strain of ankle', chapter: 'XIX', is_valid_primary: true },
      { code: 'T14.0', description: 'Superficial injury of unspecified body region', chapter: 'XIX', is_valid_primary: true },

      // Factors influencing health status (Chapter XXI)
      { code: 'Z00.0', description: 'General medical examination / Health checkup', chapter: 'XXI', is_valid_primary: true },
      { code: 'Z01.0', description: 'Examination of eyes and vision', chapter: 'XXI', is_valid_primary: true },
      { code: 'Z30.0', description: 'General counselling and advice on contraception', chapter: 'XXI', is_valid_primary: true },
      { code: 'Z76.0', description: 'Issue of repeat prescription', chapter: 'XXI', is_valid_primary: true },
    ];

    let inserted = 0;
    for (const item of commonCodes) {
      const existing = await this.icd10Repository.findOne({ where: { code: item.code } });
      if (!existing) {
        const entity = this.icd10Repository.create(item);
        await this.icd10Repository.save(entity);
        inserted++;
      }
    }

    this.logger.log(`Seeded ${inserted} South African ICD-10 MIT clinical diagnostic codes.`);
    return inserted;
  }

  /**
   * Search MediKredit NAPPI & South African primary care medication catalog (BE-705).
   * Supports Schedules S0 through S6 with NAPPI codes, strengths, and dosage forms.
   */
  async searchMedications(query: string, limit = 20) {
    const catalog = this.getSouthAfricanMedicationCatalog();

    if (!query || query.trim().length === 0) {
      return catalog.slice(0, limit);
    }

    const clean = query.trim().toLowerCase();

    const filtered = catalog.filter(
      (m) =>
        m.name.toLowerCase().includes(clean) ||
        m.generic_name.toLowerCase().includes(clean) ||
        m.nappi_code.includes(clean) ||
        m.category.toLowerCase().includes(clean),
    );

    // If query didn't match pre-indexed items, provide dynamic free-text fallback entry
    if (filtered.length === 0 && clean.length > 2) {
      return [
        {
          name: query.trim(),
          generic_name: query.trim(),
          nappi_code: 'CUSTOM-FREE-TEXT',
          schedule: 'S4',
          dosage_form: 'Tablet / Capsule',
          strength: 'As directed',
          category: 'Custom Clinical Medication',
          is_controlled: false,
        },
      ];
    }

    return filtered.slice(0, limit);
  }

  /**
   * Comprehensive South African Primary Care & Chronic Medication Catalog (MediKredit NAPPI indexed).
   */
  private getSouthAfricanMedicationCatalog() {
    return [
      // Schedule 0 & 1 — Mild Analgesia & Antipyretics
      {
        name: 'Panado 500mg Tablets',
        generic_name: 'Paracetamol',
        nappi_code: '753173001',
        schedule: 'S0',
        dosage_form: 'Tablet',
        strength: '500mg',
        category: 'Analgesics / Antipyretics',
        is_controlled: false,
      },
      {
        name: 'Adco-Paracetamol 500mg',
        generic_name: 'Paracetamol',
        nappi_code: '702138001',
        schedule: 'S0',
        dosage_form: 'Tablet',
        strength: '500mg',
        category: 'Analgesics / Antipyretics',
        is_controlled: false,
      },
      {
        name: 'Sinutab Non-Drowsy Tablets',
        generic_name: 'Paracetamol / Pseudoephedrine',
        nappi_code: '764582001',
        schedule: 'S1',
        dosage_form: 'Tablet',
        strength: '500mg / 30mg',
        category: 'Cold and Flu',
        is_controlled: false,
      },
      // Schedule 2 — NSAIDs & Antihistamines
      {
        name: 'Nurofen 200mg Tablets',
        generic_name: 'Ibuprofen',
        nappi_code: '750433001',
        schedule: 'S2',
        dosage_form: 'Tablet',
        strength: '200mg',
        category: 'Anti-inflammatory / NSAID',
        is_controlled: false,
      },
      {
        name: 'Brufen 400mg Tablets',
        generic_name: 'Ibuprofen',
        nappi_code: '710490001',
        schedule: 'S2',
        dosage_form: 'Film-coated tablet',
        strength: '400mg',
        category: 'Anti-inflammatory / NSAID',
        is_controlled: false,
      },
      {
        name: 'Voltaren Acti-Go 12.5mg',
        generic_name: 'Diclofenac Potassium',
        nappi_code: '707758001',
        schedule: 'S2',
        dosage_form: 'Softgel capsule',
        strength: '12.5mg',
        category: 'Anti-inflammatory / NSAID',
        is_controlled: false,
      },
      {
        name: 'Allergex 4mg Tablets',
        generic_name: 'Chlorpheniramine maleate',
        nappi_code: '702811001',
        schedule: 'S2',
        dosage_form: 'Tablet',
        strength: '4mg',
        category: 'Antihistamines',
        is_controlled: false,
      },
      {
        name: 'Telfast 120mg Tablets',
        generic_name: 'Fexofenadine hydrochloride',
        nappi_code: '704870001',
        schedule: 'S2',
        dosage_form: 'Film-coated tablet',
        strength: '120mg',
        category: 'Antihistamines',
        is_controlled: false,
      },
      {
        name: 'Gaviscon Plus Liquid',
        generic_name: 'Sodium alginate / Calcium carbonate',
        nappi_code: '728284001',
        schedule: 'S1',
        dosage_form: 'Oral suspension',
        strength: '500mg/267mg per 10ml',
        category: 'Antacids',
        is_controlled: false,
      },

      // Schedule 3 — Chronic Care: Antihypertensives, Antidiabetics, Bronchodilators
      {
        name: 'Norvasc 5mg Tablets',
        generic_name: 'Amlodipine besylate',
        nappi_code: '748722001',
        schedule: 'S3',
        dosage_form: 'Tablet',
        strength: '5mg',
        category: 'Antihypertensives / Calcium Channel Blockers',
        is_controlled: false,
      },
      {
        name: 'Amloc 10mg Tablets',
        generic_name: 'Amlodipine besylate',
        nappi_code: '704381001',
        schedule: 'S3',
        dosage_form: 'Tablet',
        strength: '10mg',
        category: 'Antihypertensives / Calcium Channel Blockers',
        is_controlled: false,
      },
      {
        name: 'Cozaar 50mg Tablets',
        generic_name: 'Losartan potassium',
        nappi_code: '809071001',
        schedule: 'S3',
        dosage_form: 'Tablet',
        strength: '50mg',
        category: 'Antihypertensives / ARB',
        is_controlled: false,
      },
      {
        name: 'Glucophage 500mg Tablets',
        generic_name: 'Metformin hydrochloride',
        nappi_code: '728861001',
        schedule: 'S3',
        dosage_form: 'Film-coated tablet',
        strength: '500mg',
        category: 'Antidiabetics',
        is_controlled: false,
      },
      {
        name: 'Glucophage 850mg Tablets',
        generic_name: 'Metformin hydrochloride',
        nappi_code: '728888001',
        schedule: 'S3',
        dosage_form: 'Film-coated tablet',
        strength: '850mg',
        category: 'Antidiabetics',
        is_controlled: false,
      },
      {
        name: 'Lipitor 20mg Tablets',
        generic_name: 'Atorvastatin calcium',
        nappi_code: '837776001',
        schedule: 'S3',
        dosage_form: 'Film-coated tablet',
        strength: '20mg',
        category: 'Lipid-lowering / Statins',
        is_controlled: false,
      },
      {
        name: 'Ventolin Evohaler 100mcg',
        generic_name: 'Salbutamol sulphate',
        nappi_code: '772712001',
        schedule: 'S3',
        dosage_form: 'Pressurised inhalation',
        strength: '100mcg/actuation',
        category: 'Respiratory / Bronchodilators',
        is_controlled: false,
      },

      // Schedule 4 — Antibiotics, Systemic Corticosteroids, PPIs
      {
        name: 'Augmentin 625mg Tablets',
        generic_name: 'Amoxicillin / Clavulanic acid',
        nappi_code: '706035001',
        schedule: 'S4',
        dosage_form: 'Film-coated tablet',
        strength: '500mg / 125mg',
        category: 'Antibiotics / Penicillins',
        is_controlled: false,
      },
      {
        name: 'Augmentin 1g Tablets',
        generic_name: 'Amoxicillin / Clavulanic acid',
        nappi_code: '706043001',
        schedule: 'S4',
        dosage_form: 'Film-coated tablet',
        strength: '875mg / 125mg',
        category: 'Antibiotics / Penicillins',
        is_controlled: false,
      },
      {
        name: 'Amoxil 500mg Capsules',
        generic_name: 'Amoxicillin trihydrate',
        nappi_code: '702846001',
        schedule: 'S4',
        dosage_form: 'Capsule',
        strength: '500mg',
        category: 'Antibiotics / Penicillins',
        is_controlled: false,
      },
      {
        name: 'Zithromax 500mg Tablets',
        generic_name: 'Azithromycin',
        nappi_code: '780189001',
        schedule: 'S4',
        dosage_form: 'Film-coated tablet',
        strength: '500mg',
        category: 'Antibiotics / Macrolides',
        is_controlled: false,
      },
      {
        name: 'Ciprobay 500mg Tablets',
        generic_name: 'Ciprofloxacin hydrochloride',
        nappi_code: '716073001',
        schedule: 'S4',
        dosage_form: 'Film-coated tablet',
        strength: '500mg',
        category: 'Antibiotics / Fluoroquinolones',
        is_controlled: false,
      },
      {
        name: 'Nexiam 20mg Tablets',
        generic_name: 'Esomeprazole magnesium',
        nappi_code: '891002001',
        schedule: 'S4',
        dosage_form: 'Enteric coated tablet',
        strength: '20mg',
        category: 'Gastrointestinal / PPI',
        is_controlled: false,
      },
      {
        name: 'Nexiam 40mg Tablets',
        generic_name: 'Esomeprazole magnesium',
        nappi_code: '891010001',
        schedule: 'S4',
        dosage_form: 'Enteric coated tablet',
        strength: '40mg',
        category: 'Gastrointestinal / PPI',
        is_controlled: false,
      },
      {
        name: 'Prednisone 5mg Tablets',
        generic_name: 'Prednisone',
        nappi_code: '756784001',
        schedule: 'S4',
        dosage_form: 'Tablet',
        strength: '5mg',
        category: 'Systemic Corticosteroids',
        is_controlled: false,
      },
      {
        name: 'Cipralex 10mg Tablets',
        generic_name: 'Escitalopram oxalate',
        nappi_code: '702677001',
        schedule: 'S5',
        dosage_form: 'Film-coated tablet',
        strength: '10mg',
        category: 'Antidepressants / SSRI',
        is_controlled: true,
      },

      // Schedule 5 — Sedatives, Anxiolytics, Controlled Antidepressants (BE-703)
      {
        name: 'Xanax 0.5mg Tablets',
        generic_name: 'Alprazolam',
        nappi_code: '776513001',
        schedule: 'S5',
        dosage_form: 'Scored tablet',
        strength: '0.5mg',
        category: 'Anxiolytics / Benzodiazepines',
        is_controlled: true,
      },
      {
        name: 'Valium 5mg Tablets',
        generic_name: 'Diazepam',
        nappi_code: '771694001',
        schedule: 'S5',
        dosage_form: 'Tablet',
        strength: '5mg',
        category: 'Anxiolytics / Benzodiazepines',
        is_controlled: true,
      },
      {
        name: 'Ativan 1mg Tablets',
        generic_name: 'Lorazepam',
        nappi_code: '705489001',
        schedule: 'S5',
        dosage_form: 'Tablet',
        strength: '1mg',
        category: 'Anxiolytics / Benzodiazepines',
        is_controlled: true,
      },
      {
        name: 'Stilnox 10mg Tablets',
        generic_name: 'Zolpidem hemitartrate',
        nappi_code: '768138001',
        schedule: 'S5',
        dosage_form: 'Film-coated tablet',
        strength: '10mg',
        category: 'Hypnotics / Non-benzodiazepine',
        is_controlled: true,
      },
      {
        name: 'Urbanol 10mg Tablets',
        generic_name: 'Clobazam',
        nappi_code: '770922001',
        schedule: 'S5',
        dosage_form: 'Tablet',
        strength: '10mg',
        category: 'Anxiolytics / Benzodiazepines',
        is_controlled: true,
      },
      {
        name: 'Lyrica 75mg Capsules',
        generic_name: 'Pregabalin',
        nappi_code: '702434001',
        schedule: 'S5',
        dosage_form: 'Capsule',
        strength: '75mg',
        category: 'Neuropathic Analgesia / Anticonvulsants',
        is_controlled: true,
      },
      {
        name: 'Tramal 50mg Capsules',
        generic_name: 'Tramadol hydrochloride',
        nappi_code: '769975001',
        schedule: 'S5',
        dosage_form: 'Capsule',
        strength: '50mg',
        category: 'Opioid Analgesics',
        is_controlled: true,
      },

      // Schedule 6 — Highly Controlled Substances: Narcotics & Psychostimulants (BE-703)
      {
        name: 'Ritalin 10mg Tablets',
        generic_name: 'Methylphenidate hydrochloride',
        nappi_code: '760455001',
        schedule: 'S6',
        dosage_form: 'Scored tablet',
        strength: '10mg',
        category: 'CNS Stimulants / ADHD Agents',
        is_controlled: true,
      },
      {
        name: 'Concerta 18mg Extended-Release',
        generic_name: 'Methylphenidate hydrochloride',
        nappi_code: '703080001',
        schedule: 'S6',
        dosage_form: 'Extended-release tablet',
        strength: '18mg',
        category: 'CNS Stimulants / ADHD Agents',
        is_controlled: true,
      },
      {
        name: 'MST Continus 30mg Tablets',
        generic_name: 'Morphine sulphate',
        nappi_code: '745677001',
        schedule: 'S6',
        dosage_form: 'Controlled-release tablet',
        strength: '30mg',
        category: 'Potent Narcotic Analgesics',
        is_controlled: true,
      },
      {
        name: 'OxyNorm 10mg Capsules',
        generic_name: 'Oxycodone hydrochloride',
        nappi_code: '704771001',
        schedule: 'S6',
        dosage_form: 'Hard capsule',
        strength: '10mg',
        category: 'Potent Narcotic Analgesics',
        is_controlled: true,
      },
    ];
  }
}
