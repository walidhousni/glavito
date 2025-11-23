'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useTranslations } from 'next-intl';
import { useCrmStore } from '@/lib/store/crm-store';
import { Badge } from '@/components/ui/badge';

interface SegmentDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  segment?: { id: string; name: string; description?: string } | null;
}

export function SegmentDialog({ open, onOpenChange, segment }: SegmentDialogProps) {
  const t = useTranslations('crm');
  const { createSegment, updateSegment, refreshSegments, previewSegment, recalcSegment } = useCrmStore();
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [preview, setPreview] = React.useState<{ sampleCount: number; totalMatched: number; sampleCustomerIds: string[] } | null>(null);
  const [recalcLoading, setRecalcLoading] = React.useState(false);

  React.useEffect(() => {
    if (segment) {
      setName(segment.name || '');
      setDescription(segment.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [segment, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{segment ? t('segments.editTitle') : t('segments.createTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t('segments.name')}
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('segments.namePlaceholder')} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {t('segments.description')}
            </label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('segments.descriptionPlaceholder')} />
          </div>
          {segment && (
            <div className="rounded-lg border p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">{t('segments.membership')}</h4>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={async () => {
                    const res = await previewSegment(segment.id);
                    setPreview(res);
                  }}>{t('segments.preview')}</Button>
                  <Button size="sm" variant="secondary" disabled={recalcLoading} onClick={async () => {
                    setRecalcLoading(true);
                    try {
                      await recalcSegment(segment.id);
                      const res = await previewSegment(segment.id);
                      setPreview(res);
                    } finally {
                      setRecalcLoading(false);
                    }
                  }}>{t('segments.recalculate')}</Button>
                </div>
              </div>
              {preview && (
                <div className="text-sm text-muted-foreground space-y-2">
                  <div className="flex items-center justify-between">
                    <span>{t('segments.totalMatched')}:</span>
                    <Badge variant="outline">{preview.totalMatched}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t('segments.sampleCount')}:</span>
                    <span>{preview.sampleCount}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('segments.cancel')}</Button>
            <Button disabled={saving || name.trim().length === 0} onClick={async () => {
              setSaving(true);
              try {
                if (segment) {
                  await updateSegment(segment.id, { name, description });
                } else {
                  await createSegment({ name, description });
                }
                await refreshSegments();
                onOpenChange(false);
              } finally {
                setSaving(false);
              }
            }}>{segment ? t('segments.save') : t('segments.create')}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


