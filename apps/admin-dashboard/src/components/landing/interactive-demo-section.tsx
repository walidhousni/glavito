'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { FlowPreview } from './flow-preview';
import { AnimatedChatBubble } from './animated-chat-bubble';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { channelIcons } from '@/lib/icons/landing-icons';
import { Smartphone, Zap, MessageSquare, MousePointer2 } from 'lucide-react';

type Channel = 'whatsapp' | 'instagram' | 'email';

export function InteractiveDemoSection() {
  const t = useTranslations('landing.interactiveDemo');
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [selectedChannel, setSelectedChannel] = useState<Channel>('whatsapp');
  const [isTyping, setIsTyping] = useState(false);

  const demoConversations: Record<Channel, Array<{ sender: 'customer' | 'agent'; message: string }>> = {
    whatsapp: [
      { sender: 'customer', message: t('demo.whatsapp.customer1') },
      { sender: 'agent', message: t('demo.whatsapp.agent1') },
      { sender: 'customer', message: t('demo.whatsapp.customer2') },
      { sender: 'agent', message: t('demo.whatsapp.agent2') },
    ],
    instagram: [
      { sender: 'customer', message: t('demo.instagram.customer1') },
      { sender: 'agent', message: t('demo.instagram.agent1') },
      { sender: 'customer', message: t('demo.instagram.customer2') },
      { sender: 'agent', message: t('demo.instagram.agent2') },
    ],
    email: [
      { sender: 'customer', message: t('demo.email.customer1') },
      { sender: 'agent', message: t('demo.email.agent1') },
      { sender: 'customer', message: t('demo.email.customer2') },
    ],
  };

  // Simulate typing effect
  useEffect(() => {
    setIsTyping(true);
    const timer = setTimeout(() => setIsTyping(false), 2000);
    return () => clearTimeout(timer);
  }, [selectedChannel]);

  return (
    <section
      ref={ref}
      className="py-32 px-4 bg-slate-50 dark:bg-slate-950 relative overflow-hidden"
    >
      {/* Background gradient blobs */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
      <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none mix-blend-multiply dark:mix-blend-screen" />

      <div className="container mx-auto max-w-7xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <Badge className="mb-6 bg-gradient-to-r from-blue-600/10 to-purple-600/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 px-4 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
            <Zap className="w-3.5 h-3.5 mr-2 inline-block" />
            {t('badge')}
          </Badge>
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">
            {t('title')}
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Demo Container */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          {/* Left: Flow Builder Preview (Mac Window Style) */}
          <motion.div
            initial={{ opacity: 0, x: -50, rotateY: 10 }}
            animate={isInView ? { opacity: 1, x: 0, rotateY: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.8, type: "spring" }}
            className="relative perspective-1000"
          >
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {/* Window Controls */}
              <div className="h-10 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-400/80" />
                <div className="ml-4 text-xs font-medium text-slate-400 flex items-center gap-1.5">
                  <MousePointer2 className="w-3 h-3" />
                  Flow Builder
                </div>
              </div>

              {/* Toolbar */}
              <div className="h-12 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 bg-white dark:bg-slate-900">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse" />
                    Active
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700" />
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800" />
                </div>
              </div>

              {/* Canvas Area */}
              <div className="relative h-[450px] bg-slate-50/50 dark:bg-slate-950/50 p-8 overflow-hidden">
                {/* Grid Pattern */}
                <div className="absolute inset-0" 
                  style={{ 
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.1) 1px, transparent 0)',
                    backgroundSize: '24px 24px' 
                  }} 
                />
                
                {/* Flow Nodes */}
                <div className="relative z-10 flex items-center justify-center h-full">
                  <FlowPreview animated={isInView} />
                </div>

                {/* Floating Action Button */}
                <div className="absolute bottom-6 right-6">
                  <div className="w-12 h-12 bg-blue-600 rounded-full shadow-lg shadow-blue-600/20 flex items-center justify-center text-white hover:scale-110 transition-transform cursor-pointer">
                    <Zap className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: Live Chat Preview (Phone Style) */}
          <motion.div
            initial={{ opacity: 0, x: 50, rotateY: -10 }}
            animate={isInView ? { opacity: 1, x: 0, rotateY: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.8, type: "spring" }}
            className="relative flex justify-center"
          >
            <div className="relative w-[320px] md:w-[360px] h-[650px] bg-slate-900 rounded-[3rem] border-[8px] border-slate-900 shadow-2xl overflow-hidden">
              {/* Dynamic Island / Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-20" />

              {/* Screen Content */}
              <div className="w-full h-full bg-white dark:bg-slate-950 flex flex-col">
                {/* Status Bar */}
                <div className="h-12 bg-slate-50 dark:bg-slate-900 flex items-end justify-between px-6 pb-2 text-[10px] font-medium text-slate-900 dark:text-white">
                  <span>9:41</span>
                  <div className="flex gap-1">
                    <div className="w-3 h-3 bg-slate-900 dark:bg-white rounded-full opacity-20" />
                    <div className="w-3 h-3 bg-slate-900 dark:bg-white rounded-full opacity-20" />
                    <div className="w-3 h-3 bg-slate-900 dark:bg-white rounded-full" />
                  </div>
                </div>

                {/* App Header */}
                <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 shadow-sm z-10">
                   <div className="relative">
                    <img
                      src={channelIcons[selectedChannel].url}
                      alt={selectedChannel}
                      className="w-10 h-10 rounded-full p-1 bg-slate-50 dark:bg-slate-800 object-contain"
                    />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full" />
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-sm">
                      {t(`channels.${selectedChannel}.name`)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {isTyping ? 'Typing...' : 'Online'}
                    </div>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 bg-slate-50 dark:bg-slate-950/50 p-4 overflow-y-auto space-y-4 scrollbar-hide">
                  {demoConversations[selectedChannel].map((msg, idx) => (
                    <AnimatedChatBubble
                      key={idx}
                      message={msg.message}
                      sender={msg.sender}
                      channel={selectedChannel}
                      delay={idx * 0.8}
                    />
                  ))}
                  {isTyping && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-1 p-3 bg-white dark:bg-slate-900 rounded-2xl rounded-tl-none w-16 shadow-sm"
                    >
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </motion.div>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                  {/* Channel Selector (Tabs) */}
                  <Tabs
                    value={selectedChannel}
                    onValueChange={(value) => setSelectedChannel(value as Channel)}
                    className="w-full mb-4"
                  >
                    <TabsList className="w-full grid grid-cols-3 bg-slate-100 dark:bg-slate-800 h-9 p-1">
                      {['whatsapp', 'instagram', 'email'].map((channel) => (
                        <TabsTrigger 
                          key={channel}
                          value={channel}
                          className="text-[10px] h-7 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm"
                        >
                          {channel.charAt(0).toUpperCase() + channel.slice(1)}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>

                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <div className="w-4 h-4 border-2 border-current rounded-full" />
                    </div>
                    <div className="flex-1 h-10 bg-slate-100 dark:bg-slate-800 rounded-full px-4 flex items-center text-sm text-slate-400">
                      Type a message...
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="h-6 bg-white dark:bg-slate-900 flex justify-center pt-2">
                  <div className="w-32 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
