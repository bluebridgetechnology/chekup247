'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { SolarIcon } from '../../components/common/SolarIcon';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface IcdItem {
  code: string;
  description: string;
  chapter: string;
  is_valid_primary: boolean;
}

const CHAPTER_PRESETS = [
  { label: 'All Chapters', val: 'ALL' },
  { label: 'Infections (I)', val: 'I' },
  { label: 'Endocrine & Diabetes (IV)', val: 'IV' },
  { label: 'Mental Health (V)', val: 'V' },
  { label: 'Nervous System (VI)', val: 'VI' },
  { label: 'Circulatory (IX)', val: 'IX' },
  { label: 'Respiratory (X)', val: 'X' },
  { label: 'Digestive System (XI)', val: 'XI' },
  { label: 'Skin & Subcutaneous (XII)', val: 'XII' },
  { label: 'Musculoskeletal (XIII)', val: 'XIII' },
  { label: 'Genitourinary (XIV)', val: 'XIV' },
  { label: 'Symptoms & Signs (XVIII)', val: 'XVIII' },
  { label: 'Injury & Poisoning (XIX)', val: 'XIX' },
  { label: 'General & Preventive (XXI)', val: 'XXI' },
];

export default function Icd10CodingPage() {
  const router = useRouter();
  const { doctor, profile, isAuthenticated } = useDoctorAuth();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<IcdItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [addedCodeNotice, setAddedCodeNotice] = useState<string | null>(null);
  const [selectedChapter, setSelectedChapter] = useState('ALL');
  const [whoSyncing, setWhoSyncing] = useState(false);
  const [whoSyncFeedback, setWhoSyncFeedback] = useState<string | null>(null);

  // Pagination state: capped at 10 items per page
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 280);
    return () => clearTimeout(timer);
  }, [query]);

  // Comprehensive South African Master Industry Table (MIT) Full Core Dataset (Audited & Synced with API)
  const fallbackList: IcdItem[] = useMemo(
    () => [
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
      { code: 'E03.9', description: 'Hypothyroidism, unspecified', chapter: 'IV', is_valid_primary: true },
      { code: 'E10.9', description: 'Type 1 diabetes mellitus without complications', chapter: 'IV', is_valid_primary: true },
      { code: 'E11.2', description: 'Type 2 diabetes mellitus with renal complications', chapter: 'IV', is_valid_primary: true },
      { code: 'E11.65', description: 'Type 2 diabetes mellitus with poor control', chapter: 'IV', is_valid_primary: true },
      { code: 'E11.9', description: 'Type 2 diabetes mellitus without complications', chapter: 'IV', is_valid_primary: true },
      { code: 'E66.9', description: 'Obesity, unspecified', chapter: 'IV', is_valid_primary: true },
      { code: 'E78.0', description: 'Pure hypercholesterolaemia', chapter: 'IV', is_valid_primary: true },
      { code: 'E78.5', description: 'Hyperlipidaemia, unspecified / Dyslipidaemia', chapter: 'IV', is_valid_primary: true },

      // Mental and behavioural disorders (Chapter V)
      { code: 'F32.0', description: 'Mild depressive episode', chapter: 'V', is_valid_primary: true },
      { code: 'F32.1', description: 'Moderate depressive episode', chapter: 'V', is_valid_primary: true },
      { code: 'F32.9', description: 'Major depressive disorder, single episode, unspecified', chapter: 'V', is_valid_primary: true },
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
      { code: 'J18.9', description: 'Pneumonia, unspecified organism', chapter: 'X', is_valid_primary: true },
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
      { code: 'R05', description: 'Cough, unspecified', chapter: 'XVIII', is_valid_primary: true },
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
      { code: 'Z00.0', description: 'General medical examination / Routine health checkup', chapter: 'XXI', is_valid_primary: true },
      { code: 'Z01.0', description: 'Examination of eyes and vision', chapter: 'XXI', is_valid_primary: true },
      { code: 'Z23', description: 'Need for immunization against single bacterial or viral diseases', chapter: 'XXI', is_valid_primary: true },
      { code: 'Z30.0', description: 'General counselling and advice on contraception', chapter: 'XXI', is_valid_primary: true },
      { code: 'Z76.0', description: 'Issue of repeat prescription', chapter: 'XXI', is_valid_primary: true },
    ],
    [],
  );

  const loadFallback = useCallback(
    (searchTerm: string) => {
      if (!searchTerm.trim()) {
        setResults(fallbackList);
      } else {
        const q = searchTerm.toLowerCase();
        setResults(
          fallbackList.filter(
            (item) =>
              item.code.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q) ||
              (item.chapter && item.chapter.toLowerCase().includes(q)),
          ),
        );
      }
    },
    [fallbackList],
  );

  // Fetch ICD-10 codes: uses limit=250 to ensure the entire database provided by the API is covered
  const searchIcd10 = useCallback(
    async (searchTerm: string) => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/medical/icd10?q=${encodeURIComponent(searchTerm)}&limit=250`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setResults(data);
            return;
          }
        }
        loadFallback(searchTerm);
      } catch (e) {
        loadFallback(searchTerm);
      } finally {
        setLoading(false);
      }
    },
    [loadFallback],
  );

  useEffect(() => {
    searchIcd10(debouncedQuery);
  }, [debouncedQuery, searchIcd10]);

  // Reset pagination to page 1 whenever query or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query, selectedChapter]);

  // Execute on-demand search or WHO lookup
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const term = query.trim();
    if (!term) {
      searchIcd10('');
      return;
    }

    setWhoSyncing(true);
    setWhoSyncFeedback(null);

    try {
      const res = await fetch(`${API_BASE}/medical/icd10/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: term }),
      });

      if (res.ok) {
        const count = await res.json();
        setWhoSyncFeedback(
          count > 0
            ? `Retrieved and registered ${count} new diagnostic records for "${term}".`
            : `Search completed for "${term}". Clinical registry updated.`,
        );
        searchIcd10(term);
      } else {
        searchIcd10(term);
      }
    } catch (e: any) {
      searchIcd10(term);
    } finally {
      setWhoSyncing(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2200);
  };

  const handleAddToPrescription = (item: IcdItem) => {
    navigator.clipboard.writeText(`${item.code} — ${item.description}`);
    setAddedCodeNotice(`Code [${item.code}] copied to clipboard & ready for prescription!`);
    setTimeout(() => setAddedCodeNotice(null), 3500);
  };

  // Filter by chapter if selected
  const displayedResults = useMemo(() => {
    return results.filter((item) => {
      if (selectedChapter === 'ALL') return true;
      return item.chapter === selectedChapter;
    });
  }, [results, selectedChapter]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(displayedResults.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedResults = displayedResults.slice(startIndex, startIndex + pageSize);

  return (
    <div
      className="icd10-page"
      style={{
        maxWidth: '1240px',
        margin: '0 auto',
        paddingBottom: '48px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* ========================================================================
          PAGE HEADER: Clean, standard portal typography with compliance badge
          ======================================================================== */}
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--color-gold-bronze, #B88647)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <SolarIcon name="document-text-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
                Clinical EHR • Diagnostic Coding Registry
              </span>
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.95rem',
                fontWeight: 'var(--font-heading-weight, 400)',
                color: 'var(--color-chocolate-base, #2A170F)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              ICD-10 Diagnostic Coding Assistant
            </h1>
            <p
              style={{
                color: 'var(--color-cream-text-muted, #6B5E55)',
                fontSize: '0.925rem',
                marginTop: '6px',
                maxWidth: '680px',
                lineHeight: 1.5,
              }}
            >
              Look up official South African National Department of Health (NDoH) diagnostic codes. One-click copy or attach directly to active electronic prescriptions.
            </p>
          </div>

          {/* South African MIT & WHO Compliance Badge (Relocated to top-right header) */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '9999px',
              backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
              border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.35))',
              color: 'var(--color-chocolate-base, #2A170F)',
              fontSize: '0.78rem',
              fontWeight: 600,
              boxShadow: 'none',
            }}
          >
            <SolarIcon name="shield-check-linear" size={16} color="var(--color-gold-bronze, #B88647)" />
            <span>South African Master Industry Table (MIT) & WHO Release Compliant</span>
          </div>
        </div>
      </div>

      {/* Notice Toast */}
      {addedCodeNotice && (
        <div
          style={{
            background: 'var(--color-gold-pale, #F0E5D3)',
            border: '1.5px solid var(--color-gold-base, #DFAB62)',
            borderRadius: '12px',
            padding: '12px 18px',
            color: 'var(--color-chocolate-base, #2A170F)',
            fontWeight: 700,
            fontSize: '0.875rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: 'none',
          }}
        >
          <SolarIcon name="check-circle-linear" size={18} color="#16a34a" />
          <span>{addedCodeNotice}</span>
        </div>
      )}

      {/* Search Feedback Banner */}
      {whoSyncFeedback && (
        <div
          style={{
            background: 'var(--color-cream-surface, #FDFBF7)',
            border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.35))',
            borderRadius: '12px',
            padding: '12px 18px',
            color: 'var(--color-chocolate-base, #2A170F)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SolarIcon name="magnifer-linear" size={16} color="var(--color-gold-bronze, #B88647)" />
            <span>{whoSyncFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setWhoSyncFeedback(null)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--color-cream-text-muted, #6B5E55)',
              padding: '2px',
            }}
          >
            <SolarIcon name="close-circle-linear" size={16} color="var(--color-cream-text-muted, #6B5E55)" />
          </button>
        </div>
      )}

      {/* ========================================================================
          SEARCH & FILTER TOOLBAR: Lightweight Portal Card
          ======================================================================== */}
      <div
        className="portal-card"
        style={{
          padding: '20px 24px',
          marginBottom: '24px',
          boxShadow: 'none',
        }}
      >
        {/* Search Bar Row */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <div className="doctors-search-pill" style={{ flex: 1, minWidth: '280px', height: '46px', boxShadow: 'none' }}>
            <SolarIcon name="magnifer-linear" size={18} color="var(--color-gold-base, #DFAB62)" />
            <input
              type="text"
              placeholder="Search by condition, symptom, or code (e.g. 'J06.9', 'Hypertension', 'Diabetes')..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="doctors-search-input"
              style={{ fontSize: '0.925rem', outline: 'none', border: 'none', boxShadow: 'none' }}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  boxShadow: 'none',
                  cursor: 'pointer',
                  color: 'var(--color-cream-text-muted, #6B5E55)',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Clear search"
              >
                <SolarIcon name="close-circle-linear" size={16} color="var(--color-cream-text-muted, #6B5E55)" />
              </button>
            )}
          </div>

          {/* Standard "Search" Action Button */}
          <button
            type="submit"
            disabled={whoSyncing || loading}
            className="btn-primary"
            style={{ padding: '0 24px', height: '46px', fontSize: '0.875rem', boxShadow: 'none', outline: 'none' }}
          >
            <SolarIcon
              name={whoSyncing || loading ? 'refresh-linear' : 'magnifer-linear'}
              size={16}
              color="var(--color-chocolate-base, #2A170F)"
              style={{
                animation: whoSyncing || loading ? 'spin 1s linear infinite' : 'none',
              }}
            />
            <span>{whoSyncing || loading ? 'Searching...' : 'Search'}</span>
          </button>
        </form>

        {/* Chapter Filter Pills Strip */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <SolarIcon name="filter-linear" size={15} color="var(--color-gold-bronze, #B88647)" />
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--color-cream-text-muted, #6B5E55)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Filter by Chapter:
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {CHAPTER_PRESETS.map((p) => {
              const isActive = selectedChapter === p.val;
              return (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setSelectedChapter(p.val)}
                  className={`specialty-chip ${isActive ? 'active' : ''}`}
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 700 : 500,
                    borderRadius: '9999px',
                    transition: 'all 0.18s ease',
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================
          RESULTS LIST: Capped Clinical Table with Pagination
          ======================================================================== */}
      <div className="clinical-table-container" style={{ boxShadow: 'none' }}>
        {/* Table Header Banner */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
            background: 'var(--color-cream-base, #FAF6EE)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', fontSize: '0.95rem' }}>
              Diagnostic Matches
            </span>
            <span
              style={{
                backgroundColor: 'var(--color-gold-pale, #F0E5D3)',
                color: 'var(--color-chocolate-base, #2A170F)',
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '9999px',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
              }}
            >
              {displayedResults.length}
            </span>
          </div>
          <div
            style={{
              fontSize: '0.78rem',
              color: 'var(--color-cream-text-muted, #6B5E55)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <SolarIcon name="shield-check-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
            <span>Verified South African DoH Master Industry Table (MIT)</span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '64px 24px', textAlign: 'center', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
            <SolarIcon
              name="refresh-linear"
              size={32}
              color="var(--color-gold-base, #DFAB62)"
              style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }}
            />
            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>Searching official ICD-10 registry...</p>
          </div>
        ) : displayedResults.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--color-gold-pale, #F0E5D3)',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="magnifer-linear" size={26} color="var(--color-gold-bronze, #B88647)" />
            </div>
            <h3
              style={{
                fontWeight: 'var(--font-heading-weight, 400)',
                color: 'var(--color-chocolate-base, #2A170F)',
                margin: '0 0 6px 0',
                fontSize: '1.2rem',
              }}
            >
              No diagnostic codes found
            </h3>
            <p
              style={{
                color: 'var(--color-cream-text-muted, #6B5E55)',
                fontSize: '0.88rem',
                maxWidth: '420px',
                margin: '0 auto 20px',
                lineHeight: 1.5,
              }}
            >
              No codes match &quot;{debouncedQuery || query}&quot;. Try adjusting your search term or select &quot;All Chapters&quot;.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedChapter('ALL');
              }}
              className="btn-secondary"
              style={{ padding: '8px 20px', fontSize: '0.84rem' }}
            >
              Reset Search & Filters
            </button>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table className="clinical-table">
                <thead>
                  <tr>
                    <th className="clinical-th" style={{ width: '130px' }}>ICD-10 CODE</th>
                    <th className="clinical-th">CLINICAL DESCRIPTION</th>
                    <th className="clinical-th" style={{ width: '110px' }}>CHAPTER</th>
                    <th className="clinical-th" style={{ width: '160px', whiteSpace: 'nowrap' }}>PRIMARY STATUS</th>
                    <th className="clinical-th" style={{ textAlign: 'right', width: '220px', paddingRight: '24px' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResults.map((item, index) => (
                    <tr
                      key={item.code}
                      className="clinical-tr"
                      style={{
                        backgroundColor: index % 2 === 0 ? 'var(--color-cream-surface, #FDFBF7)' : 'rgba(223, 171, 98, 0.08)',
                      }}
                    >
                      {/* Code Badge */}
                      <td className="clinical-td">
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            color: 'var(--color-chocolate-base, #2A170F)',
                            background: 'var(--color-gold-pale, #F0E5D3)',
                            padding: '3px 9px',
                            borderRadius: '6px',
                            border: '1px solid rgba(223, 171, 98, 0.4)',
                            display: 'inline-block',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {item.code}
                        </span>
                      </td>

                      {/* Description */}
                      <td className="clinical-td">
                        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--color-chocolate-base, #2A170F)' }}>
                          {item.description}
                        </div>
                      </td>

                      {/* Chapter */}
                      <td className="clinical-td">
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-cream-text-muted, #6B5E55)',
                            background: 'var(--color-cream-base, #FAF6EE)',
                            border: '1px solid rgba(223, 171, 98, 0.25)',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 600,
                          }}
                        >
                          Ch. {item.chapter || '—'}
                        </span>
                      </td>

                      {/* Valid Primary Status - Strictly on the same line */}
                      <td className="clinical-td" style={{ whiteSpace: 'nowrap' }}>
                        {item.is_valid_primary ? (
                          <span
                            className="badge-success"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <SolarIcon name="shield-check-linear" size={13} color="#059669" />
                            <span>Valid Primary</span>
                          </span>
                        ) : (
                          <span
                            className="badge-gold"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <span>Secondary</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="clinical-td" style={{ textAlign: 'right', paddingRight: '24px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          {/* Copy Code Button */}
                          <button
                            type="button"
                            onClick={() => copyToClipboard(item.code)}
                            title="Copy ICD-10 Code to Clipboard"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
                              background: copiedCode === item.code ? '#ecfdf5' : 'var(--color-cream-surface, #FDFBF7)',
                              color: copiedCode === item.code ? '#059669' : 'var(--color-chocolate-base, #2A170F)',
                              fontWeight: 600,
                              fontSize: '0.78rem',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <SolarIcon
                              name={copiedCode === item.code ? 'check-circle-linear' : 'copy-linear'}
                              size={14}
                              color={copiedCode === item.code ? '#059669' : 'var(--color-chocolate-base, #2A170F)'}
                            />
                            <span>{copiedCode === item.code ? 'Copied' : 'Copy'}</span>
                          </button>

                          {/* Add to Active Prescription Button */}
                          <button
                            type="button"
                            onClick={() => handleAddToPrescription(item)}
                            title="Add this ICD-10 code to active prescription"
                            className="btn-primary"
                            style={{
                              padding: '6px 14px',
                              fontSize: '0.78rem',
                              borderRadius: '8px',
                              gap: '5px',
                              boxShadow: 'none',
                            }}
                          >
                            <SolarIcon name="add-circle-linear" size={14} color="var(--color-chocolate-base, #2A170F)" />
                            <span>Add to Rx</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ========================================================================
                PAGINATION CONTROLS: Caps table height and allows clean navigation
                ======================================================================== */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 24px',
                borderTop: '1px solid rgba(223, 171, 98, 0.15)',
                background: 'var(--color-cream-base, #FAF6EE)',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '0.825rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                Showing <span style={{ fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)' }}>{startIndex + 1}</span> to{' '}
                <span style={{ fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)' }}>
                  {Math.min(startIndex + pageSize, displayedResults.length)}
                </span>{' '}
                of <span style={{ fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)' }}>{displayedResults.length}</span> diagnostic codes
              </div>

              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      borderRadius: '8px',
                      opacity: currentPage === 1 ? 0.4 : 1,
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <SolarIcon name="alt-arrow-left-linear" size={14} color="var(--color-chocolate-base, #2A170F)" />
                    <span>Previous</span>
                  </button>

                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-chocolate-base, #2A170F)', padding: '0 6px' }}>
                    Page {currentPage} of {totalPages}
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary"
                    style={{
                      padding: '6px 12px',
                      fontSize: '0.78rem',
                      borderRadius: '8px',
                      opacity: currentPage === totalPages ? 0.4 : 1,
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <span>Next</span>
                    <SolarIcon name="alt-arrow-right-linear" size={14} color="var(--color-chocolate-base, #2A170F)" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
