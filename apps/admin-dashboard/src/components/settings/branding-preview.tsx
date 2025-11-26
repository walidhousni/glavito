'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Users, 
  Settings, 
  Bell, 
  Search,
  CheckCircle2,
  TrendingUp,
  MoreHorizontal
} from 'lucide-react';
import { motion } from 'framer-motion';

interface BrandingPreviewProps {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  logoUrl?: string;
  fontFamily?: string;
}

export function BrandingPreview({ colors, logoUrl, fontFamily = 'Inter' }: BrandingPreviewProps) {
  const t = useTranslations('settings.branding');

  // Helper to determine text color based on background brightness
  const getContrastColor = (hexColor: string) => {
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? '#1e293b' : '#ffffff'; // slate-800 or white
  };

  return (
    <Card className="overflow-hidden border-0 shadow-xl bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>{t('preview.title', { fallback: 'Live Preview' })}</CardTitle>
        <CardDescription>{t('preview.subtitle', { fallback: 'See how your branding looks in real-time' })}</CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          className="relative w-full aspect-[16/10] rounded-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
          style={{ fontFamily }}
        >
          {/* Mock Sidebar */}
          <div className="absolute left-0 top-0 bottom-0 w-16 md:w-48 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-10">
            {/* Logo Area */}
            <div className="h-14 flex items-center px-4 border-b border-slate-100 dark:border-slate-800">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 max-w-full object-contain" />
              ) : (
                <div 
                  className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-white"
                  style={{ backgroundColor: colors.primary }}
                >
                  G
                </div>
              )}
              <span className="ml-3 font-semibold text-sm hidden md:block text-slate-900 dark:text-slate-100">Acme Inc</span>
            </div>

            {/* Nav Items */}
            <div className="flex-1 py-4 space-y-1 px-2">
              {[
                { icon: LayoutDashboard, label: 'Dashboard', active: true },
                { icon: MessageSquare, label: 'Inbox', active: false },
                { icon: Users, label: 'Customers', active: false },
                { icon: Settings, label: 'Settings', active: false },
              ].map((item, i) => (
                <div 
                  key={i}
                  className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium cursor-default transition-colors ${
                    item.active 
                      ? 'text-white' 
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                  style={item.active ? { backgroundColor: colors.primary, color: getContrastColor(colors.primary) } : {}}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  <span className="hidden md:block">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mock Header */}
          <div className="absolute left-16 md:left-48 right-0 top-0 h-14 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-10">
            <div className="flex items-center text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-md w-48">
              <Search className="w-3 h-3 mr-2" />
              <span className="text-xs">Search...</span>
            </div>
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-slate-400" />
              <Avatar className="w-7 h-7">
                <AvatarImage src="https://github.com/shadcn.png" />
                <AvatarFallback>AD</AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Mock Content */}
          <div className="absolute left-16 md:left-48 right-0 top-14 bottom-0 p-4 overflow-hidden bg-slate-50/50 dark:bg-slate-950/50">
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Stat Card 1 */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div 
                    className="p-1.5 rounded-lg"
                    style={{ backgroundColor: `${colors.primary}20` }}
                  >
                    <Users className="w-3 h-3" style={{ color: colors.primary }} />
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1" style={{ color: colors.accent, backgroundColor: `${colors.accent}20` }}>
                    +12%
                  </Badge>
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">1,234</div>
                <div className="text-[10px] text-slate-500">Total Customers</div>
              </div>

              {/* Stat Card 2 */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div 
                    className="p-1.5 rounded-lg"
                    style={{ backgroundColor: `${colors.secondary}20` }}
                  >
                    <MessageSquare className="w-3 h-3" style={{ color: colors.secondary }} />
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1" style={{ color: colors.accent, backgroundColor: `${colors.accent}20` }}>
                    +5%
                  </Badge>
                </div>
                <div className="text-lg font-bold text-slate-900 dark:text-slate-100">843</div>
                <div className="text-[10px] text-slate-500">Active Chats</div>
              </div>
            </div>

            {/* Main Chart Area */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm h-32 flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Revenue Overview</h4>
                <MoreHorizontal className="w-3 h-3 text-slate-400" />
              </div>
              <div className="flex-1 flex items-end gap-2 px-2">
                {[40, 70, 45, 90, 60, 80, 50].map((h, i) => (
                  <div 
                    key={i} 
                    className="flex-1 rounded-t-sm opacity-80 hover:opacity-100 transition-opacity"
                    style={{ 
                      height: `${h}%`, 
                      backgroundColor: i === 3 ? colors.primary : `${colors.primary}40` 
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-4 flex justify-end">
              <Button 
                size="sm" 
                className="text-xs h-7 shadow-lg transition-transform active:scale-95"
                style={{ 
                  backgroundColor: colors.primary, 
                  color: getContrastColor(colors.primary)
                }}
              >
                <CheckCircle2 className="w-3 h-3 mr-1.5" />
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
