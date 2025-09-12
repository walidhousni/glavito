import { useEffect } from 'react';
import { useWhiteLabelStore } from '@/lib/store/white-label-store';

export const useWhiteLabel = () => {
  const { assets, loading, error, loadAssets, uploadAsset, removeAsset, templates, loadTemplates, upsertTemplate, deleteTemplate, previewTemplate, testSendTemplate, smtp, loadSmtp, saveSmtp, testSmtp, deliveries, loadDeliveries } = useWhiteLabelStore();

  useEffect(() => {
    if (assets.length === 0 && !loading) {
      loadAssets();
    }
  }, [assets.length, loading, loadAssets]);

  return { assets, templates, deliveries, loading, error, loadAssets, uploadAsset, removeAsset, loadTemplates, upsertTemplate, deleteTemplate, previewTemplate, testSendTemplate, smtp, loadSmtp, saveSmtp, testSmtp, loadDeliveries };
};


