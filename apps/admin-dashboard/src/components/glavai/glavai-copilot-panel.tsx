'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GlavaiLogo } from './glavai-theme';
import { glavaiClient, CopilotSuggestions } from '@/lib/api/glavai-client';
import { useDebounce } from '@/hooks/use-debounce';
import { Sparkles, BookOpen, MessageSquare, FileText, Copy, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlavaiCopilotPanelProps {
  conversationId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onInsertResponse?: (text: string) => void;
}

export function GlavaiCopilotPanel({
  conversationId,
  isOpen,
  onClose,
  onInsertResponse,
}: GlavaiCopilotPanelProps) {
  const [suggestions, setSuggestions] = useState<CopilotSuggestions | null>(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'knowledge' | 'responses' | 'summary'>('knowledge');

  const fetchSuggestions = useCallback(async () => {
    if (!conversationId) return;

    setLoading(true);
    try {
      const data = await glavaiClient.getCopilotSuggestions(conversationId);
      console.log('Copilot suggestions data:', data); // Debug log
      setSuggestions(data);
      if (data.summary) setSummary(data.summary);
    } catch (error) {
      console.error('Failed to fetch copilot suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  const debouncedFetch = useDebounce(fetchSuggestions, 500);

  useEffect(() => {
    if (isOpen && conversationId) {
      debouncedFetch();
    }
  }, [isOpen, conversationId, debouncedFetch]);

  const handleSummarize = async () => {
    if (!conversationId) return;

    setSummaryLoading(true);
    try {
      const result = await glavaiClient.summarizeConversation(conversationId);
      setSummary(result.short);
      setActiveTab('summary');
    } catch (error) {
      console.error('Failed to summarize conversation:', error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleInsert = (text: string) => {
    if (onInsertResponse) {
      onInsertResponse(text);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[600px] shadow-2xl rounded-lg border border-purple-200 bg-white dark:bg-gray-900 dark:border-purple-800">
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3 border-b border-purple-100 dark:border-purple-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GlavaiLogo size="sm" variant="icon" />
              <CardTitle className="text-base font-semibold">GLAVAI Copilot</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
              ×
            </Button>
          </div>
        </CardHeader>

        <div className="flex border-b border-purple-100 dark:border-purple-800">
          <button
            onClick={() => setActiveTab('knowledge')}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'knowledge'
                ? 'text-purple-600 border-b-2 border-purple-600 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-400',
            )}
          >
            <BookOpen className="inline-block w-4 h-4 mr-1" />
            Knowledge
          </button>
          <button
            onClick={() => setActiveTab('responses')}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'responses'
                ? 'text-purple-600 border-b-2 border-purple-600 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-400',
            )}
          >
            <MessageSquare className="inline-block w-4 h-4 mr-1" />
            Responses
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors',
              activeTab === 'summary'
                ? 'text-purple-600 border-b-2 border-purple-600 dark:text-purple-400'
                : 'text-gray-600 dark:text-gray-400',
            )}
          >
            <FileText className="inline-block w-4 h-4 mr-1" />
            Summary
          </button>
        </div>

        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
              </div>
            ) : (
              <>
                {activeTab === 'knowledge' && (
                  <div className="space-y-4">
                    {suggestions?.knowledgeArticles && suggestions.knowledgeArticles.length > 0 ? (
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          Knowledge Articles
                        </h4>
                        <div className="space-y-2">
                          {suggestions.knowledgeArticles.slice(0, 5).map((article) => (
                            <div
                              key={article.id}
                              className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{article.title}</p>
                                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                    {article.snippet || article.content || ''}
                                  </p>
                                </div>
                                {article.relevanceScore !== undefined && (
                                  <Badge variant="secondary" className="ml-2">
                                    {Math.round((article.relevanceScore || 0) * 100)}%
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {suggestions?.faqs && suggestions.faqs.length > 0 ? (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">FAQs</h4>
                        <div className="space-y-2">
                          {suggestions.faqs.slice(0, 3).map((faq, idx) => (
                            <div
                              key={faq.id || idx}
                              className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                              <p className="text-sm font-medium">{faq.question}</p>
                              <p className="text-xs text-gray-500 mt-1">{faq.answer}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {(!suggestions || 
                      (!suggestions.knowledgeArticles?.length && !suggestions.faqs?.length)) && (
                      <div className="text-center py-8">
                        <BookOpen className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 mb-1">No knowledge suggestions available</p>
                        <p className="text-xs text-gray-400">
                          Try asking a question or check back later
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'responses' && (
                  <div className="space-y-3">
                    {suggestions?.responseSuggestions &&
                      suggestions.responseSuggestions.length > 0 ? (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Suggested Responses</h4>
                          <div className="space-y-2">
                            {suggestions.responseSuggestions.map((suggestion, idx) => {
                              const responseText = suggestion.text || suggestion.response || '';
                              return (
                                <div
                                  key={idx}
                                  className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <Badge variant="outline">{suggestion.tone}</Badge>
                                    <Badge variant="secondary">
                                      {Math.round((suggestion.confidence || 0) * 100)}%
                                    </Badge>
                                  </div>
                                  <p className="text-sm mb-2">{responseText}</p>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleCopy(responseText)}
                                    >
                                      <Copy className="w-3 h-3 mr-1" />
                                      Copy
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      onClick={() => handleInsert(responseText)}
                                    >
                                      <Send className="w-3 h-3 mr-1" />
                                      Insert
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500 mb-1">No response suggestions available</p>
                          <p className="text-xs text-gray-400">
                            Suggestions will appear as you type
                          </p>
                        </div>
                      )}

                    {suggestions?.templates && suggestions.templates.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2">Templates</h4>
                        <div className="space-y-2">
                          {suggestions.templates.map((template) => (
                            <div
                              key={template.id}
                              className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                              <p className="text-sm font-medium mb-1">{template.name}</p>
                              <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                                {template.content}
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInsert(template.content)}
                              >
                                Use Template
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'summary' && (
                  <div className="space-y-3">
                    {summary ? (
                      <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm whitespace-pre-wrap">{summary}</p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 mb-4">No summary available</p>
                        <Button
                          onClick={handleSummarize}
                          disabled={summaryLoading}
                          variant="outline"
                        >
                          {summaryLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate Summary
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

