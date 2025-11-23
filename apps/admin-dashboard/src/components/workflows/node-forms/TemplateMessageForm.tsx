'use client';

import { validateTemplateMessage, ValidationError } from './shared/validation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { VariableInput } from './shared/VariableInput';
import { ChannelSelector } from './shared/ChannelSelector';
import { channelsApi, WhatsAppTemplate } from '@/lib/api/channels-client';
import { Loader2, RefreshCw } from 'lucide-react';

interface TemplateMessageFormProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export function TemplateMessageForm({ config, onChange }: TemplateMessageFormProps) {
  const [waTemplates, setWaTemplates] = useState<WhatsAppTemplate[] | null>(null);
  const [waLoading, setWaLoading] = useState(false);

  const channel = config.channel || 'whatsapp';
  const templateId = config.templateId || config.template || '';
  const templateParams = config.templateParams || {};
  const conversationId = config.conversationId || '';

  const loadWATemplates = async (refresh = false) => {
    try {
      setWaLoading(true);
      const items = await channelsApi.listWhatsAppTemplates(refresh);
      setWaTemplates(items);
    } catch {
      setWaTemplates([]);
    } finally {
      setWaLoading(false);
    }
  };

  useEffect(() => {
    if (channel === 'whatsapp' && waTemplates === null) {
      loadWATemplates(false);
    }
  }, [channel]);

  const selectedTemplate = waTemplates?.find((t) => t.name === templateId);

  const errors = validateTemplateMessage(config);

  const updateConfig = (updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <div className="space-y-1">
              {errors.map((error, idx) => (
                <div key={idx}>
                  <strong>{error.field}:</strong> {error.message}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
      <div className="grid grid-cols-2 gap-2">
        <ChannelSelector
          value={channel}
          onChange={(v) => updateConfig({ channel: v })}
          label="Channel"
          allowAuto
        />
        <div className="space-y-1">
          <Label className="text-xs">Template ID</Label>
          <Input
            value={templateId}
            onChange={(e) => updateConfig({ templateId: e.target.value, template: e.target.value })}
            placeholder="order_confirmation"
            className="h-8"
          />
        </div>
      </div>

      {channel === 'whatsapp' && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-xs">WhatsApp Templates</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => loadWATemplates(true)}
              className="h-6 text-xs"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${waLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div className="border rounded-md p-2 max-h-48 overflow-auto bg-muted/30">
            {waTemplates === null && !waLoading && (
              <button
                className="text-xs underline"
                type="button"
                onClick={() => loadWATemplates(false)}
              >
                Load templates
              </button>
            )}
            {waLoading && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading...
              </div>
            )}
            {Array.isArray(waTemplates) && waTemplates.length > 0 && (
              <div className="space-y-1">
                {waTemplates.map((t) => (
                  <div
                    key={t.name}
                    className="flex items-start justify-between text-xs gap-2 p-1 rounded hover:bg-accent cursor-pointer"
                    onClick={() => updateConfig({ templateId: t.name, template: t.name })}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{t.name}</div>
                      {t.previewBody && (
                        <div className="text-muted-foreground truncate">{t.previewBody}</div>
                      )}
                      {t.language && (
                        <div className="text-muted-foreground text-[10px]">({t.language})</div>
                      )}
                    </div>
                    {templateId === t.name && (
                      <div className="text-primary">✓</div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {Array.isArray(waTemplates) && waTemplates.length === 0 && !waLoading && (
              <div className="text-xs text-muted-foreground">No templates found.</div>
            )}
          </div>
        </div>
      )}

      {selectedTemplate && selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs">Template Parameters</Label>
          <div className="space-y-2">
            {selectedTemplate.variables.map((varName) => (
              <VariableInput
                key={varName}
                value={templateParams[varName] || ''}
                onChange={(value) =>
                  updateConfig({
                    templateParams: { ...templateParams, [varName]: value },
                  })
                }
                label={varName}
                placeholder={`{{${varName}}}`}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs">Template Params (JSON)</Label>
        <Textarea
          className="font-mono text-xs min-h-[80px]"
          value={JSON.stringify(templateParams, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value || '{}');
              updateConfig({ templateParams: parsed });
            } catch {
              // Ignore invalid JSON while typing
            }
          }}
        />
      </div>

      <VariableInput
        value={conversationId}
        onChange={(v) => updateConfig({ conversationId: v })}
        label="Conversation ID (optional)"
        placeholder="Leave empty to auto-detect"
      />
      <p className="text-[11px] text-muted-foreground">
        Leave empty to auto-find by ticket/customer context
      </p>
    </div>
  );
}

