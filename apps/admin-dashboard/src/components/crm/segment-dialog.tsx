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
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium mb-1">{t('segments.name')}</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('segments.namePlaceholder')} />
          </div>
          <div>
            <div className="text-sm font-medium mb-1">{t('segments.description')}</div>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('segments.descriptionPlaceholder')} />
          </div>
          {segment && (
            <div className="rounded-md border p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{t('segments.membership')}</div>
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
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>{t('segments.totalMatched')}: <Badge variant="outline">{preview.totalMatched}</Badge></div>
                  <div>{t('segments.sampleCount')}: {preview.sampleCount}</div>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t('segments.cancel')}</Button>
            <Button className="btn-gradient" disabled={saving || name.trim().length === 0} onClick={async () => {
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


