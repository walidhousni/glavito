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
            totalLeads: leadScoresData.length,
            highScoreLeads: leadScoresData.filter(l => l.score > 0.7).length,
            averageScore: leadScoresData.reduce((sum, l) => sum + l.score, 0) / leadScoresData.length || 0,
            topFactors: calculateTopFactors(leadScoresData)
          },
          churnPrevention: {
            atRiskCustomers: churnData.filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical').length,
            highRiskCustomers: churnData.filter(c => c.riskLevel === 'critical').length,
            retentionRate: calculateRetentionRate(churnData),
            topRiskFactors: calculateTopRiskFactors(churnData)
          },
          salesOptimization: {
            totalDeals: dealData.length,
            highProbabilityDeals: dealData.filter(d => d.winProbability > 0.7).length,
            averageWinProbability: dealData.reduce((sum, d) => sum + d.winProbability, 0) / dealData.length || 0,
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
          <h1 className="text-3xl font-bold tracking-tight">AI Predictive Analytics</h1>
          <p className="text-muted-foreground">Advanced AI insights and predictions for your business</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Export Report
          </Button>
          <Button size="sm" onClick={() => refetch()}>
            <Brain className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High-Score Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {predictiveInsights?.leadScoring.highScoreLeads || 0}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(predictiveInsights?.leadScoring.highScoreLeads || 0, 45)}
              <span className="ml-1">+12.3% from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At-Risk Customers</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {predictiveInsights?.churnPrevention.atRiskCustomers || 0}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(predictiveInsights?.churnPrevention.atRiskCustomers || 0, 23)}
              <span className="ml-1">-5.2% from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High-Probability Deals</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {predictiveInsights?.salesOptimization.highProbabilityDeals || 0}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(predictiveInsights?.salesOptimization.highProbabilityDeals || 0, 18)}
              <span className="ml-1">+8.7% from last week</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {models.filter(m => m.status === 'deployed').length}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
              All models healthy
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="lead-scoring">Lead Scoring</TabsTrigger>
          <TabsTrigger value="churn-prevention">Churn Prevention</TabsTrigger>
          <TabsTrigger value="sales-optimization">Sales Optimization</TabsTrigger>
          <TabsTrigger value="models">Model Management</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Lead Scoring Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Lead Scoring Performance</CardTitle>
                <CardDescription>Current lead scoring metrics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Score</span>
                    <span className="text-2xl font-bold">
                      {formatPercentage(predictiveInsights?.leadScoring.averageScore || 0)}
                    </span>
                  </div>
                  <Progress value={(predictiveInsights?.leadScoring.averageScore || 0) * 100} />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{predictiveInsights?.leadScoring.totalLeads || 0}</div>
                      <div className="text-xs text-muted-foreground">Total Leads</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{predictiveInsights?.leadScoring.highScoreLeads || 0}</div>
                      <div className="text-xs text-muted-foreground">High Score</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Churn Prevention Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Churn Prevention Status</CardTitle>
                <CardDescription>Customer retention and risk assessment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Retention Rate</span>
                    <span className="text-2xl font-bold">
                      {formatPercentage(predictiveInsights?.churnPrevention.retentionRate || 0)}
                    </span>
                  </div>
                  <Progress value={(predictiveInsights?.churnPrevention.retentionRate || 0) * 100} />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{predictiveInsights?.churnPrevention.atRiskCustomers || 0}</div>
                      <div className="text-xs text-muted-foreground">At Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{predictiveInsights?.churnPrevention.highRiskCustomers || 0}</div>
                      <div className="text-xs text-muted-foreground">High Risk</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Model Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Model Performance Overview</CardTitle>
              <CardDescription>Current performance of all AI models</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {models.slice(0, 3).map((model) => (
                  <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                <CardTitle>Top Scoring Factors</CardTitle>
                <CardDescription>Most influential factors in lead scoring</CardDescription>
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
                <CardTitle>Recent Lead Scores</CardTitle>
                <CardDescription>Latest lead scoring results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {leadScores.slice(0, 5).map((lead) => (
                    <div key={lead.leadId} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Lead {lead.leadId.slice(-6)}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(lead.lastUpdated).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{formatPercentage(lead.score)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatPercentage(lead.probability)} probability
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
                <CardTitle>Risk Level Distribution</CardTitle>
                <CardDescription>Distribution of customer risk levels</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <RechartsPie
                      data={[
                        { name: 'Low Risk', value: churnAssessments.filter(c => c.riskLevel === 'low').length, color: riskColors.low },
                        { name: 'Medium Risk', value: churnAssessments.filter(c => c.riskLevel === 'medium').length, color: riskColors.medium },
                        { name: 'High Risk', value: churnAssessments.filter(c => c.riskLevel === 'high').length, color: riskColors.high },
                        { name: 'Critical Risk', value: churnAssessments.filter(c => c.riskLevel === 'critical').length, color: riskColors.critical }
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
                        { name: 'Low Risk', value: churnAssessments.filter(c => c.riskLevel === 'low').length, color: riskColors.low },
                        { name: 'Medium Risk', value: churnAssessments.filter(c => c.riskLevel === 'medium').length, color: riskColors.medium },
                        { name: 'High Risk', value: churnAssessments.filter(c => c.riskLevel === 'high').length, color: riskColors.high },
                        { name: 'Critical Risk', value: churnAssessments.filter(c => c.riskLevel === 'critical').length, color: riskColors.critical }
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
                <CardTitle>High-Risk Customers</CardTitle>
                <CardDescription>Customers requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {churnAssessments
                    .filter(c => c.riskLevel === 'high' || c.riskLevel === 'critical')
                    .slice(0, 5)
                    .map((assessment) => (
                      <div key={assessment.customerId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">Customer {assessment.customerId.slice(-6)}</div>
                          <div className="text-xs text-muted-foreground">
                            {assessment.recommendations.length} recommendations
                          </div>
                        </div>
                        <div className="text-right">
                          {getRiskBadge(assessment.riskLevel)}
                          <div className="text-xs text-muted-foreground mt-1">
                            {formatPercentage(assessment.probability)} probability
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
                <CardTitle>Deal Win Probability</CardTitle>
                <CardDescription>Distribution of deal win probabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[
                    { range: '0-20%', count: dealPredictions.filter(d => d.winProbability < 0.2).length },
                    { range: '20-40%', count: dealPredictions.filter(d => d.winProbability >= 0.2 && d.winProbability < 0.4).length },
                    { range: '40-60%', count: dealPredictions.filter(d => d.winProbability >= 0.4 && d.winProbability < 0.6).length },
                    { range: '60-80%', count: dealPredictions.filter(d => d.winProbability >= 0.6 && d.winProbability < 0.8).length },
                    { range: '80-100%', count: dealPredictions.filter(d => d.winProbability >= 0.8).length }
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
                <CardTitle>High-Probability Deals</CardTitle>
                <CardDescription>Deals with high win probability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dealPredictions
                    .filter(d => d.winProbability > 0.7)
                    .slice(0, 5)
                    .map((deal) => (
                      <div key={deal.dealId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">Deal {deal.dealId.slice(-6)}</div>
                          <div className="text-xs text-muted-foreground">
                            {deal.recommendations.length} recommendations
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{formatPercentage(deal.winProbability)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatPercentage(deal.confidence)} confidence
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
                <CardTitle>Model Status</CardTitle>
                <CardDescription>Current status of all AI models</CardDescription>
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
                            {model.type} • Version {model.version}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{formatPercentage(model.accuracy)}</div>
                          <div className="text-xs text-muted-foreground">Accuracy</div>
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
                <CardTitle>Training Jobs</CardTitle>
                <CardDescription>Recent and active model training jobs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {trainingJobs.slice(0, 5).map((job) => (
                    <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Zap className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">Training Job {job.id.slice(-6)}</div>
                          <div className="text-sm text-muted-foreground">
                            Model {job.modelId.slice(-6)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-medium">{formatPercentage(job.progress)}</div>
                          <div className="text-xs text-muted-foreground">Progress</div>
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
  
  leadScores.forEach(lead => {
    lead.factors.forEach(factor => {
      const current = factorMap.get(factor.feature) || 0;
      factorMap.set(factor.feature, current + Math.abs(factor.contribution));
    });
  });

  return Array.from(factorMap.entries())
    .map(([factor, impact]) => ({ factor, impact: impact / leadScores.length }))
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 5);
}

function calculateRetentionRate(assessments: ChurnRiskAssessment[]): number {
  if (assessments.length === 0) return 0;
  const lowRiskCount = assessments.filter(a => a.riskLevel === 'low').length;
  return lowRiskCount / assessments.length;
}

function calculateTopRiskFactors(assessments: ChurnRiskAssessment[]): Array<{ factor: string; frequency: number }> {
  const factorMap = new Map<string, number>();
  
  assessments.forEach(assessment => {
    assessment.factors.forEach(factor => {
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
  return dealPredictions
    .filter(d => d.winProbability < 0.5)
    .length * 10000; // Assuming average deal value of $10k
}
