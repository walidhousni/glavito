'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { marketingApi } from '@/lib/api/marketing-client';

interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segmentId: string;
  segmentName?: string;
}

export function CampaignDialog({ open, onOpenChange, segmentId, segmentName }: CampaignDialogProps) {
  const [name, setName] = React.useState<string>('');
  const [type, setType] = React.useState<'EMAIL' | 'SMS' | 'SOCIAL' | 'WEBINAR' | 'CONTENT' | 'PAID_ADS'>('EMAIL');
  const [subject, setSubject] = React.useState<string>('');
  const [description, setDescription] = React.useState<string>('');
  const [scheduleAt, setScheduleAt] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName(segmentName ? `${segmentName} – Campaign` : 'New Campaign');
      setType('EMAIL');
      setSubject('');
      setDescription('');
      setScheduleAt('');
      setLoading(false);
    }
  }, [open, segmentName]);

  async function createDraft() {
    setLoading(true);
    try {
      await marketingApi.create({ name, type, subject: subject || undefined, description: description || undefined, segmentId, status: 'DRAFT' });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  async function launchNow() {
    setLoading(true);
    try {
      const created = await marketingApi.create({ name, type, subject: subject || undefined, description: description || undefined, segmentId, status: 'SCHEDULED' });
      if (scheduleAt) {
        await marketingApi.schedule(created.id, scheduleAt);
      } else {
        await marketingApi.launch(created.id);
      }
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create campaign for segment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="SMS">SMS</SelectItem>
                  <SelectItem value="SOCIAL">Social</SelectItem>
                  <SelectItem value="WEBINAR">Webinar</SelectItem>
                  <SelectItem value="CONTENT">Content</SelectItem>
                  <SelectItem value="PAID_ADS">Paid Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Schedule (optional)</Label>
              <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
            </div>
          </div>
          {type === 'EMAIL' && (
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Internal description (optional)" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button variant="secondary" onClick={createDraft} disabled={loading || !name.trim()}>Save Draft</Button>
            <Button className="btn-gradient" onClick={launchNow} disabled={loading || !name.trim()}> {scheduleAt ? 'Schedule' : 'Launch now'} </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



