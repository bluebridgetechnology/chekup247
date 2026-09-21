'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { DoctorCard } from '../DoctorCard';
import { SolarIcon } from '../SolarIcon';

const SPECIALTIES = [
  'All',
  'General Practitioner',
  'Dentist',
  'Psychologist',
  'Podiatrist',
  'Dermatologist',
  'Pediatrician',
  'Physician',
  'Obstetrics & Gynaecology',
  'Dietician',
];

const SORT_OPTIONS = [
  { label: 'Highest Rated', value: 'rating_desc' },
  { label: 'Price: Low to High', value: 'price_asc' },
  { label: 'Price: High to Low', value: 'price_desc' },
  { label: 'Name (A-Z)', value: 'name_asc' },
];

const DEFAULT_FALLBACK_DOCTORS = [
  {
    id: 'doc-1',
    slug: 'dr-thabo-molefe',
    name: 'Dr. Thabo Molefe',
    user: { full_name: 'Dr. Thabo Molefe' },
    hpcsa_number: 'MP 0689432',
    specialty: 'General Practitioner',
    experience_years: 12,
    bio: 'Dr. Thabo Molefe is a compassionate General Practitioner with over 12 years of clinical practice across Gauteng. Specializes in acute care, metabolic conditions, and preventative care.',
    rate_per_hour: 850.0,
    rating_avg: 5.0,
    reviews_count: 658,
    facility_name: 'Netcare Sunninghill Hospital Suites',
    facility_address: 'Cnr Witkoppen & Nanyuki Rd, Sunninghill, Sandton',
    photo_url: '/images/doctor_thabo.jpg',
    next_available_slot: 'Available today',
    offers_in_clinic: true,
    consultation_types: ['Video Telehealth Consultation', 'Acute Infection Care', 'Chronic Script Renewal', 'Wellness'],
  },
  {
    id: 'doc-2',
    slug: 'dr-sipho-dlamini',
    name: 'Dr. Sipho Dlamini',
    user: { full_name: 'Dr. Sipho Dlamini' },
    hpcsa_number: 'MP 0792145',
    specialty: 'Dentist',
    experience_years: 9,
    bio: 'Dr. Sipho Dlamini provides oral health examinations, teeth whitening, emergency dental pain management, and preventative oral hygiene guidance.',
    rate_per_hour: 900.0,
    rating_avg: 4.9,
    reviews_count: 420,
    facility_name: 'Rosebank Dental Suites',
    facility_address: 'Oxford Rd, Rosebank, Johannesburg',
    photo_url: '/images/doctor_kevin.jpg',
    next_available_slot: 'Available today',
    offers_in_clinic: false,
    consultation_types: ['Oral Health Consultation', 'Teeth Whitening Advice', 'Dental Pain Management', 'Preventative Dentistry'],
  },
  {
    id: 'doc-3',
    slug: 'dr-naledi-khumalo',
    name: 'Dr. Naledi Khumalo',
    user: { full_name: 'Dr. Naledi Khumalo' },
    hpcsa_number: 'MP 0824921',
    specialty: 'Psychologist',
    experience_years: 8,
    bio: 'Dr. Naledi Khumalo is a licensed clinical psychologist specializing in anxiety, mood disorders, cognitive behavioral therapy, and stress management.',
    rate_per_hour: 820.0,
    rating_avg: 4.9,
    reviews_count: 519,
    facility_name: 'Glenwood Health Centre',
    facility_address: 'Glenwood, Durban, KwaZulu-Natal',
    photo_url: '/images/doctor_sarah.jpg',
    next_available_slot: 'Available today',
    offers_in_clinic: false,
    consultation_types: ['Mental Health Support', 'Anxiety & Mood Therapy', 'Stress Management', 'Family Counseling'],
  },
  {
    id: 'doc-4',
    slug: 'dr-kevin-pillay',
    name: 'Dr. Kevin Pillay',
    user: { full_name: 'Dr. Kevin Pillay' },
    hpcsa_number: 'MP 0678120',
    specialty: 'Podiatrist',
    experience_years: 11,
    bio: 'Dr. Kevin Pillay provides comprehensive medical foot and lower extremity care, specializing in diabetic foot care, biomechanics, and sports rehabilitation.',
    rate_per_hour: 780.0,
    rating_avg: 4.8,
    reviews_count: 310,
    facility_name: 'Umhlanga Medical Centre',
    facility_address: 'Umhlanga Rocks Dr, Umhlanga, Durban',
    photo_url: '/images/doctor_kevin.jpg',
    next_available_slot: 'Available today',
    offers_in_clinic: true,
    consultation_types: ['Foot & Ankle Care', 'Diabetic Foot Screening', 'Biomechanics & Gait', 'Sports Injury Recovery'],
  },
  {
    id: 'doc-5',
    slug: 'dr-anika-sharma',
    name: 'Dr. Anika Sharma',
    user: { full_name: 'Dr. Anika Sharma' },
    hpcsa_number: 'MP 0751930',
    specialty: 'Dermatologist',
    experience_years: 10,
    bio: 'Dr. Anika Sharma is a board-certified dermatologist focusing on acne therapy, eczema, psoriasis management, and preventative skin cancer screenings.',
    rate_per_hour: 950.0,
    rating_avg: 4.9,
    reviews_count: 480,
    facility_name: 'Morningside Mediclinic',
    facility_address: 'Rivonia Rd, Morningside, Sandton',
    photo_url: '/images/doctor_sarah.jpg',
    next_available_slot: 'Available today',
    offers_in_clinic: false,
    consultation_types: ['Skin Condition Screening', 'Acne Treatment', 'Eczema & Rash Management', 'Hair & Nail Health'],
  },
  {
    id: 'doc-6',
    slug: 'dr-zola-mthembu',
    name: 'Dr. Zola Mthembu',
    user: { full_name: 'Dr. Zola Mthembu' },
    hpcsa_number: 'MP 0643210',
    specialty: 'Pediatrician',
    experience_years: 14,
    bio: 'Dr. Zola Mthembu specializes in infant and child healthcare, developmental milestones, childhood illnesses, and preventative paediatric medicine.',
    rate_per_hour: 880.0,
    rating_avg: 4.9,
    reviews_count: 610,
    facility_name: 'Centurion Paediatric Clinic',
    facility_address: 'Clifton Ave, Centurion, Pretoria',
    photo_url: '/images/doctor_thabo.jpg',
    next_available_slot: 'Available today',
    offers_in_clinic: true,
    consultation_types: ['Infant & Child Health', 'Adolescent Care', 'Developmental Milestones', 'Pediatric Nutrition'],
  },
  {
    id: 'doc-7',
    slug: 'dr-farhan-patel',
    name: 'Dr. Farhan Patel',
    user: { full_name: 'Dr. Farhan Patel' },
    hpcsa_number: 'MP 0735219',
    specialty: 'Physician',
    experience_years: 12,
    bio: 'Dr. Farhan Patel focuses on internal medicine, chronic disease management, hypertension, diabetes care, and complex diagnostic workups.',
    rate_per_hour: 800.0,
    rating_avg: 4.8,
    reviews_count: 386,
    facility_name: 'City North Medical Chambers',
    facility_address: 'City North, Cape Town, Western Cape',
    photo_url: '/images/doctor_thabo.jpg',
    next_available_slot: 'Available today',
    offers_in_clinic: false,
    consultation_types: ['Internal Medicine', 'Chronic Disease Management', 'Hypertension & Diabetes Care', 'Specialist Referral'],
  },
  {
    id: 'doc-8',
    slug: 'dr-sarah-van-der-merwe',
    name: 'Dr. Sarah van der Merwe',
    user: { full_name: 'Dr. Sarah van der Merwe' },
    hpcsa_number: 'MP 0567810',
    specialty: 'Obstetrics & Gynaecology',
    experience_years: 10,
    bio: 'Dr. Sarah van der Merwe completed her medical degree at Stellenbosch University and has a dedicated clinical focus on maternal health, hormonal balance, and reproductive wellness.',
    rate_per_hour: 920.0,
    rating_avg: 4.9,
    reviews_count: 722,
    facility_name: 'Mediclinic Cape Town Medical Suites',
    facility_address: '21 Hof Street, Oranjezicht, Cape Town',
    photo_url: '/images/doctor_sarah.jpg',
    next_available_slot: 'Available today',
    offers_in_clinic: false,
    consultation_types: ['Women’s Health Screening', 'Contraceptive Counselling', 'Maternal Health Support', 'Hormonal Wellness'],
  },
  {
    id: 'doc-9',
    slug: 'dr-chloe-roux',
    name: 'Dr. Chloe Roux',
    user: { full_name: 'Dr. Chloe Roux' },
    hpcsa_number: 'MP 0819432',
    specialty: 'Dietician',
    experience_years: 7,
    bio: 'Dr. Chloe Roux is a registered dietician offering clinical nutrition therapy, diabetic meal planning, and metabolic lifestyle intervention.',
    rate_per_hour: 750.0,
    rating_avg: 4.9,
    reviews_count: 290,
    facility_name: 'Stellenbosch Wellness Institute',
    facility_address: 'Dorp Street, Stellenbosch, Western Cape',
    photo_url: '/images/doctor_sarah.jpg',
    next_available_slot: 'Available today',
    offers_in_clinic: false,
    consultation_types: ['Nutritional Therapy', 'Weight & Metabolic Guidance', 'Meal Planning', 'Diabetes Dietary Care'],
  },
];

