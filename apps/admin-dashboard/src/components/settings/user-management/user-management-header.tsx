'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { UserPlus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UserManagementHeaderProps {
  onInvite: () => void;
  onExport: () => void;
}

export function UserManagementHeader({ onInvite, onExport }: UserManagementHeaderProps) {
  const t = useTranslations('settings.userManagement');

  return (
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h2 className="text-2xl font-semibold">{t('title', { fallback: 'User Management' })}</h2>
        <p className="text-muted-foreground">{t('subtitle', { fallback: 'Manage your team members and agents' })}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          {t('export', { fallback: 'Export' })}
        </Button>
        <Button onClick={onInvite}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t('inviteUser', { fallback: 'Invite User' })}
        </Button>
      </div>
    </div>
  );
}
