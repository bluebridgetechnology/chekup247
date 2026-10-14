'use client';

import React, { useState } from 'react';
import { toastSuccess, toastError, errorMessage } from '../lib/toast';
import '../styles/review-modal.css';
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

const RATING_LABELS: Record<number, { label: string }> = {
  1: { label: 'Poor' },
  2: { label: 'Fair' },
  3: { label: 'Good' },
  4: { label: 'Very good' },
  5: { label: 'Excellent!' },
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
  const [avatarFailed, setAvatarFailed] = useState<boolean>(false);

  // Sync the star rating when the modal is (re)opened with a chosen initial value.
  React.useEffect(() => {
    if (isOpen) setRating(initialRating);
  }, [isOpen, initialRating]);

  // While open: stop the page behind from scrolling, and let Escape close the dialog.
  React.useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

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

  const initials =
    doctorName
      .replace(/^(dr|prof)\.?\s+/i, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'DR';

  return (
    <div
      className="rm-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rm-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {isSuccess ? (
        <div className="rm-sheet">
          <div className="rm-header">
            <span className="rm-header-icon">
              <HeartHandshake size={22} />
            </span>
            <div className="rm-header-text">
              <h2 className="rm-title" id="rm-title">
                Thank you
              </h2>
            </div>
            <button type="button" className="rm-close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <div className="rm-success">
            <span className="rm-success-icon">
              <CheckCircle2 size={36} />
            </span>
            <h3 className="rm-title">Thank you for your review!</h3>
            <p>
              Your rating has been recorded and added to {doctorName}&apos;s profile. We appreciate your honest feedback.
            </p>
            <button type="button" className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <form className="rm-sheet" onSubmit={handleSubmit}>
          <div className="rm-header">
            <span className="rm-header-icon">
              <HeartHandshake size={22} />
            </span>
            <div className="rm-header-text">
              <h2 className="rm-title" id="rm-title">
                Rate your consultation
              </h2>
              <p className="rm-sub">Your feedback helps us keep clinical standards high.</p>
            </div>
            <button type="button" className="rm-close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>

          <div className="rm-body">
            <div className="rm-doctor">
              <div className="rm-avatar">
                {doctorAvatar && !avatarFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={doctorAvatar} alt={doctorName} referrerPolicy="no-referrer" onError={() => setAvatarFailed(true)} />
                ) : (
                  <span className="rm-initials" role="img" aria-label={doctorName}>
                    {initials}
                  </span>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="rm-doctor-name">{doctorName}</div>
                <div className="rm-doctor-spec">{doctorSpecialty}</div>
              </div>
            </div>

            <div>
              <p className="rm-question">How would you rate your overall telehealth experience?</p>
              <div className="rm-stars" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((starValue) => (
                  <button
                    key={starValue}
                    type="button"
                    role="radio"
                    aria-checked={rating === starValue}
                    className={`rm-star${starValue <= activeRating ? ' is-on' : ''}${starValue === activeRating ? ' is-active' : ''}`}
                    onClick={() => setRating(starValue)}
                    onMouseEnter={() => setHoverRating(starValue)}
                    onMouseLeave={() => setHoverRating(null)}
                    aria-label={`${starValue} ${starValue === 1 ? 'star' : 'stars'}`}
                  >
                    <Star size={34} />
                  </button>
                ))}
              </div>
              <div className="rm-rating-label" aria-live="polite">
                {ratingInfo.label} ({activeRating} of 5 stars)
              </div>
            </div>

            <div>
              <p className="rm-label">
                What went well? <span>(optional)</span>
              </p>
              <div className="rm-tags">
                {FEEDBACK_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className={`rm-tag${selectedTags.includes(tag) ? ' is-on' : ''}`}
                    aria-pressed={selectedTags.includes(tag)}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="rm-label" htmlFor="rm-comment">
                Comments or advice <span>(optional)</span>
              </label>
              <textarea
                id="rm-comment"
                className="rm-textarea"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your thoughts on the doctor's communication, diagnosis and overall care…"
              />
            </div>

            {errorMsg && (
              <div className="rm-error" role="alert">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <div className="rm-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Submitting…</span>
                </>
              ) : (
                <span>Submit review</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