const COMMON_CONDITIONS = [
  {
    name: 'Flu, Cold & Acute Infections',
    specialty: 'General Practitioner',
    category: 'General Health',
    keywords: ['flu', 'fever', 'cold', 'cough', 'chills', 'sore throat', 'headache', 'infection', 'gp', 'sick note'],
  },
  {
    name: 'Chronic Script & Medication Renewal',
    specialty: 'General Practitioner',
    category: 'Prescriptions',
    keywords: ['script', 'prescription', 'refill', 'renewal', 'medication', 'chronic', 'repeat'],
  },
  {
    name: 'Toothache, Teeth Cleaning & Whitening',
    specialty: 'Dentist',
    category: 'Dental Care',
    keywords: ['tooth', 'teeth', 'dental', 'cavity', 'toothache', 'whitening', 'gum', 'dentist', 'oral'],
  },
  {
    name: 'Anxiety, Stress & Mental Health Support',
    specialty: 'Psychologist',
    category: 'Mental Health',
    keywords: ['anxiety', 'depression', 'stress', 'mental', 'counseling', 'therapy', 'panic', 'burnout', 'psychologist'],
  },
  {
    name: 'Foot Pain, Heel Spurs & Diabetic Foot',
    specialty: 'Podiatrist',
    category: 'Foot Care',
    keywords: ['foot', 'feet', 'podiatry', 'heel', 'plantar', 'ankle', 'toe', 'nail', 'podiatrist'],
  },
  {
    name: 'Acne, Skin Rash, Eczema & Allergies',
    specialty: 'Dermatologist',
    category: 'Dermatology',
    keywords: ['skin', 'rash', 'acne', 'eczema', 'dermatology', 'mole', 'allergy', 'dermatologist', 'spots'],
  },
  {
    name: 'Child Illnesses, Infant Care & Wellness',
    specialty: 'Pediatrician',
    category: 'Pediatrics',
    keywords: ['child', 'baby', 'pediatric', 'kid', 'toddler', 'vaccine', 'pediatrician', 'children', 'infant'],
  },
  {
    name: 'Hypertension, Diabetes & Chronic Care',
    specialty: 'Physician',
    category: 'Internal Medicine',
    keywords: ['blood pressure', 'hypertension', 'diabetes', 'sugar', 'cholesterol', 'physician', 'internal medicine'],
  },
  {
    name: 'Pregnancy, Fertility & Women’s Health',
    specialty: 'Obstetrics & Gynaecology',
    category: 'Women’s Health',
    keywords: ['pregnancy', 'pregnant', 'fertility', 'women', 'gynae', 'gynaecologist', 'pap smear', 'contraception', 'maternal'],
  },
  {
    name: 'Weight Loss, Diet & Nutrition Plans',
    specialty: 'Dietician',
    category: 'Nutrition',
    keywords: ['weight', 'diet', 'nutrition', 'meal plan', 'dietician', 'calories', 'food'],
  },
];

