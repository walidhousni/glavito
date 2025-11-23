'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check, CheckCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AnimatedChatBubbleProps {
  message: string;
  sender: 'customer' | 'agent';
  channel: 'whatsapp' | 'instagram' | 'email' | 'sms';
  delay?: number;
  showStatus?: boolean;
  status?: 'sent' | 'delivered' | 'read';
  isTyping?: boolean;
  avatar?: string;
}

export function AnimatedChatBubble({
  message,
  sender,
  channel,
  delay = 0,
  showStatus = true,
  status = 'read',
  isTyping = false,
  avatar,
}: AnimatedChatBubbleProps) {
  const t = useTranslations('landing');
  const isAgent = sender === 'agent';

  const channelStyles = {
    whatsapp: {
      bg: 'bg-[#DCF8C6] dark:bg-[#056162]',
      text: 'text-gray-900 dark:text-white',
      agentBg: 'bg-[#25D366]',
      icon: 'text-[#25D366]',
    },
    instagram: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-900 dark:text-white',
      agentBg: 'bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737]',
      icon: 'text-[#C13584]',
    },
    email: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-gray-900 dark:text-white',
      agentBg: 'bg-blue-600',
      icon: 'text-blue-600',
    },
    sms: {
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-900 dark:text-white',
      agentBg: 'bg-gray-900 dark:bg-gray-600',
      icon: 'text-gray-600',
    },
  };

  const currentStyle = channelStyles[channel];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.4, type: 'spring', stiffness: 100 }}
      className={cn(
        'flex items-end gap-3 mb-4 w-full',
        isAgent ? 'justify-end' : 'justify-start'
      )}
    >
      {!isAgent && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.1 }}
          className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center shadow-sm overflow-hidden"
        >
          {avatar ? (
            <img src={avatar} alt="Customer" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs font-bold text-gray-500 dark:text-gray-300">C</span>
          )}
        </motion.div>
      )}

      <div className={cn(
        "flex flex-col max-w-[75%]", 
        isAgent ? "items-end" : "items-start"
      )}>
        <div
          className={cn(
            'relative px-5 py-3 shadow-sm text-sm leading-relaxed',
            isAgent 
              ? cn(currentStyle.agentBg, 'text-white rounded-2xl rounded-tr-sm') 
              : cn('bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl rounded-tl-sm')
          )}
        >
          {isTyping ? (
            <div className="flex items-center gap-1.5 py-1 px-1">
              <motion.span
                className="w-1.5 h-1.5 bg-current rounded-full opacity-60"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
              />
              <motion.span
                className="w-1.5 h-1.5 bg-current rounded-full opacity-60"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
              />
              <motion.span
                className="w-1.5 h-1.5 bg-current rounded-full opacity-60"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
              />
            </div>
          ) : (
            <>
              <p>{message}</p>
              {isAgent && showStatus && (
                <div className="flex items-center justify-end mt-1 gap-1 select-none">
                  <span className="text-[10px] opacity-70">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex">
                    {status === 'sent' && <Check className="w-3 h-3 opacity-70" />}
                    {status === 'delivered' && <CheckCheck className="w-3 h-3 opacity-70" />}
                    {status === 'read' && <CheckCheck className="w-3 h-3 text-blue-100 opacity-100" />}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Channel Indicator for Agent */}
        {isAgent && !isTyping && (
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.5 }}
            className="text-[10px] text-gray-400 mt-1 mr-1 capitalize"
          >
            Via {channel}
          </motion.span>
        )}
      </div>

      {isAgent && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: delay + 0.1 }}
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-md',
            currentStyle.agentBg
          )}
        >
          {avatar ? (
            <img src={avatar} alt="Agent" className="w-full h-full object-cover rounded-full" />
          ) : (
            <span className="text-xs font-bold text-white">A</span>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

