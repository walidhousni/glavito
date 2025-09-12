"use client";

import * as React from "react";
import { useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
  attribute?: string;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  systemTheme: "light" | "dark";
  brand?: {
    name?: string;
    logoUrl?: string;
    faviconUrl?: string;
    colors?: { primary?: string; secondary?: string };
    customCSS?: string;
  };
  applyBranding: (branding: ThemeProviderState['brand']) => void;
  refreshBranding: () => Promise<void>;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  toggleTheme: () => null,
  systemTheme: "light",
  applyBranding: () => null,
  refreshBranding: async () => Promise.resolve(),
};

const ThemeProviderContext = React.createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
  attribute = "class",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const [brand, setBrand] = useState<ThemeProviderState['brand']>();

  useEffect(() => {
    const root = window.document.documentElement;
    if (attribute === "class") {
      root.classList.remove("light", "dark");

      if (theme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
        root.classList.add(systemTheme);
        setSystemTheme(systemTheme);
      } else {
        root.classList.add(theme);
        setSystemTheme(theme === "dark" ? "dark" : "light");
      }
    }
  }, [theme, attribute]);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem(storageKey) as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    // Helpers for color parsing and application
    const hexToHsl = (hex: string): { h: number; s: number; l: number } | null => {
      const normalized = hex.trim().replace('#', '');
      if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)) return null;
      const full = normalized.length === 3
        ? normalized.split('').map((c) => c + c).join('')
        : normalized;
      const r = parseInt(full.substring(0, 2), 16) / 255;
      const g = parseInt(full.substring(2, 4), 16) / 255;
      const b = parseInt(full.substring(4, 6), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
    };

    const parseToHslParams = (val?: string): string | null => {
      if (!val) return null;
      const v = val.trim();
      // Already in "H S% L%" form
      if (/^\d+\s+\d+%\s+\d+%$/.test(v)) return v;
      // hsl(H, S%, L%)
      const hslMatch = v.match(/^hsl\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)$/i);
      if (hslMatch) return `${hslMatch[1]} ${hslMatch[2]}% ${hslMatch[3]}%`;
      // hex
      if (v.startsWith('#')) {
        const hsl = hexToHsl(v);
        if (hsl) return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
      }
      return null;
    };

    const applyBrandingInternal = (data: any) => {
      setBrand(data);
      const root = window.document.documentElement;
      const primary = parseToHslParams(data?.colors?.primary);
      const secondary = parseToHslParams(data?.colors?.secondary);
      if (primary) {
        root.style.setProperty('--primary', primary);
        // derive foreground based on lightness
        const l = parseInt(primary.split(' ')[2].replace('%',''), 10);
        const foreground = l > 55 ? '222.2 84% 4.9%' : '210 40% 98%';
        root.style.setProperty('--primary-foreground', foreground);
      }
      if (secondary) {
        root.style.setProperty('--secondary', secondary);
        const l2 = parseInt(secondary.split(' ')[2].replace('%',''), 10);
        const fg2 = l2 > 55 ? '222.2 84% 4.9%' : '210 40% 98%';
        root.style.setProperty('--secondary-foreground', fg2);
        // use secondary as accent if accent not explicitly themed
        root.style.setProperty('--accent', secondary);
        root.style.setProperty('--accent-foreground', fg2);
      }
      // inject custom CSS (replace previous)
      const existingStyle = document.querySelector("style[data-tenant-css='true']");
      if (existingStyle?.parentNode) existingStyle.parentNode.removeChild(existingStyle);
      if (data?.customCSS) {
        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-tenant-css', 'true');
        styleEl.innerHTML = data.customCSS;
        document.head.appendChild(styleEl);
      }
      // set favicon
      if (data?.faviconUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = data.faviconUrl;
      }
    };

    // Load branding from server (tenant-aware by token)
    const fetchBranding = async () => {
      // Skip on auth/onboarding routes to avoid noisy 404s during first-run
      try {
        const path = window.location?.pathname || '';
        if (path.includes('/auth') || path.includes('/onboarding')) {
          return;
        }
      } catch { /* no-op */ }
      try {
        // First try public branding (host-derived, no auth)
        const pub = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/public/branding`, { headers: { 'X-Tenant-Host': window.location.host } })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
        if (pub && Object.keys(pub || {}).length) {
          applyBrandingInternal(pub)
          return
        }
      } catch { /* ignore */ }

      try {
        // Fallback to authenticated branding when available
        let authHeader: Record<string, string> | undefined
        try {
          const authStorage = localStorage.getItem('auth-storage')
          if (authStorage) {
            const { state } = JSON.parse(authStorage)
            const token = state?.tokens?.accessToken as string | undefined
            if (token) authHeader = { Authorization: `Bearer ${token}` }
            else return
          } else {
            return
          }
        } catch { return }

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tenants/me/branding`, {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...(authHeader || {}) },
        })
        if (res.ok) {
          const raw = await res.json()
          const data = (raw && (raw as any).data) ? (raw as any).data : raw
          applyBrandingInternal(data)
        }
      } catch { /* ignore */ }
    };
    fetchBranding();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [storageKey]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    toggleTheme: () => {
      const newTheme = theme === "light" ? "dark" : "light";
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);
    },
    systemTheme,
    brand,
    applyBranding: (branding: ThemeProviderState['brand']) => {
      if (typeof window === 'undefined') return;
      // Reapply branding variables, favicon and custom CSS
      const root = window.document.documentElement;
      const normalize = (val?: string) => {
        if (!val) return null;
        const v = val.trim();
        if (/^\d+\s+\d+%\s+\d+%$/.test(v)) return v;
        const hslMatch = v.match(/^hsl\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)$/i);
        if (hslMatch) return `${hslMatch[1]} ${hslMatch[2]}% ${hslMatch[3]}%`;
        if (v.startsWith('#')) {
          const toHsl = (hex: string): string | null => {
            const normalized = hex.trim().replace('#', '');
            if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)) return null;
            const full = normalized.length === 3 ? normalized.split('').map((c) => c + c).join('') : normalized;
            const r = parseInt(full.substring(0, 2), 16) / 255;
            const g = parseInt(full.substring(2, 4), 16) / 255;
            const b = parseInt(full.substring(4, 6), 16) / 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            let h = 0, s = 0; const l = (max + min) / 2;
            if (max !== min) {
              const d = max - min;
              s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
              switch (max) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; break; }
              h /= 6;
            }
            return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
          };
          return toHsl(v);
        }
        return null;
      };
      setBrand(branding);
      const primary = normalize(branding?.colors?.primary);
      const secondary = normalize(branding?.colors?.secondary);
      if (primary) {
        root.style.setProperty('--primary', primary);
        const l = parseInt(primary.split(' ')[2].replace('%',''), 10);
        root.style.setProperty('--primary-foreground', l > 55 ? '222.2 84% 4.9%' : '210 40% 98%');
      }
      if (secondary) {
        root.style.setProperty('--secondary', secondary);
        const l2 = parseInt(secondary.split(' ')[2].replace('%',''), 10);
        const fg2 = l2 > 55 ? '222.2 84% 4.9%' : '210 40% 98%';
        root.style.setProperty('--secondary-foreground', fg2);
        root.style.setProperty('--accent', secondary);
        root.style.setProperty('--accent-foreground', fg2);
      }
      const existingStyle = document.querySelector("style[data-tenant-css='true']");
      if (existingStyle?.parentNode) existingStyle.parentNode.removeChild(existingStyle);
      if (branding?.customCSS) {
        const styleEl = document.createElement('style');
        styleEl.setAttribute('data-tenant-css', 'true');
        styleEl.innerHTML = branding.customCSS;
        document.head.appendChild(styleEl);
      }
      if (branding?.faviconUrl) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel='icon']");
        if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
        link.href = branding.faviconUrl;
      }
    },
    refreshBranding: async () => {
      if (typeof window === 'undefined') return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/tenants/me/branding`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          (value as any).applyBranding(data);
        }
      } catch (e) { void 0; }
    },
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <ThemeProviderContext.Provider {...props} value={value}>
        {children}
      </ThemeProviderContext.Provider>
    );
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = React.useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};