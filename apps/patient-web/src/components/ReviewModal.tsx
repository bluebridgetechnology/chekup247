'use client';

import React, { useState } from 'react';
import { toastSuccess, toastError, errorMessage } from '../lib/toast';
import {
  Star,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HeartHandshake,
  MessageSquare,
} from 'lucide-react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  doctorName?: string;
  doctorSpecialty?: string;
  doctorAvatar?: string;
  token?: string | null;
  initialRating?: number;
  onReviewSubmitted?: (review: any) => void;
}

const RATING_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Poor', color: '#ef4444' },
  2: { label: 'Fair', color: '#f97316' },
  3: { label: 'Good', color: '#f59e0b' },
  4: { label: 'Very Good', color: '#10b981' },
  5: { label: 'Excellent!', color: '#059669' },
};

const FEEDBACK_TAGS = [
  'Punctual & attentive',
  'Clear explanation',
  'Compassionate care',
  'Thorough consultation',
  'Helpful treatment plan',
  'Prompt digital prescription',
];

export function ReviewModal({
  isOpen,
  onClose,
  bookingId,
  doctorName = 'Dr. Medical Practitioner',
  doctorSpecialty = 'General Practitioner',
  doctorAvatar,
  token,
  initialRating = 5,
  onReviewSubmitted,
}: ReviewModalProps) {
  const [rating, setRating] = useState<number>(initialRating);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Sync the star rating when the modal is (re)opened with a chosen initial value.
  React.useEffect(() => {
    if (isOpen) setRating(initialRating);
  }, [isOpen, initialRating]);

  if (!isOpen) return null;

  const activeRating = hoverRating !== null ? hoverRating : rating;
  const ratingInfo = RATING_LABELS[activeRating] || RATING_LABELS[5];

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      setErrorMsg('Please select a rating between 1 and 5 stars');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      // Combine selected tags with custom comment if tags were picked
      let finalComment = comment.trim();
      if (selectedTags.length > 0) {
        const tagsHeader = selectedTags.join(' • ');
        finalComment = finalComment
          ? `${tagsHeader}\n\n${finalComment}`
          : tagsHeader;
      }

      const API_BASE =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

      const res = await fetch(`${API_BASE}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          bookingId,
          rating,
          comment: finalComment || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to submit review');
      }

      const savedReview = await res.json();
      setIsSuccess(true);
      toastSuccess('Review submitted', 'Thank you for your feedback.');
      if (onReviewSubmitted) {
        onReviewSubmitted(savedReview);
      }
    } catch (err: any) {
      const msg = errorMessage(err, 'Unable to submit review. Please try again.');
      setErrorMsg(msg);
      toastError('Could not submit review', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          maxWidth: '520px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: '1px solid var(--color-slate-100)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'rgba(14, 147, 132, 0.1)',
                color: 'var(--color-brand-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <HeartHandshake size={22} />
            </div>
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.15rem',
                  fontWeight: 800,
                  color: 'var(--color-slate-900)',
                }}
              >
                Rate Your Consultation
              </h2>
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '0.8rem',
                  color: 'var(--color-slate-500)',
                }}
              >
                Your feedback helps us maintain exceptional clinical standards
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '6px',
              borderRadius: '8px',
              cursor: 'pointer',
              color: 'var(--color-slate-400)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        {isSuccess ? (
          <div
            style={{
              padding: '48px 32px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '18px',
              }}
            >
              <CheckCircle2 size={36} />
            </div>
            <h3
              style={{
                fontSize: '1.35rem',
                fontWeight: 800,
                color: 'var(--color-slate-900)',
                marginBottom: '8px',
              }}
            >
              Thank You for Your Review!
            </h3>
            <p
              style={{
                color: 'var(--color-slate-600)',
                fontSize: '0.925rem',
                lineHeight: 1.6,
                maxWidth: '380px',
                marginBottom: '28px',
              }}
            >
              Your rating has been recorded and synchronized to {doctorName}'s
              profile. We appreciate your honest feedback.
            </p>
            <button
              onClick={onClose}
              style={{
                background: 'var(--color-brand-600)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 32px',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
            {/* Doctor Info Card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '12px 16px',
                borderRadius: '14px',
                background: 'var(--color-slate-50)',
                border: '1px solid var(--color-slate-200)',
                marginBottom: '24px',
              }}
            >
              <img
                src={
                  doctorAvatar ||
                  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80'
                }
                alt={doctorName}
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  objectFit: 'cover',
                  border: '1px solid var(--color-slate-200)',
                }}
              />
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: 'var(--color-slate-900)',
                  }}
                >
                  {doctorName}
                </div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'var(--color-brand-700)',
                    fontWeight: 600,
                  }}
                >
                  {doctorSpecialty}
                </div>
              </div>
            </div>

            {/* Star Rating Interactive Selector */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--color-slate-600)',
                  marginBottom: '10px',
                }}
              >
                How would you rate your overall telehealth experience?
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                }}
              >
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isFilled = starValue <= activeRating;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setRating(starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        transition: 'transform 0.15s ease',
                        transform:
                          starValue === activeRating
                            ? 'scale(1.15)'
                            : 'scale(1)',
                      }}
                      aria-label={`${starValue} stars`}
                    >
                      <Star
                        size={34}
                        style={{
                          fill: isFilled ? '#f59e0b' : 'transparent',
                          color: isFilled ? '#f59e0b' : 'var(--color-slate-300)',
                          transition: 'all 0.15s ease',
                        }}
                      />
                    </button>
                  );
                })}
              </div>

              <div
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  color: ratingInfo.color,
                  letterSpacing: '0.02em',
                }}
              >
                {ratingInfo.label} ({activeRating} of 5 Stars)
              </div>
            </div>

            {/* Quick Feedback Tags */}
            <div style={{ marginBottom: '20px' }}>
              <div
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--color-slate-600)',
                  marginBottom: '8px',
                }}
              >
                What went well? (Optional)
              </div>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                {FEEDBACK_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        border: isSelected
                          ? '1px solid var(--color-brand-600)'
                          : '1px solid var(--color-slate-200)',
                        background: isSelected
                          ? 'rgba(14, 147, 132, 0.1)'
                          : 'var(--color-slate-50)',
                        color: isSelected
                          ? 'var(--color-brand-700)'
                          : 'var(--color-slate-600)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comment Textarea */}
            <div style={{ marginBottom: '24px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--color-slate-700)',
                  marginBottom: '6px',
                }}
              >
                Detailed Comments or Advice (Optional)
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts on the doctor's communication, diagnosis, and overall care..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-slate-200)',
                  fontSize: '0.88rem',
                  color: 'var(--color-slate-800)',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Error message */}
            {errorMsg && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626',
                  fontSize: '0.85rem',
                  marginBottom: '18px',
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid var(--color-slate-200)',
                  background: '#ffffff',
                  color: 'var(--color-slate-700)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--color-brand-600)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(14, 147, 132, 0.25)',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Review</span>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
