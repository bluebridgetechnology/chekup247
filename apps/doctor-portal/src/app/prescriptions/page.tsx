'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Download,
  AlertCircle,
} from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';

interface PrescriptionSummary {
  id: string;
  booking_id: string;
  patient_name: string;
  icd10_code: string;
  icd10_description: string;
  medications_count: number;
  status: string;
  created_at: string;
  download_url?: string;
}

export default function PrescriptionsListPage() {
  const { doctor, profile, token, isAuthenticated } = useDoctorAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  useEffect(() => {
    // Mock sample prescriptions or fetch if API endpoint exists
    const samplePrescriptions: PrescriptionSummary[] = [
      {
        id: 'rx-9021',
        booking_id: 'bkg-101',
        patient_name: 'Kagiso Molefe',
        icd10_code: 'J06.9',
        icd10_description: 'Acute upper respiratory infection, unspecified',
        medications_count: 2,
        status: 'SIGNED & ISSUED',
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'rx-9020',
        booking_id: 'bkg-102',
        patient_name: 'Sipho Ndlovu',
        icd10_code: 'I10',
        icd10_description: 'Essential (primary) hypertension',
        medications_count: 1,
        status: 'SIGNED & ISSUED',
        created_at: new Date(Date.now() - 3600000 * 26).toISOString(),
      },
      {
        id: 'rx-9019',
        booking_id: 'bkg-103',
        patient_name: 'Lerato Khumalo',
        icd10_code: 'E11.9',
        icd10_description: 'Type 2 diabetes mellitus without complications',
        medications_count: 3,
        status: 'SIGNED & ISSUED',
        created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
      },
    ];

    setPrescriptions(samplePrescriptions);
  }, []);

  const filtered = prescriptions.filter(
    (rx) =>
      rx.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.icd10_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.icd10_description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.85rem', color: 'var(--color-slate-900)', marginBottom: '6px' }}>
            E-Prescriptions Management
          </h1>
          <p style={{ color: 'var(--color-slate-500)', fontSize: '0.95rem' }}>
            HPCSA-compliant digital prescriptions issued with verified electronic signature and audit trail.
          </p>
        </div>

        <Link
          href="/appointments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--color-brand-600, #0e9384)',
            color: '#ffffff',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '0.9rem',
          }}
        >
          <Plus size={16} />
          <span>Issue From Appointment</span>
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '16px 20px',
          border: '1px solid var(--color-slate-200)',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Search size={18} style={{ color: 'var(--color-slate-400)' }} />
        <input
          type="text"
          placeholder="Search by patient name, ICD-10 code or diagnosis..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            border: 'none',
            outline: 'none',
            width: '100%',
            fontSize: '0.95rem',
            color: 'var(--color-slate-800)',
          }}
        />
      </div>

      {/* Prescriptions Table / List */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--color-slate-200)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--color-slate-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--color-slate-900)', fontSize: '1rem' }}>
            Issued Prescriptions ({filtered.length})
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>
            Digital signatures verified under Section 22A Medicines Act
          </span>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-slate-400)' }}>
            <FileText size={40} style={{ margin: '0 auto 12px auto', color: 'var(--color-slate-300)' }} />
            <p style={{ fontWeight: 600, color: 'var(--color-slate-600)' }}>No prescriptions found</p>
            <p style={{ fontSize: '0.85rem' }}>No records match your query.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--color-slate-50)', borderBottom: '1px solid var(--color-slate-200)' }}>
                  <th style={{ padding: '12px 24px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-slate-600)' }}>PATIENT</th>
                  <th style={{ padding: '12px 24px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-slate-600)' }}>PRIMARY DIAGNOSIS</th>
                  <th style={{ padding: '12px 24px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-slate-600)' }}>ITEMS</th>
                  <th style={{ padding: '12px 24px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-slate-600)' }}>STATUS</th>
                  <th style={{ padding: '12px 24px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-slate-600)' }}>ISSUED DATE</th>
                  <th style={{ padding: '12px 24px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-slate-600)' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rx) => (
                  <tr
                    key={rx.id}
                    style={{
                      borderBottom: '1px solid var(--color-slate-100)',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                      {rx.patient_name}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span
                        style={{
                          background: 'var(--color-brand-50, #e6f7f5)',
                          color: 'var(--color-brand-700, #0c7a6e)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          marginRight: '8px',
                        }}
                      >
                        {rx.icd10_code}
                      </span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)' }}>
                        {rx.icd10_description}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.875rem', color: 'var(--color-slate-600)' }}>
                      {rx.medications_count} medication{rx.medications_count > 1 ? 's' : ''}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          background: '#ecfdf5',
                          color: '#059669',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        <CheckCircle2 size={12} />
                        {rx.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 24px', fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
                      {new Date(rx.created_at).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px 24px' }}>
                      <Link
                        href={`/consultations/${rx.booking_id}/prescribe`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: 'var(--color-brand-600, #0e9384)',
                          fontWeight: 600,
                          fontSize: '0.85rem',
                          textDecoration: 'none',
                        }}
                      >
                        <span>View / Edit</span>
                        <ExternalLink size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
