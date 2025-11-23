'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Shield, Zap, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModernAuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const slides = [
  {
    icon: MessageSquare,
    title: 'Collaborate on key conversations',
    description: 'Combine all your messaging channels into one and work together efficiently across teams through automatic chat assignment and internal notes.',
    color: 'bg-blue-500'
  },
  {
    icon: Zap,
    title: 'Automate your workflows',
    description: 'Set up powerful automation rules to route conversations, tag customers, and trigger actions based on specific events.',
    color: 'bg-purple-500'
  },
  {
    icon: BarChart3,
    title: 'Gain actionable insights',
    description: 'Track team performance, response times, and customer satisfaction with detailed analytics and reporting dashboards.',
    color: 'bg-indigo-500'
  }
];

export function ModernAuthLayout({ children, title, subtitle }: ModernAuthLayoutProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen flex w-full bg-white dark:bg-gray-950">
      {/* Left Column - Carousel */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gray-50 dark:bg-gray-900 overflow-hidden flex-col justify-between p-12">
        {/* Logo */}
        <div className="relative z-10 flex items-center space-x-2">
          <div className="p-2 bg-blue-600 rounded-lg">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">Glavito</span>
        </div>

        {/* Carousel Content */}
        <div className="relative z-10 max-w-lg mx-auto w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
              className="space-y-8 text-center"
            >
              {/* Illustration Placeholder */}
              <div className="relative h-64 w-full flex items-center justify-center mb-8">
                <div className={cn("w-32 h-32 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20", slides[currentSlide].color)}>
                  {React.createElement(slides[currentSlide].icon, { className: "h-16 w-16 text-white" })}
                </div>
                {/* Decorative elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-full blur-3xl -z-10" />
              </div>

              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                {slides[currentSlide].title}
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
                {slides[currentSlide].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel Indicators */}
        <div className="relative z-10 flex justify-center space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                currentSlide === index 
                  ? "w-8 bg-blue-600" 
                  : "bg-gray-300 dark:bg-gray-700 hover:bg-blue-400"
              )}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Right Column - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 bg-white dark:bg-gray-950">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center space-x-2 mb-8">
            <div className="p-2 bg-blue-600 rounded-lg">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">Glavito</span>
          </div>

          <div className="text-center space-y-2">
            {title && (
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}