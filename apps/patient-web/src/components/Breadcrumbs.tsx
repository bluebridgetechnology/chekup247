'use client';

import React from 'react';
import Link from 'next/link';
import { SolarIcon } from './SolarIcon';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="doctor-breadcrumb-nav">
      <Link href="/" className="doctor-breadcrumb-link">
        <SolarIcon name="home-2-linear" size={15} color="currentColor" />
        <span>Home</span>
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={index}>
            <span className="doctor-breadcrumb-sep">
              <SolarIcon name="alt-arrow-right-linear" size={12} color="currentColor" />
            </span>
            {isLast || !item.href ? (
              <span className="doctor-breadcrumb-current">{item.label}</span>
            ) : (
              <Link href={item.href} className="doctor-breadcrumb-link">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
