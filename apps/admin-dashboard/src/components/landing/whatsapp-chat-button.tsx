'use client';

import { motion } from 'framer-motion';
import { MessageCircle, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface WhatsAppChatButtonProps {
  phoneNumber: string; // Format: country code + number (e.g., "1234567890")
  message?: string;
  position?: 'bottom-right' | 'bottom-left';
}

export function WhatsAppChatButton({ 
  phoneNumber, 
  message,
  position = 'bottom-right' 
}: WhatsAppChatButtonProps) {
  const t = useTranslations('landing');
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  // Default message with current page URL
  const defaultMessage = message || `Hi Glavito! I just visited ${typeof window !== 'undefined' ? window.location.href : 'your website'}. May I know more?`;
  
  // Construct WhatsApp URL
  const whatsappUrl = `https://api.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(defaultMessage)}`;

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
  };

  return (
    <>
      {/* Floating WhatsApp Button */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, duration: 0.3, type: 'spring' }}
        className={`fixed ${positionClasses[position]} z-50 flex flex-col items-end gap-2`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Tooltip/Message Bubble */}
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 max-w-xs mr-2 relative"
          >
            <button
              onClick={() => setShowTooltip(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Close tooltip"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 pr-4">
                <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                  {t('whatsapp.greeting', { defaultValue: 'Chat with us!' })}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('whatsapp.prompt', { defaultValue: 'Have questions? We\'re here to help via WhatsApp!' })}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main WhatsApp Button */}
        <motion.a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="relative group"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {/* Pulse animation */}
          <motion.div
            className="absolute inset-0 bg-[#25D366] rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />

          {/* Button */}
          <div className="relative w-16 h-16 bg-[#25D366] hover:bg-[#20BA5A] rounded-full shadow-2xl flex items-center justify-center transition-colors">
            <motion.div
              animate={{
                rotate: isHovered ? [0, -10, 10, -10, 0] : 0,
              }}
              transition={{
                duration: 0.5,
              }}
            >
              <MessageCircle className="w-8 h-8 text-white" />
            </motion.div>
          </div>

          {/* Notification badge (optional) */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900"
          >
            <span className="text-xs font-bold text-white">1</span>
          </motion.div>
        </motion.a>
      </motion.div>
    </>
  );
}

