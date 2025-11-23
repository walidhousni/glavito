'use client';

import { motion, useInView, animate } from 'framer-motion';
import { useRef, useState, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { MetricCard } from './metric-card';
import { TrendingUp, Clock, DollarSign, Zap, Calculator, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number, prefix?: string, suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const controls = animate(0, value, {
      duration: 1,
      onUpdate: (v) => {
        node.textContent = `${prefix}${Math.round(v).toLocaleString()}${suffix}`;
      },
    });

    return () => controls.stop();
  }, [value, prefix, suffix]);

  return <span ref={ref} />;
}

export function ROICalculatorSection() {
  const t = useTranslations('landing.roiCalculator');
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  const [monthlyTickets, setMonthlyTickets] = useState(1000);
  const [hourlyRate, setHourlyRate] = useState(30);
  const [avgTimePerTicket, setAvgTimePerTicket] = useState(15);
  const [currentAutomation, setCurrentAutomation] = useState(10);

  const calculations = useMemo(() => {
    const totalMinutesPerMonth = monthlyTickets * avgTimePerTicket;
    const currentAutoMinutes = totalMinutesPerMonth * (currentAutomation / 100);
    const manualMinutes = totalMinutesPerMonth - currentAutoMinutes;

    const targetAutomation = 70;
    const newAutoMinutes = totalMinutesPerMonth * (targetAutomation / 100);
    const newManualMinutes = totalMinutesPerMonth - newAutoMinutes;

    const minutesSaved = manualMinutes - newManualMinutes;
    const hoursSavedPerMonth = Math.round(minutesSaved / 60);
    const costSavingsPerMonth = Math.round((minutesSaved / 60) * hourlyRate);
    const costSavingsPerYear = costSavingsPerMonth * 12;
    const ticketsAutomated = Math.round(
      monthlyTickets * ((targetAutomation - currentAutomation) / 100)
    );
    const roiPercentage = Math.round(
      ((costSavingsPerYear - 1200) / 1200) * 100
    );

    return {
      hoursSavedPerMonth,
      costSavingsPerMonth,
      costSavingsPerYear,
      ticketsAutomated,
      roiPercentage,
    };
  }, [monthlyTickets, hourlyRate, avgTimePerTicket, currentAutomation]);

  return (
    <section
      ref={ref}
      className="py-32 px-4 bg-white dark:bg-slate-950 relative overflow-hidden"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-[100px] -translate-y-1/2" />
        <div className="absolute top-1/2 right-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] -translate-y-1/2" />
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center justify-center p-3 mb-6 rounded-2xl bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
            <Calculator className="w-8 h-8" />
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6 text-slate-900 dark:text-white tracking-tight">
            {t('title')}
          </h2>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Input Controls (Glass Card) */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="lg:col-span-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800"
          >
            <h3 className="text-xl font-bold mb-8 text-slate-900 dark:text-white flex items-center gap-3">
              <div className="w-1 h-6 bg-blue-600 rounded-full" />
              {t('inputsTitle')}
            </h3>

            <div className="space-y-10">
              {/* Monthly Tickets */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {t('inputs.monthlyTickets')}
                  </label>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-full">
                    {monthlyTickets.toLocaleString()}
                  </span>
                </div>
                <Slider
                  value={[monthlyTickets]}
                  onValueChange={([value]) => setMonthlyTickets(value)}
                  min={100}
                  max={10000}
                  step={100}
                  className="w-full [&_.bg-primary]:bg-blue-600"
                />
              </div>

              {/* Hourly Rate */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {t('inputs.hourlyRate')}
                  </label>
                  <span className="text-sm font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                    ${hourlyRate}/hr
                  </span>
                </div>
                <Slider
                  value={[hourlyRate]}
                  onValueChange={([value]) => setHourlyRate(value)}
                  min={15}
                  max={100}
                  step={5}
                  className="w-full [&_.bg-primary]:bg-green-600"
                />
              </div>

              {/* Avg Time Per Ticket */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {t('inputs.avgTime')}
                  </label>
                  <span className="text-sm font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full">
                    {avgTimePerTicket} min
                  </span>
                </div>
                <Slider
                  value={[avgTimePerTicket]}
                  onValueChange={([value]) => setAvgTimePerTicket(value)}
                  min={5}
                  max={60}
                  step={5}
                  className="w-full [&_.bg-primary]:bg-purple-600"
                />
              </div>

              {/* Current Automation */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {t('inputs.currentAutomation')}
                  </label>
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full">
                    {currentAutomation}%
                  </span>
                </div>
                <Slider
                  value={[currentAutomation]}
                  onValueChange={([value]) => setCurrentAutomation(value)}
                  min={0}
                  max={50}
                  step={5}
                  className="w-full [&_.bg-primary]:bg-orange-600"
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
              {t('disclaimer')}
            </div>
          </motion.div>

          {/* Results (Floating Cards) */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="lg:col-span-7 space-y-6"
          >
            {/* Main Savings Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-10 shadow-2xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10">
                <div className="text-slate-300 font-medium mb-2">{t('results.costSavings')}</div>
                <div className="text-5xl md:text-7xl font-bold mb-6 tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  <AnimatedNumber value={calculations.costSavingsPerYear} prefix="$" />
                  <span className="text-2xl md:text-4xl text-slate-400 font-normal">/yr</span>
                </div>
                
                <div className="flex flex-wrap gap-4">
                   <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 text-sm">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 font-bold">
                      <AnimatedNumber value={calculations.roiPercentage} suffix="%" />
                    </span>
                    <span className="text-slate-300">ROI</span>
                   </div>
                   <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-2 text-sm">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-bold">
                      <AnimatedNumber value={calculations.hoursSavedPerMonth} />
                    </span>
                    <span className="text-slate-300">Hours Saved/mo</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Secondary Metrics Grid */}
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:scale-[1.02] transition-transform">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    <AnimatedNumber value={calculations.ticketsAutomated} />
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{t('results.ticketsAutomated')}</div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 hover:scale-[1.02] transition-transform">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white">
                    <AnimatedNumber value={calculations.roiPercentage} suffix="%" />
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Return on Investment</div>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="pt-4"
            >
              <Button
                size="lg"
                className="w-full h-16 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/20 rounded-2xl group"
              >
                {t('cta', {
                  savings: `$${calculations.costSavingsPerYear.toLocaleString()}`,
                })}
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
