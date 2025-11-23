'use client'

import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { 
  FaSearch, 
  FaPlus, 
  FaBook 
} from 'react-icons/fa'

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
              <FaBook className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">
              {t('title', { fallback: 'Knowledge Base' })}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('subtitle', { fallback: 'Manage articles, FAQs, and analytics' })}
          </p>
        </div>
        <Button
          onClick={onCreateArticle}
          className="h-9 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm"
        >
          <FaPlus className="h-3.5 w-3.5 mr-2" />
          {t('newArticle', { fallback: 'New Article' })}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <FaSearch className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder={t('searchPlaceholder', { fallback: 'Search articles, FAQs, or content...' })}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="pl-9 pr-4 h-9 border-0 shadow-sm text-xs"
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border-0 shadow-sm">
          <Switch
            id="semantic"
            checked={semantic}
            onCheckedChange={onSemanticChange}
            className="data-[state=checked]:bg-blue-600"
          />
          <Label htmlFor="semantic" className="text-xs font-medium cursor-pointer">
            {t('semanticSearch', { fallback: 'Semantic Search' })}
          </Label>
        </div>
      </div>
    </div>
  )
}
