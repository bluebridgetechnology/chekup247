import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.875rem',
        color: 'var(--color-slate-500)',
        marginBottom: '24px',
      }}
    >
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: 'var(--color-slate-600)',
          textDecoration: 'none',
        }}
      >
        <Home size={14} />
        <span>Home</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={index}>
            <ChevronRight size={14} style={{ color: 'var(--color-slate-400)' }} />
            {isLast || !item.href ? (
              <span style={{ color: 'var(--color-brand-700)', fontWeight: 600 }}>
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                style={{ color: 'var(--color-slate-600)', textDecoration: 'none' }}
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
