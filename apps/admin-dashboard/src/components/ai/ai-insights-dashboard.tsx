"use client";

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Target,
  Activity,
  Clock,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { 
  AreaChart,
  Area,
  Pie as RechartsPie,
  PieChart as RechartsPieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { useAI } from '@/lib/hooks/use-ai';

interface AIInsights {
  totalAnalyses: number;
  averageConfidence: number;
  modelsActive: number;
  topIntents: Array<{ intent: string; count: number; percentage: number }>;
  sentimentTrends: Array<{ date: string; positive: number; negative: number; neutral: number }>;
  performanceMetrics: {
    accuracy: number;
    responseTime: number;
    successRate: number;
  };
}

interface AIAnalysisResult {
  analysisId: string;
  content: string;
  results: {
    intentClassification?: {
      primaryIntent: string;
      confidence: number;
      category: string;
    };
    sentimentAnalysis?: {
      sentiment: 'positive' | 'negative' | 'neutral';
      score: number;
      confidence: number;
    };
    urgencyDetection?: {
      urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
      urgencyScore: number;
    };
    escalationPrediction?: {
      shouldEscalate: boolean;
      escalationProbability: number;
    };
    churnRiskAssessment?: {
      churnRisk: 'low' | 'medium' | 'high' | 'critical';
      churnProbability: number;
    };
  };
  confidence: number;
  timestamp: Date;
}

// Removed mockInsights; now using live data fallbacks only

// Removed mockRecentAnalyses; now mapping live recent items to UI

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const sentimentColors = {
  positive: '#10B981',
  negative: '#EF4444',
  neutral: '#6B7280'
};

const urgencyColors = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626'
};

