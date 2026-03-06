import React, { ReactNode } from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'brand';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: ReactNode;
  removable?: boolean;
  onRemove?: () => void;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-900 border-slate-300',
  success: 'bg-green-100 text-green-900 border-green-300',
  warning: 'bg-yellow-100 text-yellow-900 border-yellow-300',
  error: 'bg-red-100 text-red-900 border-red-300',
  info: 'bg-blue-100 text-blue-900 border-blue-300',
  brand: 'bg-primary text-inverse border-primary',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-3 py-1.5',
  lg: 'text-base px-4 py-2',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  icon,
  removable = false,
  onRemove,
}: BadgeProps) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold border rounded-full ${variantStyles[variant]} ${sizeStyles[size]}`}>
      {icon && <span>{icon}</span>}
      <span>{children}</span>
      {removable && (
        <button
          onClick={onRemove}
          className="ml-2 p-0.5 rounded-full hover:opacity-75 transition-normal"
          aria-label="Remover"
        >
          ✕
        </button>
      )}
    </span>
  );
}
