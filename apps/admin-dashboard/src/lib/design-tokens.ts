/**
 * Design Tokens for White-Label Theming
 * Central configuration for colors, spacing, typography, and other design values
 */

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
}

export interface ThemeSpacing {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

export interface ThemeTypography {
  fontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
}

export interface ThemeBorderRadius {
  none: string;
  sm: string;
  md: string;
  lg: string;
  full: string;
}

export const defaultTheme = {
  colors: {
    primary: 'hsl(221.2 83.2% 53.3%)',
    secondary: 'hsl(210 40% 96.1%)',
    accent: 'hsl(262.1 83.3% 57.8%)',
    background: 'hsl(0 0% 100%)',
    foreground: 'hsl(222.2 84% 4.9%)',
    muted: 'hsl(210 40% 96.1%)',
    border: 'hsl(214.3 31.8% 91.4%)',
  },
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '3rem', // 48px
  },
  typography: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '1.875rem', // 30px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    full: '9999px',
  },
};

/**
 * Apply custom theme to CSS variables
 */
export function applyTheme(theme: Partial<typeof defaultTheme>) {
  const root = document.documentElement;

  // Merge with default theme
  const fullTheme = {
    ...defaultTheme,
    ...theme,
    colors: { ...defaultTheme.colors, ...theme.colors },
    spacing: { ...defaultTheme.spacing, ...theme.spacing },
    typography: {
      ...defaultTheme.typography,
      ...theme.typography,
      fontSize: {
        ...defaultTheme.typography.fontSize,
        ...theme.typography?.fontSize,
      },
      fontWeight: {
        ...defaultTheme.typography.fontWeight,
        ...theme.typography?.fontWeight,
      },
    },
    borderRadius: { ...defaultTheme.borderRadius, ...theme.borderRadius },
  };

  // Apply colors
  Object.entries(fullTheme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });

  // Apply spacing
  Object.entries(fullTheme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, value);
  });

  // Apply typography
  root.style.setProperty('--font-family', fullTheme.typography.fontFamily);
  Object.entries(fullTheme.typography.fontSize).forEach(([key, value]) => {
    root.style.setProperty(`--font-size-${key}`, value);
  });

  // Apply border radius
  Object.entries(fullTheme.borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--border-radius-${key}`, value);
  });
}

/**
 * Export CSS for white-label customization
 */
export function exportThemeCSS(theme: Partial<typeof defaultTheme>): string {
  const fullTheme = {
    ...defaultTheme,
    ...theme,
    colors: { ...defaultTheme.colors, ...theme.colors },
  };

  const cssVariables = [
    ':root {',
    ...Object.entries(fullTheme.colors).map(
      ([key, value]) => `  --color-${key}: ${value};`
    ),
    ...Object.entries(fullTheme.spacing).map(
      ([key, value]) => `  --spacing-${key}: ${value};`
    ),
    `  --font-family: ${fullTheme.typography.fontFamily};`,
    ...Object.entries(fullTheme.typography.fontSize).map(
      ([key, value]) => `  --font-size-${key}: ${value};`
    ),
    ...Object.entries(fullTheme.borderRadius).map(
      ([key, value]) => `  --border-radius-${key}: ${value};`
    ),
    '}',
  ];

  return cssVariables.join('\n');
}

