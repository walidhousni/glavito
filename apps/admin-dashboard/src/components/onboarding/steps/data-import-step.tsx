'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileText, 
  Users, 
  MessageSquare,
  BookOpen,
  CheckCircle,
  AlertCircle,
  Download
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DataImportStepProps {
  data: any;
  onComplete: (data: any) => Promise<void>;
  isLoading: boolean;
}

export function DataImportStep({ data, onComplete, isLoading }: DataImportStepProps) {
  const t = useTranslations('onboarding.steps.dataImport');
  const tn = useTranslations('onboarding');
  const tr = (key: string, fallback: string) => {
    try {
      const value = t(key as any);
      return value === key ? fallback : value;
    } catch {
      return fallback;
    }
  };
  
  const [importOption, setImportOption] = useState<'skip' | 'csv' | 'platform'>(data.importOption || 'skip');
  const [selectedPlatform, setSelectedPlatform] = useState(data.selectedPlatform || '');

  const platforms = [
    { id: 'zendesk', name: 'Zendesk', icon: '🎫' },
    { id: 'freshdesk', name: 'Freshdesk', icon: '🍃' },
    { id: 'intercom', name: 'Intercom', icon: '💬' },
    { id: 'helpscout', name: 'Help Scout', icon: '🔍' },
    { id: 'custom', name: tr('platforms.custom', 'Custom/Other'), icon: '⚙️' },
  ];

  const importTypes = [
    {
      id: 'customers',
      name: tr('types.customers.name', 'Customers'),
      description: tr('types.customers.description', 'Import customer profiles and contact information'),
      icon: Users,
      supported: true,
    },
    {
      id: 'tickets',
      name: tr('types.tickets.name', 'Tickets'),
      description: tr('types.tickets.description', 'Import support tickets and conversation history'),
      icon: MessageSquare,
      supported: true,
    },
    {
      id: 'knowledge-base',
      name: tr('types.knowledgeBase.name', 'Knowledge Base'),
      description: tr('types.knowledgeBase.description', 'Import articles and FAQ content'),
      icon: BookOpen,
      supported: true,
    },
    {
      id: 'agents',
      name: tr('types.agents.name', 'Agents'),
      description: tr('types.agents.description', 'Import agent profiles and permissions'),
      icon: Users,
      supported: false,
    },
  ];

  const handleSubmit = async () => {
    const importData = {
      importOption,
      selectedPlatform: importOption === 'platform' ? selectedPlatform : null,
      importTypes: importOption !== 'skip' ? importTypes.filter(t => t.supported).map(t => t.id) : [],
      settings: {
        skipDuplicates: true,
        updateExisting: false,
        validateData: true,
        notifyOnCompletion: true,
      },
    };

    await onComplete(importData);
  };

  return (
    <div className="space-y-6">
      {/* Import Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Upload className="w-6 h-6 text-primary" />
            <CardTitle>{tr('overview.title', 'Data Import Overview')}</CardTitle>
          </div>
          <CardDescription>
            {tr('overview.description', 'Import your existing customers, tickets, and knowledge base')}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Import Options */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card 
          className={`cursor-pointer transition-all ${importOption === 'skip' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => setImportOption('skip')}
        >
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-6 h-6 text-gray-600" />
            </div>
            <CardTitle className="text-lg">{tr('options.skip.title', 'Start Fresh')}</CardTitle>
            <CardDescription>{tr('options.skip.description', 'Begin with a clean slate')}</CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${importOption === 'csv' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => setImportOption('csv')}
        >
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-lg">{tr('options.csv.title', 'CSV Import')}</CardTitle>
            <CardDescription>{tr('options.csv.description', 'Import data from CSV files')}</CardDescription>
          </CardHeader>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${importOption === 'platform' ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
          onClick={() => setImportOption('platform')}
        >
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Upload className="w-6 h-6 text-purple-600" />
            </div>
            <CardTitle className="text-lg">{tr('options.platform.title', 'Platform Migration')}</CardTitle>
            <CardDescription>{tr('options.platform.description', 'Migrate from another support platform')}</CardDescription>
            <Badge className="mt-2">{tr('recommended', 'Recommended')}</Badge>
          </CardHeader>
        </Card>
      </div>

      {/* Platform Selection */}
      {importOption === 'platform' && (
        <Card>
          <CardHeader>
            <CardTitle>{tr('platforms.title', 'Select Platform')}</CardTitle>
            <CardDescription>{tr('platforms.description', 'Choose your current support platform')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {platforms.map((platform) => (
                <div
                  key={platform.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedPlatform === platform.id ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}
                  onClick={() => setSelectedPlatform(platform.id)}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">{platform.icon}</div>
                    <h3 className="font-medium">{platform.name}</h3>
                    {selectedPlatform === platform.id && (
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto mt-2" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Types */}
      {importOption !== 'skip' && (
        <Card>
          <CardHeader>
            <CardTitle>{tr('types.title', 'Data Types')}</CardTitle>
            <CardDescription>{tr('types.description', 'What data would you like to import?')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              {importTypes.map((type) => (
                <div
                  key={type.id}
                  className={`p-4 border rounded-lg ${
                    type.supported ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        type.supported ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <type.icon className={`w-5 h-5 ${
                          type.supported ? 'text-green-600' : 'text-gray-500'
                        }`} />
                      </div>
                      <div>
                        <h3 className="font-medium">{type.name}</h3>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                    </div>
                    {type.supported ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Badge variant="secondary">{tr('types.comingSoon', 'Coming Soon')}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CSV Templates */}
      {importOption === 'csv' && (
        <Card>
          <CardHeader>
            <CardTitle>{tr('templates.title', 'CSV Templates')}</CardTitle>
            <CardDescription>{tr('templates.description', 'Download templates to format your data correctly')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {importTypes.filter(t => t.supported).map((type) => (
                <div key={type.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <type.icon className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">{type.name} {tr('templates.template', 'Template')}</span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    {tr('templates.download', 'Download')}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Settings */}
      {importOption !== 'skip' && (
        <Card>
          <CardHeader>
            <CardTitle>{tr('settings.title', 'Import Settings')}</CardTitle>
            <CardDescription>{tr('settings.description', 'Configure how your data should be imported')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">{tr('settings.note.title', 'Important')}</h4>
                    <p className="text-sm text-yellow-700 mt-1">{tr('settings.note.description', 'You can always import more data later from the settings page')}</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <Input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">{tr('settings.options.skipDuplicates', 'Skip duplicate records')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Input type="checkbox" className="rounded" />
                  <span className="text-sm">{tr('settings.options.updateExisting', 'Update existing records')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">{tr('settings.options.validateData', 'Validate data before importing')}</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Input type="checkbox" defaultChecked className="rounded" />
                  <span className="text-sm">{tr('settings.options.notifyOnCompletion', 'Send notification when import is complete')}</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || (importOption === 'platform' && !selectedPlatform)}
          size="lg"
        >
          {isLoading ? tn('loading.saving') : tn('navigation.next')}
        </Button>
      </div>
    </div>
  );
}