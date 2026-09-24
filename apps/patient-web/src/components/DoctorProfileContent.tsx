'use client';

import React, { useState } from 'react';
import { SolarIcon } from './SolarIcon';

interface DoctorProfileContentProps {
  doctor: {
    id: string;
    slug: string;
    hpcsa_number?: string;
    specialty?: string;
    bio?: string;
    rate_per_hour?: number | string;
    rating_avg?: number;
    reviews_count?: number;
    facility_name?: string;
    facility_address?: string;
    photo_url?: string;
    experience_years?: string | number;
    verification_status?: string;
    is_board_certified?: boolean;
    board_certification_title?: string;
    /** Whether the doctor offers video consultations (default: true) */
    offers_video?: boolean;
    /** Whether the doctor offers audio-only consultations */
    offers_audio?: boolean;
    /** Whether the doctor offers in-clinic in-person visits */
    offers_in_clinic?: boolean;
    /** Whether the doctor accepts medical aid */
    accepts_medical_aid?: boolean;
    /** Areas of expertise and consultation types */
    consultation_types?: string[];
    user?: {
      full_name: string;
    };
  };
  reviewsData?: any;
}

const EXPERTISE_ICON_MAP: Record<string, string> = {
  'video telehealth consultation': 'videocamera-linear',
  'video telehealth': 'videocamera-linear',
  'digital prescription renewal': 'pill-linear',
  'prescription renewal': 'pill-linear',
  'medical certificates / sick notes': 'document-text-linear',
  'medical certificates': 'document-text-linear',
  'sick notes': 'document-text-linear',
  'specialist referral letters': 'diploma-verified-linear',
  'referral letters': 'diploma-verified-linear',
  'chronic medication management': 'heart-pulse-linear',
  'chronic medication': 'heart-pulse-linear',
  "women's health & contraception": 'stethoscope-linear',
  "women's health screening": 'stethoscope-linear',
  'paediatric & child wellness': 'user-rounded-linear',
  'mental health & anxiety support': 'chat-round-line-linear',
  'acute infection & flu care': 'pulse-linear',
  'lab results & diagnostics review': 'test-tube-linear',
  'lab results review': 'test-tube-linear',
  'hypertension & diabetes care': 'heart-pulse-linear',
  'preventative health screening': 'shield-check-linear',
};

function getExpertiseIcon(label: string): string {
  const normalized = label.toLowerCase().trim();
  for (const [key, icon] of Object.entries(EXPERTISE_ICON_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return icon;
    }
  }
  return 'medal-ribbons-star-linear';
}

