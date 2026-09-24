'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { SolarIcon } from './SolarIcon';

export interface DoctorCardProps {
  id: string;
  slug?: string;
  name: string;
  hpcsa_number?: string;
  specialty: string;
  bio?: string;
  rate_per_hour: number;
  rating_avg: number;
  reviews_count?: number;
  facility_name?: string;
  facility_address?: string;
  photo_url?: string;
  next_available_slot?: string;
  tags?: string[];
  experience_years?: number | string;
  offers_in_clinic?: boolean;
}

export function DoctorCard({
  id,
  slug,
  name,
  hpcsa_number,
  specialty,
  bio,
  rate_per_hour,
  rating_avg,
  reviews_count = 0,
  facility_name,
  facility_address,
  photo_url,
  next_available_slot,
  tags,
  experience_years,
  offers_in_clinic,
}: DoctorCardProps) {
  const profileUrl = `/doctors/${slug || id}`;
  const displayName = name.startsWith('Dr.') || name.startsWith('Dr ') ? name : `Dr. ${name}`;

  const [imgSrc, setImgSrc] = useState(photo_url || '');

  useEffect(() => {
    setImgSrc(photo_url || '');
  }, [photo_url]);

  const locationText = facility_address || facility_name;

  return (
    <div className="doctor-card" style={{ minWidth: 0, width: '100%' }}>
      <div style={{ minWidth: 0, width: '100%' }}>
        {/* Doctor Photograph with Floating Badges — strictly constrained height */}
        <div
          className="doctor-image-wrapper"
          style={{
            width: '100%',
            height: '220px',
            minHeight: '220px',
            maxHeight: '220px',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={displayName}
              onError={() => setImgSrc('')}
              style={{
                width: '100%',
                height: '100%',
                maxHeight: '100%',
                objectFit: 'cover',
                objectPosition: 'center 20%',
                display: 'block',
              }}
            />
          ) : (
            <div className="doctor-card-initials" aria-label={`${displayName} initials`}>
              {displayName.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
            </div>
          )}

          {/* Floating Availability Badge (Upper-Right) */}
          <div className="doctor-availability-badge">
            <span className="doctor-availability-dot" />
            <span>{next_available_slot || 'Availability not published'}</span>
          </div>

          {/* Floating Rating Badge (Lower-Left) */}
          <div className="doctor-rating-badge">
            <SolarIcon name="star-bold" size={13} color="var(--color-gold-primary)" />
            <span>{rating_avg ? Number(rating_avg).toFixed(1) : 'No rating'}</span>
            <span style={{ color: 'var(--color-chocolate-muted)', fontWeight: 500 }}>
              ({reviews_count})
            </span>
          </div>
        </div>

        {/* Doctor Identity Area */}
        <div style={{ marginBottom: '10px' }}>
          {/* Name, Specialty & HPCSA Verification */}
          <div>
            <h3
              style={{
                fontFamily: 'var(--font-heading), sans-serif',
                fontSize: '1.125rem',
                fontWeight: 600,
                color: 'var(--color-chocolate-base)',
                marginBottom: '2px',
                lineHeight: 1.25,
              }}
            >
              <Link href={profileUrl} style={{ color: 'inherit', textDecoration: 'none' }}>
                {displayName}
              </Link>
            </h3>

            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                color: 'var(--color-gold-base)',
                marginBottom: '4px',
              }}
            >
              {specialty}
            </p>

            {hpcsa_number && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--color-gold-pale)',
                  color: 'var(--color-chocolate-mid)',
                  border: '1px solid rgba(223, 171, 98, 0.25)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                <SolarIcon name="shield-check-linear" size={12} color="var(--color-gold-bronze)" />
                <span>HPCSA • {hpcsa_number}</span>
              </span>
            )}
          </div>
        </div>

        {/* Experience Row */}
        {experience_years !== undefined && experience_years !== null && experience_years !== '' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8125rem',
              color: 'var(--color-chocolate-muted)',
              marginBottom: locationText ? '6px' : '10px',
            }}
          >
            <SolarIcon name="diploma-verified-linear" size={14} color="var(--color-gold-base)" />
            <span>
              {typeof experience_years === 'number'
                ? `${experience_years}+ yrs experience`
                : experience_years.toString().includes('exp')
                ? experience_years
                : `${experience_years} experience`}
            </span>
          </div>
        )}

        {/* In-Clinic Physical Location Row (ONLY shown if doctor offers In-Clinic visits) */}
        {offers_in_clinic && locationText && !locationText.includes('yrs exp') && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8125rem',
              color: 'var(--color-chocolate-muted)',
              marginBottom: '10px',
              minWidth: 0,
              width: '100%',
              overflow: 'hidden',
            }}
          >
            <SolarIcon name="map-point-linear" size={14} color="var(--color-gold-base)" style={{ flexShrink: 0 }} />
            <span
              title={`In-Clinic: ${locationText}`}
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
                flex: 1,
              }}
            >
              In-Clinic: {locationText}
            </span>
          </div>
        )}

        {/* Specialty Tags */}
        {tags && tags.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              marginBottom: '10px',
            }}
          >
            {tags.map((tag, idx) => (
              <span key={idx} className="doctor-tag">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Bio summary snippet (when tags not present) */}
        {bio && (!tags || tags.length === 0) && (
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8125rem',
              color: 'var(--color-chocolate-muted)',
              lineHeight: 1.45,
              marginBottom: '12px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {bio}
          </p>
        )}
      </div>

      {/* Card Footer: Fee Callout & Booking Actions */}
      <div style={{ minWidth: 0, width: '100%' }}>
        {/* Consultation Fee Callout in bold chocolate text */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            paddingTop: '12px',
            borderTop: '1px solid var(--color-gold-border)',
            marginBottom: '12px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.75rem',
              color: 'var(--color-chocolate-muted)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Consultation Fee
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--color-chocolate-base)',
                letterSpacing: '-0.02em',
              }}
            >
              R{Number(rate_per_hour).toFixed(0)}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.75rem',
                color: 'var(--color-chocolate-muted)',
              }}
            >
              / session
            </span>
          </div>
        </div>

        {/* Booking Actions */}
        <div className="doctor-booking-actions" style={{ marginTop: 0 }}>
          <Link href={profileUrl} className="doctor-book-btn touch-target">
            <span>Book Consultation</span>
            <SolarIcon name="calendar-linear" size={16} color="var(--color-gold-base)" />
          </Link>

          <Link
            href={profileUrl}
            aria-label={`View profile for ${displayName}`}
            className="doctor-arrow-btn touch-target"
          >
            <SolarIcon name="arrow-right-linear" size={18} color="var(--color-chocolate-base)" />
          </Link>
        </div>
      </div>
    </div>
  );
}
