'use client';

import React from 'react';
import Link from 'next/link';
import { QUICK_BOOK_ONLY } from '../lib/featureFlags';
import { openQuickBook } from '../lib/quickBook';

interface BookingLinkProps {
  /** Where the link goes in the normal (directory) booking flow. */
  href: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
  'aria-label'?: string;
  title?: string;
  /** Render a div (instead of a button) when the content has block children such as headings. */
  block?: boolean;
  /** Called after a Quick Book click, e.g. to close a menu. */
  onActivate?: () => void;
}

/**
 * A booking call to action. Normally a link to `href`; while QUICK_BOOK_ONLY is on it opens the
 * Quick Book widget instead, so every marketing/booking button routes to the same place.
 */
export function BookingLink({ href, className, style, children, block, onActivate, ...aria }: BookingLinkProps) {
  if (!QUICK_BOOK_ONLY) {
    return (
      <Link href={href} className={className} style={style} {...aria}>
        {children}
      </Link>
    );
  }
  const activate = () => {
    onActivate?.();
    openQuickBook();
  };
  if (block) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={`booking-link-btn ${className || ''}`}
        style={{ cursor: 'pointer', ...style }}
        onClick={activate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            activate();
          }
        }}
        {...aria}
      >
        {children}
      </div>
    );
  }
  return (
    <button type="button" className={`booking-link-btn ${className || ''}`} style={style} onClick={activate} {...aria}>
      {children}
    </button>
  );
}
