import { create } from 'zustand';
import { tenantsApi } from '@/lib/api/tenants-client';

type Locale = 'en' | 'fr' | 'ar';

type LocalizationState = {
  locale: Locale;
  currency: string;
  supportedLocales: Locale[];
  supportedCurrencies: string[];
  isLoading: boolean;
  error: string | null;
  load: () => Promise<void>;
  setLocale: (l: Locale) => Promise<void>;
  setCurrency: (c: string) => Promise<void>;
};

export const useLocalizationStore = create<LocalizationState>((set, get) => ({
  locale: 'en',
  currency: 'USD',
  supportedLocales: ['en', 'fr', 'ar'],
  supportedCurrencies: ['USD','EUR','GBP','MAD','AED','SAR','CAD'],
  isLoading: false,
  error: null,
  load: async () => {
    try {
      set({ isLoading: true, error: null });
      const [locs, currs, myLoc, myCur] = await Promise.all([
        tenantsApi.listSupportedLocales().catch(() => ['en','fr','ar']),
        tenantsApi.listSupportedCurrencies().catch(() => ['USD','EUR','GBP','MAD','AED','SAR','CAD']),
        tenantsApi.getMyLocale().catch(() => ({ locale: 'en' })),
        tenantsApi.getMyCurrency().catch(() => ({ currency: 'USD' })),
      ]);
      // Persist currency to cookie for middleware/header propagation
      if (typeof document !== 'undefined') {
        document.cookie = `currency=${myCur.currency}; path=/; max-age=${60*60*24*365}`;
      }
      set({
        supportedLocales: Array.isArray(locs) ? locs as Locale[] : ['en', 'fr', 'ar'],
        supportedCurrencies: Array.isArray(currs) ? currs : ['USD','EUR','GBP','MAD','AED','SAR','CAD'],
        locale: (myLoc.locale as Locale) || 'en',
        currency: myCur.currency || 'USD',
      });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load localization' });
    } finally {
      set({ isLoading: false });
    }
  },
  setLocale: async (l: Locale) => {
    await tenantsApi.setMyLocale(l);
    set({ locale: l });
  },
  setCurrency: async (c: string) => {
    await tenantsApi.setMyCurrency(c);
    if (typeof document !== 'undefined') {
      document.cookie = `currency=${c}; path=/; max-age=${60*60*24*365}`;
    }
    set({ currency: c });
  },
}));


