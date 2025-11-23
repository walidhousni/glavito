'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  FaTimes, 
  FaSave, 
  FaFileAlt, 
  FaTag, 
  FaSpinner 
} from 'react-icons/fa'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'

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

  const parsedTags = editing?.tags.split(',').map(t => t.trim()).filter(Boolean) || []

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

  if (!editing) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 border-0 shadow-xl rounded-xl flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
              <FaFileAlt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">
                {editing.id ? t('editArticle', { fallback: 'Edit Article' }) : t('newArticle', { fallback: 'New Article' })}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {editing.id ? 'Update article details' : 'Create a new knowledge base article'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          <div className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">
                {t('title', { fallback: 'Title' })}
              </Label>
              <Input
                value={editing.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                placeholder={t('titlePlaceholder', { fallback: 'Enter article title...' })}
                className="h-9 text-xs border-0 shadow-sm"
              />
            </div>

            <Separator className="bg-border/50" />

            {/* Content */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">
                {t('content', { fallback: 'Content' })}
              </Label>
              <Textarea
                value={editing.content}
                onChange={(e) => onUpdate({ content: e.target.value })}
                placeholder={t('contentPlaceholder', { fallback: 'Write your article content here...' })}
                className="min-h-[300px] text-xs border-0 shadow-sm resize-none"
              />
            </div>

            <Separator className="bg-border/50" />

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-foreground">
                {t('tags', { fallback: 'Tags' })}
              </Label>
              <div className="space-y-3">
                <Input
                  placeholder={t('tagsPlaceholder', { fallback: 'Type tags and press Enter or comma...' })}
                  onKeyDown={handleTagAdd}
                  className="h-9 text-xs border-0 shadow-sm"
                />
                {parsedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {parsedTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="text-[10px] h-5 px-2 border-0 shadow-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                      >
                        <FaTag className="h-2.5 w-2.5 mr-1" />
                        {tag}
                        <button
                          onClick={() => handleTagRemove(tag)}
                          className="ml-1.5 hover:opacity-70 transition-opacity"
                        >
                          <FaTimes className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="h-9 text-xs border-0 shadow-sm"
          >
            {t('cancel', { fallback: 'Cancel' })}
          </Button>
          <Button
            onClick={onSave}
            disabled={saving || !editing.title.trim()}
            className="h-9 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm"
          >
            {saving ? (
              <>
                <FaSpinner className="h-3.5 w-3.5 mr-2 animate-spin" />
                {t('saving', { fallback: 'Saving...' })}
              </>
            ) : (
              <>
                <FaSave className="h-3.5 w-3.5 mr-2" />
                {t('save', { fallback: 'Save' })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
