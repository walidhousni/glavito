'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IndustryTemplate {
  id: string;
  industry: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  usageCount: number;
  _count?: {
    applications: number;
  };
}

interface IndustryTemplateSelectorProps {
  onSelect: (template: IndustryTemplate) => void;
  onSkip?: () => void;
  selectedId?: string;
  apiUrl?: string;
}

const INDUSTRY_NAMES: Record<string, string> = {
  'e-commerce': 'E-commerce',
  'automotive': 'Automotive',
  'healthcare': 'Healthcare',
  'real-estate': 'Real Estate',
  'hospitality': 'Hospitality',
  'saas': 'SaaS',
  'finance': 'Finance',
  'education': 'Education',
  'retail': 'Retail',
  'manufacturing': 'Manufacturing'
};

export function IndustryTemplateSelector({
  onSelect,
  onSkip,
  selectedId,
  apiUrl = '/api/templates'
}: IndustryTemplateSelectorProps) {
  const [templates, setTemplates] = useState<IndustryTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<IndustryTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${apiUrl}?isActive=true`);
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    INDUSTRY_NAMES[template.industry]?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (template: IndustryTemplate) => {
    setSelectedTemplate(template);
    onSelect(template);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading industry templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search industries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence>
          {filteredTemplates.map((template, index) => {
            const isSelected = selectedId === template.id || selectedTemplate?.id === template.id;
            
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={cn(
                    'group cursor-pointer transition-all hover:shadow-lg',
                    isSelected && 'ring-2 ring-primary'
                  )}
                  onClick={() => handleSelect(template)}
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${template.color}20` }}
                      >
                        <img
                          src={template.icon}
                          alt={INDUSTRY_NAMES[template.industry] || template.industry}
                          className="h-8 w-8"
                        />
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="rounded-full bg-primary p-1 text-primary-foreground"
                        >
                          <Check className="h-4 w-4" />
                        </motion.div>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {INDUSTRY_NAMES[template.industry] || template.industry}
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs">
                        {template.name}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {template.description}
                    </p>
                    {template._count && template._count.applications > 0 && (
                      <Badge variant="secondary" className="mt-3">
                        Used by {template._count.applications} {template._count.applications === 1 ? 'company' : 'companies'}
                      </Badge>
                    )}
                  </CardContent>
                  <div
                    className="absolute inset-0 -z-10 rounded-lg opacity-0 transition-opacity group-hover:opacity-10"
                    style={{ backgroundColor: template.color }}
                  />
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredTemplates.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No templates found matching your search.</p>
        </div>
      )}

      {/* Actions */}
      {onSkip && (
        <div className="flex justify-center pt-4">
          <Button variant="ghost" onClick={onSkip}>
            Skip for now
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

