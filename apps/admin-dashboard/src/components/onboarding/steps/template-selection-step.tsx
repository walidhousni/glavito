/**
 * Template Selection Step Component
 * Handles template selection and customization during onboarding
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  LayoutTemplate,
  Star,
  Users,
  Clock,
  CheckCircle,
  Eye,
  Sparkles,
  Filter,
  Search,
  ArrowRight,
  Download,
  Heart,
  Zap,
  Building,
  Code,
  ShoppingCart,
  Stethoscope,
  GraduationCap,
} from 'lucide-react';

interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  category: string;
  version: string;
  isOfficial: boolean;
  tags: string[];
  rating: number;
  usageCount: number;
  estimatedSetupTime: number;
  screenshots: string[];
  features: string[];
}

interface SmartRecommendation {
  templateId: string;
  confidence: number;
  reasons: string[];
  estimatedBenefit: string;
  customizations: Array<{
    field: string;
    suggestedValue: any;
    reason: string;
  }>;
}

interface TemplateSelectionStepProps {
  onNext: () => void;
  onPrevious: () => void;
  isLoading?: boolean;
}

export function TemplateSelectionStep({
  onNext,
  onPrevious,
  isLoading = false,
}: TemplateSelectionStepProps) {
  const t = useTranslations('onboarding.templates');
  const [activeTab, setActiveTab] = useState('recommended');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [templates, setTemplates] = useState<OnboardingTemplate[]>([]);
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);
  const [previewTemplate, setPreviewTemplate] = useState<OnboardingTemplate | null>(null);
  const [customizations, setCustomizations] = useState<Record<string, any>>({});

  const industries = [
    { value: 'technology', label: t('industries.technology'), icon: Code },
    { value: 'ecommerce', label: t('industries.ecommerce'), icon: ShoppingCart },
    { value: 'healthcare', label: t('industries.healthcare'), icon: Stethoscope },
    { value: 'education', label: t('industries.education'), icon: GraduationCap },
    { value: 'finance', label: t('industries.finance'), icon: Building },
  ];

  const categories = [
    { value: 'complete', label: t('categories.complete') },
    { value: 'workflow', label: t('categories.workflow') },
    { value: 'faq', label: t('categories.faq') },
    { value: 'email', label: t('categories.email') },
    { value: 'dashboard', label: t('categories.dashboard') },
  ];

  useEffect(() => {
    loadTemplates();
    loadRecommendations();
  }, [selectedIndustry, selectedCategory, searchQuery]);

  const loadTemplates = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedIndustry) params.append('industry', selectedIndustry);
      if (selectedCategory) params.append('category', selectedCategory);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/onboarding/templates?${params}`);
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadRecommendations = async () => {
    try {
      const response = await fetch('/api/onboarding/templates/recommendations');
      const data = await response.json();
      setRecommendations(data);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    // Load customizations for recommended templates
    const recommendation = recommendations.find(r => r.templateId === templateId);
    if (recommendation) {
      const customizationMap: Record<string, any> = {};
      recommendation.customizations.forEach(c => {
        customizationMap[c.field] = c.suggestedValue;
      });
      setCustomizations(customizationMap);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await fetch(`/api/onboarding/templates/${selectedTemplate}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customizations),
      });

      if (response.ok) {
        onNext();
      } else {
        console.error('Failed to apply template');
      }
    } catch (error) {
      console.error('Failed to apply template:', error);
    }
  };

  const getIndustryIcon = (industry: string) => {
    const industryData = industries.find(i => i.value === industry);
    return industryData?.icon || Building;
  };

  const filteredTemplates = templates.filter(template => {
    if (searchQuery && !template.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const renderTemplateCard = (template: OnboardingTemplate, isRecommended = false) => {
    const recommendation = recommendations.find(r => r.templateId === template.id);
    const IndustryIcon = getIndustryIcon(template.industry);

    return (
      <Card
        key={template.id}
        className={`cursor-pointer transition-all hover:shadow-md ${
          selectedTemplate === template.id
            ? 'ring-2 ring-blue-500 bg-blue-50'
            : 'hover:bg-gray-50'
        }`}
        onClick={() => handleTemplateSelect(template.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <IndustryIcon className="h-5 w-5 text-gray-600" />
              <div>
                <h3 className="font-medium text-sm">{template.name}</h3>
                {template.isOfficial && (
                  <Badge variant="secondary" className="text-xs mt-1">
                    {t('official')}
                  </Badge>
                )}
              </div>
            </div>
            {selectedTemplate === template.id && (
              <CheckCircle className="h-5 w-5 text-blue-600" />
            )}
          </div>

          <p className="text-sm text-gray-600 mb-3 line-clamp-2">
            {template.description}
          </p>

          {isRecommended && recommendation && (
            <div className="mb-3">
              <div className="flex items-center space-x-1 mb-1">
                <Sparkles className="h-4 w-4 text-yellow-500" />
                <span className="text-xs font-medium text-yellow-700">
                  {Math.round(recommendation.confidence * 100)}% {t('match')}
                </span>
              </div>
              <p className="text-xs text-gray-600">{recommendation.estimatedBenefit}</p>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Star className="h-3 w-3 fill-current text-yellow-400" />
                <span>{template.rating}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>{template.usageCount}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{template.estimatedSetupTime}m</span>
              </div>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewTemplate(template);
                  }}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {t('preview')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{template.name}</DialogTitle>
                  <DialogDescription>{template.description}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="font-medium">{t('industry')}</Label>
                      <p className="capitalize">{template.industry}</p>
                    </div>
                    <div>
                      <Label className="font-medium">{t('category')}</Label>
                      <p className="capitalize">{template.category}</p>
                    </div>
                    <div>
                      <Label className="font-medium">{t('setupTime')}</Label>
                      <p>{template.estimatedSetupTime} {t('minutes')}</p>
                    </div>
                    <div>
                      <Label className="font-medium">{t('version')}</Label>
                      <p>{template.version}</p>
                    </div>
                  </div>

                  {template.features.length > 0 && (
                    <div>
                      <Label className="font-medium mb-2 block">{t('features')}</Label>
                      <div className="flex flex-wrap gap-1">
                        {template.features.map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {template.tags.length > 0 && (
                    <div>
                      <Label className="font-medium mb-2 block">{t('tags')}</Label>
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {template.tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{template.tags.length - 3}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderRecommendedTab = () => (
    <div className="space-y-6">
      {recommendations.length > 0 ? (
        <>
          <div className="text-center">
            <Sparkles className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">{t('smartRecommendations')}</h3>
            <p className="text-gray-600">{t('recommendationsDescription')}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((recommendation) => {
              const template = templates.find(t => t.id === recommendation.templateId);
              return template ? renderTemplateCard(template, true) : null;
            })}
          </div>

          {selectedTemplate && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">{t('customizations')}</h4>
              <div className="space-y-3">
                {recommendations
                  .find(r => r.templateId === selectedTemplate)
                  ?.customizations.map((customization, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{customization.field}</p>
                        <p className="text-xs text-gray-600">{customization.reason}</p>
                      </div>
                      <Badge variant="secondary">{customization.suggestedValue}</Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <LayoutTemplate className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('noRecommendations')}</h3>
          <p className="text-gray-600">{t('noRecommendationsDescription')}</p>
        </div>
      )}
    </div>
  );

  const renderBrowseTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('searchTemplates')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('selectIndustry')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('allIndustries')}</SelectItem>
            {industries.map((industry) => (
              <SelectItem key={industry.value} value={industry.value}>
                {industry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('selectCategory')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('allCategories')}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => renderTemplateCard(template))}
        </div>
      ) : (
        <div className="text-center py-12">
          <LayoutTemplate className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('noTemplatesFound')}</h3>
          <p className="text-gray-600">{t('noTemplatesFoundDescription')}</p>
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div>
        <h2 className="text-2xl font-bold mb-2">{t('title')}</h2>
        <p className="text-gray-600">{t('description')}</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="recommended" disabled={isLoading}>
                <Sparkles className="h-4 w-4 mr-2" />
                {t('recommended')}
              </TabsTrigger>
              <TabsTrigger value="browse" disabled={isLoading}>
                <Filter className="h-4 w-4 mr-2" />
                {t('browse')}
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="recommended" className="mt-0">
                {renderRecommendedTab()}
              </TabsContent>

              <TabsContent value="browse" className="mt-0">
                {renderBrowseTab()}
              </TabsContent>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {selectedTemplate && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            {t('templateSelected', { 
              name: templates.find(t => t.id === selectedTemplate)?.name || ''
            })}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious} disabled={isLoading}>
          {t('previous')}
        </Button>
        <Button 
          onClick={selectedTemplate ? handleApplyTemplate : onNext} 
          disabled={isLoading}
        >
          {selectedTemplate ? (
            <>
              <Zap className="h-4 w-4 mr-2" />
              {t('applyTemplate')}
            </>
          ) : (
            <>
              {t('skipTemplate')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}