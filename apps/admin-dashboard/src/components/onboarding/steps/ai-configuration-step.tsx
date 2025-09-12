'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  MessageCircle, 
  TrendingUp, 
  Languages, 
  Zap,
  CheckCircle,
  Settings,
  Sparkles
} from 'lucide-react';

interface AIConfigurationStepProps {
  data: any;
  onComplete: (data: any) => Promise<void>;
  isLoading: boolean;
}

interface AIFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  isEnabled: boolean;
  isPremium: boolean;
  category: 'automation' | 'analysis' | 'enhancement';
}

export function AIConfigurationStep({ data, onComplete, isLoading }: AIConfigurationStepProps) {
  const t = useTranslations('onboarding.steps.ai');
  const tn = useTranslations('onboarding');
  const tr = (key: string, fallback: string) => {
    try {
      const value = t(key as any);
      return value === key ? fallback : value;
    } catch {
      return fallback;
    }
  };
  
  const [features, setFeatures] = useState<AIFeature[]>([
    {
      id: 'ticket-classification',
      name: tr('features.ticketClassification.title', 'AI Ticket Classification'),
      description: tr('features.ticketClassification.description', 'Automatically categorize and prioritize incoming tickets'),
      icon: Brain,
      isEnabled: data.features?.ticketClassification || false,
      isPremium: false,
      category: 'automation',
    },
    {
      id: 'sentiment-analysis',
      name: tr('features.sentimentAnalysis.title', 'Sentiment Analysis'),
      description: tr('features.sentimentAnalysis.description', 'Detect customer emotions to prioritize urgent issues'),
      icon: TrendingUp,
      isEnabled: data.features?.sentimentAnalysis || false,
      isPremium: false,
      category: 'analysis',
    },
    {
      id: 'auto-response',
      name: tr('features.autoResponse.title', 'Auto Response'),
      description: tr('features.autoResponse.description', 'Generate intelligent responses for common inquiries'),
      icon: MessageCircle,
      isEnabled: data.features?.autoResponse || false,
      isPremium: true,
      category: 'automation',
    },
    {
      id: 'language-detection',
      name: tr('features.languageDetection.title', 'Language Detection'),
      description: tr('features.languageDetection.description', 'Automatically detect and route multilingual tickets'),
      icon: Languages,
      isEnabled: data.features?.languageDetection || false,
      isPremium: false,
      category: 'enhancement',
    },
    {
      id: 'knowledge-suggestions',
      name: tr('features.knowledgeBaseSuggestions.title', 'Knowledge Base Suggestions'),
      description: tr('features.knowledgeBaseSuggestions.description', 'Suggest relevant articles to agents and customers'),
      icon: Sparkles,
      isEnabled: data.features?.knowledgeSuggestions || false,
      isPremium: true,
      category: 'enhancement',
    },
    {
      id: 'workflow-automation',
      name: tr('features.workflowAutomation.title', 'Workflow Automation'),
      description: tr('features.workflowAutomation.description', 'Automate complex ticket routing and escalation'),
      icon: Zap,
      isEnabled: data.features?.workflowAutomation || false,
      isPremium: true,
      category: 'automation',
    },
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleFeature = (featureId: string) => {
    setFeatures(prev => prev.map(feature => 
      feature.id === featureId 
        ? { ...feature, isEnabled: !feature.isEnabled }
        : feature
    ));
  };

  const handleSubmit = async () => {
    const aiConfig = {
      features: features.reduce((acc, feature) => {
        acc[feature.id.replace('-', '')] = feature.isEnabled;
        return acc;
      }, {} as Record<string, boolean>),
      customModels: data.customModels || [],
      settings: {
        confidenceThreshold: data.settings?.confidenceThreshold || 0.8,
        autoTraining: data.settings?.autoTraining || true,
        fallbackToHuman: data.settings?.fallbackToHuman || true,
      }
    };

    await onComplete(aiConfig);
  };

  const categories = [
    { id: 'all', name: tr('categories.all', 'All Features'), count: features.length },
    { id: 'automation', name: tr('categories.automation', 'Automation'), count: features.filter(f => f.category === 'automation').length },
    { id: 'analysis', name: tr('categories.analysis', 'Analysis'), count: features.filter(f => f.category === 'analysis').length },
    { id: 'enhancement', name: tr('categories.enhancement', 'Enhancement'), count: features.filter(f => f.category === 'enhancement').length },
  ];

  const filteredFeatures = selectedCategory === 'all' 
    ? features 
    : features.filter(f => f.category === selectedCategory);

  const enabledFeatures = features.filter(f => f.isEnabled);
  const premiumFeatures = enabledFeatures.filter(f => f.isPremium);

  return (
    <div className="space-y-6">
      {/* AI Overview */}
      <Card className="border">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Brain className="w-6 h-6 text-primary" />
            <CardTitle>{tr('overview.title', 'AI Overview')}</CardTitle>
          </div>
          <CardDescription>
            {tr('overview.description', 'Enhance your support with intelligent automation and insights')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{enabledFeatures.length}</div>
              <div className="text-sm text-muted-foreground">{tr('overview.enabled', 'features enabled')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{premiumFeatures.length}</div>
              <div className="text-sm text-muted-foreground">{tr('overview.premium', 'premium features')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {Math.round((enabledFeatures.length / features.length) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">{tr('overview.coverage', 'AI coverage')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
            className="flex items-center space-x-2"
          >
            <span>{category.name}</span>
            <Badge variant="secondary" className="ml-1">
              {category.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* AI Features Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredFeatures.map((feature) => (
          <Card 
            key={feature.id}
            className={`cursor-pointer transition-all ${
              feature.isEnabled 
                ? 'border-primary bg-primary/5' 
                : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => toggleFeature(feature.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    feature.isEnabled ? 'bg-primary/10' : 'bg-gray-100'
                  }`}>
                    <feature.icon className={`w-5 h-5 ${
                      feature.isEnabled ? 'text-primary' : 'text-gray-500'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-sm">{feature.name}</CardTitle>
                      {feature.isPremium && (
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 text-xs">
                          {tr('premium', 'Premium')}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="text-xs mt-1">
                      {feature.description}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {feature.isEnabled && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* AI Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <CardTitle>{tr('settings.title', 'AI Settings')}</CardTitle>
          </div>
          <CardDescription>{tr('settings.description', 'Configure how AI features work')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">{tr('settings.confidence.title', 'Confidence Threshold')}</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{tr('settings.confidence.low', 'Low')}</span>
                  <span>{tr('settings.confidence.high', 'High')}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1"
                  step="0.1"
                  defaultValue="0.8"
                  className="w-full"
                />
                <p className="text-xs text-gray-500">{tr('settings.confidence.description', 'Minimum confidence level for AI decisions')}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">{tr('settings.options.title', 'Options')}</h4>
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">{tr('settings.options.autoTraining', 'Enable automatic model training')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">{tr('settings.options.fallbackToHuman', 'Fallback to human when confidence is low')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span className="text-sm">{tr('settings.options.continuousLearning', 'Enable continuous learning from feedback')}</span>
                </label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Benefits Preview */}
      {enabledFeatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{tr('benefits.title', 'Expected Benefits')}</CardTitle>
            <CardDescription>
              {tr('benefits.description', 'With your selected AI features, you can expect:')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">{tr('benefits.efficiency', '40% improvement in response efficiency')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">{tr('benefits.accuracy', '85% accuracy in ticket classification')}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">{tr('benefits.satisfaction', 'Higher customer satisfaction scores')}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">{tr('benefits.insights', 'Better insights into customer needs')}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading}
          size="lg"
        >
          {isLoading ? tn('loading.saving') : tn('navigation.next')}
        </Button>
      </div>
    </div>
  );
}