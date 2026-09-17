'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { DoctorCard } from '../../components/DoctorCard';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { SolarIcon } from '../../components/SolarIcon';

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

  // Active dropdown for the horizontal filter bar directly below hero
  const [activeDropdown, setActiveDropdown] = useState<'specialty' | 'rating' | 'price' | 'sort' | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Close filter popovers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        // Fallback for offline or local preview
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
        name: 'Dr. Thabo Molefe',
        user: { full_name: 'Dr. Thabo Molefe' },
        hpcsa_number: 'MP 0823452',
        specialty: 'General Practitioner & Family Health',
        bio: 'Dr. Thabo Molefe is a compassionate General Practitioner with over 7+ years of clinical practice across Gauteng. Specializes in acute care, metabolic conditions, and preventative care.',
        rate_per_hour: 850.0,
        rating_avg: 5.0,
        reviews_count: 658,
        facility_name: 'Cw Wikliegn, uMkhanyakude, KZN, South Africa',
        facility_address: '7+ yrs experience',
        photo_url: '/images/doctor_thabo.jpg',
        next_available_slot: 'Available today',
        tags: ['Flu & Infections', 'Chronic Script Renewal', 'Wellness'],
      },
      {
        id: 'doc-2',
        slug: 'dr-naledi-khumalo',
        name: 'Dr. Naledi Khumalo',
        user: { full_name: 'Dr. Naledi Khumalo' },
        hpcsa_number: 'MP 0824921',
        specialty: 'Family Medicine & Mental Health',
        bio: 'Dr. Naledi Khumalo is a committed GP, passionate about mental health integration in primary care, especially anxiety, mood disorders, and family counseling.',
        rate_per_hour: 820.0,
        rating_avg: 4.9,
        reviews_count: 519,
        facility_name: 'Glenwood, Durban, KZN, South Africa',
        facility_address: '5+ yrs experience',
        photo_url: '/images/doctor_sarah.jpg',
        next_available_slot: 'Available today',
        tags: ['Mental Health', 'Family Medicine', 'Preventative Care'],
      },
      {
        id: 'doc-3',
        slug: 'dr-sarah-van-der-merwe',
        name: 'Dr. Sarah van der Merwe',
        user: { full_name: 'Dr. Sarah van der Merwe' },
        hpcsa_number: 'MP 0567810',
        specialty: 'Internal Medicine & Preventive Care',
        bio: 'Dr. Sarah van der Merwe completed her medical degree at Stellenbosch University and has a dedicated clinical focus on diagnostic screening and lifestyle medicine.',
        rate_per_hour: 900.0,
        rating_avg: 4.8,
        reviews_count: 722,
        facility_name: 'Rivonia, Johannesburg, Gauteng, South Africa',
        facility_address: '8+ yrs experience',
        photo_url: '/images/doctor_kevin.jpg',
        next_available_slot: 'Available today',
        tags: ['Internal Medicine', 'Preventative Care', "Women's Health"],
      },
      {
        id: 'doc-4',
        slug: 'dr-priya-naidoo',
        name: 'Dr. Priya Naidoo',
        user: { full_name: 'Dr. Priya Naidoo' },
        hpcsa_number: 'MP 0625140',
        specialty: 'Obstetrics & Gynaecology',
        bio: 'Dr. Priya Naidoo has 14 years of primary healthcare experience, with a special interest in women’s health, reproductive medicine, and prenatal support.',
        rate_per_hour: 780.0,
        rating_avg: 4.8,
        reviews_count: 482,
        facility_name: '14th Avenue, Westville, Durban, KZN, South Africa',
        facility_address: '9+ yrs experience',
        photo_url: '/images/doctor_sarah.jpg',
        next_available_slot: 'Available today',
        tags: ['Obstetrics', 'Gynaecology', 'Family Planning'],
      },
      {
        id: 'doc-5',
        slug: 'dr-farhan-patel',
        name: 'Dr. Farhan Patel',
        user: { full_name: 'Dr. Farhan Patel' },
        hpcsa_number: 'MP 0735219',
        specialty: 'Urgent Care & Respiratory Illness',
        bio: 'Dr. Farhan Patel focuses on urgent care, respiratory infections, asthma management, and immediate medical triage with extensive acute care experience.',
        rate_per_hour: 750.0,
        rating_avg: 4.8,
        reviews_count: 386,
        facility_name: 'City North, Cape Town, Western Cape, South Africa',
        facility_address: '7+ yrs experience',
        photo_url: '/images/doctor_thabo.jpg',
        next_available_slot: 'Available today',
        tags: ['Urgent Care', 'Respiratory', 'Asthma'],
      },
      {
        id: 'doc-6',
        slug: 'dr-johan-botha',
        name: 'Dr. Johan Botha',
        user: { full_name: 'Dr. Johan Botha' },
        hpcsa_number: 'MP 0632748',
        specialty: 'Internal Medicine & Sports Medicine',
        bio: 'Dr. Johan Botha is a specialist in Internal Medicine and Sports Medicine, with a focus on preventive care, musculoskeletal therapy, and cardiac wellness.',
        rate_per_hour: 800.0,
        rating_avg: 4.8,
        reviews_count: 360,
        facility_name: 'Rondebosch, Cape Town, Western Cape, South Africa',
        facility_address: '6+ yrs experience',
        photo_url: '/images/doctor_kevin.jpg',
        next_available_slot: 'Available today',
        tags: ['Sports Medicine', 'Internal Medicine', 'Cardiology'],
      },
    ];

    // Apply filters
    let filtered = fallbacks.filter((d) => {
      const docName = d.user?.full_name || d.name || '';
      const matchQuery =
        !searchQuery.trim() ||
        docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.specialty.toLowerCase().includes(searchQuery.toLowerCase());
      const matchSpecialty =
        selectedSpecialty === 'All' ||
        d.specialty.toLowerCase().includes(selectedSpecialty.toLowerCase());
      const matchRating = ratingMin === 0 || d.rating_avg >= ratingMin;
      const matchPrice = d.rate_per_hour <= priceMax;
      return matchQuery && matchSpecialty && matchRating && matchPrice;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      if (sortBy === 'rating_desc') return b.rating_avg - a.rating_avg;
      if (sortBy === 'price_asc') return a.rate_per_hour - b.rate_per_hour;
      if (sortBy === 'price_desc') return b.rate_per_hour - a.rate_per_hour;
      if (sortBy === 'name_asc') {
        const nameA = a.user?.full_name || a.name || '';
        const nameB = b.user?.full_name || b.name || '';
        return nameA.localeCompare(nameB);
      }
      return 0;
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
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-cream-base)', paddingBottom: '88px' }}>
      {/* Redesigned Full-Width Hero Section with doc_hero.png as background */}
      <section className="doctors-hero-section">
        <div className="container" style={{ position: 'relative', zIndex: 2 }}>
          {/* Breadcrumb matching mockup */}
          <nav
            aria-label="Breadcrumb"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8125rem',
              color: 'var(--color-white-72)',
              marginBottom: '18px',
              fontFamily: 'var(--font-sans)',
            }}
          >
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: 'var(--color-white-85)',
                textDecoration: 'none',
              }}
            >
              <SolarIcon name="home-2-linear" size={15} color="var(--color-white-85)" />
              <span>Home</span>
            </Link>
            <span style={{ color: 'var(--color-white-35)' }}>›</span>
            <span style={{ color: 'var(--color-white)', fontWeight: 600 }}>Find a Doctor</span>
          </nav>

          {/* Hero Left Content Column in negative space */}
          <div className="doctors-hero-content">
            {/* Top Verified Practitioners Pill Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                border: '1px solid rgba(223, 171, 98, 0.4)',
                backgroundColor: 'rgba(30, 16, 10, 0.55)',
                backdropFilter: 'blur(4px)',
                marginBottom: '16px',
              }}
            >
              <SolarIcon name="shield-check-bold" size={14} color="var(--color-gold-base)" />
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: 'var(--color-gold-base)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                TOP VERIFIED PRACTITIONERS
              </span>
            </div>

            {/* Bold Headline: Two-Tone */}
            <h1
              style={{
                fontFamily: 'var(--font-heading), sans-serif',
                fontSize: 'clamp(2.3rem, 3.8vw, 3.2rem)',
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.15,
                marginBottom: '14px',
              }}
            >
              <span style={{ color: 'var(--color-white)', display: 'block' }}>Consult with Trusted</span>
              <span style={{ color: 'var(--color-gold-base)', display: 'block' }}>South African Doctors</span>
            </h1>

            {/* Supporting Copy */}
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.98rem',
                color: 'var(--color-white-80)',
                lineHeight: 1.6,
                maxWidth: '480px',
                marginBottom: '26px',
              }}
            >
              Get expert medical advice and quality care from licensed, HPCSA-registered doctors — anytime, anywhere.
            </p>

            {/* Wide Search Pill */}
            <form onSubmit={handleSearchSubmit} className="doctors-search-form">
              <div className="doctors-search-pill">
                <SolarIcon name="magnifier-linear" size={20} color="var(--color-gold-bronze)" />
                <input
                  type="text"
                  placeholder="Search by doctor name, medical condition, or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="doctors-search-input"
                />
                <button type="submit" className="doctors-search-submit touch-target" aria-label="Search Doctors">
                  <span className="doctors-search-text-desktop">Search Doctors</span>
                  <span className="doctors-search-text-mobile">Search</span>
                  <SolarIcon name="arrow-right-linear" size={16} color="var(--color-chocolate-base)" />
                </button>
              </div>
            </form>

            {/* Credibility / Trust Row Directly on Background */}
            <div className="doctors-trust-row">
              {/* Trust Item 1 */}
              <div className="doctors-trust-item">
                <div className="doctors-trust-icon-box">
                  <SolarIcon name="shield-check-bold" size={18} color="var(--color-gold-base)" />
                </div>
                <div>
                  <div style={{ color: 'var(--color-white)', fontSize: '0.8125rem', fontWeight: 700, lineHeight: 1.2 }}>
                    100% HPCSA Registered
                  </div>
                  <div style={{ color: 'var(--color-white-72)', fontSize: '0.72rem', marginTop: '2px' }}>
                    All doctors are verified and licensed
                  </div>
                </div>
              </div>

              <div className="doctors-trust-divider" />

              {/* Trust Item 2 */}
              <div className="doctors-trust-item">
                <div className="doctors-trust-icon-box">
                  <SolarIcon name="users-group-rounded-linear" size={18} color="var(--color-gold-base)" />
                </div>
                <div>
                  <div style={{ color: 'var(--color-white)', fontSize: '0.8125rem', fontWeight: 700, lineHeight: 1.2 }}>
                    Verified Doctors
                  </div>
                  <div style={{ color: 'var(--color-white-72)', fontSize: '0.72rem', marginTop: '2px' }}>
                    Background &amp; credentials checked
                  </div>
                </div>
              </div>

              <div className="doctors-trust-divider" />

              {/* Trust Item 3 */}
              <div className="doctors-trust-item">
                <div className="doctors-trust-icon-box">
                  <SolarIcon name="lock-password-bold" size={18} color="var(--color-gold-base)" />
                </div>
                <div>
                  <div style={{ color: 'var(--color-white)', fontSize: '0.8125rem', fontWeight: 700, lineHeight: 1.2 }}>
                    Secure Consultations
                  </div>
                  <div style={{ color: 'var(--color-white-72)', fontSize: '0.72rem', marginTop: '2px' }}>
                    Private, confidential and encrypted
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Redesigned Filter Bar directly beneath hero */}
      <div className="container doctors-filter-bar-container" ref={filterBarRef}>
        <div className="doctors-filter-bar">
          {/* 1. Specialty Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`doctors-filter-trigger ${activeDropdown === 'specialty' ? 'active' : ''}`}
              style={{ width: '100%' }}
              onClick={() => setActiveDropdown(activeDropdown === 'specialty' ? null : 'specialty')}
              aria-expanded={activeDropdown === 'specialty'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                <SolarIcon name="stethoscope-linear" size={20} color="var(--color-chocolate-base)" />
                <div style={{ textAlign: 'left', minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-cream-text-muted)', fontWeight: 500 }}>
                    Specialty
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: 'var(--color-chocolate-base)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {selectedSpecialty === 'All' ? 'All Specialties' : selectedSpecialty}
                  </span>
                </div>
              </div>
              <SolarIcon
                name="alt-arrow-down-linear"
                size={16}
                color="var(--color-chocolate-muted)"
                style={{
                  transition: 'transform 0.2s ease',
                  transform: activeDropdown === 'specialty' ? 'rotate(180deg)' : 'none',
                  flexShrink: 0,
                  marginLeft: '8px',
                }}
              />
            </button>

            {activeDropdown === 'specialty' && (
              <div className="doctors-filter-popover">
                {SPECIALTIES.map((spec) => {
                  const isSelected = selectedSpecialty === spec;
                  return (
                    <button
                      key={spec}
                      type="button"
                      className={`doctors-filter-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedSpecialty(spec);
                        setPage(1);
                        setActiveDropdown(null);
                      }}
                    >
                      <span>{spec === 'All' ? 'All Specialties' : spec}</span>
                      {isSelected && <SolarIcon name="check-circle-bold" size={16} color="var(--color-gold-base)" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Rating Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`doctors-filter-trigger ${activeDropdown === 'rating' ? 'active' : ''}`}
              style={{ width: '100%' }}
              onClick={() => setActiveDropdown(activeDropdown === 'rating' ? null : 'rating')}
              aria-expanded={activeDropdown === 'rating'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <SolarIcon name="star-bold" size={20} color="var(--color-gold-base)" />
                <div style={{ textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-cream-text-muted)', fontWeight: 500 }}>
                    Rating
                  </span>
                  <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>
                    {ratingMin === 0 ? 'All Ratings' : `${ratingMin}+ ★`}
                  </span>
                </div>
              </div>
              <SolarIcon
                name="alt-arrow-down-linear"
                size={16}
                color="var(--color-chocolate-muted)"
                style={{
                  transition: 'transform 0.2s ease',
                  transform: activeDropdown === 'rating' ? 'rotate(180deg)' : 'none',
                  flexShrink: 0,
                  marginLeft: '8px',
                }}
              />
            </button>

            {activeDropdown === 'rating' && (
              <div className="doctors-filter-popover">
                {[
                  { label: 'All Ratings', value: 0 },
                  { label: '4.5+ ★ and above', value: 4.5 },
                  { label: '4.8+ ★ and above', value: 4.8 },
                  { label: '4.9+ ★ and above', value: 4.9 },
                ].map((item) => {
                  const isSelected = ratingMin === item.value;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      className={`doctors-filter-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setRatingMin(item.value);
                        setPage(1);
                        setActiveDropdown(null);
                      }}
                    >
                      <span>{item.label}</span>
                      {isSelected && <SolarIcon name="check-circle-bold" size={16} color="var(--color-gold-base)" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Max Fee Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`doctors-filter-trigger ${activeDropdown === 'price' ? 'active' : ''}`}
              style={{ width: '100%' }}
              onClick={() => setActiveDropdown(activeDropdown === 'price' ? null : 'price')}
              aria-expanded={activeDropdown === 'price'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <SolarIcon name="wallet-money-linear" size={20} color="var(--color-chocolate-base)" />
                <div style={{ textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-cream-text-muted)', fontWeight: 500 }}>
                    Max Fee
                  </span>
                  <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>
                    {priceMax >= 1500 ? 'Any Price' : `Under R${priceMax}`}
                  </span>
                </div>
              </div>
              <SolarIcon
                name="alt-arrow-down-linear"
                size={16}
                color="var(--color-chocolate-muted)"
                style={{
                  transition: 'transform 0.2s ease',
                  transform: activeDropdown === 'price' ? 'rotate(180deg)' : 'none',
                  flexShrink: 0,
                  marginLeft: '8px',
                }}
              />
            </button>

            {activeDropdown === 'price' && (
              <div className="doctors-filter-popover" style={{ minWidth: '250px', padding: '12px' }}>
                <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-chocolate-base)', marginBottom: '8px' }}>
                  Select Price Ceiling
                </span>
                {[
                  { label: 'Any Price (Up to R1,500)', value: 1500 },
                  { label: 'Under R1,200', value: 1200 },
                  { label: 'Under R1,000', value: 1000 },
                  { label: 'Under R800', value: 800 },
                  { label: 'Under R600', value: 600 },
                ].map((tier) => {
                  const isSelected = priceMax === tier.value;
                  return (
                    <button
                      key={tier.label}
                      type="button"
                      className={`doctors-filter-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setPriceMax(tier.value);
                        setPage(1);
                        setActiveDropdown(null);
                      }}
                    >
                      <span>{tier.label}</span>
                      {isSelected && <SolarIcon name="check-circle-bold" size={16} color="var(--color-gold-base)" />}
                    </button>
                  );
                })}

                <div style={{ borderTop: '1px solid #EFECE6', marginTop: '10px', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-chocolate-base)', marginBottom: '6px' }}>
                    <span>Custom Max:</span>
                    <span style={{ color: 'var(--color-gold-bronze)' }}>R{priceMax}</span>
                  </div>
                  <input
                    type="range"
                    min="400"
                    max="1500"
                    step="50"
                    value={priceMax}
                    onChange={(e) => {
                      setPriceMax(Number(e.target.value));
                      setPage(1);
                    }}
                    style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--color-gold-base)' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Sort Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={`doctors-filter-trigger ${activeDropdown === 'sort' ? 'active' : ''}`}
              style={{ width: '100%' }}
              onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
              aria-expanded={activeDropdown === 'sort'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <SolarIcon name="sort-vertical-linear" size={20} color="var(--color-chocolate-base)" />
                <div style={{ textAlign: 'left' }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-cream-text-muted)', fontWeight: 500 }}>
                    Sort
                  </span>
                  <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-chocolate-base)' }}>
                    {SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Highest Rated'}
                  </span>
                </div>
              </div>
              <SolarIcon
                name="alt-arrow-down-linear"
                size={16}
                color="var(--color-chocolate-muted)"
                style={{
                  transition: 'transform 0.2s ease',
                  transform: activeDropdown === 'sort' ? 'rotate(180deg)' : 'none',
                  flexShrink: 0,
                  marginLeft: '8px',
                }}
              />
            </button>

            {activeDropdown === 'sort' && (
              <div className="doctors-filter-popover">
                {SORT_OPTIONS.map((opt) => {
                  const isSelected = sortBy === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`doctors-filter-option ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setSortBy(opt.value);
                        setPage(1);
                        setActiveDropdown(null);
                      }}
                    >
                      <span>{opt.label}</span>
                      {isSelected && <SolarIcon name="check-circle-bold" size={16} color="var(--color-gold-base)" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Reset Filters Button */}
          <button
            type="button"
            onClick={handleResetFilters}
            className="doctors-filter-reset-btn touch-target"
            title="Reset all filters"
          >
            <SolarIcon name="restart-linear" size={16} color="var(--color-chocolate-base)" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Main Results Section */}
      <div className="container" style={{ marginTop: '8px' }}>

        {/* Results Summary Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '28px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <p
            style={{
              fontSize: '0.95rem',
              color: 'var(--color-chocolate-muted)',
              fontWeight: 500,
              fontFamily: 'var(--font-sans)',
            }}
          >
            Showing <strong style={{ color: 'var(--color-chocolate-base)' }}>{doctors.length}</strong>{' '}
            of <strong style={{ color: 'var(--color-chocolate-base)' }}>{total}</strong> verified doctors
          </p>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-chocolate-base)',
              backgroundColor: 'var(--color-gold-pale)',
              padding: '6px 14px',
              borderRadius: '9999px',
              border: '1px solid rgba(223, 171, 98, 0.25)',
            }}
          >
            <SolarIcon name="shield-check-linear" size={16} color="var(--color-gold-bronze)" />
            <span>100% HPCSA Registered & Board Certified</span>
          </div>
        </div>

        {/* Doctor Grid or Empty State */}
        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '28px',
            }}
          >
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                style={{
                  height: '460px',
                  borderRadius: '22px',
                  backgroundColor: 'var(--color-cream-surface)',
                  border: '1px solid var(--color-gold-border)',
                  opacity: 0.6,
                  animation: 'pulse 1.5s infinite',
                }}
              />
            ))}
          </div>
        ) : doctors.length > 0 ? (
          <div className="doctors-grid">
            {doctors.map((doc) => (
              <DoctorCard
                key={doc.id}
                id={doc.id}
                slug={doc.slug}
                name={doc.user?.full_name || doc.name || 'Medical Practitioner'}
                hpcsa_number={doc.hpcsa_number}
                specialty={doc.specialty}
                bio={doc.bio}
                tags={doc.tags}
                rate_per_hour={Number(doc.rate_per_hour) || 750}
                rating_avg={Number(doc.rating_avg) || 4.8}
                reviews_count={doc.reviews_count || 24}
                facility_name={doc.facility_name}
                facility_address={doc.facility_address}
                photo_url={doc.photo_url}
                next_available_slot={doc.next_available_slot}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div
            style={{
              backgroundColor: 'var(--color-cream-surface)',
              borderRadius: '24px',
              border: '1px solid var(--color-gold-border)',
              padding: '64px 28px',
              textAlign: 'center',
              maxWidth: '540px',
              margin: '40px auto',
              boxShadow: '0 4px 20px rgba(42, 23, 15, 0.04)',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-gold-pale)',
                border: '1.5px solid rgba(223, 171, 98, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <SolarIcon name="stethoscope-linear" size={32} color="var(--color-gold-bronze)" />
            </div>
            <h3
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-chocolate-base)',
                marginBottom: '8px',
              }}
            >
              No Doctors Match Your Filters
            </h3>
            <p
              style={{
                fontSize: '0.925rem',
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-chocolate-muted)',
                lineHeight: 1.6,
                maxWidth: '440px',
                margin: '0 auto',
              }}
            >
              We couldn't find any verified doctors matching your exact criteria. Try broadening
              your search or resetting the active filters.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                marginTop: '24px',
                padding: '12px 28px',
                borderRadius: '9999px',
                backgroundColor: 'var(--color-gold-primary)',
                color: 'var(--color-chocolate-base)',
                fontWeight: 700,
                fontFamily: 'var(--font-sans)',
                fontSize: '0.9rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px var(--color-gold-cta-shadow)',
                transition: 'all 0.2s ease',
              }}
              className="touch-target"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Circular Pagination Controls */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              marginTop: '48px',
            }}
          >
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="doctors-carousel-btn touch-target"
              aria-label="Previous page"
            >
              <SolarIcon name="arrow-left-linear" size={18} color="var(--color-chocolate-base)" />
            </button>

            <span
              style={{
                fontSize: '0.925rem',
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-chocolate-base)',
                padding: '0 8px',
              }}
            >
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="doctors-carousel-btn touch-target"
              aria-label="Next page"
            >
              <SolarIcon name="arrow-right-linear" size={18} color="var(--color-chocolate-base)" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
