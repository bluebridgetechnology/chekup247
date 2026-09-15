export const tokens = {
  colors: {
    brand: {
      50: '#e6f7f5',
      100: '#c2ece7',
      200: '#93ded4',
      300: '#57c7bc',
      400: '#2baea1',
      500: '#0e9384',
      600: '#0b7b6e',
      700: '#0b6259',
      800: '#0e4e47',
      900: '#10413c',
    },
    slate: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    },
    feedback: {
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#0ea5e9',
    },
  },
  fonts: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    heading: "'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  radii: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    full: '9999px',
  },
} as const;

export type DesignTokens = typeof tokens;
