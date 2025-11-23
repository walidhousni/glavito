'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { EnhancedHeader } from '@/components/landing/enhanced-header';
import { ComprehensiveFooter } from '@/components/landing/comprehensive-footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Mail, 
  Smartphone, 
  Globe, 
  Users, 
  Clock, 
  Shield, 
  BarChart3,
  CheckCircle2,
  Zap,
  MessageCircle,
  Instagram,
  ArrowRight,
  Inbox
} from 'lucide-react';
import type { Locale } from '@/i18n.config';
import { cn } from '@/lib/utils';

export default function TicketingFeaturePage() {
  const locale = useLocale() as Locale;
  const t = useTranslations('landing');
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const channels = [
    { name: 'WhatsApp', icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-500/10', desc: 'Official API Integration' },
    { name: 'Instagram', icon: Instagram, color: 'text-pink-500', bg: 'bg-pink-500/10', desc: 'DM & Story Replies' },
    { name: 'Email', icon: Mail, color: 'text-blue-500', bg: 'bg-blue-500/10', desc: 'Unified Inbox' },
    { name: 'Web Chat', icon: Globe, color: 'text-purple-500', bg: 'bg-purple-500/10', desc: 'Live Website Widget' },
    { name: 'SMS', icon: Smartphone, color: 'text-orange-500', bg: 'bg-orange-500/10', desc: 'Direct Messaging' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-hidden" ref={containerRef}>
      <EnhancedHeader locale={locale} />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-1/4 w-[800px] h-[800px] bg-cyan-500/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
                <Inbox className="w-3.5 h-3.5 mr-2 inline-block" />
                Omnichannel Support
              </Badge>
              <h1 className="text-5xl md:text-7xl font-bold mb-8 text-slate-900 dark:text-white tracking-tight leading-tight">
                One Inbox for <br />
                <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  Every Conversation
                </span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                Stop switching tabs. Manage WhatsApp, Instagram, Email, and more from a single, powerful inbox designed for teams.
              </p>
              
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900">
                  View Demo
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Hero Visual - Inbox Interface */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative perspective-1000"
          >
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden aspect-[16/9] max-w-6xl mx-auto transform-gpu">
              {/* Window Controls */}
              <div className="h-12 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Shield className="w-4 h-4" />
                  <span className="hidden sm:inline">Secure Connection</span>
                </div>
              </div>
              
              {/* Inbox UI Mockup */}
              <div className="flex h-full">
                {/* Sidebar */}
                <div className="w-20 md:w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-4 hidden md:block">
                  <div className="space-y-2">
                    {['All Tickets', 'Assigned to Me', 'Mentions', 'Unassigned'].map((item, i) => (
                      <div key={item} className={cn(
                        "p-3 rounded-lg text-sm font-medium cursor-pointer flex items-center gap-3",
                        i === 0 ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                      )}>
                        {i === 0 ? <Inbox className="w-4 h-4" /> : <div className="w-4 h-4" />}
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ticket List */}
                <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  {[
                    { name: 'Sarah Miller', msg: 'Need help with my order...', time: '2m', icon: MessageSquare, color: 'text-green-500' },
                    { name: 'John Doe', msg: 'Pricing question', time: '15m', icon: Mail, color: 'text-blue-500' },
                    { name: 'Tech Corp', msg: 'Integration support', time: '1h', icon: Globe, color: 'text-purple-500' },
                  ].map((ticket, i) => (
                    <div key={i} className="p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                      <div className="flex justify-between mb-1">
                        <span className="font-semibold text-slate-900 dark:text-white text-sm">{ticket.name}</span>
                        <span className="text-xs text-slate-500">{ticket.time}</span>
                      </div>
                      <div className="text-xs text-slate-500 truncate mb-2">{ticket.msg}</div>
                      <div className="flex items-center gap-2">
                        <ticket.icon className={cn("w-3 h-3", ticket.color)} />
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">Open</Badge>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Chat Area */}
                <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/50 p-8 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Select a ticket to view</h3>
                  <p className="text-slate-500 text-sm max-w-xs">
                    Choose a conversation from the list to start chatting with your customers.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Channels Grid */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
              Connect where your customers are
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Native integrations for the world's most popular messaging channels
            </p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {channels.map((channel, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all text-center group"
              >
                <div className={`w-12 h-12 rounded-xl ${channel.bg} ${channel.color} flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform`}>
                  <channel.icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold mb-2 text-slate-900 dark:text-white">{channel.name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {channel.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-6 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 px-4 py-1.5 rounded-full text-sm font-medium">
                <Zap className="w-3.5 h-3.5 mr-2 inline-block" />
                AI Superpowers
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-900 dark:text-white">
                Work smarter with AI assistance
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Let AI handle the busy work. From categorizing tickets to suggesting responses, 
                our AI helps your team resolve issues faster and more accurately.
              </p>
              
              <div className="space-y-6">
                {[
                  { title: 'Smart Triage', desc: 'Automatically tag and route tickets based on content.' },
                  { title: 'Response Suggestions', desc: 'Get AI-drafted replies based on your knowledge base.' },
                  { title: 'Sentiment Analysis', desc: 'Prioritize angry customers before they churn.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 dark:text-white">{item.title}</h4>
                      <p className="text-slate-600 dark:text-slate-400 text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-3xl blur-3xl" />
              <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-8">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-none p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">
                      My order #12345 hasn't arrived yet. Can you check the status?
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px]">
                        Urgent
                      </Badge>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px]">
                        Shipping
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl rounded-tl-none p-4 mb-2">
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-purple-600 dark:text-purple-400 block mb-1">AI Suggestion:</span>
                        I've checked order #12345. It is currently in transit and expected to arrive tomorrow. Would you like the tracking link?
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-8 text-xs bg-purple-600 hover:bg-purple-700">Use Response</Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs">Edit</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="relative bg-gradient-to-br from-blue-600 to-cyan-600 rounded-3xl p-12 md:p-20 text-center overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-900/20 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                Deliver support your customers love
              </h2>
              <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
                Join 5,000+ support teams delivering faster, more personal support with Glavito.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button size="lg" className="h-14 px-8 text-lg bg-white text-blue-600 hover:bg-slate-100 border-0">
                  Start Free Trial
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/30 text-white hover:bg-white/10">
                  Schedule Demo
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ComprehensiveFooter locale={locale} />
    </div>
  );
}
