'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  ChevronRight, 
  ChevronDown, 
  Building, 
  Palette, 
  MessageSquare, 
  Zap, 
  Users, 
  Plug, 
  Settings,
  CreditCard,
  Shield,
  Globe,
  Smartphone,
  Mail,
  BarChart3,
  Bot,
  Workflow,
  Webhook,
  Key,
  Bell,
  Sliders
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface SettingsSection {
  id: string;
  label: string;
  icon: React.ElementType;
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
      icon: Building,
      children: [
        { id: 'companyDetails', label: t('basicInfo', { defaultValue: 'Basic Info' }) },
        { id: 'billing', label: t('billing', { defaultValue: 'Billing & Plans' }) },
        { id: 'wallet', label: t('wallet', { defaultValue: 'Wallet' }) },
      ],
    },
    {
      id: 'white-label',
      label: t('whiteLabel', { defaultValue: 'White Label' }),
      icon: Palette,
      children: [
        { id: 'appearance', label: t('branding', { defaultValue: 'Branding & Appearance' }) },
        { id: 'domains', label: t('domains', { defaultValue: 'Domains' }) },
      ],
    },
    {
      id: 'channels',
      label: t('channels', { defaultValue: 'Channels' }),
      icon: MessageSquare,
      children: [
        { id: 'channels', label: t('overview', { defaultValue: 'Overview' }) },
        { id: 'email', label: t('email', { defaultValue: 'Email Configuration' }) },
      ],
    },
    {
      id: 'automation',
      label: t('automation', { defaultValue: 'Automation' }),
      icon: Zap,
      children: [
        { id: 'bots', label: t('aiBots', { defaultValue: 'AI Bots' }) },
        { id: 'glavai', label: 'GLAVAI' },
      ],
    },
    {
      id: 'team',
      label: t('team', { defaultValue: 'Team' }),
      icon: Users,
      children: [
        { id: 'team', label: t('members', { defaultValue: 'Team Members' }) },
        { id: 'userManagement', label: t('userManagement', { defaultValue: 'User Management' }) },
      ],
    },
    {
      id: 'system',
      label: t('system', { defaultValue: 'System' }),
      icon: Settings,
      children: [
        { id: 'notifications', label: t('notifications', { defaultValue: 'Notifications' }) },
        { id: 'features', label: t('features', { defaultValue: 'Features' }) },
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
    <nav className="space-y-1 w-full">
      {sections.map((section) => {
        const SectionIcon = section.icon;
        const isExpanded = expandedSections.has(section.id);
        const isActive = activeSection === section.id || section.children?.some(c => c.id === activeSection);

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
                'w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 group',
                isActive
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                isActive 
                  ? "bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400" 
                  : "bg-transparent text-slate-500 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
              )}>
                <SectionIcon className="w-4 h-4 shrink-0" />
              </div>
              <span className="flex-1 text-left">{section.label}</span>
              {section.children && section.children.length > 0 && (
                <div className={cn(
                  "w-4 h-4 text-slate-400 transition-transform duration-200",
                  isExpanded && "transform rotate-90"
                )}>
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </button>

            {/* Section Items */}
            <AnimatePresence initial={false}>
              {section.children && isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-4 pl-4 border-l border-slate-200 dark:border-slate-800 space-y-1 py-1">
                    {section.children.map((item) => {
                      const itemIsActive = activeSection === item.id; // Using activeSection as the item ID for flat navigation
                      return (
                        <button
                          key={item.id}
                          onClick={() => onNavigate(item.id)}
                          className={cn(
                            'w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-200 relative',
                            itemIsActive
                              ? 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 font-medium'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          )}
                        >
                          <span>{item.label}</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-medium">
                              {item.badge}
                            </span>
                          )}
                          {itemIsActive && (
                            <motion.div
                              layoutId="activeIndicator"
                              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[17px] w-1 h-4 rounded-r-full bg-blue-600 dark:bg-blue-400"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}
