'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import {
  Loader2,
  CheckCircle2,
  Database,
  Workflow,
  Clock,
  Route,
  LayoutDashboard,
  BarChart3,
  GitBranch,
  Zap,
  Palette,
  Package
} from 'lucide-react';

interface TemplatePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: any;
  onApply: (options: ApplyTemplateOptions) => Promise<void>;
}

interface ApplyTemplateOptions {
  applyCustomFields?: boolean;
  applyWorkflows?: boolean;
  applySLA?: boolean;
  applyRouting?: boolean;
  applyDashboards?: boolean;
  applyAnalytics?: boolean;
  applyPipelines?: boolean;
  applyAutomations?: boolean;
  applyIntegrations?: boolean;
  applyPortalTheme?: boolean;
}

export function TemplatePreviewModal({
  open,
  onOpenChange,
  template,
  onApply
}: TemplatePreviewModalProps) {
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [options, setOptions] = useState<ApplyTemplateOptions>({
    applyCustomFields: true,
    applyWorkflows: true,
    applySLA: true,
    applyRouting: true,
    applyDashboards: true,
    applyAnalytics: true,
    applyPipelines: true,
    applyAutomations: false,
    applyIntegrations: false,
    applyPortalTheme: true
  });

  if (!template) return null;

  const handleApply = async () => {
    try {
      setApplying(true);
      await onApply(options);
      setApplied(true);
      setTimeout(() => {
        onOpenChange(false);
        setApplied(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to apply template:', error);
    } finally {
      setApplying(false);
    }
  };

  const templateSections = [
    {
      key: 'applyCustomFields',
      icon: Database,
      label: 'Custom Fields',
      description: 'Industry-specific data fields',
      count: Object.values(template.customFieldsSchema || {}).flat().length
    },
    {
      key: 'applyWorkflows',
      icon: Workflow,
      label: 'Workflows',
      description: 'Pre-built automation workflows',
      count: (template.workflowTemplates || []).length
    },
    {
      key: 'applySLA',
      icon: Clock,
      label: 'SLA Policies',
      description: 'Service level agreements',
      count: (template.slaTemplates || []).length
    },
    {
      key: 'applyRouting',
      icon: Route,
      label: 'Routing Rules',
      description: 'Ticket routing strategies',
      count: template.routingRules ? 1 : 0
    },
    {
      key: 'applyDashboards',
      icon: LayoutDashboard,
      label: 'Dashboard Layouts',
      description: 'Pre-configured dashboard views',
      count: Object.keys(template.dashboardLayouts || {}).length
    },
    {
      key: 'applyAnalytics',
      icon: BarChart3,
      label: 'Analytics Presets',
      description: 'Industry KPIs and reports',
      count: (template.analyticsPresets || []).length
    },
    {
      key: 'applyPipelines',
      icon: GitBranch,
      label: 'CRM Pipelines',
      description: 'Sales pipeline stages',
      count: Object.keys(template.pipelineStages || {}).length
    },
    {
      key: 'applyAutomations',
      icon: Zap,
      label: 'Automation Recipes',
      description: 'Advanced automation scenarios',
      count: (template.automationRecipes || []).length
    },
    {
      key: 'applyPortalTheme',
      icon: Palette,
      label: 'Portal Theme',
      description: 'Customer portal branding',
      count: template.portalTheme ? 1 : 0
    },
    {
      key: 'applyIntegrations',
      icon: Package,
      label: 'Integration Pack',
      description: 'Recommended integrations',
      count: (template.integrationPacks || []).length
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-lg"
              style={{ backgroundColor: `${template.color}20` }}
            >
              <img src={template.icon} alt={template.name} className="h-10 w-10" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl">{template.name}</DialogTitle>
              <DialogDescription className="mt-1">
                {template.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="customize">Customize</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4 pr-4">
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {templateSections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <Card key={section.key} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{section.label}</h4>
                            <Badge variant="secondary">{section.count}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {section.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              <div className="space-y-6">
                {template.workflowTemplates && template.workflowTemplates.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Included Workflows</h3>
                    <div className="space-y-2">
                      {template.workflowTemplates.map((workflow: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 rounded-lg border p-3"
                        >
                          <Workflow className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <h4 className="font-medium">{workflow.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {workflow.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {template.slaTemplates && template.slaTemplates.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">SLA Policies</h3>
                    <div className="space-y-2">
                      {template.slaTemplates.map((sla: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 rounded-lg border p-3"
                        >
                          <Clock className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <h4 className="font-medium">{sla.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              First Response: {sla.targets.firstResponseTime}min | Resolution: {sla.targets.resolutionTime}min
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="customize" className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Choose which components to apply to your account. You can always customize or disable these later.
              </p>
              <div className="space-y-3">
                {templateSections.map((section) => {
                  const Icon = section.icon;
                  const isEnabled = options[section.key as keyof ApplyTemplateOptions];
                  const isDisabled = section.count === 0;

                  return (
                    <div
                      key={section.key}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-4',
                        isDisabled && 'opacity-50'
                      )}
                    >
                      <Checkbox
                        id={section.key}
                        checked={isEnabled}
                        onCheckedChange={(checked) =>
                          setOptions({ ...options, [section.key]: checked })
                        }
                        disabled={isDisabled}
                      />
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <Label
                        htmlFor={section.key}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{section.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {section.description}
                        </div>
                      </Label>
                      <Badge variant="secondary">{section.count}</Badge>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={applying || applied}>
            {applying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Applying...
              </>
            ) : applied ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Applied!
              </>
            ) : (
              'Apply Template'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('rounded-lg border bg-card', className)}>{children}</div>;
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

