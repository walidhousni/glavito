'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { tenantsApi, type RolesMapping } from '@/lib/api/tenants-client';

export default function PermissionsPage() {
  const t = useTranslations();
  const [rolesJson, setRolesJson] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Admin-only page; backend enforces via auth/roles too

  useEffect(() => {
    (async () => {
      try {
        const mapping = await tenantsApi.getMyRoles();
        setRolesJson(JSON.stringify(mapping, null, 2));
      } catch (_err) {
        setRolesJson('{}');
      }
      try {
        const perms = await tenantsApi.getMyPermissions();
        setPermissions(perms);
      } catch (_err) {
        setPermissions([]);
      }
    })();
  }, []);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const parsed = JSON.parse(rolesJson || '{}') as RolesMapping;
      await tenantsApi.updateMyRoles(parsed);
    } catch (e) {
      setError((e as Error)?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Roles Mapping</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          <Textarea
            value={rolesJson}
            onChange={(e) => setRolesJson(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
          />
          <div className="flex gap-3">
            <Button onClick={onSave} disabled={saving}>
              {saving ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Effective Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {permissions.map((p) => (
              <span key={p} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-xs">
                {p}
              </span>
            ))}
            {!permissions.length && <div className="text-sm text-gray-500">No permissions</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


