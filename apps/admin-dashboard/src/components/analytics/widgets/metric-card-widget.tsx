'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

export interface MetricCardWidgetProps {
  title: string;
  value: number | string;
  previousValue?: number;
  format?: 'number' | 'currency' | 'percent' | 'duration';
  icon?: string; // Icons8 URL
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  suffix?: string;
  prefix?: string;
}

export function MetricCardWidget({
  title,
  value,
  previousValue,
  format = 'number',
  icon,
  trend,
  trendValue,
  suffix,
  prefix,
}: MetricCardWidgetProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(val);
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'duration':
        return `${val}min`;
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && (
          <img src={icon} alt="" className="h-5 w-5 text-muted-foreground" />
        )}
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-2xl font-bold">
            {prefix}
            {formatValue(value)}
            {suffix}
          </div>
          {trendValue !== undefined && (
            <div className={`flex items-center gap-1 text-xs ${getTrendColor()} mt-1`}>
              {getTrendIcon()}
              <span>
                {trendValue > 0 ? '+' : ''}
                {trendValue}%
              </span>
              <span className="text-muted-foreground">vs last period</span>
            </div>
          )}
        </motion.div>
      </CardContent>
    </Card>
  );
}

