// tailwind.config.js - Configuração customizada com design system

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores semânticas do design system
        primary: {
          DEFAULT: '#AE1E25',
          light: '#DC2626',
          dark: '#7F1D1D',
        },
        surface: {
          primary: '#000000',
          secondary: '#1F1F1F',
          tertiary: '#FFFFFF',
        },
        text: {
          primary: '#000000',
          secondary: '#4B5563',
          inverse: '#FFFFFF',
          brand: '#AE1E25',
        },
        border: {
          DEFAULT: '#000000',
          light: '#E5E7EB',
        },
        feedback: {
          success: '#10B981',
          warning: '#F59E0B',
          error: '#EF4444',
          info: '#3B82F6',
        },
        state: {
          hover: 'rgba(174, 30, 37, 0.1)',
          active: 'rgba(174, 30, 37, 0.2)',
          disabled: '#D1D5DB',
        },
      },
      spacing: {
        xs: '0.25rem',  // 4px
        sm: '0.5rem',   // 8px
        md: '1rem',     // 16px
        lg: '1.5rem',   // 24px
        xl: '2rem',     // 32px
        '2xl': '3rem',  // 48px
        '3xl': '4rem',  // 64px
      },
      fontSize: {
        xs: ['0.75rem', '1.2'],     // 12px
        sm: ['0.875rem', '1.5'],    // 14px
        base: ['1rem', '1.5'],      // 16px
        lg: ['1.125rem', '1.75'],   // 18px
        xl: ['1.25rem', '1.75'],    // 20px
        '2xl': ['1.5rem', '1.75'],  // 24px
        '3xl': ['1.875rem', '1.75'], // 30px
        '4xl': ['2.25rem', '1.75'],  // 36px
      },
      fontWeight: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      borderRadius: {
        sm: '0.375rem',   // 6px
        md: '0.5rem',     // 8px
        lg: '1rem',       // 16px
        xl: '1.5rem',     // 24px
        full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
      zIndex: {
        sticky: '10',
        dropdown: '20',
        modal: '30',
        tooltip: '40',
      },
      borderWidth: {
        brand: '2px',
      },
    },
  },
  plugins: [],
};
