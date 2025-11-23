'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Sparkles, 
  Zap, 
  Users, 
  MessageSquare, 
  Mail, 
  Instagram, 
  Phone,
  Bot,
  ArrowRight,
  Clock,
  Layers,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { workflowsApi } from '@/lib/api/workflows-client';
import { workflowTemplates, type WorkflowTemplate } from '@/lib/workflows/templates';
import { cn } from '@/lib/utils';

type TemplateInfo = {
  slug: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  nodeCount?: number;
  triggerTypes?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  channels?: string[];
  estimatedExecutionTime?: string;
};

interface CreateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (workflowId: string) => void;
}

export function CreateWorkflowDialog({ open, onOpenChange, onCreated }: CreateWorkflowDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    if (open) {
      setSelectedTemplate('');
      setTemplateSearch('');
      setName('');
      setDescription('');
      setCategory('general');
      setCurrentStep(1);
      
      // Load from local templates
      const normalized: TemplateInfo[] = workflowTemplates.map((t: WorkflowTemplate): TemplateInfo => ({
        slug: t.id,
        name: t.name,
        description: t.description,
        category: t.category,
        tags: t.tags,
        nodeCount: t.nodes.length,
        triggerTypes: ['event'],
        difficulty: t.difficulty,
        channels: t.channels,
        estimatedExecutionTime: t.estimatedExecutionTime
      }));
      setTemplates(normalized);
    }
  }, [open]);

  const filteredTemplates = useMemo<TemplateInfo[]>(() => {
    const base = Array.isArray(templates) ? templates : [];
    const q = templateSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((tpl) =>
      (tpl.name || '').toLowerCase().includes(q) ||
      (tpl.description || '').toLowerCase().includes(q) ||
      (tpl.category || '').toLowerCase().includes(q) ||
      (tpl.tags || []).some((x) => (x || '').toLowerCase().includes(q))
    );
  }, [templateSearch, templates]);

  const extractId = (res: unknown): string | undefined => {
    const r = res as { id?: string } | { data?: { id?: string } } | undefined;
    if (!r) return undefined;
    if (typeof (r as { id?: string }).id === 'string') return (r as { id?: string }).id;
    if (typeof (r as { data?: { id?: string } }).data?.id === 'string') return (r as { data?: { id?: string } }).data?.id;
    return undefined;
  };

  const handleCreate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      setError(null);
      if (selectedTemplate && selectedTemplate !== 'list') {
        // selectedTemplate now contains the slug
        const res = await workflowsApi.createFromTemplate(selectedTemplate, { metadata: { category } });
        const id = extractId(res);
        if (id) {
          onCreated(String(id));
          onOpenChange(false);
        } else {
          setError('Failed to create from template');
        }
      } else {
        if (!name.trim()) {
          setError('Name is required');
          return;
        }
        const payload = {
          name: name || 'New Workflow',
          description: description || '',
          type: 'n8n',
          priority: 0,
          isActive: true,
          triggers: [],
          nodes: [],
          connections: [],
          metadata: { category, tags: [], version: '1.0' },
        };
        const res = await workflowsApi.create(payload);
        const id = extractId(res);
        if (id) {
          onCreated(String(id));
          onOpenChange(false);
        } else {
          setError('Failed to create workflow');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const getTemplateIcon = (category: string): React.ReactElement => {
    switch (category) {
      case 'routing': return <Zap className="h-4 w-4" />;
      case 'sla': return <Clock className="h-4 w-4" />;
      case 'onboarding': return <Users className="h-4 w-4" />;
      case 'chatbot': return <Bot className="h-4 w-4" />;
      default: return <Sparkles className="h-4 w-4" />;
    }
  };

  const getChannelIcon = (tag: string): React.ReactElement | null => {
    switch (tag) {
      case 'whatsapp': return <MessageSquare className="h-3 w-3" />;
      case 'instagram': return <Instagram className="h-3 w-3" />;
      case 'email': return <Mail className="h-3 w-3" />;
      case 'sms': return <Phone className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-2xl font-bold mb-6">Create new flow</DialogTitle>
            
            {/* Step Wizard Indicator */}
            <div className="flex items-center gap-2 mb-6">
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                currentStep === 1 ? "bg-blue-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
              )}>
                <span className="font-semibold text-sm">1 Flow type</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                currentStep === 2 ? "bg-blue-500 text-white" : currentStep > 2 ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" : "bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600"
              )}>
                <span className="font-semibold text-sm">2 Flow template</span>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                currentStep === 3 ? "bg-blue-500 text-white" : "bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600"
              )}>
                <span className="font-semibold text-sm">3 Flow settings</span>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {error && (
              <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
                  <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
                    <div className="h-2 w-2 bg-white rounded-full" />
                  </div>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}

            {/* Step 1: Flow Type Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Choose Flow Type</h3>
                  <p className="text-sm text-muted-foreground">Select the type of flow builder you want to use</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Advanced Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplate('advanced');
                      setCurrentStep(2);
                    }}
                    className="group relative p-6 rounded-lg border-2 transition-all text-left bg-card hover:border-primary hover:shadow-md"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-base">Advanced</h4>
                      <Badge variant="default" className="text-xs">BETA</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Smarter, more flexible flows with AI-powered nodes and exclusive integration capabilities.
                    </p>
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-foreground">Features:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• AI-powered nodes</li>
                        <li>• Integration nodes (Salesforce, Google Sheets, HubSpot)</li>
                        <li>• All channel support</li>
                      </ul>
                    </div>
                  </button>

                  {/* Classic Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTemplate('classic');
                      setCurrentStep(2);
                    }}
                    className="group relative p-6 rounded-lg border-2 transition-all text-left bg-card hover:border-primary hover:shadow-md"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-base">Classic</h4>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Classic Flow Builder with familiar features and setup.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Standard workflow builder with core features.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Flow Template Selection */}
            {currentStep === 2 && (
              <div className="space-y-4 flex-1 overflow-auto">
            {/* Search Bar */}
                <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates by name, category, or tags..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="pl-10 h-12 text-base border-2 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Templates Grid */}
                <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  Template Gallery
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {filteredTemplates.length} templates
                </Badge>
              </div>

              {filteredTemplates.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
                  {filteredTemplates.map((tpl: TemplateInfo) => (
                        <button
                          key={tpl.slug}
                          type="button"
                          onClick={() => setSelectedTemplate(tpl.slug)}
                          className={`group relative p-4 rounded-lg border-2 transition-all text-left ${
                            selectedTemplate === tpl.slug 
                              ? 'border-primary bg-primary/5 shadow-sm' 
                              : 'border-border hover:border-primary/50 bg-card'
                          }`}
                        >
                          {selectedTemplate === tpl.slug && (
                            <div className="absolute -top-2 -right-2 p-1 rounded-full bg-primary text-primary-foreground">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </div>
                          )}
                          
                          <div className="flex items-start gap-3 mb-2">
                            <div className={`p-2 rounded-md shrink-0 ${
                              selectedTemplate === tpl.slug 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted'
                            }`}>
                              {getTemplateIcon(tpl.category || '')}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm line-clamp-1 mb-1">
                                {tpl.name}
                              </h4>
                              {tpl.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                  {tpl.description}
                                </p>
                              )}
                            </div>
                          </div>

                            <div className="flex items-center gap-2 flex-wrap">
                              {tpl.difficulty && (
                                <Badge 
                                  variant={tpl.difficulty === 'beginner' ? 'default' : tpl.difficulty === 'intermediate' ? 'secondary' : 'outline'}
                                className="text-[10px] px-1.5 py-0.5"
                                >
                                  {tpl.difficulty}
                                </Badge>
                              )}
                              {tpl.estimatedExecutionTime && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  <span>{tpl.estimatedExecutionTime}</span>
                                </div>
                              )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Layers className="h-3 w-3" />
                              <span>{tpl.nodeCount || 0}</span>
                            </div>
                              {tpl.channels && tpl.channels.length > 0 && (
                              <div className="flex items-center gap-1 ml-auto">
                                {tpl.channels.slice(0, 2).map((channel) => {
                                    const icon = getChannelIcon(channel);
                                  return icon ? (
                                      <div key={channel} className="p-1 rounded bg-muted">
                                      {icon}
                                    </div>
                                    ) : null;
                                })}
                                {tpl.channels.length > 2 && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                    +{tpl.channels.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4">
                    <Search className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">No templates found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Try adjusting your search terms or create a workflow from scratch
                  </p>
                </div>
              )}

                  <Separator className="my-4" />

                  {/* Custom Workflow Option */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      <h3 className="text-sm font-semibold">Or create from scratch</h3>
                    </div>
                  
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="workflow-name-step2" className="text-xs font-medium">
                          Workflow Name *
                        </Label>
                        <Input
                          id="workflow-name-step2"
                          placeholder="Enter workflow name..."
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="h-9 text-sm"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <Label htmlFor="workflow-category-step2" className="text-xs font-medium">
                          Category
                        </Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="routing">Routing</SelectItem>
                            <SelectItem value="escalation">Escalation</SelectItem>
                            <SelectItem value="automation">Automation</SelectItem>
                            <SelectItem value="sla">SLA</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label htmlFor="workflow-description-step2" className="text-xs font-medium">
                        Description
                      </Label>
                      <Input
                        id="workflow-description-step2"
                        placeholder="Describe what this workflow does..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Flow Settings */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Flow Settings</h3>
                  <p className="text-sm text-muted-foreground">Configure your workflow details</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="workflow-name" className="text-sm font-medium">
                      Workflow Name *
                    </Label>
                    <Input
                      id="workflow-name"
                      placeholder="Enter workflow name..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="workflow-category" className="text-sm font-medium">
                      Category
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="routing">Routing</SelectItem>
                        <SelectItem value="escalation">Escalation</SelectItem>
                        <SelectItem value="automation">Automation</SelectItem>
                        <SelectItem value="sla">SLA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="workflow-description" className="text-sm font-medium">
                    Description
                  </Label>
                  <Input
                    id="workflow-description"
                    placeholder="Describe what this workflow does..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-10"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 border-t">
            {currentStep > 1 && (
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3)} 
                disabled={loading}
                className="h-11 px-6"
              >
                Back
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={loading}
              className="h-11 px-6"
            >
              Cancel
            </Button>
            {currentStep < 3 ? (
              <Button 
                onClick={() => {
                  if (currentStep === 1) {
                    setCurrentStep(2);
                  } else if (currentStep === 2) {
                    setCurrentStep(3);
                  }
                }}
                disabled={loading || (currentStep === 1 && !selectedTemplate)}
                className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Next
              </Button>
            ) : (
            <Button 
              onClick={handleCreate} 
              disabled={loading || (!selectedTemplate && !name.trim())}
                className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Create Workflow
                </div>
              )}
            </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}


