"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { aiApi } from '@/lib/api/ai-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  Sparkles,
  MessageSquare,
  BookOpen,
  HelpCircle,
  Wand2,
  RefreshCw,
  Send
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponseSuggestion {
  response: string;
  tone: 'professional' | 'friendly' | 'empathetic' | 'technical';
  confidence: number;
  reasoning: string;
}

interface TemplateSuggestion {
  templateId: string;
  title: string;
  content: string;
  relevanceScore: number;
}

interface KnowledgeArticle {
  id: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  url?: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  relevanceScore: number;
}

interface AISuggestionsProps {
  customerMessage: string;
  conversationContext?: any;
  onResponseSelect?: (response: string) => void;
  onTemplateSelect?: (template: TemplateSuggestion) => void;
}

const emptySuggestions = {
  responses: [] as ResponseSuggestion[],
  templates: [] as TemplateSuggestion[],
  knowledgeArticles: [] as KnowledgeArticle[],
  faqs: [] as FAQ[],
};

const toneColors = {
  professional: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  friendly: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  empathetic: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
  technical: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
};

const toneIcons = {
  professional: MessageSquare,
  friendly: ThumbsUp,
  empathetic: Brain,
  technical: Wand2
};

export default function AIResponseSuggestions({ 
  customerMessage, 
  conversationContext,
  onResponseSelect,
  onTemplateSelect 
}: AISuggestionsProps) {
  const t = useTranslations('ai.suggestions');
  const [suggestions, setSuggestions] = useState(emptySuggestions);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState<string>('');
  const [customResponse, setCustomResponse] = useState<string>('');

  const handleGenerateSuggestions = async () => {
    setIsLoading(true);
    try {
      const data = await aiApi.getResponseSuggestions({ content: customerMessage, context: conversationContext });
      setSuggestions({
        responses: Array.isArray(data?.responses) ? data.responses.map((r: any) => ({
          response: String(r.response ?? ''),
          tone: (r.tone ?? 'professional') as any,
          confidence: Number(r.confidence ?? 0),
          reasoning: String(r.reasoning ?? ''),
        })) : [],
        templates: Array.isArray(data?.templates) ? data.templates : [],
        knowledgeArticles: Array.isArray(data?.knowledgeArticles) ? data.knowledgeArticles : [],
        faqs: Array.isArray(data?.faqs) ? data.faqs : [],
      });
    } catch (e) {
      setSuggestions(emptySuggestions);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = (response: string) => {
    navigator.clipboard.writeText(response);
    // You could add a toast notification here
  };

  const handleUseResponse = (response: string) => {
    setSelectedResponse(response);
    setCustomResponse(response);
    onResponseSelect?.(response);
  };

  const handleUseTemplate = (template: TemplateSuggestion) => {
    setCustomResponse(template.content);
    onTemplateSelect?.(template);
  };

  const formatConfidence = (confidence: number) => `${(confidence * 100).toFixed(0)}%`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t('title')}</h3>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button 
          onClick={handleGenerateSuggestions} 
          disabled={isLoading}
          size="sm"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {isLoading ? t('analyzing') : t('regenerate')}
        </Button>
      </div>

      {/* Customer Message Context */}
      {customerMessage && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{t('customerMessage')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              &quot;{customerMessage}&quot;
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="responses" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="responses">{t('tabs.responses')}</TabsTrigger>
          <TabsTrigger value="templates">{t('tabs.templates')}</TabsTrigger>
          <TabsTrigger value="knowledge">{t('tabs.knowledge')}</TabsTrigger>
          <TabsTrigger value="faqs">{t('tabs.faqs')}</TabsTrigger>
        </TabsList>

        <TabsContent value="responses" className="space-y-4">
          <div className="space-y-4">
            {suggestions.responses.map((suggestion, index) => {
              const ToneIcon = toneIcons[suggestion.tone];
              return (
                <Card key={index} className={cn(
                  "transition-all duration-200 hover:shadow-md",
                  selectedResponse === suggestion.response && "ring-2 ring-primary"
                )}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ToneIcon className="h-4 w-4" />
                        <Badge className={toneColors[suggestion.tone]}>
                          {suggestion.tone}
                        </Badge>
                        <Badge variant="outline">
                          {formatConfidence(suggestion.confidence)} {t('labels.confidence')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyResponse(suggestion.response)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUseResponse(suggestion.response)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm mb-3">{suggestion.response}</p>
                    <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      <strong>AI Reasoning:</strong> {suggestion.reasoning}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="space-y-4">
            {suggestions.templates.map((template) => (
              <Card key={template.templateId} className="transition-all duration-200 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <CardTitle className="text-sm">{template.title}</CardTitle>
                      <Badge variant="outline">
                        {(template.relevanceScore * 100).toFixed(0)}% match
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUseTemplate(template)}
                    >
                      Use Template
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-line">{template.content}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="knowledge" className="space-y-4">
          <div className="space-y-4">
            {suggestions.knowledgeArticles.map((article) => (
              <Card key={article.id} className="transition-all duration-200 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <CardTitle className="text-sm">{article.title}</CardTitle>
                      <Badge variant="outline">
                        {(article.relevanceScore * 100).toFixed(0)}% relevant
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {article.url && (
                        <Button variant="ghost" size="sm">
                          View Article
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyResponse(article.snippet)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{article.snippet}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="faqs" className="space-y-4">
          <div className="space-y-4">
            {suggestions.faqs.map((faq) => (
              <Card key={faq.id} className="transition-all duration-200 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" />
                      <Badge variant="outline">
                        {(faq.relevanceScore * 100).toFixed(0)}% relevant
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyResponse(faq.answer)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{faq.question}</p>
                    <p className="text-sm text-muted-foreground">{faq.answer}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Custom Response Editor */}
      {customResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('yourResponse')}</CardTitle>
            <CardDescription>{t('yourResponseDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={customResponse}
              onChange={(e) => setCustomResponse(e.target.value)}
              placeholder={t('placeholders.writeHere')}
              className="min-h-[100px]"
            />
            <div className="flex items-center justify-between mt-3">
              <div className="text-xs text-muted-foreground">
                {customResponse.length} {t('labels.characters')}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">{t('buttons.saveAsTemplate')}</Button>
                <Button size="sm">
                  <Send className="h-4 w-4 mr-2" />
                  {t('buttons.sendResponse')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}