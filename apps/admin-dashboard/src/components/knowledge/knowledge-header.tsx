'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Search, Plus, Sparkles } from 'lucide-react'

interface KnowledgeHeaderProps {
  query: string
  semantic: boolean
  onQueryChange: (query: string) => void
  onSemanticChange: (semantic: boolean) => void
  onCreateArticle: () => void
}

export function KnowledgeHeader({
  query,
  semantic,
  onQueryChange,
  onSemanticChange,
  onCreateArticle
}: KnowledgeHeaderProps) {
  const t = useTranslations('knowledge')

  return (
    <div className="bg-gradient-to-r from-slate-50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl p-8 mb-8 border border-slate-200/60 dark:border-slate-700/60 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
              {t('title', { fallback: 'Knowledge Base' })}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {t('subtitle', { fallback: 'Manage articles, FAQs, and analytics' })}
            </p>
          </div>
        </div>
        <Button
          onClick={onCreateArticle}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3 h-12"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('newArticle', { fallback: 'New Article' })}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 group">
          <Search className="h-5 w-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors" />
          <Input
            placeholder={t('searchPlaceholder', { fallback: 'Search articles, FAQs, or content...' })}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="pl-12 pr-4 bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60 rounded-xl h-12 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 shadow-sm backdrop-blur-sm transition-all hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-800"
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-2 bg-white/60 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 backdrop-blur-sm">
          <Switch
            id="semantic"
            checked={semantic}
            onCheckedChange={onSemanticChange}
            className="data-[state=checked]:bg-blue-600"
          />
          <Label htmlFor="semantic" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
            {t('semanticSearch', { fallback: 'Semantic Search' })}
          </Label>
        </div>
      </div>
    </div>
  )
}
