'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface UserManagementEmptyProps {
  searchQuery: string;
  onInvite: () => void;
}

export function UserManagementEmpty({ searchQuery, onInvite }: UserManagementEmptyProps) {
  const t = useTranslations('settings.userManagement');

  return (
    <Card>
      <CardContent className="py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">
          {t('noUsersFound', { fallback: 'No users found' })}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {searchQuery 
            ? t('tryAdjustingSearch', { fallback: 'Try adjusting your search filters' }) 
            : t('getStartedInviting', { fallback: 'Get started by inviting team members' })}
        </p>
        {!searchQuery && (
          <Button onClick={onInvite}>
            <UserPlus className="h-4 w-4 mr-2" />
            {t('inviteUser', { fallback: 'Invite User' })}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
