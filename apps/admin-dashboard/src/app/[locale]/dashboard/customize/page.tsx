'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useDashboardStore } from '@/lib/store/dashboard-store';
import { ProtectedRoute } from '@/components/auth/protected-route';

export default function CustomizeDashboardPage() {
  const t = useTranslations();
  const { config, jsonText, isLoading, isSaving, error, load, setJsonText, resetJsonToLoaded, save } = useDashboardStore();

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ProtectedRoute requiredRole={["admin"]}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.settings')}: Customize Dashboard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="text-sm text-red-600">{error}</div>
            )}
            <Textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            <div className="flex gap-3">
              <Button onClick={save} disabled={isSaving || isLoading}>
                {isSaving || isLoading ? t('common.loading') : t('common.save')}
              </Button>
              <Button variant="outline" onClick={resetJsonToLoaded} disabled={isLoading}>
                Reset
              </Button>
              <Button variant="ghost" onClick={load} disabled={isLoading}>
                Reload
              </Button>
            </div>
            {config && (
              <div className="text-xs text-gray-500">
                Layout: {('layout' in config ? (config as { layout?: string }).layout : undefined) || 'grid'} • Widgets: {('widgets' in config && Array.isArray((config as { widgets?: unknown[] }).widgets)) ? ((config as { widgets?: unknown[] }).widgets?.length ?? 0) : 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}


