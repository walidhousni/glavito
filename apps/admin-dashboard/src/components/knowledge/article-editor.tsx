'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { X, Save, FileText, Tag, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

interface ArticleEditorProps {
  isOpen: boolean
  editing: {
    id?: string
    title: string
    content: string
    tags: string
  } | null
  saving: boolean
  onClose: () => void
  onSave: () => void
  onUpdate: (updates: Partial<{ title: string; content: string; tags: string }>) => void
}

export function ArticleEditor({
  isOpen,
  editing,
  saving,
  onClose,
  onSave,
  onUpdate
}: ArticleEditorProps) {
  const t = useTranslations('knowledge')

  if (!isOpen || !editing) return null

  const parsedTags = editing.tags.split(',').map(t => t.trim()).filter(Boolean)

  const handleTagRemove = (tagToRemove: string) => {
    const newTags = parsedTags.filter(tag => tag !== tagToRemove).join(', ')
    onUpdate({ tags: newTags })
  }

  const handleTagAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const newTag = e.currentTarget.value.trim()
      if (newTag && !parsedTags.includes(newTag)) {
        onUpdate({ tags: [...parsedTags, newTag].join(', ') })
        e.currentTarget.value = ''
      }
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        <Card className="shadow-2xl bg-white dark:bg-slate-900 rounded-2xl border-slate-200/60 dark:border-slate-700/60">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-800 dark:text-slate-200">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                {editing.id ? t('editArticle', { fallback: 'Edit Article' }) : t('newArticle', { fallback: 'New Article' })}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('title', { fallback: 'Title' })}
                </Label>
                <Input
                  value={editing.title}
                  onChange={(e) => onUpdate({ title: e.target.value })}
                  placeholder={t('titlePlaceholder', { fallback: 'Enter article title...' })}
                  className="rounded-xl border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                />
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('content', { fallback: 'Content' })}
                </Label>
                <Textarea
                  value={editing.content}
                  onChange={(e) => onUpdate({ content: e.target.value })}
                  placeholder={t('contentPlaceholder', { fallback: 'Write your article content here...' })}
                  className="min-h-[300px] rounded-xl border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none"
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('tags', { fallback: 'Tags' })}
                </Label>
                <div className="space-y-3">
                  <Input
                    placeholder={t('tagsPlaceholder', { fallback: 'Type tags and press Enter or comma...' })}
                    onKeyDown={handleTagAdd}
                    className="rounded-xl border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  />
                  {parsedTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {parsedTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-lg"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                          <button
                            onClick={() => handleTagRemove(tag)}
                            className="ml-2 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200/60 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl px-6"
            >
              {t('cancel', { fallback: 'Cancel' })}
            </Button>
            <Button
              onClick={onSave}
              disabled={saving || !editing.title.trim()}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl px-6"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('saving', { fallback: 'Saving...' })}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('save', { fallback: 'Save' })}
                </>
              )}
            </Button>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}
