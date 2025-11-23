import { useEffect } from 'react';
import { useWhiteLabelStore } from '@/lib/store/white-label-store';

export const useWhiteLabel = () => {
  const {
    settings,
    // Assets & Theme
    assets,
    theme,
    loading,
    error,
    loadSettings,
    saveSettings,
    saveCompany,
    saveLocalization,
    loadAssets,
    uploadAsset,
    removeAsset,
    activateAsset,
    loadTheme,
    // Templates & Email
    templates,
    loadTemplates,
    upsertTemplate,
    deleteTemplate,
    previewTemplate,
    testSendTemplate,
    // SMTP
    smtp,
    loadSmtp,
    saveSmtp,
    testSmtp,
    // Deliveries
    deliveries,
    loadDeliveries,
    // Domains
    domains,
    loadDomains,
    createDomain,
    checkDomain,
    requestSSL,
    deleteDomain,
    // Feature toggles
    toggles,
    loadToggles,
    upsertToggle,
    deleteToggle,
  } = useWhiteLabelStore();

  useEffect(() => {
    if (!settings && !loading) {
      loadSettings();
    }
    if (assets.length === 0 && !loading) {
      loadAssets();
    }
  }, [settings, assets.length, loading, loadAssets, loadSettings]);

  return {
    settings,
    // Assets & Theme
    assets,
    theme,
    loading,
    error,
    loadSettings,
    saveSettings,
    saveCompany,
    saveLocalization,
    loadAssets,
    uploadAsset,
    removeAsset,
    activateAsset,
    loadTheme,
    // Templates & Email
    templates,
    loadTemplates,
    upsertTemplate,
    deleteTemplate,
    previewTemplate,
    testSendTemplate,
    // SMTP
    smtp,
    loadSmtp,
    saveSmtp,
    testSmtp,
    // Deliveries
    deliveries,
    loadDeliveries,
    // Domains
    domains,
    loadDomains,
    createDomain,
    checkDomain,
    requestSSL,
    deleteDomain,
    // Feature toggles
    toggles,
    loadToggles,
    upsertToggle,
    deleteToggle,
  };
};


