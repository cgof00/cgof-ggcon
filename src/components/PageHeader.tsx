import React, { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  rightContent?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  rightContent,
}: PageHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            {icon && <div className="text-primary">{icon}</div>}
            <h2 className="text-2xl sm:text-3xl font-bold text-primary">{title}</h2>
          </div>
          {subtitle && (
            <p className="mt-2 text-sm text-secondary">{subtitle}</p>
          )}
        </div>
        {rightContent}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-3 mt-4">
          {actions}
        </div>
      )}
    </div>
  );
}