export default function AIInsightsDashboard() {
  const t = useTranslations('ai');
  const { timeRange, insights: liveInsights, recent, refetch } = useAI('7d');

  // Map live insights to local shape with safe fallbacks
  const insights: AIInsights = {
    totalAnalyses: liveInsights?.totalAnalyses ?? 0,
    averageConfidence: liveInsights?.averageConfidence ?? 0,
    modelsActive: liveInsights?.modelsActive ?? 0,
    topIntents: Array.isArray(liveInsights?.topIntents) ? (liveInsights?.topIntents as Array<{ intent: string; count: number; percentage: number }>) : [],
    sentimentTrends: Array.isArray(liveInsights?.sentimentTrends) ? (liveInsights?.sentimentTrends as Array<{ date: string; positive: number; negative: number; neutral: number }>) : [],
    performanceMetrics: {
      accuracy: liveInsights?.performanceMetrics?.accuracy ?? 0,
      responseTime: liveInsights?.performanceMetrics?.responseTime ?? 0,
      successRate: liveInsights?.performanceMetrics?.successRate ?? 0,
    },
  };

  const recentAnalyses: AIAnalysisResult[] = Array.isArray(recent) && recent.length
    ? recent.map((it: { id: string; content: string; results?: unknown; confidence?: number; createdAt?: string }) => ({
        analysisId: it.id,
        content: it.content,
        results: (it.results || {}) as AIAnalysisResult['results'],
        confidence: it.confidence ?? 0,
        timestamp: new Date(it.createdAt ?? Date.now()),
      }))
    : [];

  // const selectedTimeRange = timeRange;

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatNumber = (value: number) => value.toLocaleString();

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getSentimentBadge = (sentiment: string, score: number) => {
    const color = sentimentColors[sentiment as keyof typeof sentimentColors];
    return (
      <Badge 
        style={{ backgroundColor: `${color}20`, color: color, borderColor: color }}
        className="border"
      >
        {sentiment} ({score > 0 ? '+' : ''}{score.toFixed(2)})
      </Badge>
    );
  };

  // const getUrgencyBadge = (urgency: string, score: number) => {
  //   const color = urgencyColors[urgency as keyof typeof urgencyColors];
  //   return (
  //     <Badge 
  //       style={{ backgroundColor: `${color}20`, color: color, borderColor: color }}
  //       className="border"
  //     >
  //       {urgency} ({formatPercentage(score)})
  //     </Badge>
  //   );
  // };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {t('buttons.export')}
          </Button>
          <Button size="sm" onClick={() => refetch()}>
            <Brain className="h-4 w-4 mr-2" />
            {t('buttons.trainModel')}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('metrics.totalAnalyses')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(insights.totalAnalyses)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(insights.totalAnalyses, 14200)}
              <span className="ml-1">+8.6% from last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('metrics.avgConfidence')}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(insights.averageConfidence)}</div>
            <Progress value={insights.averageConfidence * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('metrics.modelsActive')}</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.modelsActive}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              All models healthy
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('metrics.responseTime')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.performanceMetrics.responseTime}ms</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(245, 280)}
              <span className="ml-1">-12.5% faster</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="sentiment">{t('tabs.sentiment')}</TabsTrigger>
          <TabsTrigger value="intents">{t('tabs.intents')}</TabsTrigger>
          <TabsTrigger value="predictions">{t('tabs.predictions')}</TabsTrigger>
          <TabsTrigger value="models">{t('tabs.models')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Sentiment Trends */}
            <Card>
              <CardHeader>
                <CardTitle>{t('charts.sentimentTrends')}</CardTitle>
                <CardDescription>{t('charts.sentimentTrendsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={insights.sentimentTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="positive" 
                      stackId="1" 
                      stroke="#10B981" 
                      fill="#10B981" 
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="neutral" 
                      stackId="1" 
                      stroke="#6B7280" 
                      fill="#6B7280" 
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="negative" 
                      stackId="1" 
                      stroke="#EF4444" 
                      fill="#EF4444" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Intents */}
            <Card>
              <CardHeader>
                <CardTitle>{t('charts.topIntents')}</CardTitle>
                <CardDescription>{t('charts.topIntentsDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <RechartsPie
                      data={insights.topIntents}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ intent, percentage }: any) => `${intent} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {insights.topIntents.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </RechartsPie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>{t('charts.aiPerformance')}</CardTitle>
              <CardDescription></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('charts.accuracy')}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatPercentage(insights.performanceMetrics.accuracy)}
                    </span>
                  </div>
                  <Progress value={insights.performanceMetrics.accuracy * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('charts.successRate')}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatPercentage(insights.performanceMetrics.successRate)}
                    </span>
                  </div>
                  <Progress value={insights.performanceMetrics.successRate * 100} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('metrics.responseTime')}</span>
                    <span className="text-sm text-muted-foreground">
                      {insights.performanceMetrics.responseTime}ms
                    </span>
                  </div>
                  <Progress value={Math.max(0, 100 - (insights.performanceMetrics.responseTime / 10))} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('recentSentiment')}</CardTitle>
              <CardDescription></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAnalyses
                  .filter(analysis => analysis.results.sentimentAnalysis)
                  .map((analysis) => (
                    <div key={analysis.analysisId} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-2">
                            {analysis.content}
                          </p>
                          <div className="flex items-center gap-2">
                            {analysis.results.sentimentAnalysis && getSentimentBadge(
                              analysis.results.sentimentAnalysis.sentiment,
                              analysis.results.sentimentAnalysis.score
                            )}
                            <Badge variant="outline">
                              {formatPercentage(analysis.results.sentimentAnalysis?.confidence ?? 0)} {t('labels.confidence')}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(analysis.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('intentResults')}</CardTitle>
              <CardDescription></CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentAnalyses
                  .filter(analysis => analysis.results.intentClassification)
                  .map((analysis) => (
                    <div key={analysis.analysisId} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-2">
                            {analysis.content}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge>
                              {analysis.results.intentClassification?.primaryIntent}
                            </Badge>
                            <Badge variant="outline">
                              {analysis.results.intentClassification?.category}
                            </Badge>
                            <Badge variant="outline">
                              {formatPercentage(analysis.results.intentClassification?.confidence ?? 0)} {t('labels.confidence')}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(analysis.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Escalation Predictions */}
            <Card>
              <CardHeader>
                <CardTitle>{t('escalationPredictions')}</CardTitle>
                <CardDescription></CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentAnalyses
                    .filter(analysis => analysis.results.escalationPrediction)
                    .map((analysis) => (
                      <div key={analysis.analysisId} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge 
                            variant={analysis.results.escalationPrediction?.shouldEscalate ? "destructive" : "secondary"}
                          >
                            {analysis.results.escalationPrediction?.shouldEscalate ? 'Should Escalate' : 'No Escalation'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatPercentage(analysis.results.escalationPrediction?.escalationProbability ?? 0)} {t('labels.probability')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {analysis.content.substring(0, 100)}...
                        </p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Churn Risk Assessment */}
            <Card>
              <CardHeader>
                <CardTitle>{t('churnRiskAssessment')}</CardTitle>
                <CardDescription></CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentAnalyses
                    .filter(analysis => analysis.results.churnRiskAssessment)
                    .map((analysis) => (
                      <div key={analysis.analysisId} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge 
                            style={{ 
                              backgroundColor: `${urgencyColors[(analysis.results.churnRiskAssessment?.churnRisk ?? 'low') as keyof typeof urgencyColors]}20`,
                              color: urgencyColors[(analysis.results.churnRiskAssessment?.churnRisk ?? 'low') as keyof typeof urgencyColors],
                              borderColor: urgencyColors[(analysis.results.churnRiskAssessment?.churnRisk ?? 'low') as keyof typeof urgencyColors]
                            }}
                            className="border"
                          >
                            {analysis.results.churnRiskAssessment?.churnRisk ?? 'low'} {t('labels.risk')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatPercentage(analysis.results.churnRiskAssessment?.churnProbability ?? 0)} {t('labels.probability')}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {analysis.content.substring(0, 100)}...
                        </p>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('models.title')}</CardTitle>
              <CardDescription>{t('models.desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Intent Classification', status: 'active', accuracy: 0.92, version: '2.1' },
                  { name: 'Sentiment Analysis', status: 'active', accuracy: 0.89, version: '1.8' },
                  { name: 'Urgency Detection', status: 'active', accuracy: 0.85, version: '1.5' },
                  { name: 'Escalation Prediction', status: 'training', accuracy: 0.87, version: '2.0' },
                  { name: 'Churn Risk Assessment', status: 'active', accuracy: 0.83, version: '1.3' }
                ].map((model, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Brain className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-sm text-muted-foreground">Version {model.version}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatPercentage(model.accuracy)}</div>
                        <div className="text-xs text-muted-foreground">Accuracy</div>
                      </div>
                      <Badge 
                        variant={model.status === 'active' ? 'default' : 'secondary'}
                        className={model.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {model.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}