import React, { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'sm' | 'md' | 'lg';
}

const maxWidthStyles = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'w-full',
};

const paddingStyles = {
  sm: 'px-4 py-4',
  md: 'px-4 sm:px-6 lg:px-8 py-6',
  lg: 'px-4 sm:px-6 lg:px-8 py-8',
};

export function Layout({
  children,
  maxWidth = 'full',
  padding = 'md',
}: LayoutProps) {
  return (
    <main className={`${paddingStyles[padding]}`}>
      <div className={`mx-auto ${maxWidthStyles[maxWidth]}`}>
        {children}
      </div>
    </main>
  );
}
