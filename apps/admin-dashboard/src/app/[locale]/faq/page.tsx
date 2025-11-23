'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n.config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

// For v1 we keep FAQ content static; wiring to the CMS client will be a small follow-up.

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const mockFaq = [
  {
    category: 'Getting Started',
    items: [
      {
        question: 'What is Glavito?',
        answer:
          'Glavito is an AI-first omnichannel support platform that combines ticketing, CRM, workflows, and GLAVAI agents in one place.',
      },
      {
        question: 'Who is Glavito for?',
        answer:
          'Glavito is designed for SaaS companies and fast-growing teams that want to centralize customer communication and automate routine work with AI.',
      },
    ],
  },
  {
    category: 'Pricing & Billing',
    items: [
      {
        question: 'Do you offer a free trial?',
        answer: 'Yes, we offer a 14-day free trial with no credit card required.',
      },
      {
        question: 'Can I cancel anytime?',
        answer: 'Yes. You can cancel or change plans at any time from your workspace settings.',
      },
    ],
  },
];

export default function FaqPage() {
  const t = useTranslations('landing');
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    if (!query.trim()) return mockFaq;
    const lower = query.toLowerCase();
    return mockFaq
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.question.toLowerCase().includes(lower) ||
            item.answer.toLowerCase().includes(lower),
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [query]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-6 py-10">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.h1
              variants={fadeUp}
              className="text-4xl md:text-5xl font-bold tracking-tight mb-4"
            >
              {t('faq.title', { default: 'Frequently Asked Questions' })}
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="text-lg text-muted-foreground mb-6"
            >
              {t('faq.subtitle', {
                default: 'Answers to the most common questions about Glavito.',
              })}
            </motion.p>
            <motion.div
              variants={fadeUp}
              className="relative max-w-xl mx-auto"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search in FAQ..."
                className="pl-10"
              />
            </motion.div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="grid gap-6 md:grid-cols-2"
        >
          {filtered.map((category) => (
            <motion.div key={category.category} variants={fadeUp}>
              <Card className="h-full shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle>{category.category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {category.items.map((item) => (
                    <div key={item.question}>
                      <div className="font-medium mb-1">{item.question}</div>
                      <p className="text-sm text-muted-foreground">
                        {item.answer}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          Still have questions?{' '}
          <Link href="/auth/register" className="underline">
            Talk to our team
          </Link>
          .
        </div>
      </div>
    </div>
  );
}


