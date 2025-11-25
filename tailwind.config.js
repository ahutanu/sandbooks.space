/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'JetBrains Mono Variable',
          'SF Mono',
          'Menlo',
          'Monaco',
          'Courier New',
          'monospace',
        ],
        mono: [
          'JetBrains Mono Variable',
          'SF Mono',
          'Menlo',
          'Monaco',
          'Courier New',
          'monospace',
        ],
      },
      colors: {
        stone: {
          '50': '#FAFAF9',
          '100': '#F5F5F4',
          '200': '#E7E5E4',
          '300': '#D6D3D1',
          '400': '#A8A29E',
          '500': '#78716C',
          '700': '#44403C',
          '800': '#292524',
          '900': '#1C1917',
          '950': '#0C0A09',
        },
        // Keep slate for syntax highlighting
        slate: {
          '50': '#f8fafc',
          '100': '#f1f5f9',
          '200': '#e2e8f0',
          '300': '#cbd5e1',
          '400': '#94a3b8',
          '500': '#64748b',
          '600': '#475569',
          '700': '#334155',
          '800': '#1e293b',
          '900': '#0f172a',
          '950': '#020617',
        },
      },
      borderRadius: {
        'lg': '0.5rem',    // 8px
        'xl': '0.75rem',   // 12px
        '2xl': '1rem',     // 16px
        '3xl': '1.5rem',   // 24px
      },
      boxShadow: {
        // Elevation system with layered shadows
        'elevation-1': '0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.06)',
        'elevation-2': '0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 4px 6px -1px rgba(0, 0, 0, 0.08)',
        'elevation-3': '0 4px 6px -2px rgba(0, 0, 0, 0.08), 0 8px 12px -4px rgba(0, 0, 0, 0.10)',
        'elevation-4': '0 8px 16px -4px rgba(0, 0, 0, 0.10), 0 16px 24px -8px rgba(0, 0, 0, 0.12)',
        'elevation-5': '0 16px 32px -8px rgba(0, 0, 0, 0.12), 0 24px 48px -12px rgba(0, 0, 0, 0.14)',
        // Code block inner glow
        'code-block': '0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 4px 6px -1px rgba(0, 0, 0, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        // Legacy aliases
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 1px 3px 0 rgba(0, 0, 0, 0.06)',
        'md': '0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 4px 6px -1px rgba(0, 0, 0, 0.08)',
        'lg': '0 4px 6px -2px rgba(0, 0, 0, 0.08), 0 8px 12px -4px rgba(0, 0, 0, 0.10)',
        'xl': '0 8px 16px -4px rgba(0, 0, 0, 0.10), 0 16px 24px -8px rgba(0, 0, 0, 0.12)',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      fontSize: {
        'xs': ['0.6875rem', { lineHeight: '1.3', letterSpacing: '0' }],          // 11px, 1.3 line-height (was 10px) - WCAG minimum
        'sm': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0' }],            // 12px, 1.4 line-height (was 11px) - UI labels
        'base': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0' }],         // 14px, 1.5 line-height (was 13px) - Body/code text
        'lg': ['1rem', { lineHeight: '1.5', letterSpacing: '0' }],               // 16px, 1.5 line-height (was 15px) - Primary text
        'xl': ['1.125rem', { lineHeight: '1.5', letterSpacing: '0' }],           // 18px, 1.5 line-height (was 16px) - Large text
        '2xl': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.02em' }],      // 24px, 1.3 line-height (was 20px) - Headings
        '3xl': ['1.875rem', { lineHeight: '1.3', letterSpacing: '-0.02em' }],    // 30px, 1.3 line-height (was 24px) - Large headings
        '4xl': ['2.25rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],     // 36px, 1.2 line-height (was 29px) - XL headings
        '5xl': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],        // 48px, 1.2 line-height (was 39px) - Hero text
      },
      letterSpacing: {
        tighter: '-0.04em',
        tight: '-0.02em',
        normal: '-0.01em', // Slight negative tracking for Mono UI to feel more cohesive
        wide: '0.02em',
        wider: '0.05em',
        widest: '0.1em',
      },
      lineHeight: {
        'tight': '1.2',      // Headings, compact UI (user's default)
        'snug': '1.3',       // Lists, navigation, cards
        'normal': '1.5',     // Body text (WCAG AAA compliant)
        'relaxed': '1.65',   // Optional looser spacing
        'loose': '1.8',      // Extra spacing
      },
      transitionDuration: {
        // Liquid Glass Motion Scale
        'instant': '75ms',     // Focus rings, icon swaps
        'fast': '100ms',       // Menu item hovers
        'normal': '150ms',     // Button states
        'moderate': '200ms',   // Dropdowns, popovers
        'slow': '300ms',       // Modals, panels
        'deliberate': '400ms', // Full-screen transitions
        // Legacy numeric (keep for compatibility)
        '150': '150ms',
        '200': '200ms',
        '300': '300ms',
      },
      transitionTimingFunction: {
        // Fluid interface curves
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',      // Gentle bounce - feels organic
        'spring-snappy': 'cubic-bezier(0.5, 1.8, 0.9, 0.8)', // Pronounced bounce
        'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',   // Smooth deceleration
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',        // Elegant deceleration for enters
        'in-expo': 'cubic-bezier(0.4, 0, 1, 1)',            // Quick exit acceleration
        'bounce': 'cubic-bezier(0.34, 1.8, 0.64, 1)',       // Success feedback
        // Legacy (keep for compatibility)
        'out': 'cubic-bezier(0, 0, 0.2, 1)',
        'in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
        // Alias for Tailwind ease-* classes
        'ease-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeInSlideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(16, 185, 129, 0.4), 0 0 40px rgba(16, 185, 129, 0.2)'
          },
          '50%': {
            boxShadow: '0 0 30px rgba(16, 185, 129, 0.6), 0 0 60px rgba(16, 185, 129, 0.3)'
          },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        // Sidebar active indicator slide-in with bounce
        slideInFromLeft: {
          '0%': { transform: 'translateX(-100%) translateY(-50%)', opacity: '0' },
          '60%': { transform: 'translateX(10%) translateY(-50%)', opacity: '1' },
          '100%': { transform: 'translateX(0) translateY(-50%)', opacity: '1' },
        },
        // Content cross-fade with subtle lift
        contentFadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Execution pulse glow
        executionPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.5)' },
          '50%': { boxShadow: '0 0 0 6px rgba(16, 185, 129, 0)' },
        },
        // Success checkmark pop
        successPop: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.2)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        // Terminal reconnect bounce
        retryBounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
        // Sidebar note delete exit animation
        fadeOutSlideLeft: {
          '0%': { opacity: '1', transform: 'translateX(0)' },
          '100%': { opacity: '0', transform: 'translateX(-20px)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',      // Spring physics
        slideInLeft: 'slideInLeft 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        scaleIn: 'scaleIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        fadeInSlideUp: 'fadeInSlideUp 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        pulseGlow: 'pulseGlow 1.5s smooth infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        // New expressive animations
        slideInFromLeft: 'slideInFromLeft 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        contentFadeIn: 'contentFadeIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        executionPulse: 'executionPulse 1.5s ease-out infinite',
        successPop: 'successPop 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        retryBounce: 'retryBounce 600ms ease-in-out infinite',
        fadeOutSlideLeft: 'fadeOutSlideLeft 200ms ease-out forwards',
      },
    },
  },
  plugins: [
    function ({ addComponents }) {
      addComponents({
        '.prose': {
          '@apply text-stone-800 dark:text-stone-200 leading-normal bg-transparent': {}, // 1.5 line height (WCAG AAA compliant), transparent to inherit parent bg
          fontFamily: '"JetBrains Mono Variable", "SF Mono", "Menlo", "Monaco", "Courier New", monospace',
        },
        '.prose h1': {
          '@apply text-4xl font-bold text-stone-950 dark:text-stone-50 mt-12 mb-6 leading-tight tracking-tight': {},
        },
        '.prose h2': {
          '@apply text-3xl font-bold text-stone-950 dark:text-stone-50 mt-10 mb-5 leading-tight tracking-tight': {},
        },
        '.prose h3': {
          '@apply text-2xl font-semibold text-stone-800 dark:text-stone-100 mt-8 mb-4 leading-snug': {},
        },
        '.prose p': {
          '@apply text-stone-800 dark:text-stone-200 mb-6 leading-normal': {}, // 1.5 for comfortable reading (WCAG AAA)
        },
        '.prose ul': {
          '@apply list-disc list-outside ml-6 space-y-2 mb-6': {}, // list-outside for proper nesting, ml-6 for indentation
        },
        '.prose ol': {
          '@apply list-decimal list-outside ml-6 space-y-2 mb-6': {}, // list-outside for proper nesting, ml-6 for indentation
        },
        '.prose li': {
          '@apply text-stone-800 dark:text-stone-200 pl-2 leading-snug': {}, // 1.3 line-height for compact lists, pl-2 for space after bullet
        },
        '.prose ul ul, .prose ol ul': {
          '@apply mt-2 mb-0 ml-5': {}, // Nested unordered lists - tighter spacing, more indentation
        },
        '.prose ul ol, .prose ol ol': {
          '@apply mt-2 mb-0 ml-5': {}, // Nested ordered lists - tighter spacing, more indentation
        },
        '.prose a': {
          '@apply text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline transition-colors duration-200': {},
        },
        '.prose code': {
          '@apply bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 px-2 py-1 rounded-md text-sm font-mono font-medium': {},
        },
        '.prose blockquote': {
          '@apply border-l-4 border-stone-300 dark:border-stone-600 pl-6 italic text-stone-700 dark:text-stone-300 my-6': {},
        },
        '.prose strong': {
          '@apply font-semibold text-stone-900 dark:text-stone-50': {},
        },
        '.prose em': {
          '@apply italic text-stone-800 dark:text-stone-200': {},
        },
        // Removed - ExecutableCodeBlock handles its own styling with .hljs CSS
        // '.prose pre': {},
        '.prose hr': {
          '@apply border-stone-200 dark:border-stone-700 my-8': {},
        },
        '.prose table': {
          '@apply w-full border-collapse my-6': {},
        },
        '.prose th': {
          '@apply bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-4 py-3 text-left font-semibold': {},
        },
        '.prose td': {
          '@apply border border-stone-200 dark:border-stone-700 px-4 py-3': {},
        },
        '.prose img': {
          '@apply rounded-xl my-6 max-w-full h-auto shadow-elevation-2': {},
        },
        '.prose mark': {
          '@apply bg-yellow-100 dark:bg-yellow-900/40 px-1 rounded-sm': {},
        },
        '.prose u': {
          '@apply underline decoration-stone-400 dark:decoration-stone-600': {},
        },
      });
    },
  ],
}
