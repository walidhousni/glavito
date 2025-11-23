'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Zap, GitBranch, Send } from 'lucide-react';

interface FlowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface FlowPreviewProps {
  nodes?: FlowNode[];
  className?: string;
  animated?: boolean;
}

export function FlowPreview({
  nodes,
  className,
  animated = true,
}: FlowPreviewProps) {
  const t = useTranslations('landing.flowPreview');

const defaultNodes: FlowNode[] = [
  {
    id: '1',
    type: 'trigger',
      label: t('nodes.trigger.label'),
    icon: <Zap className="w-4 h-4" />,
    color: 'from-yellow-500 to-orange-500',
  },
  {
    id: '2',
    type: 'condition',
      label: t('nodes.condition.label'),
    icon: <GitBranch className="w-4 h-4" />,
    color: 'from-blue-500 to-purple-500',
  },
  {
    id: '3',
    type: 'action',
      label: t('nodes.action.label'),
    icon: <Send className="w-4 h-4" />,
    color: 'from-green-500 to-emerald-500',
  },
];

  const displayNodes = nodes || defaultNodes;
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      {displayNodes.map((node, index) => (
        <div key={node.id} className="flex flex-col items-center w-full">
          {/* Node */}
          <motion.div
            initial={animated ? { opacity: 0, scale: 0.8, y: -20 } : false}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: index * 0.2, duration: 0.5, type: "spring", bounce: 0.3 }}
            className={cn(
              'relative flex items-center gap-3 px-5 py-3.5 rounded-xl w-full max-w-[280px]',
              'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg',
              'hover:scale-[1.02] transition-transform duration-300 z-10'
            )}
          >
            <div className={cn(
              "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br text-white shadow-sm",
              node.color
            )}>
              {node.icon}
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {node.label}
            </span>

            {/* Glow effect */}
            <div
              className={cn(
                'absolute inset-0 rounded-xl opacity-0 hover:opacity-10 transition-opacity duration-300',
                'bg-gradient-to-r',
                node.color
              )}
            />
          </motion.div>

          {/* Connection line with animated dots */}
          {index < displayNodes.length - 1 && (
            <div className="relative h-8 w-0.5 bg-slate-200 dark:bg-slate-800 my-1">
              {animated && (
                <motion.div
                  className={cn(
                    "absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full shadow-sm",
                    "bg-gradient-to-r",
                    displayNodes[index].color
                  )}
                  animate={{
                    y: [0, 32],
                    opacity: [1, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: index * 0.2 + 0.5,
                    ease: 'linear',
                  }}
                />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
