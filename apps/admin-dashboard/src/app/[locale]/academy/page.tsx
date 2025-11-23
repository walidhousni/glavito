'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const mockLessons = [
  {
    id: 'intro-glavai',
    title: 'Introduction to GLAVAI',
    level: 'Beginner',
    duration: '8 min',
    description: 'Learn how GLAVAI auto-resolve, copilot, and insights work together.',
  },
  {
    id: 'omnichannel-ticketing',
    title: 'Omnichannel Ticketing Basics',
    level: 'Beginner',
    duration: '10 min',
    description: 'Understand how conversations from WhatsApp, Instagram, email, and more are unified.',
  },
  {
    id: 'workflows-automation',
    title: 'Workflows & Automation',
    level: 'Intermediate',
    duration: '12 min',
    description: 'Design automation journeys that connect ticketing, CRM, and marketing flows.',
  },
];

export default function AcademyPage() {
  const t = useTranslations('landing');

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 py-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="max-w-3xl"
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              {t('academy.title', { default: 'Glavito Academy' })}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('academy.subtitle', {
                default:
                  'Bite-sized lessons for your future content team, support leaders, and sales operators.',
              })}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-10">
        <div className="grid gap-6 md:grid-cols-3">
          {mockLessons.map((lesson) => (
            <Card key={lesson.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg mb-1">{lesson.title}</CardTitle>
                <div className="text-xs text-muted-foreground">
                  {lesson.level} • {lesson.duration}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{lesson.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}