export function DoctorProfileContent({ doctor, reviewsData }: DoctorProfileContentProps) {
  const [activeTab, setActiveTab] = useState<'about' | 'services' | 'reviews'>('about');

  const displayName = doctor.user?.full_name || 'Doctor';
  const specialty = doctor.specialty || '';
  const hpcsaNumber = doctor.hpcsa_number || 'Not provided';
  const ratingAvg = Number(reviewsData?.ratingAvg ?? doctor.rating_avg ?? 0);
  const reviewsCount = Number(reviewsData?.reviewsCount ?? doctor.reviews_count ?? 0);
  const bio = doctor.bio || 'No clinical biography submitted.';

  const expertiseTags: Array<{ label: string; icon: string }> =
    doctor.consultation_types && doctor.consultation_types.length > 0
      ? doctor.consultation_types.map((type) => ({
          label: type,
          icon: getExpertiseIcon(type),
        }))
      : [];
  const photoUrl = doctor.photo_url;

  // Dynamic credentials (Experience, HPCSA, Board Certification)
  const experienceText =
    typeof doctor.experience_years === 'number'
      ? `${doctor.experience_years}+ Years Experience`
      : (doctor.experience_years ? `${doctor.experience_years} Years Experience` : 'Experience not provided');
  const isHpcsaVerified = doctor.verification_status === 'verified';
  const hpcsaText = isHpcsaVerified ? 'HPCSA Verified' : 'HPCSA Registered';
  const hpcsaIcon = isHpcsaVerified ? 'shield-check-linear' : 'shield-warning-linear';
  const showBoardCertified = doctor.is_board_certified === true;
  const boardTitle = doctor.board_certification_title || 'Board certification not provided';

  const credentialsList: Array<{ icon: string; text: string }> = [
    { icon: 'calendar-linear', text: experienceText },
    { icon: hpcsaIcon, text: hpcsaText },
    ...(showBoardCertified ? [{ icon: 'medal-ribbons-star-linear', text: boardTitle }] : []),
  ];

  // Ratings distribution
  const distribution = reviewsData?.distribution || {
    5: { percentage: 96, count: 56 },
    4: { percentage: 3, count: 2 },
    3: { percentage: 0, count: 0 },
    2: { percentage: 0, count: 0 },
    1: { percentage: 0, count: 0 },
  };

  const reviewsList =
    reviewsData?.reviews && reviewsData.reviews.length > 0
      ? reviewsData.reviews.map((r: any) => ({
          id: r.id,
          author: r.patientName || 'Verified Patient',
          initial: (r.patientName || 'V')[0].toUpperCase(),
          rating: Number(r.rating || 5),
          date: new Date(r.created_at).toLocaleDateString('en-ZA', {
            month: 'long',
            year: 'numeric',
          }),
          comment: r.comment || 'Thorough and professional consultation.',
        }))
      : [];

  return (
    <div>
      {/* 1. Doctor Profile Summary Card */}
      <div className="doctor-summary-card">
        <div className="doctor-summary-top">
          {/* Portrait with "Available today" Badge */}
          <div className="doctor-portrait-container">
            {photoUrl ? (
              <img src={photoUrl} alt={displayName} className="doctor-portrait-img" />
            ) : (
              <div className="doctor-portrait-img doctor-portrait-initials" aria-label={`${displayName} initials`}>
                {displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
              </div>
            )}
            <div className="doctor-available-badge">
              <span className="doctor-available-dot" />
              <span>Available today</span>
            </div>
          </div>

          {/* Identity & Credentials Column */}
          <div className="doctor-info-col">
            {/* HPCSA Badge */}
            <div style={{ marginBottom: '8px' }}>
              <div className="doctor-hpcsa-badge">
                <SolarIcon name="shield-check-bold" size={14} color="currentColor" />
                <span>HPCSA Registered • {hpcsaNumber}</span>
              </div>
            </div>

            {/* Doctor Name & Specialty */}
            <h1 className="doctor-name-heading">{displayName}</h1>
            {specialty && <p className="doctor-specialty-title">{specialty}</p>}

            {/* Rating Row */}
            {reviewsCount > 0 ? (
              <div className="doctor-rating-row">
                <SolarIcon name="star-bold" size={16} color="var(--color-gold-base)" />
                <span className="doctor-rating-num">{ratingAvg.toFixed(1)}</span>
                <span className="doctor-rating-count">({reviewsCount} verified reviews)</span>
              </div>
            ) : (
              <p className="doctor-rating-count">No reviews yet</p>
            )}

            {/* Credential Items & Medical Aid Tag (4th option on next line) */}
            <div className="doctor-credentials-container">
              <div className="doctor-credentials-row">
                {credentialsList.map((item, index) => (
                  <React.Fragment key={item.text + index}>
                    {index > 0 && <span className="doctor-credential-divider">|</span>}
                    <div className="doctor-credential-item">
                      <SolarIcon name={item.icon} size={16} color="var(--color-gold-base)" />
                      <span>{item.text}</span>
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {doctor.accepts_medical_aid && (
                <div className="doctor-credentials-badge-row">
                  <div className="doctor-medical-aid-badge">
                    <SolarIcon name="card-bold" size={13} color="var(--color-gold-bronze)" />
                    <span>Accepts Medical Aid</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compact Consultation Mode Availability Blocks */}
        <div className="doctor-services-row">
          {/* Video Consultation — shown by default unless explicitly disabled */}
          {(doctor.offers_video !== false) && (
            <div className="doctor-service-block">
              <div className="doctor-service-icon-box">
                <SolarIcon name="videocamera-record-bold" size={18} color="var(--color-chocolate-base)" />
              </div>
              <div>
                <div className="doctor-service-title">Video Consultation</div>
                <div className="doctor-service-status">Available</div>
              </div>
            </div>
          )}

          {/* In-Clinic Visit — shown only if doctor offers it */}
          {doctor.offers_in_clinic && (
            <div className="doctor-service-block">
              <div className="doctor-service-icon-box">
                <SolarIcon name="hospital-bold" size={18} color="var(--color-chocolate-base)" />
              </div>
              <div>
                <div className="doctor-service-title">In-Clinic Visit</div>
                <div className="doctor-service-status">Available</div>
              </div>
            </div>
          )}

          {/* Audio Consultation — shown only if doctor has enabled it */}
          {doctor.offers_audio && (
            <div className="doctor-service-block">
              <div className="doctor-service-icon-box">
                <SolarIcon name="phone-calling-linear" size={18} color="var(--color-chocolate-base)" />
              </div>
              <div>
                <div className="doctor-service-title">Audio Consultation</div>
                <div className="doctor-service-status">Available</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Content Card with Tabs (About, Services, Reviews) */}
      <div className="doctor-tabs-card">
        {/* Tab Navigation Row */}
        <div className="doctor-tabs-nav">
          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`doctor-tab-btn ${activeTab === 'about' ? 'active' : ''}`}
          >
            <SolarIcon name="document-text-linear" size={17} color="currentColor" />
            <span>About</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`doctor-tab-btn ${activeTab === 'services' ? 'active' : ''}`}
          >
            <SolarIcon name="stethoscope-linear" size={17} color="currentColor" />
            <span>Services</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`doctor-tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
          >
            <SolarIcon name="chat-round-line-linear" size={17} color="currentColor" />
            <span>Reviews</span>
          </button>
        </div>

        {/* Tab 1: About */}
        {activeTab === 'about' && (
          <div>
            <h2 className="doctor-section-heading">About {displayName}</h2>
            <p className="doctor-bio-text">{bio}</p>

            {/* Areas of Expertise */}
            <div className="doctor-expertise-box">
              <div className="doctor-expertise-heading">
                <SolarIcon name="medal-ribbons-star-bold" size={17} color="var(--color-gold-base)" />
                <span>Areas of Expertise</span>
              </div>
              <div className="doctor-expertise-tags">
                {expertiseTags.map((tag) => (
                  <div key={tag.label} className="doctor-expertise-pill">
                    <SolarIcon name={tag.icon} size={15} color="var(--color-gold-bronze)" />
                    <span>{tag.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Services */}
        {activeTab === 'services' && (
          <div style={{ marginBottom: '28px' }}>
            <h2 className="doctor-section-heading">Available Medical Services</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '28px' }}>
              <div className="doctor-service-block" style={{ padding: '16px' }}>
                <div className="doctor-service-icon-box">
                  <SolarIcon name="videocamera-linear" size={20} color="var(--color-chocolate-base)" />
                </div>
                <div>
                  <div className="doctor-service-title" style={{ fontSize: '0.95rem' }}>Video Telehealth Consultation</div>
                  <p className="doctor-service-status" style={{ fontSize: '0.8rem', lineHeight: 1.4, marginTop: '4px' }}>
                    Secure HD video appointment for diagnosis, treatment advice, and clinical guidance.
                  </p>
                </div>
              </div>

              <div className="doctor-service-block" style={{ padding: '16px' }}>
                <div className="doctor-service-icon-box">
                  <SolarIcon name="pill-linear" size={20} color="var(--color-chocolate-base)" />
                </div>
                <div>
                  <div className="doctor-service-title" style={{ fontSize: '0.95rem' }}>Digital Prescription Renewal</div>
                  <p className="doctor-service-status" style={{ fontSize: '0.8rem', lineHeight: 1.4, marginTop: '4px' }}>
                    Valid e-prescriptions with ICD-10 coding routed to your preferred pharmacy (Clicks, Dis-Chem).
                  </p>
                </div>
              </div>

              <div className="doctor-service-block" style={{ padding: '16px' }}>
                <div className="doctor-service-icon-box">
                  <SolarIcon name="document-text-linear" size={20} color="var(--color-chocolate-base)" />
                </div>
                <div>
                  <div className="doctor-service-title" style={{ fontSize: '0.95rem' }}>Medical Certificates / Sick Notes</div>
                  <p className="doctor-service-status" style={{ fontSize: '0.8rem', lineHeight: 1.4, marginTop: '4px' }}>
                    Legally compliant medical certificates issued after virtual clinical examination.
                  </p>
                </div>
              </div>

              <div className="doctor-service-block" style={{ padding: '16px' }}>
                <div className="doctor-service-icon-box">
                  <SolarIcon name="diploma-verified-linear" size={20} color="var(--color-chocolate-base)" />
                </div>
                <div>
                  <div className="doctor-service-title" style={{ fontSize: '0.95rem' }}>Specialist Referral Letters</div>
                  <p className="doctor-service-status" style={{ fontSize: '0.8rem', lineHeight: 1.4, marginTop: '4px' }}>
                    Comprehensive clinical referral documentation for specialized in-person medical care.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Patient Reviews & Ratings (Visible directly in About and Reviews tabs) */}
        <div className="doctor-reviews-section">
          <div className="doctor-reviews-header">
            <h2 className="doctor-reviews-title">
              <SolarIcon name="chat-round-line-linear" size={20} color="var(--color-gold-base)" />
              <span>Patient Reviews & Ratings</span>
            </h2>

            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className="doctor-reviews-view-all"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <span>{reviewsCount} Total Reviews</span>
              <SolarIcon name="arrow-right-linear" size={14} color="currentColor" />
            </button>
          </div>

          {/* Rating Summary Card (Hero score left, distribution bars right) */}
          <div className="doctor-rating-summary">
            {/* Left: Overall Score */}
            <div className="doctor-rating-hero-col">
              <div className="doctor-rating-hero-number">{ratingAvg.toFixed(1)}</div>
              <div className="doctor-rating-hero-stars">
                {[1, 2, 3, 4, 5].map((star) => (
                  <SolarIcon
                    key={star}
                    name="star-bold"
                    size={16}
                    color={star <= Math.round(ratingAvg) ? 'var(--color-gold-base)' : 'var(--color-rating-bar-empty)'}
                  />
                ))}
              </div>
              <div className="doctor-rating-hero-sub">Based on {reviewsCount} reviews</div>
            </div>

            {/* Right: Distribution Bars */}
            <div className="doctor-rating-distribution">
              {[5, 4, 3, 2, 1].map((stars) => {
                const bar = distribution[stars] || { percentage: 0, count: 0 };
                return (
                  <div key={stars} className="doctor-rating-bar-row">
                    <span className="doctor-rating-bar-star-num">
                      <span>{stars}</span>
                      <SolarIcon name="star-bold" size={12} color="var(--color-gold-base)" />
                    </span>

                    <div className="doctor-rating-bar-track">
                      <div
                        className="doctor-rating-bar-fill"
                        style={{ width: `${bar.percentage}%` }}
                      />
                    </div>

                    <span className="doctor-rating-bar-stat">
                      {bar.percentage}% ({bar.count})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Individual Patient Review Cards */}
          <div>
            {reviewsList.map((rev: any) => (
              <div key={rev.id} className="doctor-review-card">
                <div className="doctor-review-top">
                  <div className="doctor-review-author-info">
                    <div className="doctor-review-avatar">{rev.initial}</div>
                    <span className="doctor-review-author-name">{rev.author}</span>
                    <span className="doctor-verified-badge">
                      <SolarIcon name="check-circle-bold" size={11} color="currentColor" />
                      <span>Verified Patient</span>
                    </span>
                  </div>

                  <div className="doctor-review-stars">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <SolarIcon
                        key={s}
                        name="star-bold"
                        size={13}
                        color={s <= rev.rating ? 'var(--color-gold-base)' : 'var(--color-rating-bar-empty)'}
                      />
                    ))}
                  </div>
                </div>

                <p className="doctor-review-comment">"{rev.comment}"</p>
                <span className="doctor-review-date">Consulted in {rev.date}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
