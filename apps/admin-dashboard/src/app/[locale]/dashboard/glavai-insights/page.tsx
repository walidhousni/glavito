'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { glavaiClient, InsightsData } from '@/lib/api/glavai-client';
import { 
  Brain,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  BookOpen,
  MessageSquare,
  BarChart3,
  Loader2,
  Check,
  X,
  MessageSquarePlus,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

export default function GlavaiInsightsPage() {
  const t = useTranslations('glavaiInsights');
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [trainingItems, setTrainingItems] = useState<any[]>([]);
  const [correction, setCorrection] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const { toast } = useToast() as any;

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const to = new Date();
        const from = new Date();
        if (timeRange === '7d') from.setDate(from.getDate() - 7);
        else if (timeRange === '30d') from.setDate(from.getDate() - 30);
        else from.setDate(from.getDate() - 90);

        const [insightsData, trainingData] = await Promise.all([
          glavaiClient.getInsights(from.toISOString(), to.toISOString()),
          glavaiClient.getRecentAnalyses({ limit: 20, maxConfidence: 0.75 })
        ]);

        setInsights(insightsData);
        setTrainingItems(Array.isArray(trainingData) ? trainingData : []);
      } catch (error) {
        console.error('Failed to fetch insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, [timeRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/50">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600 dark:text-purple-400" />
        </div>
      </div>
    );
  }

  if (!insights) return null;

  // Safely handle potentially undefined arrays with defaults
  const sentimentTrends = insights.sentimentTrends || [];
  const intentDistribution = insights.intentDistribution || [];
  const escalationAlerts = insights.escalationAlerts || [];
  const knowledgeUsage = insights.knowledgeUsage || [];
  const summary = insights.summary || {
    totalAnalyses: 0,
    avgConfidence: 0,
    escalationRiskCount: 0,
    topIntent: 'N/A',
  };

  const validTrainingItems = Array.isArray(trainingItems) ? trainingItems : [];

  const sentimentChartData = sentimentTrends.map((trend) => ({
    date: new Date(trend.date).toLocaleString('en-US', { month: 'short', day: 'numeric' }),
    [t('sentiment.positive')]: trend.positive,
    [t('sentiment.negative')]: trend.negative,
    [t('sentiment.neutral')]: trend.neutral,
  }));

  const intentChartData = intentDistribution.slice(0, 10).map((item) => ({
    name: item.intent,
    value: item.count,
    percentage: item.percentage,
  }));

  const handleTrain = async (item: any, accepted: boolean, correctionText?: string) => {
    try {
      await glavaiClient.submitFeedback({
        analysisId: item.id,
        accepted,
        correction: correctionText
      });
      
      toast({
        title: accepted ? "Feedback Submitted" : "Correction Submitted",
        description: "Thank you for training Glav AI.",
      });

      // Remove item from list
      setTrainingItems(prev => Array.isArray(prev) ? prev.filter(i => i.id !== item.id) : []);
      setSelectedItem(null);
      setCorrection('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit feedback.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('7d')}
            className={cn(
              "h-9 text-xs border-0 shadow-sm",
              timeRange === '7d' 
                ? "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700" 
                : ""
            )}
          >
            {t('timeRange.7days')}
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('30d')}
            className={cn(
              "h-9 text-xs border-0 shadow-sm",
              timeRange === '30d' 
                ? "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700" 
                : ""
            )}
          >
            {t('timeRange.30days')}
          </Button>
          <Button
            variant={timeRange === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('90d')}
            className={cn(
              "h-9 text-xs border-0 shadow-sm",
              timeRange === '90d' 
                ? "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700" 
                : ""
            )}
          >
            {t('timeRange.90days')}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50/30 to-white dark:from-purple-950/20 dark:to-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('summary.totalAnalyses')}</p>
                <p className="text-xl font-semibold text-foreground">{summary.totalAnalyses}</p>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg shadow-purple-500/30">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50/30 to-white dark:from-blue-950/20 dark:to-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('summary.avgConfidence')}</p>
                <p className="text-xl font-semibold text-foreground">{Math.round(summary.avgConfidence * 100)}%</p>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-orange-50/30 to-white dark:from-orange-950/20 dark:to-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('summary.escalationRisks')}</p>
                <p className="text-xl font-semibold text-foreground">{summary.escalationRiskCount}</p>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 shadow-lg shadow-orange-500/30">
                <AlertTriangle className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50/30 to-white dark:from-green-950/20 dark:to-slate-900">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">{t('summary.topIntent')}</p>
                <p className="text-lg font-semibold text-foreground capitalize">{summary.topIntent}</p>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/30">
                <MessageSquare className="h-4 w-4 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="sentiment" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px] bg-transparent h-auto p-0 gap-1">
          <TabsTrigger 
            value="sentiment" 
            className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-green-50 dark:data-[state=active]:bg-green-950/30 data-[state=active]:text-green-600 dark:data-[state=active]:text-green-400 text-muted-foreground hover:text-foreground transition-colors border-0"
          >
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium">{t('tabs.sentiment')}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="escalations" 
            className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-950/30 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 text-muted-foreground hover:text-foreground transition-colors border-0"
          >
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-xs font-medium">{t('tabs.escalations')}</span>
            {escalationAlerts.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                {escalationAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="intents" 
            className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-purple-50 dark:data-[state=active]:bg-purple-950/30 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 text-muted-foreground hover:text-foreground transition-colors border-0"
          >
            <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium">{t('tabs.intents')}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="knowledge" 
            className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/30 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-muted-foreground hover:text-foreground transition-colors border-0"
          >
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium">{t('tabs.knowledge')}</span>
          </TabsTrigger>
          <TabsTrigger 
            value="training" 
            className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-pink-50 dark:data-[state=active]:bg-pink-950/30 data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 text-muted-foreground hover:text-foreground transition-colors border-0"
          >
            <MessageSquarePlus className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            <span className="text-xs font-medium">Training</span>
            {validTrainingItems.length > 0 && (
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300">
                {validTrainingItems.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sentiment">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-green-50 dark:bg-green-950/50">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{t('sentiment.title')}</h3>
              </div>
              {sentimentChartData.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">{t('sentiment.noData')}</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sentimentChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-20" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem'
                      }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                    <Line type="monotone" dataKey={t('sentiment.positive')} stroke="#10B981" strokeWidth={2} />
                    <Line type="monotone" dataKey={t('sentiment.negative')} stroke="#EF4444" strokeWidth={2} />
                    <Line type="monotone" dataKey={t('sentiment.neutral')} stroke="#6B7280" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="escalations">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/50">
                  <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{t('escalations.title')}</h3>
              </div>
              <div className="space-y-3">
                {escalationAlerts.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">{t('escalations.noAlerts')}</p>
                ) : (
                  escalationAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-lg border-0 shadow-sm bg-orange-50 dark:bg-orange-950/30"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                            <span className="text-xs font-semibold text-foreground">{alert.reasoning}</span>
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-0 shadow-sm bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                              {Math.round(alert.probability * 100)}% {t('escalations.risk')}
                            </Badge>
                          </div>
                          {alert.conversationId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('escalations.conversation')}: {alert.conversationId.slice(0, 8)}...
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intents">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50">
                  <BarChart3 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{t('intents.title')}</h3>
              </div>
              {intentChartData.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-8">{t('intents.noData')}</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={intentChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${Math.round(percentage)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {intentChartData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={intentChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-20" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem'
                        }} 
                      />
                      <Bar dataKey="value" fill="#8B5CF6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="knowledge">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50">
                  <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">{t('knowledge.title')}</h3>
              </div>
              <div className="space-y-3">
                {knowledgeUsage.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-8">{t('knowledge.noData')}</p>
                ) : (
                  knowledgeUsage.map((item) => (
                    <div
                      key={item.articleId}
                      className="p-3 rounded-lg border-0 shadow-sm bg-muted/30"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs font-semibold text-foreground">{item.title}</span>
                          </div>
                          <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                            <span>{item.suggestionCount} {t('knowledge.suggestions')}</span>
                            <span>{item.viewCount} {t('knowledge.views')}</span>
                            <span>{Math.round(item.helpfulRate * 100)}% {t('knowledge.helpful')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="training">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 rounded-lg bg-pink-50 dark:bg-pink-950/50">
                  <MessageSquarePlus className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Active Learning & Training (Beta)</h3>
              </div>
              
              <div className="space-y-4">
                {validTrainingItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-950/30 mb-3">
                      <Check className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                    </div>
                    <p className="text-sm font-medium text-foreground">All caught up!</p>
                    <p className="text-xs text-muted-foreground mt-1">No low-confidence items requiring review.</p>
                  </div>
                ) : (
                  validTrainingItems.map((item) => (
                    <div key={item.id} className="p-4 rounded-lg border border-border bg-card">
                      <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {Math.round((item.confidence || 0) * 100)}% Confidence
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(item.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="p-3 rounded-md bg-muted/50 text-sm">
                            <p className="font-medium text-xs text-muted-foreground mb-1">User Query:</p>
                            {item.content}
                          </div>
                          <div className="p-3 rounded-md bg-purple-50 dark:bg-purple-950/20 text-sm border border-purple-100 dark:border-purple-900">
                            <p className="font-medium text-xs text-purple-600 dark:text-purple-400 mb-1">AI Prediction:</p>
                            <div className="flex gap-2 items-center">
                              <span className="font-medium">Intent:</span> {item.results?.intentClassification?.primaryIntent || 'Unknown'}
                            </div>
                            {item.results?.responseGeneration?.suggestedResponses?.[0]?.response && (
                              <div className="mt-2 text-muted-foreground">
                                {item.results.responseGeneration.suggestedResponses[0].response}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2 min-w-[140px] justify-center">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="w-full justify-start text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30"
                            onClick={() => handleTrain(item, true)}
                          >
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            Correct
                          </Button>
                          
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                                onClick={() => setSelectedItem(item)}
                              >
                                <ThumbsDown className="w-4 h-4 mr-2" />
                                Incorrect
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Provide Correction</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Correct Response or Intent</Label>
                                  <Textarea 
                                    placeholder="Type the correct response or intent here..." 
                                    value={correction}
                                    onChange={(e) => setCorrection(e.target.value)}
                                    rows={4}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setCorrection('')}>Cancel</Button>
                                <Button onClick={() => handleTrain(item, false, correction)}>Submit Training</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
