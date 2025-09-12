'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Eye, Play, CheckCircle, Clock, BarChart3, Sparkles, Star, Rocket, ArrowRight, Users, Bot, Settings } from 'lucide-react';
import { onboardingAPI } from '@/lib/api/onboarding';
import { N8NTemplate, WorkflowAutomationRequest } from '@glavito/shared-types';

interface WorkflowTemplateSelectorProps {
    onWorkflowCreated: (workflow: any) => void;
}

export function WorkflowTemplateSelector({ onWorkflowCreated }: WorkflowTemplateSelectorProps) {
    const t = useTranslations('onboarding.workflows.workflowTemplates');
    const tCategories = useTranslations('onboarding.workflows.workflowTemplates.categories');
    const [templates, setTemplates] = useState<N8NTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<N8NTemplate | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');

    const categories = [
        { id: 'all', name: tCategories('all'), count: templates.length },
         { id: 'ticket-management', name: tCategories('tickets'), count: templates.filter(t => t.category === 'ticket-management').length },
         { id: 'customer-experience', name: tCategories('customer'), count: templates.filter(t => t.category === 'customer-experience').length },
         { id: 'automation', name: tCategories('automation'), count: templates.filter(t => t.category === 'automation').length },
    ];

    const filteredTemplates = activeCategory === 'all'
        ? templates
        : templates.filter(template => template.category === activeCategory);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            setIsLoading(true);
            const templateList = await onboardingAPI.getWorkflowTemplates();
            setTemplates(templateList || []);
        } catch (error) {
            console.error('Failed to load workflow templates:', error);
            setTemplates([]);
        } finally {
            setIsLoading(false);
        }
    };

    const createWorkflow = async (template: N8NTemplate) => {
        try {
            setIsCreating(true);
            const workflowRequest: WorkflowAutomationRequest = {
                name: template.name,
                description: template.description,
                workflowType: 'n8n',
                workflowDefinition: {
                    name: template.name,
                    description: template.description,
                    nodes: template.workflow.nodes || [],
                    connections: template.workflow.connections || {},
                    settings: template.workflow.settings || {}
                }
            };

            const workflow = await onboardingAPI.createWorkflow(workflowRequest);
            await onboardingAPI.activateWorkflow(workflow.id);
            onWorkflowCreated({ ...workflow, isActive: true });
        } catch (error) {
            console.error('Failed to create workflow:', error);
        } finally {
            setIsCreating(false);
        }
    };

    const getComplexityColor = (complexity: string) => {
        switch (complexity) {
            case 'beginner':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'intermediate':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'advanced':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getComplexityIcon = (complexity: string) => {
        switch (complexity) {
            case 'beginner':
                return <CheckCircle className="w-3 h-3" />;
            case 'intermediate':
                return <Clock className="w-3 h-3" />;
            case 'advanced':
                return <BarChart3 className="w-3 h-3" />;
            default:
                return <Zap className="w-3 h-3" />;
        }
    };

    return (
        <div className="space-y-8">
            {/* Enhanced Header */}
            <div className="text-center relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl opacity-50" />
                <div className="relative py-8 px-6">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                            <Rocket className="w-6 h-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                            {t('title')}
                        </h3>
                        <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
                    </div>
                    <p className="text-slate-600 max-w-2xl mx-auto leading-relaxed">
                        {t('description')}
                    </p>
                </div>
            </div>

            {/* Enhanced Category Tabs */}
            <Tabs value={activeCategory} onValueChange={setActiveCategory}>
                <div className="bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
                    <TabsList className="grid w-full grid-cols-4 bg-slate-50 rounded-lg p-1">
                        {categories.map((category) => (
                            <TabsTrigger 
                                key={category.id} 
                                value={category.id} 
                                className="text-sm font-medium transition-all duration-200 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-700"
                            >
                                <div className="flex items-center gap-2">
                                    <span>{category.name}</span>
                                    {category.count > 0 && (
                                        <Badge 
                                            variant="secondary" 
                                            className="text-xs bg-blue-100 text-blue-700 border-0 data-[state=active]:bg-blue-200"
                                        >
                                            {category.count}
                                        </Badge>
                                    )}
                                </div>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                <TabsContent value={activeCategory} className="mt-6">
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Card key={i} className="animate-pulse border-0 shadow-lg">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-10 h-10 bg-slate-200 rounded-xl"></div>
                                            <div className="flex-1">
                                                <div className="h-4 bg-slate-200 rounded-lg w-3/4 mb-2"></div>
                                                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                                            </div>
                                        </div>
                                        <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
                                        <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex justify-between items-center">
                                            <div className="h-6 bg-slate-200 rounded-full w-20"></div>
                                            <div className="flex gap-2">
                                                <div className="h-8 bg-slate-200 rounded-lg w-16"></div>
                                                <div className="h-8 bg-slate-200 rounded-lg w-20"></div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredTemplates.map((template, index) => (
                                <Card 
                                    key={template.id} 
                                    className="group hover:shadow-xl transition-all duration-300 border-0 shadow-lg hover:scale-[1.02] bg-gradient-to-br from-white to-slate-50 overflow-hidden relative"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    
                                    <CardHeader className="pb-4 relative z-10">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                                                    {template.category === 'ticket-management' && <Settings className="w-5 h-5 text-white" />}
                                                    {template.category === 'customer-experience' && <Users className="w-5 h-5 text-white" />}
                                                    {template.category === 'automation' && <Bot className="w-5 h-5 text-white" />}
                                                    {!['ticket-management', 'customer-experience', 'automation'].includes(template.category) && <Zap className="w-5 h-5 text-white" />}
                                                </div>
                                                <div className="flex-1">
                                                    <CardTitle className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition-colors duration-200">
                                                        {template.name}
                                                    </CardTitle>
                                                </div>
                                            </div>
                                            <Badge
                                                className={`${getComplexityColor(template.complexity)} flex items-center gap-1.5 px-3 py-1 font-medium border-0 shadow-sm`}
                                            >
                                                {getComplexityIcon(template.complexity)}
                                                <span className="capitalize">{template.complexity}</span>
                                            </Badge>
                                        </div>
                                        <CardDescription className="text-slate-600 leading-relaxed line-clamp-2">
                                            {template.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-0 relative z-10">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                <span className="text-sm text-slate-600 font-medium capitalize">{template.category.replace('-', ' ')}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-slate-500">
                                                <Star className="w-3 h-3 text-yellow-500" />
                                                <span>{t('popular')}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="flex-1 border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                                                        onClick={() => setSelectedTemplate(template)}
                                                    >
                                                        <Eye className="w-3 h-3 mr-1.5" />
                                                        {t('preview')}
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                    <DialogHeader>
                                                        <DialogTitle className="flex items-center space-x-2">
                                                            <Zap className="w-5 h-5 text-blue-600" />
                                                            <span>{selectedTemplate?.name}</span>
                                                        </DialogTitle>
                                                        <DialogDescription>
                                                            {selectedTemplate?.description}
                                                        </DialogDescription>
                                                    </DialogHeader>
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                                            <div>
                                                                <span className="font-medium">{t('category')}</span>
                                                                <Badge variant="outline" className="ml-2">
                                                                    {selectedTemplate?.category}
                                                                </Badge>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium">{t('complexity')}</span>
                                                                <Badge className={`ml-2 ${selectedTemplate ? getComplexityColor(selectedTemplate.complexity) : ''}`}>
                                                                    {selectedTemplate?.complexity}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-medium mb-2">{t('workflowSteps')}</h4>
                                                            <div className="bg-gray-50 rounded-lg p-4">
                                                                <div className="space-y-2">
                                                                    {selectedTemplate?.workflow.nodes?.map((node: any, index: number) => (
                                                                        <div key={index} className="flex items-center space-x-2 text-sm">
                                                                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                                                                                {index + 1}
                                                                            </div>
                                                                            <span>{node.name || node.type}</span>
                                                                        </div>
                                                                    )) || (
                                                                        <p className="text-gray-500 text-sm">{t('workflowDetailsNotAvailable')}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex justify-end space-x-2">
                                                            <Button
                                                                onClick={() => selectedTemplate && createWorkflow(selectedTemplate)}
                                                                disabled={isCreating}
                                                                className="flex items-center space-x-2"
                                                            >
                                                                {isCreating ? (
                                                                    <>
                                                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                        <span>{t('creating')}</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Play className="w-3 h-3" />
                                                                        <span>{t('createWorkflow')}</span>
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                            <Button
                                                size="sm"
                                                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 group"
                                                onClick={() => createWorkflow(template)}
                                                disabled={isCreating}
                                            >
                                                {isCreating ? (
                                                    <>
                                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5"></div>
                                                        {t('creating')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Rocket className="w-3 h-3 mr-1.5 group-hover:translate-x-0.5 transition-transform duration-200" />
                                                        {t('create')}
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {!isLoading && filteredTemplates.length === 0 && (
                        <div className="text-center py-12">
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 rounded-full blur-2xl opacity-50" />
                                <div className="relative p-6 bg-white rounded-2xl shadow-lg border border-slate-200 inline-block">
                                    <Zap className="w-12 h-12 text-slate-400 mx-auto" />
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-3">{t('noTemplatesFound')}</h3>
                            <p className="text-slate-600 max-w-md mx-auto leading-relaxed">
                                {activeCategory === 'all'
                                    ? t('noTemplatesMessage')
                                    : t('noCategoryTemplatesMessage', { category: categories.find(c => c.id === activeCategory)?.name ?? '' })
                                }
                            </p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}