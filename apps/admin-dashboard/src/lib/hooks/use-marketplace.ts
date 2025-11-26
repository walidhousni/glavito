import { useEffect, useMemo } from 'react';
import { useMarketplaceStore } from '@/lib/store/marketplace-store';

export function useMarketplace(initial?: { search?: string; category?: string; tag?: string; type?: string; premium?: boolean }) {
  const { items, isLoading, error, filters, setFilters, load, install, installLoading, installed, installedLoading, seedDemo, loadInstalled, updateInstallation, uninstall } = useMarketplaceStore();

  useEffect(() => {
    if (initial) setFilters(initial);
    load();

  }, []);

  const installingSlugs = useMemo(() => new Set(Object.keys(installLoading).filter((k) => installLoading[k])), [installLoading]);

  return {
    items,
    isLoading,
    error,
    filters,
    setFilters,
    reload: load,
    install,
    installingSlugs,
    installed,
    installedLoading,
    seedDemo,
    loadInstalled,
    updateInstallation,
    uninstall,
  };
}


