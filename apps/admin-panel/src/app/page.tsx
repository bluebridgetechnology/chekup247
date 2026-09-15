import React from 'react';
import {
  ShieldAlert,
  UserCheck,
  FileCheck,
  XCircle,
  Eye,
  ExternalLink,
  Database,
  Server,
} from 'lucide-react';

const mockVerifications = [
  {
    id: 'doc-001',
    name: 'Dr. Sarah Van Der Merwe',
    hpcsaNumber: 'MP 0689412',
    specialty: 'General Practitioner',
    source: 'Direct Application',
    documentsCount: 3,
    submittedDate: '14 Sep 2026',
    status: 'pending',
  },
  {
    id: 'doc-002',
    name: 'Dr. Ayanda Khumalo',
    hpcsaNumber: 'MP 0714299',
    specialty: 'Dermatologist',
    source: 'LocumStaff SSO',
    documentsCount: 2,
    submittedDate: '14 Sep 2026',
    status: 'pending',
  },
  {
    id: 'doc-003',
    name: 'Dr. Pieter Coetzee',
    hpcsaNumber: 'MP 0592811',
    specialty: 'Pediatrician',
    source: 'Direct Application',
    documentsCount: 4,
    submittedDate: '13 Sep 2026',
    status: 'pending',
  },
];

export default function AdminVerificationQueuePage() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Title */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '1.85rem', color: '#f8fafc', marginBottom: '6px' }}>
          Doctor Verification Queue
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
          Review practitioner credentials against the Health Professions Council of South Africa (HPCSA) public register.
        </p>
      </div>

      {/* Health / System Status Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
              OPERATIONAL DB (VPS)
            </span>
            <Database size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
            Connected
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
            PostgreSQL 16 • 12ms latency
          </div>
        </div>

        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
              PATIENT HEALTH DB
            </span>
            <Server size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
            Connected (Isolated)
          </div>
          <div style={{ fontSize: '0.75rem', color: '#10b981' }}>
            POPIA Compliant • Port 5433
          </div>
        </div>

        <div className="admin-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8' }}>
              PENDING VERIFICATIONS
            </span>
            <UserCheck size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
            3 Awaiting Review
          </div>
          <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>
            Target turnaround: &lt; 24h
          </div>
        </div>
      </div>

      {/* Verification Data Table */}
      <div className="admin-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.15rem', color: '#f8fafc' }}>
            HPCSA Credential Approval Roster
          </h3>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            Showing 3 pending submissions
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Doctor Name</th>
                <th>HPCSA Registration</th>
                <th>Specialty</th>
                <th>Registration Source</th>
                <th>Credentials</th>
                <th>Submitted</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockVerifications.map((doc) => (
                <tr key={doc.id}>
                  <td style={{ fontWeight: 600 }}>{doc.name}</td>
                  <td>
                    <span style={{ fontFamily: 'monospace', color: 'var(--color-brand-400)' }}>
                      {doc.hpcsaNumber}
                    </span>
                  </td>
                  <td>{doc.specialty}</td>
                  <td>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: doc.source.includes('LocumStaff') ? 'rgba(14, 165, 233, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        color: doc.source.includes('LocumStaff') ? '#38bdf8' : '#cbd5e1',
                      }}
                    >
                      {doc.source}
                    </span>
                  </td>
                  <td>
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-brand-400)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.8rem',
                      }}
                    >
                      <Eye size={14} />
                      <span>{doc.documentsCount} Documents</span>
                    </button>
                  </td>
                  <td style={{ color: '#94a3b8' }}>{doc.submittedDate}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        style={{
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Approve
                      </button>
                      <button
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
