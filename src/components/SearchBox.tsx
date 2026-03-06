import React, { InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBoxProps extends InputHTMLAttributes<HTMLInputElement> {
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'text-xs px-2 py-1',
  md: 'text-sm px-3 py-2',
  lg: 'text-base px-4 py-2.5',
};

export function SearchBox({
  value,
  onChange,
  onClear,
  placeholder = 'Buscar...',
  size = 'md',
  className = '',
  ...props
}: SearchBoxProps) {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`${sizeStyles[size]} pl-10 pr-10 bg-surface-tertiary border-2 border-primary text-primary placeholder:text-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-normal w-full ${className}`}
        {...props}
      />
      {value && (
        <button
          onClick={() => {
            onChange?.('');
            onClear?.();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-state-hover text-primary transition-normal"
          title="Limpar busca"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
