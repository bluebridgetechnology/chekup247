'use client';

import React from 'react';
import Link from 'next/link';
import { Star, ShieldCheck, Clock, MapPin, Calendar, ArrowRight } from 'lucide-react';

export interface DoctorCardProps {
  id: string;
  slug?: string;
  name: string;
  hpcsa_number: string;
  specialty: string;
  bio?: string;
  rate_per_hour: number;
  rating_avg: number;
  reviews_count?: number;
  facility_name?: string;
  facility_address?: string;
  photo_url?: string;
  next_available_slot?: string;
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
  photo_url,
  next_available_slot,
}: DoctorCardProps) {
  const profileUrl = `/doctors/${slug || id}`;
  const displayName = name.startsWith('Dr.') || name.startsWith('Dr ') ? name : `Dr. ${name}`;

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid var(--color-slate-200)',
        boxShadow: '0 4px 20px -2px rgba(15, 23, 42, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      }}
      className="doctor-card-hover"
    >
      {/* Top Banner / Avatar & Core Info */}
      <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
          {/* Avatar */}
          <div
            style={{
              position: 'relative',
              width: '72px',
              height: '72px',
              borderRadius: '16px',
              overflow: 'hidden',
              flexShrink: 0,
              background: 'linear-gradient(135deg, var(--color-brand-100) 0%, var(--color-brand-200) 100%)',
              border: '2px solid #ffffff',
              boxShadow: '0 4px 12px rgba(14, 147, 132, 0.15)',
            }}
          >
            {photo_url ? (
              <img
                src={photo_url}
                alt={displayName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : null}
            {/* Fallback Initials */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.25rem',
                color: 'var(--color-brand-700)',
                zIndex: 0,
              }}
            >
              {displayName.replace(/Dr\.?\s*/i, '').slice(0, 2).toUpperCase()}
            </div>
          </div>

          {/* Details */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <Link
                href={profileUrl}
                style={{
                  fontWeight: 700,
                  fontSize: '1.125rem',
                  color: 'var(--color-slate-900)',
                  textDecoration: 'none',
                  letterSpacing: '-0.02em',
                }}
              >
                {displayName}
              </Link>
            </div>

            <p
              style={{
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-brand-600)',
                marginTop: '2px',
              }}
            >
              {specialty}
            </p>

            {/* HPCSA Verified Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '6px',
                padding: '2px 8px',
                borderRadius: '9999px',
                background: 'rgba(14, 147, 132, 0.08)',
                color: 'var(--color-brand-700)',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={13} style={{ color: 'var(--color-brand-600)' }} />
              <span>HPCSA Verified • {hpcsa_number}</span>
            </div>
          </div>
        </div>

        {/* Rating & Location snippet */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid var(--color-slate-100)',
            fontSize: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Star size={15} style={{ fill: '#f59e0b', color: '#f59e0b' }} />
            <span style={{ fontWeight: 700, color: 'var(--color-slate-900)' }}>
              {Number(rating_avg).toFixed(1)}
            </span>
            <span style={{ color: 'var(--color-slate-500)' }}>
              ({reviews_count} {reviews_count === 1 ? 'review' : 'reviews'})
            </span>
          </div>

          {facility_name && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--color-slate-500)',
                maxWidth: '180px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={facility_name}
            >
              <MapPin size={13} style={{ flexShrink: 0, color: 'var(--color-slate-400)' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{facility_name}</span>
            </div>
          )}
        </div>

        {/* Bio summary */}
        {bio && (
          <p
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-slate-600)',
              lineHeight: 1.5,
              marginTop: '12px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {bio}
          </p>
        )}

        {/* Next Available Slot indicator */}
        <div
          style={{
            marginTop: 'auto',
            paddingTop: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            color: 'var(--color-slate-600)',
          }}
        >
          <Clock size={13} style={{ color: 'var(--color-brand-600)' }} />
          <span>Next slot:</span>
          <span style={{ fontWeight: 600, color: 'var(--color-slate-800)' }}>
            {next_available_slot || 'Available Tomorrow, 09:00'}
          </span>
        </div>
      </div>

      {/* Card Footer: Fee & Book CTA */}
      <div
        style={{
          background: 'var(--color-slate-50)',
          borderTop: '1px solid var(--color-slate-200)',
          padding: '14px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)', display: 'block' }}>
            Consultation Fee
          </span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
            <span
              style={{
                fontSize: '1.2rem',
                fontWeight: 800,
                color: 'var(--color-slate-900)',
                letterSpacing: '-0.02em',
              }}
            >
              R{Number(rate_per_hour).toFixed(2)}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>/ session</span>
          </div>
        </div>

        <Link
          href={profileUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '10px',
            background: 'var(--color-brand-600)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.875rem',
            textDecoration: 'none',
            boxShadow: '0 2px 6px rgba(14, 147, 132, 0.25)',
            transition: 'background 0.2s, transform 0.1s',
          }}
        >
          <span>Book Now</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}
