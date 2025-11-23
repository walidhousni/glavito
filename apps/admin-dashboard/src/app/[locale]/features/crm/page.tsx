'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { EnhancedHeader } from '@/components/landing/enhanced-header';
import { ComprehensiveFooter } from '@/components/landing/comprehensive-footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  TrendingUp, 
  FileText, 
  Target, 
  BarChart3,
  CheckCircle2,
  Zap,
  DollarSign,
  PieChart,
  ArrowRight,
  MoreHorizontal,
  Phone,
  Mail,
  Calendar
} from 'lucide-react';
import type { Locale } from '@/i18n.config';
import { cn } from '@/lib/utils';

export default function CRMFeaturePage() {
  const locale = useLocale() as Locale;
  const t = useTranslations('landing');
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const pipelineStages = [
    { name: 'New Lead', count: 12, value: '$24,000', color: 'bg-blue-500' },
    { name: 'Qualified', count: 8, value: '$18,500', color: 'bg-purple-500' },
    { name: 'Proposal', count: 5, value: '$42,000', color: 'bg-orange-500' },
    { name: 'Negotiation', count: 3, value: '$15,000', color: 'bg-green-500' },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-hidden" ref={containerRef}>
      <EnhancedHeader locale={locale} />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-green-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
                <Users className="w-3.5 h-3.5 mr-2 inline-block" />
                Intelligent CRM
              </Badge>
              <h1 className="text-5xl md:text-7xl font-bold mb-8 text-slate-900 dark:text-white tracking-tight leading-tight">
                Turn Relationships into <br />
                <span className="bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                  Revenue
                </span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                A powerful CRM built for modern sales teams. Manage leads, track deals, and automate follow-ups—all in one place.
              </p>
              
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900">
                  View Demo
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Hero Visual - Pipeline Board */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative perspective-1000"
          >
            <div className="relative bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden aspect-[16/9] max-w-6xl mx-auto transform-gpu p-6">
              {/* Pipeline Header */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Sales Pipeline</h3>
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-900" />
                    ))}
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-xs font-medium text-slate-500">
                      +5
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline">Add Deal</Button>
              </div>

              {/* Kanban Board */}
              <div className="grid grid-cols-4 gap-4 h-full pb-4">
                {pipelineStages.map((stage, i) => (
                  <div key={stage.name} className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                        <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{stage.name}</span>
                        <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">{stage.count}</span>
                      </div>
                    </div>
                    
                    <div className="flex-1 bg-slate-100/50 dark:bg-slate-800/30 rounded-xl p-2 space-y-3">
                      {[1, 2].map((card) => (
                        <motion.div
                          key={card}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + (i * 0.1) + (card * 0.05) }}
                          className="bg-white dark:bg-slate-900 p-3 rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-medium text-slate-500">Acme Corp</span>
                            <MoreHorizontal className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="font-semibold text-slate-900 dark:text-white text-sm mb-3">Enterprise License</div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700" />
                              <span>John D.</span>
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">$12,500</span>
                          </div>
                        </motion.div>
                      ))}
                      <div className="text-center py-2 text-xs text-slate-400 font-medium">
                        Total: {stage.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: '360° Customer View',
                desc: 'See every interaction, ticket, and deal in one timeline. Know your customer before you say hello.',
                icon: Users,
                color: 'text-blue-500'
              },
              {
                title: 'Sales Automation',
                desc: 'Automate follow-ups, task creation, and deal updates. Focus on selling, not data entry.',
                icon: Zap,
                color: 'text-yellow-500'
              },
              {
                title: 'Smart Reporting',
                desc: 'Forecast revenue and track team performance with beautiful, real-time dashboards.',
                icon: BarChart3,
                color: 'text-purple-500'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all"
              >
                <div className={`w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-6 ${feature.color}`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-slate-900 dark:text-white">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Profile Showcase */}
      <section className="py-24 px-4 overflow-hidden">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-3xl blur-3xl" />
              
              {/* Contact Card */}
              <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-slate-800 to-slate-900" />
                <div className="px-8 pb-8">
                  <div className="relative -mt-12 mb-6 flex justify-between items-end">
                    <div className="w-24 h-24 rounded-2xl bg-white dark:bg-slate-800 p-1 shadow-lg">
                      <div className="w-full h-full rounded-xl bg-slate-200 dark:bg-slate-700" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="rounded-full"><Phone className="w-4 h-4 mr-2" /> Call</Button>
                      <Button size="sm" className="rounded-full bg-blue-600 hover:bg-blue-700"><Mail className="w-4 h-4 mr-2" /> Email</Button>
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Sarah Miller</h3>
                  <p className="text-slate-500 mb-6">VP of Operations at TechCorp</p>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-xs text-slate-500 mb-1">Total Value</div>
                      <div className="text-lg font-bold text-green-600">$45,200</div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="text-xs text-slate-500 mb-1">Open Deals</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">2 Active</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider">Recent Activity</h4>
                    {[
                      { icon: Mail, text: 'Opened email campaign "Q4 Promo"', time: '2h ago', color: 'text-blue-500' },
                      { icon: Calendar, text: 'Meeting scheduled for Demo', time: '1d ago', color: 'text-purple-500' },
                      { icon: CheckCircle2, text: 'Completed task "Send Proposal"', time: '2d ago', color: 'text-green-500' },
                    ].map((activity, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <div className={`w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center ${activity.color}`}>
                          <activity.icon className="w-4 h-4" />
                        </div>
                        <span className="flex-1 text-slate-600 dark:text-slate-300">{activity.text}</span>
                        <span className="text-slate-400 text-xs">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <Badge className="mb-6 bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 px-4 py-1.5 rounded-full text-sm font-medium">
                <Target className="w-3.5 h-3.5 mr-2 inline-block" />
                Lead Intelligence
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-900 dark:text-white">
                Know exactly who to contact and when
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                Stop guessing. Our CRM enriches contact profiles automatically and tracks every interaction, 
                giving you the context you need to close deals faster.
              </p>
              
              <ul className="space-y-4">
                {[
                  'Automatic profile enrichment from social data',
                  'Timeline view of emails, calls, and meetings',
                  'Smart segmentation based on behavior',
                  'Lead scoring to prioritize hot prospects'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="relative bg-gradient-to-br from-green-600 to-emerald-600 rounded-3xl p-12 md:p-20 text-center overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-green-900/20 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                Ready to grow your sales?
              </h2>
              <p className="text-xl text-green-100 mb-10 max-w-2xl mx-auto">
                Join high-growth teams using Glavito CRM to close more deals.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button size="lg" className="h-14 px-8 text-lg bg-white text-green-600 hover:bg-slate-100 border-0">
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
