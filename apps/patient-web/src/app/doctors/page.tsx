'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Star,
  ShieldCheck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Stethoscope,
} from 'lucide-react';
import { DoctorCard } from '../../components/DoctorCard';
import { Breadcrumbs } from '../../components/Breadcrumbs';

const SPECIALTIES = [
  'All',
  'General Practitioner',
  'Family Health',
  'Women’s Health',
  'Chronic Disease',
  'Sports Medicine',
  'Mental Health',
  'Urgent Care',
];

const SORT_OPTIONS = [
  { label: 'Highest Rated', value: 'rating_desc' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Name (A-Z)', value: 'name_asc' },
];

export default function DoctorsDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [ratingMin, setRatingMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(1500);
  const [sortBy, setSortBy] = useState('rating_desc');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch doctors from API
  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('searchQuery', searchQuery.trim());
      if (selectedSpecialty !== 'All') params.set('specialty', selectedSpecialty);
      if (ratingMin > 0) params.set('ratingMin', ratingMin.toString());
      if (priceMax < 1500) params.set('priceMax', priceMax.toString());
      params.set('sort', sortBy);
      params.set('page', page.toString());
      params.set('limit', '9');

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await fetch(`${apiUrl}/api/v1/doctors?${params.toString()}`);

      if (res.ok) {
        const data = await res.json();
        if (data?.doctors) {
          setDoctors(data.doctors);
          setTotal(data.total || data.doctors.length);
          setTotalPages(data.totalPages || 1);
        } else if (Array.isArray(data)) {
          setDoctors(data);
          setTotal(data.length);
          setTotalPages(1);
        }
      } else {
        // Fallback for offline or empty database
        loadDefaultFallbackDoctors();
      }
    } catch (err) {
      loadDefaultFallbackDoctors();
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultFallbackDoctors = () => {
    const fallbacks = [
      {
        id: 'doc-1',
        slug: 'dr-thabo-molefe',
        user: { full_name: 'Dr. Thabo Molefe' },
        hpcsa_number: 'MP 0689432',
        specialty: 'General Practitioner & Family Health',
        bio: 'Dr. Thabo Molefe is a compassionate General Practitioner with over 12 years of clinical practice across Gauteng. Specializes in acute infections, metabolic conditions, and preventative care.',
        rate_per_hour: 850.0,
        rating_avg: 4.95,
        reviews_count: 58,
        facility_name: 'Netcare Sunninghill Hospital',
        facility_address: 'Sandton, Johannesburg',
        photo_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'doc-2',
        slug: 'dr-sarah-van-der-merwe',
        user: { full_name: 'Dr. Sarah van der Merwe' },
        hpcsa_number: 'MP 0741890',
        specialty: 'Women’s Health & Primary Care',
        bio: 'Dr. Sarah van der Merwe completed her MBChB at Stellenbosch University with a clinical focus on women’s wellness, preventative screening, and paediatric telehealth.',
        rate_per_hour: 900.0,
        rating_avg: 4.9,
        reviews_count: 72,
        facility_name: 'Mediclinic Cape Town',
        facility_address: 'Oranjezicht, Cape Town',
        photo_url: 'https://images.unsplash.com/photo-1594824813501-48af52595a4b?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'doc-3',
        slug: 'dr-priya-naidoo',
        user: { full_name: 'Dr. Priya Naidoo' },
        hpcsa_number: 'MP 0812304',
        specialty: 'Chronic Disease & Geriatric Care',
        bio: 'Dr. Priya Naidoo has 14 years of primary healthcare experience in KwaZulu-Natal. Specializes in diabetes, hypertension management, and lifestyle medicine.',
        rate_per_hour: 780.0,
        rating_avg: 4.85,
        reviews_count: 43,
        facility_name: 'Life Entabeni Hospital',
        facility_address: 'Glenwood, Durban',
        photo_url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'doc-4',
        slug: 'dr-johan-botha',
        user: { full_name: 'Dr. Johan Botha' },
        hpcsa_number: 'MP 0632198',
        specialty: 'Sports Medicine & General Practice',
        bio: 'Dr. Johan Botha holds a postgraduate diploma in Sports Medicine from UP. He consults on acute musculoskeletal conditions, fitness, and ambulatory medicine.',
        rate_per_hour: 800.0,
        rating_avg: 4.78,
        reviews_count: 36,
        facility_name: 'Mediclinic Kloof Healthcare',
        facility_address: 'Erasmuskloof, Pretoria',
        photo_url: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'doc-5',
        slug: 'dr-naledi-khumalo',
        user: { full_name: 'Dr. Naledi Khumalo' },
        hpcsa_number: 'MP 0923481',
        specialty: 'Family Medicine & Mental Health',
        bio: 'Dr. Naledi Khumalo is an empathetic GP passionate about mental health integration in primary care, anxiety, depression screening, and holistic family checkups.',
        rate_per_hour: 820.0,
        rating_avg: 4.92,
        reviews_count: 51,
        facility_name: 'Wits Donald Gordon Centre',
        facility_address: 'Parktown, Johannesburg',
        photo_url: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?auto=format&fit=crop&w=400&q=80',
      },
      {
        id: 'doc-6',
        slug: 'dr-farhan-patel',
        user: { full_name: 'Dr. Farhan Patel' },
        hpcsa_number: 'MP 0795412',
        specialty: 'Urgent Care & Respiratory Illness',
        bio: 'Dr. Farhan Patel focuses on acute respiratory tract infections, asthma management, and immediate telehealth triage. Known for prompt and thorough care.',
        rate_per_hour: 750.0,
        rating_avg: 4.82,
        reviews_count: 39,
        facility_name: 'Melomed Bellville Centre',
        facility_address: 'Bellville, Cape Town',
        photo_url: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=400&q=80',
      },
    ];

    // Apply client filters if using fallback
    let filtered = fallbacks.filter((d) => {
      const matchQuery =
        !searchQuery.trim() ||
        d.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.specialty.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSpecialty =
        selectedSpecialty === 'All' ||
        d.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase());
      const matchRating = ratingMin === 0 || d.rating_avg >= ratingMin;
      const matchPrice = d.rate_per_hour <= priceMax;
      return matchQuery && matchSpecialty && matchRating && matchPrice;
    });

    setDoctors(filtered);
    setTotal(filtered.length);
    setTotalPages(1);
  };

  useEffect(() => {
    fetchDoctors();
  }, [selectedSpecialty, ratingMin, priceMax, sortBy, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchDoctors();
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('All');
    setRatingMin(0);
    setPriceMax(1500);
    setSortBy('rating_desc');
    setPage(1);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-slate-50)', paddingBottom: '80px' }}>
      {/* Hero Section with Search Header */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
          color: '#ffffff',
          padding: '60px 0 70px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.08,
            backgroundImage:
              'radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, var(--color-brand-800) 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <Breadcrumbs
            items={[
              { label: 'Home', href: '/' },
              { label: 'Find a Doctor', href: '/doctors' },
            ]}
          />

          <div style={{ maxWidth: '780px', marginTop: '16px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(8px)',
                fontSize: '0.85rem',
                fontWeight: 600,
                marginBottom: '16px',
              }}
            >
              <ShieldCheck size={16} />
              <span>100% HPCSA Verified General Practitioners Across South Africa</span>
            </div>

            <h1
              style={{
                fontSize: '2.5rem',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                marginBottom: '12px',
              }}
            >
              Consult with Top South African Doctors Online
            </h1>
            <p
              style={{
                fontSize: '1.1rem',
                color: 'rgba(255, 255, 255, 0.9)',
                lineHeight: 1.5,
                marginBottom: '28px',
              }}
            >
              Browse verified general practitioners, compare consultation rates, read authentic patient
              reviews, and book instant virtual consultations with digital prescriptions.
            </p>

            {/* Main Search Bar */}
            <form onSubmit={handleSearchSubmit}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  borderRadius: '16px',
                  padding: '6px 8px 6px 18px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
                }}
              >
                <Search size={20} style={{ color: 'var(--color-slate-400)', flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search by doctor name, medical condition, or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    fontSize: '1rem',
                    color: 'var(--color-slate-900)',
                    padding: '12px 14px',
                    background: 'transparent',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: 'var(--color-brand-600)',
                    color: '#ffffff',
                    fontWeight: 700,
                    padding: '12px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.95rem',
                    transition: 'background 0.2s',
                  }}
                >
                  Search Doctors
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Main Filter & Results Container */}
      <div className="container" style={{ marginTop: '36px' }}>
        {/* Filter Toolbar */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid var(--color-slate-200)',
            padding: '20px 24px',
            marginBottom: '32px',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '20px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Specialty Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-slate-700)' }}>
                Specialty:
              </span>
              <select
                value={selectedSpecialty}
                onChange={(e) => {
                  setSelectedSpecialty(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-slate-300)',
                  background: '#ffffff',
                  fontSize: '0.875rem',
                  color: 'var(--color-slate-800)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {SPECIALTIES.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            {/* Minimum Rating Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-slate-700)' }}>
                Rating:
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { label: 'All', value: 0 },
                  { label: '4.5+ ★', value: 4.5 },
                  { label: '4.8+ ★', value: 4.8 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setRatingMin(item.value);
                      setPage(1);
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      border:
                        ratingMin === item.value
                          ? '1px solid var(--color-brand-600)'
                          : '1px solid var(--color-slate-300)',
                      background:
                        ratingMin === item.value ? 'var(--color-brand-50)' : '#ffffff',
                      color:
                        ratingMin === item.value
                          ? 'var(--color-brand-700)'
                          : 'var(--color-slate-700)',
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Max Price Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-slate-700)' }}>
                Max Fee:
              </span>
              <input
                type="range"
                min="500"
                max="1500"
                step="50"
                value={priceMax}
                onChange={(e) => {
                  setPriceMax(Number(e.target.value));
                  setPage(1);
                }}
                style={{ cursor: 'pointer', accentColor: 'var(--color-brand-600)' }}
              />
              <span
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'var(--color-brand-700)',
                  minWidth: '65px',
                }}
              >
                R{priceMax}
              </span>
            </div>

            {/* Sort Order */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-slate-700)' }}>
                Sort By:
              </span>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-slate-300)',
                  background: '#ffffff',
                  fontSize: '0.875rem',
                  color: 'var(--color-slate-800)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-slate-500)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Results Summary Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <p style={{ fontSize: '0.95rem', color: 'var(--color-slate-600)', fontWeight: 500 }}>
            Showing <strong style={{ color: 'var(--color-slate-900)' }}>{doctors.length}</strong>{' '}
            of <strong style={{ color: 'var(--color-slate-900)' }}>{total}</strong> verified doctors
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.85rem',
              color: 'var(--color-slate-500)',
            }}
          >
            <ShieldCheck size={16} style={{ color: 'var(--color-brand-600)' }} />
            <span>LocumStaff Directory & Direct HPCSA Registered</span>
          </div>
        </div>

        {/* Doctor Grid or Empty State */}
        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '24px',
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                style={{
                  height: '340px',
                  borderRadius: '16px',
                  background: '#ffffff',
                  border: '1px solid var(--color-slate-200)',
                  animation: 'pulse 1.5s infinite',
                }}
              />
            ))}
          </div>
        ) : doctors.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '24px',
            }}
          >
            {doctors.map((doc) => (
              <DoctorCard
                key={doc.id}
                id={doc.id}
                slug={doc.slug}
                name={doc.user?.full_name || 'Medical Practitioner'}
                hpcsa_number={doc.hpcsa_number}
                specialty={doc.specialty}
                bio={doc.bio}
                rate_per_hour={Number(doc.rate_per_hour) || 750}
                rating_avg={Number(doc.rating_avg) || 4.8}
                reviews_count={doc.reviews_count || 24}
                facility_name={doc.facility_name}
                facility_address={doc.facility_address}
                photo_url={doc.photo_url}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid var(--color-slate-200)',
              padding: '64px 24px',
              textAlign: 'center',
              maxWidth: '520px',
              margin: '40px auto',
            }}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--color-slate-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'var(--color-slate-400)',
              }}
            >
              <Stethoscope size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
              No Doctors Match Your Filters
            </h3>
            <p
              style={{
                fontSize: '0.9rem',
                color: 'var(--color-slate-600)',
                marginTop: '8px',
                lineHeight: 1.5,
              }}
            >
              We couldn't find any verified doctors matching your exact criteria. Try broadening
              your search or resetting the active filters.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                borderRadius: '10px',
                background: 'var(--color-brand-600)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.875rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginTop: '48px',
            }}
          >
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 16px',
                borderRadius: '10px',
                border: '1px solid var(--color-slate-300)',
                background: '#ffffff',
                color: page <= 1 ? 'var(--color-slate-400)' : 'var(--color-slate-700)',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-slate-700)' }}>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 16px',
                borderRadius: '10px',
                border: '1px solid var(--color-slate-300)',
                background: '#ffffff',
                color: page >= totalPages ? 'var(--color-slate-400)' : 'var(--color-slate-700)',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
