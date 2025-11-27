/**
 * Icons8 Integration & Icon Mapping
 * Provides centralized icon configuration using Icons8
 */

import React from 'react';
import {
  Building2,
  CreditCard,
  Shield,
  Users,
  Globe2,
  Palette,
  Mail,
  Bell,
  Settings,
  Zap,
  Plug,
  MessageSquare,
  Bot,
  Smartphone,
  File,
  Lock,
  Webhook,
  BarChart3,
  Package,
  TrendingUp,
  DollarSign,
  FileText,
  Database,
  Key,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  ChevronRight,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  EyeOff,
  Plus,
  Minus,
  X,
  Check,
  Save,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  RotateCw,
  type LucideIcon,
} from 'lucide-react';

/**
 * Icon categories mapped to Lucide icons
 * For production, these can be replaced with Icons8 URLs
 */
export const icons = {
  // Navigation & Settings
  building: Building2,
  creditCard: CreditCard,
  shield: Shield,
  users: Users,
  globe: Globe2,
  palette: Palette,
  mail: Mail,
  bell: Bell,
  settings: Settings,
  zap: Zap,
  plug: Plug,
  messageSquare: MessageSquare,
  bot: Bot,
  smartphone: Smartphone,
  file: File,
  lock: Lock,
  webhook: Webhook,

  // Business & Analytics
  barChart: BarChart3,
  package: Package,
  trendingUp: TrendingUp,
  dollarSign: DollarSign,
  fileText: FileText,
  database: Database,
  key: Key,

  // Status
  checkCircle: CheckCircle,
  xCircle: XCircle,
  alertCircle: AlertCircle,
  info: Info,

  // Actions
  chevronRight: ChevronRight,
  search: Search,
  filter: Filter,
  download: Download,
  upload: Upload,
  eye: Eye,
  eyeOff: EyeOff,
  plus: Plus,
  minus: Minus,
  x: X,
  check: Check,
  save: Save,
  edit: Edit,
  trash: Trash2,
  copy: Copy,
  externalLink: ExternalLink,
  refresh: RotateCw,
} as const;

export type IconName = keyof typeof icons;

interface IconProps {
  name: IconName;
  className?: string;
  size?: number;
}

/**
 * Icon component that renders from our icon map
 */
export function Icon({ name, className, size = 20 }: IconProps) {
  const IconComponent = icons[name] as LucideIcon;
  
  if (!IconComponent) {
    return null;
  }

  return <IconComponent className={className} size={size} />;
}

/**
 * Icons8 URL generator (for future implementation)
 * When migrating to Icons8 API, use this function to generate URLs
 */
export function getIcons8Url(
  iconName: string,
  options?: {
    size?: number;
    color?: string;
    format?: 'png' | 'svg';
    platform?: string;
  }
): string {
  const { size = 48, color = '000000', format = 'png', platform = 'ios' } = options || {};
  
  // Icons8 URL format: https://img.icons8.com/{format}/{size}/{color}/{icon-name}.{format}
  return `https://img.icons8.com/${platform}/${size}/${color}/${iconName}.${format}`;
}

/**
 * Channel type icons
 */
export const channelIcons: Record<string, LucideIcon> = {
  whatsapp: MessageSquare,
  instagram: MessageSquare,
  sms: MessageSquare,
  email: Mail,
  web: Globe2,
  phone: Smartphone,
};

/**
 * Status icons with colors
 */
export const statusIcons = {
  success: {
    icon: CheckCircle,
    color: 'text-green-500',
  },
  error: {
    icon: XCircle,
    color: 'text-red-500',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-yellow-500',
  },
  info: {
    icon: Info,
    color: 'text-blue-500',
  },
};

