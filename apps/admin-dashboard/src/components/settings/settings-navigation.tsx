'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { icons } from '@/lib/icons';

export interface SettingsSection {
  id: string;
  label: string;
  icon: keyof typeof icons;
  children?: SettingsItem[];
}

export interface SettingsItem {
  id: string;
  label: string;
  badge?: string | number;
}

interface SettingsNavigationProps {
  activeSection: string;
  activeItem?: string;
  onNavigate: (section: string, item?: string) => void;
}

export function SettingsNavigation({
  activeSection,
  activeItem,
  onNavigate,
}: SettingsNavigationProps) {
  const t = useTranslations('settings.navigation');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set([activeSection])
  );

  const sections: SettingsSection[] = [
    {
      id: 'company',
      label: t('company', { defaultValue: 'Company' }),
      icon: 'building',
      children: [
        { id: 'basic-info', label: t('basicInfo', { defaultValue: 'Basic Info' }) },
        { id: 'billing', label: t('billing', { defaultValue: 'Billing & Plans' }) },
        { id: 'security', label: t('security', { defaultValue: 'Security & Compliance' }) },
      ],
    },
    {
      id: 'white-label',
      label: t('whiteLabel', { defaultValue: 'White Label' }),
      icon: 'palette',
      children: [
        { id: 'branding', label: t('branding', { defaultValue: 'Branding' }) },
        { id: 'assets', label: t('assets', { defaultValue: 'Assets' }) },
        { id: 'templates', label: t('templates', { defaultValue: 'Templates' }) },
        { id: 'domains', label: t('domains', { defaultValue: 'Domains' }) },
        { id: 'mobile-app', label: t('mobileApp', { defaultValue: 'Mobile App' }) },
      ],
    },
    {
      id: 'channels',
      label: t('channels', { defaultValue: 'Channels' }),
      icon: 'messageSquare',
      children: [
        { id: 'overview', label: t('overview', { defaultValue: 'Overview' }) },
        { id: 'whatsapp', label: t('whatsapp', { defaultValue: 'WhatsApp' }) },
        { id: 'instagram', label: t('instagram', { defaultValue: 'Instagram' }) },
        { id: 'sms', label: t('sms', { defaultValue: 'SMS' }) },
        { id: 'email', label: t('email', { defaultValue: 'Email' }) },
        { id: 'analytics', label: t('analytics', { defaultValue: 'Analytics' }) },
      ],
    },
    {
      id: 'automation',
      label: t('automation', { defaultValue: 'Automation' }),
      icon: 'zap',
      children: [
        { id: 'ai-bots', label: t('aiBots', { defaultValue: 'AI Bots' }) },
        { id: 'workflows', label: t('workflows', { defaultValue: 'Workflows' }) },
        { id: 'webhooks', label: t('webhooks', { defaultValue: 'API Webhooks' }) },
      ],
    },
    {
      id: 'team',
      label: t('team', { defaultValue: 'Team & Permissions' }),
      icon: 'users',
      children: [
        { id: 'members', label: t('members', { defaultValue: 'Team Members' }) },
        { id: 'roles', label: t('roles', { defaultValue: 'Roles & Permissions' }) },
        { id: 'invitations', label: t('invitations', { defaultValue: 'Invitations' }) },
        { id: 'sso', label: t('sso', { defaultValue: 'SSO Configuration' }) },
      ],
    },
    {
      id: 'integrations',
      label: t('integrations', { defaultValue: 'Integrations' }),
      icon: 'plug',
      children: [
        { id: 'connected', label: t('connected', { defaultValue: 'Connected Apps' }) },
        { id: 'marketplace', label: t('marketplace', { defaultValue: 'Marketplace' }) },
        { id: 'api-keys', label: t('apiKeys', { defaultValue: 'API Keys' }) },
      ],
    },
    {
      id: 'features',
      label: t('features', { defaultValue: 'Features & Customization' }),
      icon: 'settings',
      children: [
        { id: 'toggles', label: t('toggles', { defaultValue: 'Feature Toggles' }) },
        { id: 'custom-fields', label: t('customFields', { defaultValue: 'Custom Fields' }) },
        { id: 'notifications', label: t('notifications', { defaultValue: 'Notifications' }) },
      ],
    },
  ];

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  return (
    <nav className="space-y-1">
      {sections.map((section) => {
        const SectionIcon = icons[section.icon];
        const isExpanded = expandedSections.has(section.id);
        const isActive = activeSection === section.id;

        return (
          <div key={section.id} className="space-y-1">
            {/* Section Header */}
            <button
              onClick={() => {
                if (section.children && section.children.length > 0) {
                  toggleSection(section.id);
                } else {
                  onNavigate(section.id);
                }
              }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <SectionIcon className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">{section.label}</span>
              {section.children && section.children.length > 0 && (
                <div className="w-4 h-4">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              )}
            </button>

            {/* Section Items */}
            {section.children && isExpanded && (
              <div className="ml-7 space-y-1">
                {section.children.map((item) => {
                  const itemIsActive = activeItem === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(section.id, item.id)}
                      className={cn(
                        'w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-md transition-colors',
                        itemIsActive
                          ? 'bg-muted text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      )}
                    >
                      <span>{item.label}</span>
                      {item.badge && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary font-medium">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

