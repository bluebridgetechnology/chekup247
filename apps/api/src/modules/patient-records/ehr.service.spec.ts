import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EhrService, parseClinicalNotes } from './ehr.service';

describe('parseClinicalNotes', () => {
  it('maps the SOAP JSON saved by the consultation screen', () => {
    const notes = parseClinicalNotes(
      JSON.stringify({ chiefComplaint: 'Cough', hpi: '3 days', assessment: 'URTI', plan: 'Rest', patientInstructions: 'Fluids' }),
    );
    expect(notes).toEqual({
      chief_complaint: 'Cough',
      history: '3 days',
      assessment: 'URTI',
      plan: 'Rest',
      patient_instructions: 'Fluids',
    });
  });

  it('falls back to plain text and null', () => {
    expect(parseClinicalNotes('just text')?.chief_complaint).toBe('just text');
    expect(parseClinicalNotes(null)).toBeNull();
  });
});

describe('EhrService writes', () => {
  const doctor = { id: 'doc-1', role: 'doctor' };
  const meta = {};
  let saved: any[];
  let denied = false;
  let service: EhrService;

  beforeEach(() => {
    saved = [];
    denied = false;
    const vitalRepo: any = {
      create: (v: any) => v,
      save: async (v: any) => {
        const row = { id: 'v1', ...v };
        saved.push(row);
        return row;
      },
      findOne: async () => ({ id: 'v1', patient_id: 'p1', recorded_by: 'someone-else' }),
      delete: jest.fn(),
      query: jest.fn(),
    };
    const access: any = {
      userId: (u: any) => u.id,
      assertTreatingDoctor: async () => {
        if (denied) throw new ForbiddenException();
      },
    };
    const audit: any = { logHealthRecordAccess: jest.fn().mockResolvedValue(undefined) };
    service = new EhrService(
      {} as any, {} as any, {} as any, {} as any, {} as any, vitalRepo, {} as any, {} as any, {} as any, access, {} as any, audit,
    );
  });

  it('rejects an empty vitals entry', async () => {
    await expect(service.addVital(doctor, 'p1', { notes: 'nothing measured' } as any, meta)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires both blood pressure values, with diastolic below systolic', async () => {
    await expect(service.addVital(doctor, 'p1', { bp_systolic: 120 } as any, meta)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.addVital(doctor, 'p1', { bp_systolic: 80, bp_diastolic: 120 } as any, meta)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('records vitals for the authenticated doctor', async () => {
    const row = await service.addVital(doctor, 'p1', { bp_systolic: 120, bp_diastolic: 80, heart_rate: 72 } as any, meta);
    expect(row.recorded_by).toBe('doc-1');
    expect(row.patient_id).toBe('p1');
    expect(row.bp_systolic).toBe(120);
  });

  it('does not write when the doctor is not treating the patient', async () => {
    denied = true;
    await expect(service.addVital(doctor, 'p1', { heart_rate: 70 } as any, meta)).rejects.toBeInstanceOf(ForbiddenException);
    expect(saved).toHaveLength(0);
  });

  it('only lets the recording doctor delete a vitals entry', async () => {
    await expect(service.deleteVital(doctor, 'p1', 'v1', meta)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
