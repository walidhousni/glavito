'use client';

import React from 'react';
import { Link } from '@/i18n.config';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface DocsBreadcrumbProps {
  items: BreadcrumbItem[];
}

export function DocsBreadcrumb({ items }: DocsBreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400 mb-4">
      <Link href="/docs" className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
        <Home className="w-4 h-4" />
      </Link>
      {items.map((item, index) => (
        <React.Fragment key={index}>
          <ChevronRight className="w-4 h-4" />
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-900 dark:text-slate-100 font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

