import React, { ReactNode } from 'react';

interface ActionBarProps {
  children: ReactNode;
  align?: 'left' | 'center' | 'right' | 'between';
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  wrap?: boolean;
  className?: string;
}

const alignStyles = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  between: 'justify-between',
};

const gapStyles = {
  xs: 'gap-2',
  sm: 'gap-3',
  md: 'gap-4',
  lg: 'gap-6',
};

export function ActionBar({
  children,
  align = 'between',
  gap = 'sm',
  wrap = true,
  className = '',
}: ActionBarProps) {
  const wrapClass = wrap ? 'flex-wrap' : '';
  
  return (
    <div className={`flex items-center ${alignStyles[align]} ${gapStyles[gap]} ${wrapClass} ${className}`}>
      {children}
    </div>
  );
}
