"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Brain, 
  Target,
  Activity,
  Clock,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  PieChart,
  LineChart,
  Zap
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
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line
} from 'recharts';
import { useAI } from '@/lib/hooks/use-ai';
import { predictiveAnalyticsApi, type LeadScore, type ChurnRiskAssessment, type DealWinPrediction, type AIModel, type ModelTrainingJob } from '@/lib/api/predictive-analytics-client';

interface PredictiveInsights {
  leadScoring: {
    totalLeads: number
    highScoreLeads: number
    averageScore: number
    topFactors: Array<{ factor: string; impact: number }>
  }
  churnPrevention: {
    atRiskCustomers: number
    highRiskCustomers: number
    retentionRate: number
    topRiskFactors: Array<{ factor: string; frequency: number }>
  }
  salesOptimization: {
    totalDeals: number
    highProbabilityDeals: number
    averageWinProbability: number
    revenueAtRisk: number
  }
  customerJourney: {
    totalJourneys: number
    averageJourneyLength: number
    conversionRate: number
    dropoffStages: Array<{ stage: string; dropoffRate: number }>
  }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const riskColors = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626'
};

const statusColors = {
  training: '#F59E0B',
  deployed: '#10B981',
  deprecated: '#6B7280'
};

export default function EnhancedAIInsightsDashboard() {
  const t = useTranslations('ai');
  const { timeRange, insights: liveInsights, recent, refetch } = useAI('7d');
  
  // State for predictive analytics data
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsights | null>(null);
  const [leadScores, setLeadScores] = useState<LeadScore[]>([]);
  const [churnAssessments, setChurnAssessments] = useState<ChurnRiskAssessment[]>([]);
  const [dealPredictions, setDealPredictions] = useState<DealWinPrediction[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [trainingJobs, setTrainingJobs] = useState<ModelTrainingJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load predictive analytics data
  useEffect(() => {
    const loadPredictiveData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [
          leadScoresData,
          churnData,
          dealData,
          modelsData,
          trainingJobsData
        ] = await Promise.all([
          predictiveAnalyticsApi.getLeadScores(),
          predictiveAnalyticsApi.getChurnRiskAssessments(),
          predictiveAnalyticsApi.getDealWinPredictions(),
          predictiveAnalyticsApi.getModels(),
          predictiveAnalyticsApi.getTrainingJobs()
        ]);

        setLeadScores(leadScoresData);
        setChurnAssessments(churnData);
        setDealPredictions(dealData);
        setModels(modelsData);
        setTrainingJobs(trainingJobsData);

        // Calculate insights
        const insights: PredictiveInsights = {
          leadScoring: {
            totalLeads: leadScoresData?.length || 0,
            highScoreLeads: leadScoresData?.filter(l => l.score > 0.7).length || 0,
            averageScore: leadScoresData?.length ? leadScoresData.reduce((sum, l) => sum + l.score, 0) / leadScoresData.length : 0,
            topFactors: calculateTopFactors(leadScoresData)
          },
          churnPrevention: {
            atRiskCustomers: churnData?.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical').length || 0,
            highRiskCustomers: churnData?.filter(c => c.riskLevel === 'critical').length || 0,
            retentionRate: calculateRetentionRate(churnData),
            topRiskFactors: calculateTopRiskFactors(churnData)
          },
          salesOptimization: {
            totalDeals: dealData?.length || 0,
            highProbabilityDeals: dealData?.filter(d => d.winProbability > 0.7).length || 0,
            averageWinProbability: dealData?.length ? dealData.reduce((sum, d) => sum + d.winProbability, 0) / dealData.length : 0,
            revenueAtRisk: calculateRevenueAtRisk(dealData)
          },
          customerJourney: {
            totalJourneys: 0, // This would come from journey data
            averageJourneyLength: 0,
            conversionRate: 0,
            dropoffStages: []
          }
        };

        setPredictiveInsights(insights);
      } catch (err) {
        console.error('Failed to load predictive analytics data:', err);
        setError('Failed to load predictive analytics data');
      } finally {
        setIsLoading(false);
      }
    };

    loadPredictiveData();
  }, []);

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatNumber = (value: number) => value.toLocaleString();
  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (current < previous) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getRiskBadge = (riskLevel: string) => {
    const color = riskColors[riskLevel as keyof typeof riskColors];
    return (
      <Badge 
        style={{ backgroundColor: `${color}20`, color: color, borderColor: color }}
        className="border"
      >
        {riskLevel}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const color = statusColors[status as keyof typeof statusColors];
    return (
      <Badge 
        style={{ backgroundColor: `${color}20`, color: color, borderColor: color }}
        className="border"
      >
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

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
            {t('exportReport')}
          </Button>
          <Button size="sm" onClick={() => refetch()}>
            <Brain className="h-4 w-4 mr-2" />
            {t('refreshData')}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('metrics.highScoreLeads')}</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {predictiveInsights?.leadScoring.highScoreLeads || 0}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(predictiveInsights?.leadScoring.highScoreLeads || 0, 45)}
              <span className="ml-1">+12.3% {t('trends.fromLastWeek')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('metrics.atRiskCustomers')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {predictiveInsights?.churnPrevention.atRiskCustomers || 0}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(predictiveInsights?.churnPrevention.atRiskCustomers || 0, 23)}
              <span className="ml-1">-5.2% {t('trends.fromLastWeek')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('metrics.highProbabilityDeals')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {predictiveInsights?.salesOptimization.highProbabilityDeals || 0}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(predictiveInsights?.salesOptimization.highProbabilityDeals || 0, 18)}
              <span className="ml-1">+8.7% {t('trends.fromLastWeek')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('metrics.activeModels')}</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {models.filter(m => m.status === 'deployed').length}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              {t('metrics.allModelsHealthy')}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="lead-scoring">{t('tabs.leadScoring')}</TabsTrigger>
          <TabsTrigger value="churn-prevention">{t('tabs.churnPrevention')}</TabsTrigger>
          <TabsTrigger value="sales-optimization">{t('tabs.salesOptimization')}</TabsTrigger>
          <TabsTrigger value="models">{t('tabs.models')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Lead Scoring Overview */}
            <Card>
              <CardHeader>
                <CardTitle>{t('overview.leadScoring.title')}</CardTitle>
                <CardDescription>{t('overview.leadScoring.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('overview.leadScoring.averageScore')}</span>
                    <span className="text-2xl font-bold">
                      {formatPercentage(predictiveInsights?.leadScoring.averageScore || 0)}
                    </span>
                  </div>
                  <Progress value={(predictiveInsights?.leadScoring.averageScore || 0) * 100} />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{predictiveInsights?.leadScoring.totalLeads || 0}</div>
                      <div className="text-xs text-muted-foreground">{t('overview.leadScoring.totalLeads')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{predictiveInsights?.leadScoring.highScoreLeads || 0}</div>
                      <div className="text-xs text-muted-foreground">{t('overview.leadScoring.highScore')}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Churn Prevention Overview */}
            <Card>
              <CardHeader>
                <CardTitle>{t('overview.churnPrevention.title')}</CardTitle>
                <CardDescription>{t('overview.churnPrevention.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('overview.churnPrevention.retentionRate')}</span>
                    <span className="text-2xl font-bold">
                      {formatPercentage(predictiveInsights?.churnPrevention.retentionRate || 0)}
                    </span>
                  </div>
                  <Progress value={(predictiveInsights?.churnPrevention.retentionRate || 0) * 100} />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{predictiveInsights?.churnPrevention.atRiskCustomers || 0}</div>
                      <div className="text-xs text-muted-foreground">{t('overview.churnPrevention.atRisk')}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{predictiveInsights?.churnPrevention.highRiskCustomers || 0}</div>
                      <div className="text-xs text-muted-foreground">{t('overview.churnPrevention.highRisk')}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Model Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle>{t('overview.modelPerformance.title')}</CardTitle>
              <CardDescription>{t('overview.modelPerformance.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {models.slice(0, 3).map((model) => (
                  <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Brain className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{model.name}</div>
                        <div className="text-sm text-muted-foreground">{t('overview.modelPerformance.version')} {model.version}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">{formatPercentage(model.accuracy)}</div>
                        <div className="text-xs text-muted-foreground">{t('overview.modelPerformance.accuracy')}</div>
                      </div>
                      {getStatusBadge(model.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lead-scoring" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Lead Scoring Factors */}
            <Card>
              <CardHeader>
                <CardTitle>{t('leadScoring.topFactors.title')}</CardTitle>
                <CardDescription>{t('leadScoring.topFactors.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {predictiveInsights?.leadScoring.topFactors.slice(0, 5).map((factor, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm">{factor.factor}</span>
                      <div className="flex items-center gap-2">
                        <Progress value={factor.impact * 100} className="w-20" />
                        <span className="text-xs text-muted-foreground w-12">
                          {formatPercentage(factor.impact)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Lead Scores */}
            <Card>
              <CardHeader>
                <CardTitle>{t('leadScoring.recentScores.title')}</CardTitle>
                <CardDescription>{t('leadScoring.recentScores.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leadScores.slice(0, 5).map((lead) => (
                    <div key={lead.leadId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">{t('leadScoring.recentScores.lead')} {lead.leadId.slice(-6)}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(lead.lastUpdated).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{formatPercentage(lead.score)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatPercentage(lead.probability)} {t('leadScoring.recentScores.probability')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="churn-prevention" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Risk Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{t('churnPrevention.riskDistribution.title')}</CardTitle>
                <CardDescription>{t('churnPrevention.riskDistribution.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <RechartsPie
                      data={[
                        { name: t('churnPrevention.riskDistribution.lowRisk'), value: churnAssessments?.filter(c => c.riskLevel === 'low').length || 0, color: riskColors.low },
                        { name: t('churnPrevention.riskDistribution.mediumRisk'), value: churnAssessments?.filter(c => c.riskLevel === 'medium').length || 0, color: riskColors.medium },
                        { name: t('churnPrevention.riskDistribution.highRisk'), value: churnAssessments?.filter(c => c.riskLevel === 'high').length || 0, color: riskColors.high },
                        { name: t('churnPrevention.riskDistribution.criticalRisk'), value: churnAssessments?.filter(c => c.riskLevel === 'critical').length || 0, color: riskColors.critical }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: t('churnPrevention.riskDistribution.lowRisk'), value: churnAssessments?.filter(c => c.riskLevel === 'low').length || 0, color: riskColors.low },
                        { name: t('churnPrevention.riskDistribution.mediumRisk'), value: churnAssessments?.filter(c => c.riskLevel === 'medium').length || 0, color: riskColors.medium },
                        { name: t('churnPrevention.riskDistribution.highRisk'), value: churnAssessments?.filter(c => c.riskLevel === 'high').length || 0, color: riskColors.high },
                        { name: t('churnPrevention.riskDistribution.criticalRisk'), value: churnAssessments?.filter(c => c.riskLevel === 'critical').length || 0, color: riskColors.critical }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </RechartsPie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* High-Risk Customers */}
            <Card>
              <CardHeader>
                <CardTitle>{t('churnPrevention.highRiskCustomers.title')}</CardTitle>
                <CardDescription>{t('churnPrevention.highRiskCustomers.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {churnAssessments
                    .filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical')
                    .slice(0, 5)
                    .map((assessment) => (
                      <div key={assessment.customerId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{t('churnPrevention.highRiskCustomers.customer')} {assessment.customerId.slice(-6)}</div>
                          <div className="text-xs text-muted-foreground">
                            {assessment.recommendations?.length || 0} {t('churnPrevention.highRiskCustomers.recommendations')}
                          </div>
                        </div>
                        <div className="text-right">
                          {getRiskBadge(assessment.riskLevel)}
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatPercentage(assessment.probability)} {t('churnPrevention.highRiskCustomers.probability')}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales-optimization" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Deal Win Probability Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>{t('salesOptimization.dealWinProbability.title')}</CardTitle>
                <CardDescription>{t('salesOptimization.dealWinProbability.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { range: '0-20%', count: dealPredictions?.filter(d => d.winProbability < 0.2).length || 0 },
                    { range: '20-40%', count: dealPredictions?.filter(d => d.winProbability >= 0.2 && d.winProbability < 0.4).length || 0 },
                    { range: '40-60%', count: dealPredictions?.filter(d => d.winProbability >= 0.4 && d.winProbability < 0.6).length || 0 },
                    { range: '60-80%', count: dealPredictions?.filter(d => d.winProbability >= 0.6 && d.winProbability < 0.8).length || 0 },
                    { range: '80-100%', count: dealPredictions?.filter(d => d.winProbability >= 0.8).length || 0 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* High-Probability Deals */}
            <Card>
              <CardHeader>
                <CardTitle>{t('salesOptimization.highProbabilityDeals.title')}</CardTitle>
                <CardDescription>{t('salesOptimization.highProbabilityDeals.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dealPredictions
                    .filter(d => d.winProbability > 0.7)
                    .slice(0, 5)
                    .map((deal) => (
                      <div key={deal.dealId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{t('salesOptimization.highProbabilityDeals.deal')} {deal.dealId.slice(-6)}</div>
                          <div className="text-xs text-muted-foreground">
                            {deal.recommendations?.length || 0} {t('salesOptimization.highProbabilityDeals.recommendations')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{formatPercentage(deal.winProbability)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatPercentage(deal.confidence)} {t('salesOptimization.highProbabilityDeals.confidence')}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Model Status */}
            <Card>
              <CardHeader>
                <CardTitle>{t('models.status.title')}</CardTitle>
                <CardDescription>{t('models.status.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {models.map((model) => (
                    <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Brain className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {model.type} • {t('models.status.version')} {model.version}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{formatPercentage(model.accuracy)}</div>
                          <div className="text-xs text-muted-foreground">{t('models.status.accuracy')}</div>
                        </div>
                        {getStatusBadge(model.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Training Jobs */}
            <Card>
              <CardHeader>
                <CardTitle>{t('models.trainingJobs.title')}</CardTitle>
                <CardDescription>{t('models.trainingJobs.subtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trainingJobs.slice(0, 5).map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{t('models.trainingJobs.trainingJob')} {job.id.slice(-6)}</div>
                          <div className="text-sm text-muted-foreground">
                            {t('models.trainingJobs.model')} {job.modelId.slice(-6)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{formatPercentage(job.progress)}</div>
                          <div className="text-xs text-muted-foreground">{t('models.trainingJobs.progress')}</div>
                        </div>
                        {getStatusBadge(job.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper functions
function calculateTopFactors(leadScores: LeadScore[]): Array<{ factor: string; impact: number }> {
  const factorMap = new Map<string, number>();
  
  if (!leadScores) return [];
  
  leadScores.forEach(lead => {
    lead.factors?.forEach(factor => {
      const current = factorMap.get(factor.feature) || 0;
      factorMap.set(factor.feature, current + Math.abs(factor.contribution));
    });
  });

  return Array.from(factorMap.entries())
    .map(([factor, impact]) => ({ factor, impact: impact / (leadScores?.length || 1) }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5);
}

function calculateRetentionRate(assessments: ChurnRiskAssessment[]): number {
  if (!assessments || assessments.length === 0) return 0;
  const lowRiskCount = assessments.filter(a => a.riskLevel === 'low').length;
  return lowRiskCount / assessments.length;
}

function calculateTopRiskFactors(assessments: ChurnRiskAssessment[]): Array<{ factor: string; frequency: number }> {
  const factorMap = new Map<string, number>();
  
  if (!assessments) return [];
  
  assessments.forEach(assessment => {
    assessment.factors?.forEach(factor => {
      if (factor.trend === 'declining') {
        const current = factorMap.get(factor.factor) || 0;
        factorMap.set(factor.factor, current + 1);
      }
    });
  });

  return Array.from(factorMap.entries())
    .map(([factor, frequency]) => ({ factor, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);
}

function calculateRevenueAtRisk(dealPredictions: DealWinPrediction[]): number {
  // This is a simplified calculation - in reality, you'd need deal values
  if (!dealPredictions) return 0;
  return dealPredictions
    .filter(d => d.winProbability < 0.5)
    .length * 10000; // Assuming average deal value of $10k
}