interface SearchSuggestion {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  type: 'doctor' | 'specialty' | 'condition';
  iconName: string;
  onSelect: () => void;
}

export function PortalDoctorFinder() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [ratingMin, setRatingMin] = useState<number>(0);
  const [priceMax, setPriceMax] = useState<number>(1500);
  const [sortBy, setSortBy] = useState('rating_desc');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [doctors, setDoctors] = useState<any[]>(DEFAULT_FALLBACK_DOCTORS);
  const [total, setTotal] = useState(DEFAULT_FALLBACK_DOCTORS.length);

  // Suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const searchContainerRef = useRef<HTMLFormElement>(null);

  // Active dropdown for the horizontal filter bar
  const [activeDropdown, setActiveDropdown] = useState<'specialty' | 'rating' | 'price' | 'sort' | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Close filter popovers and suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter fallback doctors locally when offline or local preview
  const filterFallbackDoctors = (
    query: string,
    specialty: string,
    minRating: number,
    maxPrice: number,
    sort: string,
  ) => {
    const q = query.trim().toLowerCase();
    let filtered = DEFAULT_FALLBACK_DOCTORS.filter((d) => {
      const docName = d.user?.full_name || d.name || '';
      const matchQuery =
        !q ||
        docName.toLowerCase().includes(q) ||
        d.specialty.toLowerCase().includes(q) ||
        d.facility_name.toLowerCase().includes(q);
      const matchSpecialty =
        specialty === 'All' || d.specialty.toLowerCase().includes(specialty.toLowerCase());
      const matchRating = minRating === 0 || d.rating_avg >= minRating;
      const matchPrice = d.rate_per_hour <= maxPrice;
      return matchQuery && matchSpecialty && matchRating && matchPrice;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      if (sort === 'rating_desc') return b.rating_avg - a.rating_avg;
      if (sort === 'price_asc') return a.rate_per_hour - b.rate_per_hour;
      if (sort === 'price_desc') return b.rate_per_hour - a.rate_per_hour;
      if (sort === 'name_asc') {
        const nameA = a.user?.full_name || a.name || '';
        const nameB = b.user?.full_name || b.name || '';
        return nameA.localeCompare(nameB);
      }
      return 0;
    });

    setDoctors(filtered);
    setTotal(filtered.length);
  };

  // Fetch doctors with explicit parameters from API
  const fetchDoctorsWith = async (
    query: string,
    specialty: string,
    minRating: number,
    maxPrice: number,
    sort: string,
    pageNum: number,
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('searchQuery', query.trim());
      if (specialty !== 'All') params.set('specialty', specialty);
      if (minRating > 0) params.set('ratingMin', minRating.toString());
      if (maxPrice < 1500) params.set('priceMax', maxPrice.toString());
      params.set('sort', sort);
      params.set('page', pageNum.toString());
      params.set('limit', '12');

      const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const apiBase = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api/v1`;
      const res = await fetch(`${apiBase}/doctors?${params.toString()}`);

      if (res.ok) {
        const data = await res.json();
        if (data?.doctors && Array.isArray(data.doctors)) {
          setDoctors(data.doctors);
          setTotal(data.total || data.doctors.length);
        } else if (Array.isArray(data)) {
          setDoctors(data);
          setTotal(data.length);
        } else {
          filterFallbackDoctors(query, specialty, minRating, maxPrice, sort);
        }
      } else {
        filterFallbackDoctors(query, specialty, minRating, maxPrice, sort);
      }
    } catch {
      filterFallbackDoctors(query, specialty, minRating, maxPrice, sort);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch whenever filters or page change
  useEffect(() => {
    fetchDoctorsWith(searchQuery, selectedSpecialty, ratingMin, priceMax, sortBy, page);
  }, [selectedSpecialty, ratingMin, priceMax, sortBy, page]);

  // Compute live search suggestions based on searchQuery
  const searchSuggestions: SearchSuggestion[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];

    const results: SearchSuggestion[] = [];

    // 1. Doctors matching name or specialty
    const candidateDocs = [...DEFAULT_FALLBACK_DOCTORS];
    doctors.forEach((d) => {
      if (!candidateDocs.some((c) => c.name === d.name || c.id === d.id)) {
        candidateDocs.push(d);
      }
    });

    const matchingDocs = candidateDocs.filter((d) => {
      const name = (d.user?.full_name || d.name || '').toLowerCase();
      const spec = (d.specialty || '').toLowerCase();
      const facility = (d.facility_name || '').toLowerCase();
      return name.includes(q) || spec.includes(q) || facility.includes(q);
    });

    matchingDocs.slice(0, 3).forEach((d) => {
      const docName = d.user?.full_name || d.name;
      results.push({
        id: `doc-${d.id || d.slug}`,
        title: docName,
        subtitle: `${d.specialty} • ${d.facility_name || 'Verified Practitioner'}`,
        category: 'Doctor',
        type: 'doctor',
        iconName: 'stethoscope-bold',
        onSelect: () => {
          setSearchQuery(docName);
          setSelectedSpecialty('All');
          setPage(1);
          fetchDoctorsWith(docName, 'All', ratingMin, priceMax, sortBy, 1);
        },
      });
    });

    // 2. Specialties matching query
    const matchingSpecialties = SPECIALTIES.filter(
      (spec) => spec !== 'All' && spec.toLowerCase().includes(q),
    );
    matchingSpecialties.slice(0, 3).forEach((spec) => {
      results.push({
        id: `spec-${spec}`,
        title: spec,
        subtitle: 'Medical Specialty • View verified practitioners',
        category: 'Specialty',
        type: 'specialty',
        iconName: 'hospital-bold',
        onSelect: () => {
          setSelectedSpecialty(spec);
          setSearchQuery('');
          setPage(1);
          fetchDoctorsWith('', spec, ratingMin, priceMax, sortBy, 1);
        },
      });
    });

    // 3. Health conditions & symptoms matching query
    const matchingConditions = COMMON_CONDITIONS.filter(
      (cond) =>
        cond.name.toLowerCase().includes(q) ||
        cond.specialty.toLowerCase().includes(q) ||
        cond.keywords.some((k) => k.includes(q)),
    );
    matchingConditions.slice(0, 3).forEach((cond) => {
      results.push({
        id: `cond-${cond.name}`,
        title: cond.name,
        subtitle: `${cond.category} • Consult a ${cond.specialty}`,
        category: cond.category,
        type: 'condition',
        iconName: 'heart-pulse-bold',
        onSelect: () => {
          setSelectedSpecialty(cond.specialty);
          setSearchQuery(cond.name);
          setPage(1);
          fetchDoctorsWith(cond.name, cond.specialty, ratingMin, priceMax, sortBy, 1);
        },
      });
    });

    return results.slice(0, 8);
  }, [searchQuery, doctors, ratingMin, priceMax, sortBy]);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    setPage(1);
    fetchDoctorsWith(searchQuery, selectedSpecialty, ratingMin, priceMax, sortBy, 1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || searchSuggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearchSubmit();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev < searchSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : searchSuggestions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < searchSuggestions.length) {
        const item = searchSuggestions[activeSuggestionIndex];
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
        item.onSelect();
      } else {
        handleSearchSubmit();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedSpecialty('All');
    setRatingMin(0);
    setPriceMax(1500);
    setSortBy('rating_desc');
    setPage(1);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
    fetchDoctorsWith('', 'All', 0, 1500, 'rating_desc', 1);
  };

  return (
    <div>
      {/* 1. In-Portal Header (No marketing hero, clean and professional) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px',
        }}
        className="portal-page-intro"
      >
        <div>
          <div
            style={{
              fontSize: '0.74rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: '#B88647',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            ACCREDITED MEDICAL SPECIALISTS
          </div>
          <h1 className="page-title" style={{ marginBottom: '4px' }}>
            Find a Healthcare Practitioner
          </h1>
          <p className="page-subtitle" style={{ margin: 0, lineHeight: 1.45 }}>
            Browse verified General Practitioners and Specialists. Book an instant telehealth consultation without leaving your account.
          </p>
        </div>

        <Link
          href="/appointments"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #D5C1A7',
            color: '#2A170F',
            fontSize: '0.84rem',
            fontWeight: 600,
            padding: '8px 16px',
            borderRadius: '20px',
            textDecoration: 'none',
            minHeight: '40px',
          }}
          className="portal-details-btn"
        >
          <SolarIcon name="calendar-linear" size={14} color="#2A170F" />
          <span>My Appointments</span>
        </Link>
      </div>

      {/* 2. Search Bar Component with Autocomplete */}
      <div style={{ position: 'relative', marginBottom: '16px' }}>
        <form
          ref={searchContainerRef}
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            border: '1.5px solid #E4D8C8',
            padding: '4px 6px 4px 16px',
            boxShadow: '0 2px 10px rgba(42, 23, 15, 0.04)',
            transition: 'border-color 0.2s ease',
          }}
        >
          <SolarIcon name="magnifer-linear" size={18} color="#B88647" style={{ marginRight: '10px', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by doctor name, specialty, condition (e.g. flu, anxiety, diabetes)..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
              setActiveSuggestionIndex(-1);
              setActiveDropdown(null);
            }}
            onFocus={() => {
              setActiveDropdown(null);
              if (searchQuery.trim().length > 0) setShowSuggestions(true);
            }}
            onKeyDown={handleSearchKeyDown}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '0.9rem',
              color: '#2A170F',
              fontFamily: 'var(--font-sans), sans-serif',
              backgroundColor: 'transparent',
              padding: '8px 0',
              minWidth: 0,
            }}
          />

          {searchQuery.trim() && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowSuggestions(false);
                setActiveSuggestionIndex(-1);
              }}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 8px',
                cursor: 'pointer',
                color: '#7A6A5E',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              aria-label="Clear search"
            >
              <SolarIcon name="close-circle-bold" size={16} color="#7A6A5E" />
            </button>
          )}

          <button
            type="submit"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2E1A10',
              color: '#FAF6EE',
              fontSize: '0.84rem',
              fontWeight: 600,
              padding: '9px 18px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              flexShrink: 0,
              marginLeft: '6px',
            }}
            className="portal-join-btn"
          >
            <span>Search</span>
            <SolarIcon name="arrow-right-linear" size={14} color="#DFAB62" />
          </button>
        </form>

        {/* Search Suggestions Dropdown */}
        {showSuggestions && searchQuery.trim().length > 0 && searchSuggestions.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              right: 0,
              backgroundColor: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #EDE4D4',
              boxShadow: '0 12px 36px rgba(42, 23, 15, 0.12)',
              zIndex: 50,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '8px 14px',
                backgroundColor: '#FAF5ED',
                borderBottom: '1px solid #EDE4D4',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#B88647',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Matching Doctors & Specialties
            </div>
            <ul style={{ listStyle: 'none', margin: 0, padding: '4px 0', maxHeight: '280px', overflowY: 'auto' }}>
              {searchSuggestions.map((item, idx) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSuggestions(false);
                      item.onSelect();
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: idx === activeSuggestionIndex ? '#FAF5ED' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={() => setActiveSuggestionIndex(idx)}
                  >
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#2A170F' }}>{item.title}</div>
                      <div style={{ fontSize: '0.74rem', color: '#7A6A5E' }}>{item.subtitle}</div>
                    </div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        backgroundColor: '#FAF5ED',
                        color: '#B88647',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {item.category}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 3. Horizontal Filter Bar */}
      <div
        ref={filterBarRef}
        className="portal-doctors-filter-bar"
      >
        {/* Specialty Filter */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`doctors-filter-trigger ${activeDropdown === 'specialty' ? 'active' : ''}`}
            style={{ width: '100%' }}
            onClick={() => setActiveDropdown(activeDropdown === 'specialty' ? null : 'specialty')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <SolarIcon name="stethoscope-linear" size={18} color="#B88647" />
              <div style={{ textAlign: 'left', minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '0.68rem', color: '#7A6A5E', fontWeight: 500 }}>
                  Specialty
                </span>
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#2A170F',
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
              size={14}
              color="#7A6A5E"
              style={{
                transform: activeDropdown === 'specialty' ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
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
                    {isSelected && <SolarIcon name="check-circle-bold" size={16} color="#B88647" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Rating Filter */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`doctors-filter-trigger ${activeDropdown === 'rating' ? 'active' : ''}`}
            style={{ width: '100%' }}
            onClick={() => setActiveDropdown(activeDropdown === 'rating' ? null : 'rating')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SolarIcon name="star-bold" size={18} color="#DFAB62" />
              <div style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.68rem', color: '#7A6A5E', fontWeight: 500 }}>
                  Rating
                </span>
                <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2A170F' }}>
                  {ratingMin === 0 ? 'All Ratings' : `${ratingMin}+ ★`}
                </span>
              </div>
            </div>
            <SolarIcon
              name="alt-arrow-down-linear"
              size={14}
              color="#7A6A5E"
              style={{
                transform: activeDropdown === 'rating' ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
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
                    {isSelected && <SolarIcon name="check-circle-bold" size={16} color="#B88647" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Max Fee Filter */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`doctors-filter-trigger ${activeDropdown === 'price' ? 'active' : ''}`}
            style={{ width: '100%' }}
            onClick={() => setActiveDropdown(activeDropdown === 'price' ? null : 'price')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SolarIcon name="wallet-money-linear" size={18} color="#B88647" />
              <div style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.68rem', color: '#7A6A5E', fontWeight: 500 }}>
                  Max Fee
                </span>
                <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2A170F' }}>
                  {priceMax >= 1500 ? 'Any Price' : `Under R${priceMax}`}
                </span>
              </div>
            </div>
            <SolarIcon
              name="alt-arrow-down-linear"
              size={14}
              color="#7A6A5E"
              style={{
                transform: activeDropdown === 'price' ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </button>

          {activeDropdown === 'price' && (
            <div className="doctors-filter-popover" style={{ minWidth: '240px', padding: '12px' }}>
              <span style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#2A170F', marginBottom: '8px' }}>
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
                    {isSelected && <SolarIcon name="check-circle-bold" size={16} color="#B88647" />}
                  </button>
                );
              })}

              <div style={{ borderTop: '1px solid #EDE4D4', marginTop: '10px', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontWeight: 600, color: '#2A170F', marginBottom: '6px' }}>
                  <span>Custom Max:</span>
                  <span style={{ color: '#B88647' }}>R{priceMax}</span>
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
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#B88647' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Sort Filter */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={`doctors-filter-trigger ${activeDropdown === 'sort' ? 'active' : ''}`}
            style={{ width: '100%' }}
            onClick={() => setActiveDropdown(activeDropdown === 'sort' ? null : 'sort')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SolarIcon name="sort-vertical-linear" size={18} color="#B88647" />
              <div style={{ textAlign: 'left' }}>
                <span style={{ display: 'block', fontSize: '0.68rem', color: '#7A6A5E', fontWeight: 500 }}>
                  Sort
                </span>
                <span style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#2A170F' }}>
                  {SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Highest Rated'}
                </span>
              </div>
            </div>
            <SolarIcon
              name="alt-arrow-down-linear"
              size={14}
              color="#7A6A5E"
              style={{
                transform: activeDropdown === 'sort' ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </button>

          {activeDropdown === 'sort' && (
            <div className="doctors-filter-popover" style={{ right: 0, left: 'auto', minWidth: '200px' }}>
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
                    {isSelected && <SolarIcon name="check-circle-bold" size={16} color="#B88647" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Reset Filter Button */}
        <button
          type="button"
          onClick={handleResetFilters}
          className="doctors-filter-reset-btn touch-target"
          title="Reset all filters"
        >
          <SolarIcon name="restart-linear" size={15} color="var(--color-chocolate-base, #2A170F)" />
          <span>Reset</span>
        </button>
      </div>

      {/* 4. Results Count & HPCSA Assurance Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <p style={{ fontSize: '0.88rem', color: '#6B5E55', margin: 0, fontWeight: 500 }}>
          Showing <strong style={{ color: '#2A170F' }}>{doctors.length}</strong> of{' '}
          <strong style={{ color: '#2A170F' }}>{total}</strong> verified doctors
        </p>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.76rem',
            fontWeight: 600,
            color: '#0E7039',
            backgroundColor: '#EAF7EE',
            padding: '4px 12px',
            borderRadius: '9999px',
            border: '1px solid #D0EED9',
          }}
        >
          <SolarIcon name="shield-check-linear" size={14} color="#0E7039" />
          <span>100% HPCSA Registered &amp; Verified</span>
        </div>
      </div>

      {/* 5. Doctor Cards Grid or Loading Skeletons */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: '20px',
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                height: '420px',
                borderRadius: '18px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #EDE4D4',
                opacity: 0.6,
                animation: 'pulse 1.5s infinite',
              }}
            />
          ))}
        </div>
      ) : doctors.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: '20px',
          }}
        >
          {doctors.map((doc) => (
            <DoctorCard
              key={doc.id}
              id={doc.id}
              slug={doc.slug}
              name={doc.user?.full_name || doc.name || 'Medical Practitioner'}
              hpcsa_number={doc.hpcsa_number}
              specialty={doc.specialty}
              bio={doc.bio}
              tags={doc.consultation_types || doc.tags}
              experience_years={doc.experience_years}
              rate_per_hour={Number(doc.rate_per_hour) || 750}
              rating_avg={Number(doc.rating_avg) || 4.8}
              reviews_count={doc.reviews_count || 24}
              facility_name={doc.facility_name}
              facility_address={doc.facility_address}
              photo_url={doc.photo_url}
              next_available_slot={doc.next_available_slot}
              offers_in_clinic={doc.offers_in_clinic}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px dashed #D5C1A7',
            padding: '50px 24px',
            textAlign: 'center',
            maxWidth: '500px',
            margin: '30px auto',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              backgroundColor: '#FAF5ED',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <SolarIcon name="stethoscope-linear" size={28} color="#B88647" />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2A170F', margin: '0 0 6px 0' }}>
            No Doctors Match Your Filters
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#7A6A5E', lineHeight: 1.5, margin: '0 auto 20px' }}>
            We couldn't find any healthcare practitioners matching your selected filters. Try broadening your criteria or reset filters.
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2E1A10',
              color: '#FAF6EE',
              fontSize: '0.84rem',
              fontWeight: 600,
              padding: '10px 20px',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
            }}
            className="portal-join-btn"
          >
            <SolarIcon name="restart-linear" size={14} color="#DFAB62" />
            <span>Reset All Filters</span>
          </button>
        </div>
      )}
    </div>
  );
}
