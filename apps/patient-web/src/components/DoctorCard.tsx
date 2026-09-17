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
}

const DEFAULT_DOCTOR_IMAGES = [
  '/images/doctor_thabo.jpg',
  '/images/doctor_sarah.jpg',
  '/images/doctor_kevin.jpg',
];

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
}: DoctorCardProps) {
  const profileUrl = `/doctors/${slug || id}`;
  const displayName = name.startsWith('Dr.') || name.startsWith('Dr ') ? name : `Dr. ${name}`;

  // Extract initials for the avatar circle
  const cleanName = displayName.replace(/^Dr\.?\s*/i, '').trim();
  const nameParts = cleanName.split(/\s+/).filter(Boolean);
  const initials =
    nameParts.length >= 2
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : cleanName.slice(0, 2).toUpperCase() || 'DR';

  // Fallback image selection based on id or name
  const fallbackIndex = Math.abs(
    (id || displayName).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  ) % DEFAULT_DOCTOR_IMAGES.length;
  const fallbackImg = DEFAULT_DOCTOR_IMAGES[fallbackIndex];

  const [imgSrc, setImgSrc] = useState(photo_url || fallbackImg);

  useEffect(() => {
    if (photo_url) {
      setImgSrc(photo_url);
    }
  }, [photo_url]);

  const locationText = facility_address || facility_name;

  return (
    <div className="doctor-card">
      <div>
        {/* Doctor Photograph with Floating Badges */}
        <div className="doctor-image-wrapper">
          <img
            src={imgSrc}
            alt={displayName}
            onError={() => {
              if (imgSrc !== fallbackImg) {
                setImgSrc(fallbackImg);
              }
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />

          {/* Floating Availability Badge (Upper-Right) */}
          <div className="doctor-availability-badge">
            <span className="doctor-availability-dot" />
            <span>{next_available_slot || 'Available today'}</span>
          </div>

          {/* Floating Rating Badge (Lower-Left) */}
          <div className="doctor-rating-badge">
            <SolarIcon name="star-bold" size={13} color="var(--color-gold-primary)" />
            <span>{Number(rating_avg).toFixed(1)}</span>
            <span style={{ color: 'var(--color-chocolate-muted)', fontWeight: 500 }}>
              ({reviews_count})
            </span>
          </div>
        </div>

        {/* Doctor Identity Area */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '10px',
          }}
        >
          {/* Initials Badge */}
          <div className="doctor-avatar-circle">
            <span>{initials}</span>
          </div>

          {/* Name, Specialty & HPCSA Verification */}
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3
              style={{
                fontFamily: 'var(--font-heading), sans-serif',
                fontSize: '1.125rem',
                fontWeight: 700,
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

        {/* Location Row */}
        {locationText && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8125rem',
              color: 'var(--color-chocolate-muted)',
              marginBottom: '10px',
            }}
          >
            <SolarIcon name="map-point-linear" size={14} color="var(--color-gold-base)" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {locationText}
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
      <div>
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
