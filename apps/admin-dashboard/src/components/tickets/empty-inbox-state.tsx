'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Instagram,
  Mail,
  Phone,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Channel {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  status: 'connected' | 'not_connected';
  badge?: string;
  features: string[];
}

interface EmptyInboxStateProps {
  onConnectChannel: (channelType: string) => void;
}

export function EmptyInboxState({ onConnectChannel }: EmptyInboxStateProps) {
  const channels: Channel[] = [
    {
      id: 'whatsapp',
      name: 'WhatsApp Business API',
      description: 'Send high-volume automated messages and broadcasts directly to your customers',
      icon: MessageSquare,
      iconColor: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
      borderColor: 'border-green-200 dark:border-green-800',
      status: 'not_connected',
      badge: 'MOST POPULAR',
      features: ['Automated messages', 'Broadcasts', 'Template messages', 'Rich media'],
    },
    {
      id: 'messenger',
      name: 'Facebook Messenger',
      description: 'Manage messages and convert leads. Ideal for businesses running Facebook campaigns or ads',
      icon: MessageSquare,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      borderColor: 'border-blue-200 dark:border-blue-800',
      status: 'not_connected',
      badge: 'FREE',
      features: ['Campaign integration', 'Lead conversion', 'Automated responses', 'Rich cards'],
    },
    {
      id: 'instagram',
      name: 'Instagram',
      description: 'Handle DMs, comments, and ads interactions. Great for engaging leads from Reels and Posts',
      icon: Instagram,
      iconColor: 'text-pink-600',
      bgColor: 'bg-pink-50 dark:bg-pink-950',
      borderColor: 'border-pink-200 dark:border-pink-800',
      status: 'not_connected',
      badge: 'FREE',
      features: ['DMs & comments', 'Story mentions', 'Ad interactions', 'Quick replies'],
    },
    {
      id: 'email',
      name: 'Email',
      description: 'Professional email support with templates, tracking, and automation',
      icon: Mail,
      iconColor: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      borderColor: 'border-purple-200 dark:border-purple-800',
      status: 'not_connected',
      features: ['Templates', 'Tracking', 'Automation', 'Rich formatting'],
    },
    {
      id: 'sms',
      name: 'SMS',
      description: 'Reach customers directly via text messages with delivery tracking',
      icon: Phone,
      iconColor: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950',
      borderColor: 'border-orange-200 dark:border-orange-800',
      status: 'not_connected',
      features: ['Instant delivery', 'Delivery tracking', 'Bulk messaging', 'Two-way chat'],
    },
  ];

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <div className="h-full flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-6 shadow-lg">
            <MessageSquare className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Get started by connecting messaging channels
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Manage conversations, track leads, and drive conversions all in one place with Glavito
          </p>
        </motion.div>

        {/* Stats Banner */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="grid grid-cols-3 gap-4 mb-12 max-w-3xl mx-auto"
        >
          <Card className="border-0 shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold text-slate-900 dark:text-white">5+</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Channels</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Zap className="h-5 w-5 text-yellow-600" />
                <span className="text-2xl font-bold text-slate-900 dark:text-white">2 min</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Setup time</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <span className="text-2xl font-bold text-slate-900 dark:text-white">AI</span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Powered</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Channel Cards */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {channels.map((channel) => {
            const Icon = channel.icon;
            return (
              <motion.div key={channel.id} variants={fadeUp}>
                <Card
                  className={`relative overflow-hidden border-2 ${channel.borderColor} hover:shadow-xl transition-all duration-300 group cursor-pointer h-full`}
                  onClick={() => onConnectChannel(channel.id)}
                >
                  <CardHeader className={`${channel.bgColor} pb-4`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-3 rounded-xl ${channel.bgColor} border ${channel.borderColor}`}>
                        <Icon className={`h-6 w-6 ${channel.iconColor}`} />
                      </div>
                      {channel.badge && (
                        <Badge
                          variant="secondary"
                          className={`text-xs font-semibold ${
                            channel.badge === 'MOST POPULAR'
                              ? 'bg-blue-600 text-white'
                              : 'bg-green-600 text-white'
                          }`}
                        >
                          {channel.badge}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white">
                      {channel.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                      {channel.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 pb-6">
                    <ul className="space-y-2 mb-6">
                      {channel.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onConnectChannel(channel.id);
                      }}
                    >
                      Connect
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Footer Help Text */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-12 text-center"
        >
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Need help setting up?{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
              View setup guide
            </a>{' '}
            or{' '}
            <a href="#" className="text-blue-600 hover:text-blue-700 font-medium">
              contact support
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

