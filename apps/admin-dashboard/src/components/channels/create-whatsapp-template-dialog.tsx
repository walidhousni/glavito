'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { channelsApi } from '@/lib/api/channels-client';
import { useToast } from '@/hooks/use-toast';
import { Plus, X, Loader2, MessageSquare } from 'lucide-react';

interface CreateWhatsAppTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ButtonConfig {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phoneNumber?: string;
}

export function CreateWhatsAppTemplateDialog({ open, onOpenChange, onSuccess }: CreateWhatsAppTemplateDialogProps) {
  const t = useTranslations('whatsapp');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'MARKETING' | 'UTILITY' | 'AUTHENTICATION'>('UTILITY');
  const [language, setLanguage] = useState('en');
  const [header, setHeader] = useState('');
  const [body, setBody] = useState('Hello, this is glavito test mode operating');
  const [footer, setFooter] = useState('');
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);

  const handleAddButton = () => {
    if (buttons.length >= 3) {
      toast({
        title: 'Error',
        description: 'Maximum 3 buttons allowed',
        variant: 'destructive',
      });
      return;
    }
    setButtons([...buttons, { type: 'QUICK_REPLY', text: '' }]);
  };

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleButtonChange = (index: number, field: keyof ButtonConfig, value: string) => {
    const updated = [...buttons];
    updated[index] = { ...updated[index], [field]: value };
    setButtons(updated);
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'Template name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!body.trim()) {
      toast({
        title: 'Error',
        description: 'Template body is required',
        variant: 'destructive',
      });
      return;
    }

    // Validate buttons
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      if (!button.text.trim()) {
        toast({
          title: 'Error',
          description: `Button ${i + 1} text is required`,
          variant: 'destructive',
        });
        return;
      }
      if (button.type === 'URL' && !button.url?.trim()) {
        toast({
          title: 'Error',
          description: `Button ${i + 1} URL is required`,
          variant: 'destructive',
        });
        return;
      }
      if (button.type === 'PHONE_NUMBER' && !button.phoneNumber?.trim()) {
        toast({
          title: 'Error',
          description: `Button ${i + 1} phone number is required`,
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);
    try {
      const result = await channelsApi.createWhatsAppTemplate({
        name,
        category,
        language,
        body,
        header: header.trim() || undefined,
        footer: footer.trim() || undefined,
        buttons: buttons.length > 0 ? buttons : undefined,
      });

      toast({
        title: 'Success',
        description: `Template "${result.name}" created successfully. Status: ${result.status}. ${result.message || 'It will be reviewed by Meta and approved within 24 hours.'}`,
      });

      // Reset form
      setName('');
      setCategory('UTILITY');
      setLanguage('en');
      setHeader('');
      setBody('Hello, this is glavito test mode operating');
      setFooter('');
      setButtons([]);

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to create template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Create WhatsApp Template
          </DialogTitle>
          <DialogDescription>
            Create a new WhatsApp message template. Templates must be approved by Meta before use (usually within 24 hours).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              placeholder="e.g., glavito_test_mode"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={512}
            />
            <p className="text-xs text-muted-foreground">
              Use lowercase letters, numbers, and underscores only. Max 512 characters.
            </p>
          </div>

          {/* Category and Language */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTILITY">Utility</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language *</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">Arabic</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                  <SelectItem value="fr">French</SelectItem>
                  <SelectItem value="de">German</SelectItem>
                  <SelectItem value="pt">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Header (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="header">Header (Optional)</Label>
            <Input
              id="header"
              placeholder="Template header text"
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">Max 60 characters. Appears at the top of the message.</p>
          </div>

          {/* Body (Required) */}
          <div className="space-y-2">
            <Label htmlFor="body">Body Text *</Label>
            <Textarea
              id="body"
              placeholder="Hello, this is glavito test mode operating"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={1024}
            />
            <p className="text-xs text-muted-foreground">
              Use {'{{1}}'}, {'{{2}}'}, etc. for variables. Max 1024 characters.
            </p>
          </div>

          {/* Footer (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="footer">Footer (Optional)</Label>
            <Input
              id="footer"
              placeholder="Template footer text"
              value={footer}
              onChange={(e) => setFooter(e.target.value)}
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">Max 60 characters. Appears at the bottom of the message.</p>
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Buttons (Optional, Max 3)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddButton}
                disabled={buttons.length >= 3}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Button
              </Button>
            </div>

            {buttons.map((button, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">Button {index + 1}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveButton(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={button.type}
                      onValueChange={(v) => handleButtonChange(index, 'type', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                        <SelectItem value="URL">URL</SelectItem>
                        <SelectItem value="PHONE_NUMBER">Phone Number</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Button Text *</Label>
                    <Input
                      placeholder="Button label"
                      value={button.text}
                      onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                      maxLength={20}
                    />
                  </div>
                </div>

                {button.type === 'URL' && (
                  <div className="space-y-2">
                    <Label>URL *</Label>
                    <Input
                      placeholder="https://example.com"
                      value={button.url || ''}
                      onChange={(e) => handleButtonChange(index, 'url', e.target.value)}
                    />
                  </div>
                )}

                {button.type === 'PHONE_NUMBER' && (
                  <div className="space-y-2">
                    <Label>Phone Number *</Label>
                    <Input
                      placeholder="+1234567890"
                      value={button.phoneNumber || ''}
                      onChange={(e) => handleButtonChange(index, 'phoneNumber', e.target.value)}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

