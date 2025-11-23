'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { IndustryTemplateSelector } from '@/components/templates/industry-template-selector';
import { TemplatePreviewModal } from '@/components/templates/template-preview-modal';
import { templatesApi } from '@/lib/api/templates';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, ArrowRight } from 'lucide-react';

interface IndustryTemplateStepProps {
  onNext: () => void;
  onSkip: () => void;
  onBack?: () => void;
}

export function IndustryTemplateStep({ onNext, onSkip, onBack }: IndustryTemplateStepProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    setShowPreview(true);
  };

  const handleApplyTemplate = async (options: any) => {
    try {
      setApplying(true);
      const result = await templatesApi.apply(selectedTemplate.id, options);
      
      toast({
        title: 'Template applied successfully!',
        description: `Applied ${Object.values(result.results).reduce((a: any, b: any) => 
          typeof b === 'number' ? a + b : a, 0)} components to your account.`,
      });

      setShowPreview(false);
      
      // Wait a bit to show success state
      setTimeout(() => {
        onNext();
      }, 1000);
    } catch (error) {
      console.error('Failed to apply template:', error);
      toast({
        title: 'Failed to apply template',
        description: 'Please try again or skip this step.',
        variant: 'destructive',
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-3"
      >
        <div className="flex justify-center">
          <div className="rounded-full bg-gradient-to-br from-purple-500 to-pink-500 p-3">
            <Sparkles className="h-8 w-8 text-white" />
          </div>
        </div>
        <h2 className="text-3xl font-bold">Choose Your Industry</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Get started faster with pre-configured templates tailored to your industry. 
          Includes custom fields, workflows, SLA policies, and more.
        </p>
      </motion.div>

      {/* Template Selector */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <IndustryTemplateSelector
          onSelect={handleTemplateSelect}
          selectedId={selectedTemplate?.id}
        />
      </motion.div>

      {/* Navigation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-between pt-6 border-t"
      >
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onSkip}>
            Skip for now
          </Button>
          <Button
            onClick={() => selectedTemplate && setShowPreview(true)}
            disabled={!selectedTemplate}
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </motion.div>

      {/* Preview Modal */}
      {selectedTemplate && (
        <TemplatePreviewModal
          open={showPreview}
          onOpenChange={setShowPreview}
          template={selectedTemplate}
          onApply={handleApplyTemplate}
        />
      )}
    </div>
  );
}

