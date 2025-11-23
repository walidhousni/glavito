'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { EnhancedHeader } from '@/components/landing/enhanced-header';
import { ComprehensiveFooter } from '@/components/landing/comprehensive-footer';
import { FlowPreview } from '@/components/landing/flow-preview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  Workflow, 
  Zap, 
  GitBranch, 
  PlayCircle, 
  ArrowRight,
  CheckCircle2,
  Boxes,
  Clock,
  Users,
  Sparkles,
  Mail,
  Target,
  Link as LinkIcon
} from 'lucide-react';
import type { Locale } from '@/i18n.config';

export default function WorkflowsFeaturePage() {
  const locale = useLocale() as Locale;
  const t = useTranslations('landing'); // Using landing translations for consistency
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  const templates = [
    {
      title: 'Auto-Assign Tickets',
      description: 'Route tickets to the right agent based on skills and availability.',
      icon: Users,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10'
    },
    {
      title: 'SLA Escalation',
      description: 'Automatically escalate tickets that are approaching SLA breach.',
      icon: Clock,
      color: 'text-orange-500',
      bg: 'bg-orange-500/10'
    },
    {
      title: 'Lead Qualification',
      description: 'Score and qualify leads before passing them to sales.',
      icon: Target,
      color: 'text-green-500',
      bg: 'bg-green-500/10'
    },
    {
      title: 'Customer Onboarding',
      description: 'Send a sequence of welcome emails and tips to new users.',
      icon: Sparkles,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10'
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-hidden" ref={containerRef}>
      <EnhancedHeader locale={locale} />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] bg-purple-500/5 rounded-full blur-3xl" />
          <div className="absolute top-1/4 right-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="mb-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
                <Workflow className="w-3.5 h-3.5 mr-2 inline-block" />
                Visual Workflow Builder
              </Badge>
              <h1 className="text-5xl md:text-7xl font-bold mb-8 text-slate-900 dark:text-white tracking-tight leading-tight">
                Automate Anything, <br />
                <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Without Code
                </span>
              </h1>
              <p className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                Build powerful automations with our intuitive drag-and-drop builder. 
                Connect your favorite apps, streamline operations, and save hours of manual work.
              </p>
              
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20">
                  Start Building
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900">
                  View Templates
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Hero Visual */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="relative perspective-1000"
          >
            <div className="relative bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden aspect-[16/9] max-w-5xl mx-auto transform-gpu">
              {/* Window Controls */}
              <div className="h-10 bg-slate-800/50 border-b border-slate-700 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                <div className="w-3 h-3 rounded-full bg-green-500/20" />
              </div>
              
              {/* Builder Interface */}
              <div className="absolute inset-0 top-10 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
              
              <div className="relative h-full flex items-center justify-center p-10">
                <FlowPreview animated={true} className="scale-125" />
              </div>

              {/* Floating Cards */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-20 left-20 bg-slate-800/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Trigger</div>
                    <div className="text-xs text-slate-400">New Ticket Created</div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-20 right-20 bg-slate-800/90 backdrop-blur-md p-4 rounded-xl border border-slate-700 shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Action</div>
                    <div className="text-xs text-slate-400">Send Email</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
              Everything you need to automate
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Powerful features to build simple tasks or complex enterprise workflows
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: 'Visual Builder',
                desc: 'Drag, drop, and connect. Building workflows is as easy as drawing on a whiteboard.',
                icon: Workflow,
                color: 'text-purple-500'
              },
              {
                title: 'Conditional Logic',
                desc: 'Create smart flows with if/else branches, loops, and advanced filtering logic.',
                icon: GitBranch,
                color: 'text-blue-500'
              },
              {
                title: 'Real-time Testing',
                desc: 'Test your workflows in real-time and debug with detailed execution logs.',
                icon: PlayCircle,
                color: 'text-green-500'
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

      {/* Templates Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-slate-900 dark:text-white">
                Start with a template
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Launch faster with pre-built workflows for common use cases
              </p>
            </div>
            <Button variant="outline" className="mt-4 md:mt-0">
              View All Templates
            </Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {templates.map((template, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 hover:border-purple-500/50 transition-colors"
              >
                <div className={`w-12 h-12 rounded-xl ${template.bg} ${template.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <template.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">{template.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                  {template.description}
                </p>
                <div className="flex items-center text-sm font-medium text-purple-600 dark:text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Use Template <ArrowRight className="w-4 h-4 ml-1" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Banner */}
      <section className="py-24 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-900/50 to-blue-900/50" />
        
        <div className="container mx-auto max-w-7xl relative z-10 text-center">
          <Badge className="mb-6 bg-white/10 text-white border-white/20 backdrop-blur-md">
            <LinkIcon className="w-3.5 h-3.5 mr-2" />
            500+ Integrations
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Connects with everything you use
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-12">
            From CRMs to payment gateways, connect all your tools in one place.
            Powered by n8n for limitless possibilities.
          </p>
          
          <div className="flex flex-wrap justify-center gap-8 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
            {['Shopify', 'Salesforce', 'HubSpot', 'Slack', 'Stripe', 'Zendesk'].map((name) => (
              <div key={name} className="text-2xl font-bold text-white/50 hover:text-white transition-colors">
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="relative bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl p-12 md:p-20 text-center overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-900/20 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
                Ready to automate your business?
              </h2>
              <p className="text-xl text-purple-100 mb-10 max-w-2xl mx-auto">
                Join thousands of businesses saving time and money with Glavito workflows.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Button size="lg" className="h-14 px-8 text-lg bg-white text-purple-600 hover:bg-slate-100 border-0">
                  Get Started for Free
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-white/30 text-white hover:bg-white/10">
                  Book a Demo
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
