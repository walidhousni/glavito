import { create } from 'zustand';
import { portalApi, type Portal, type PortalPage, type PortalTheme, type PortalWidget } from '@/lib/api/portal-client';

interface PortalState {
  portal: Portal | null;
  pages: PortalPage[];
  themes: PortalTheme[];
  widgets: PortalWidget[];
  isLoading: boolean;
  error?: string;

  loadAll: () => Promise<void>;
  savePortal: (patch: Partial<Portal>) => Promise<void>;
  publish: () => Promise<void>;

  upsertPage: (p: PortalPage) => Promise<void>;
  deletePage: (id: string) => Promise<void>;

  upsertTheme: (t: PortalTheme) => Promise<void>;

  upsertWidget: (w: PortalWidget) => Promise<void>;
  deleteWidget: (id: string) => Promise<void>;
}

export const usePortalStore = create<PortalState>((set, get) => ({
  portal: null,
  pages: [],
  themes: [],
  widgets: [],
  isLoading: false,

  async loadAll() {
    set({ isLoading: true, error: undefined });
    try {
      const [portal, pages, themes, widgets] = await Promise.all([
        portalApi.getPortal(),
        portalApi.listPages(),
        portalApi.listThemes(),
        portalApi.listWidgets(),
      ]);
      set({ portal, pages, themes, widgets });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  async savePortal(patch) {
    set({ isLoading: true, error: undefined });
    try {
      const portal = await portalApi.upsertPortal(patch);
      set({ portal });
    } catch (e) {
      set({ error: (e as Error).message });
    } finally {
      set({ isLoading: false });
    }
  },

  async publish() {
    const p = await portalApi.publish();
    set({ portal: p });
  },

  async upsertPage(p) {
    const page = await portalApi.upsertPage(p);
    const pages = get().pages;
    const idx = pages.findIndex(x => x.id === page.id);
    if (idx >= 0) {
      const next = pages.slice();
      next[idx] = page;
      set({ pages: next });
    } else {
      set({ pages: [page, ...pages] });
    }
  },

  async deletePage(id) {
    await portalApi.deletePage(id);
    set({ pages: get().pages.filter(p => p.id !== id) });
  },

  async upsertTheme(t) {
    const theme = await portalApi.upsertTheme(t);
    const themes = get().themes;
    const idx = themes.findIndex(x => x.id === theme.id);
    if (idx >= 0) {
      const next = themes.slice();
      next[idx] = theme;
      set({ themes: next });
    } else {
      set({ themes: [theme, ...themes] });
    }
  },

  async upsertWidget(w) {
    const widget = await portalApi.upsertWidget(w);
    const widgets = get().widgets;
    const idx = widgets.findIndex(x => x.id === widget.id);
    if (idx >= 0) {
      const next = widgets.slice();
      next[idx] = widget;
      set({ widgets: next });
    } else {
      set({ widgets: [widget, ...widgets] });
    }
  },

  async deleteWidget(id) {
    await portalApi.deleteWidget(id);
    set({ widgets: get().widgets.filter(w => w.id !== id) });
  },
}));


