import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Prescription } from '../../database/patient/entities';

@Injectable()
export class PrescriptionsService {
  constructor(
    @InjectRepository(Prescription, 'patient')
    private readonly prescriptionRepository: Repository<Prescription>,
  ) {}

  async getPatientPrescriptions(patientId: string): Promise<Prescription[]> {
    return this.prescriptionRepository.find({
      where: { patient_id: patientId },
      order: { issued_at: 'DESC' },
    });
  }

  async getPrescriptionById(id: string): Promise<Prescription | null> {
    return this.prescriptionRepository.findOne({
      where: { id },
    });
  }
}
