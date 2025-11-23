"use client";
import React from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AISuggestion = { response: string; tone?: string; confidence?: number; reasoning?: string }

interface AISuggestionsBarProps {
  loading?: boolean
  suggestions: AISuggestion[]
  onPick: (text: string) => void
  className?: string
  showToggle?: boolean
  enabled?: boolean
  onToggle?: (enabled: boolean) => void
}

export function AISuggestionsBar({ loading, suggestions, onPick, className, showToggle, enabled = true, onToggle }: AISuggestionsBarProps) {
  const t = useTranslations('ai.suggestionsBar')
  
  // optional: persist toggle across sessions
  React.useEffect(() => {
    try {
      if (typeof enabled === 'boolean') {
        localStorage.setItem('aiSuggestions.enabled', String(enabled))
      }
    } catch { /* noop */ }
  }, [enabled])

  if (showToggle) {
    return (
      <div className={cn("modern-card p-3", className)}>
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 select-none">
            <input 
              type="checkbox" 
              checked={enabled} 
              onChange={(e) => onToggle?.(e.target.checked)}
              className="rounded border-slate-300 text-primary focus:ring-primary/20"
            />
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('enabled')}</span>
            </div>
          </label>
          {enabled && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Sparkles className="h-3 w-3" />
              <span>{t('smart')}</span>
            </div>
          )}
        </div>
        
        {enabled && (
          loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>{t('generating')}</span>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {suggestions.slice(0, 3).map((s, i) => (
                <Button 
                  key={i} 
                  variant="outline" 
                  size="sm" 
                  className="h-8 px-3 text-xs modern-btn-secondary hover:bg-primary/5 hover:border-primary/30"
                  onClick={() => onPick(s.response)} 
                  title={`${s.tone || 'auto'} • ${Math.round((s.confidence || 0) * 100)}% confidence`}
                >
                  <span className="line-clamp-1">
                    {s.response.slice(0, 40)}{s.response.length > 40 ? '…' : ''}
                  </span>
                </Button>
              ))}
            </div>
          )
        )}
      </div>
    )
  }

  if (!enabled) return null

  return (
    <div className={cn("modern-card p-3", className)}>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span>{t('generating')}</span>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Brain className="h-3 w-3" />
            <span>{t('title')}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {suggestions.slice(0, 3).map((s, i) => (
              <Button 
                key={i} 
                variant="outline" 
                size="sm" 
                className="h-8 px-3 text-xs modern-btn-secondary hover:bg-primary/5 hover:border-primary/30"
                onClick={() => onPick(s.response)} 
                title={`${s.tone || 'auto'} • ${Math.round((s.confidence || 0) * 100)}% confidence`}
              >
                <span className="line-clamp-1">
                  {s.response.slice(0, 40)}{s.response.length > 40 ? '…' : ''}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AISuggestionsBar


