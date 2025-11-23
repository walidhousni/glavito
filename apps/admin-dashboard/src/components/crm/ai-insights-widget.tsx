'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import Image from 'next/image';
import { Zap, Loader2, RefreshCw, AlertCircle, TrendingUp, Users, Target, Sparkles } from 'lucide-react';
import { crmAiApi, type DashboardInsights } from '@/lib/api/crm-ai-client';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';

export function AIInsightsWidget() {
  const t = useTranslations('crm');
  const [insights, setInsights] = useState<DashboardInsights>({
    topLeads: [],
    atRiskDeals: [],
    churnAlerts: [],
    recommendations: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadInsights = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const data = await crmAiApi.getDashboardInsights();
      
      // Ensure all arrays exist and are arrays
      setInsights({
        topLeads: Array.isArray(data?.topLeads) ? data.topLeads : [],
        atRiskDeals: Array.isArray(data?.atRiskDeals) ? data.atRiskDeals : [],
        churnAlerts: Array.isArray(data?.churnAlerts) ? data.churnAlerts : [],
        recommendations: Array.isArray(data?.recommendations) ? data.recommendations : [],
      });
    } catch (err) {
      console.error('Failed to load AI insights:', err);
      setError('Failed to load insights');
      // Set empty arrays on error
      setInsights({
        topLeads: [],
        atRiskDeals: [],
        churnAlerts: [],
        recommendations: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInsights();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadInsights, 300000);
    return () => clearInterval(interval);
  }, []);

  const topLeads = Array.isArray(insights.topLeads) ? insights.topLeads : [];
  const atRiskDeals = Array.isArray(insights.atRiskDeals) ? insights.atRiskDeals : [];
  const churnAlerts = Array.isArray(insights.churnAlerts) ? insights.churnAlerts : [];
  const recommendations = Array.isArray(insights.recommendations) ? insights.recommendations : [];

  return (
    <Card className="border-0 shadow-2xl overflow-hidden relative bg-gradient-to-br from-purple-50/50 via-pink-50/50 to-orange-50/50 dark:from-purple-950/20 dark:via-pink-950/20 dark:to-orange-950/20">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-orange-500/10" />
      <CardHeader className="relative pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
              <Image 
                src="https://img.icons8.com/?size=28&id=FQrA6ic36VQu" 
                alt="AI" 
                width={24} 
                height={24}
                className="brightness-0 invert animate-pulse"
              />
            </div>
            <div>
              <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
                {t('aiInsights.title', { default: 'AI Insights' })}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live Intelligence
              </p>
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
              <Sparkles className="h-3 w-3 mr-1" />
              AI Powered
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadInsights}
              disabled={refreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Analyzing your CRM data...</p>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-12">
            <div className="p-4 rounded-full bg-destructive/10 inline-flex mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-sm font-medium mb-2">{error}</p>
            <Button size="sm" variant="outline" onClick={loadInsights}>
              <RefreshCw className="h-3 w-3 mr-2" />
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && (
          <Tabs defaultValue="leads" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted/50 mb-6">
              <TabsTrigger value="leads" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Image src="https://img.icons8.com/?size=16&id=18515" alt="Hot" width={14} height={14} />
                <span className="hidden sm:inline">{t('aiInsights.hotLeads', { default: 'Hot Leads' })}</span>
                {topLeads.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {topLeads.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="deals" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Image src="https://img.icons8.com/?size=16&id=8nkymLDcVcxF" alt="Risk" width={14} height={14} />
                <span className="hidden sm:inline">{t('aiInsights.atRisk', { default: 'At Risk' })}</span>
                {atRiskDeals.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {atRiskDeals.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="churn" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Image src="https://img.icons8.com/?size=16&id=39vT8RSUxpIY" alt="Churn" width={14} height={14} />
                <span className="hidden sm:inline">{t('aiInsights.churn', { default: 'Churn' })}</span>
                {churnAlerts.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                    {churnAlerts.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Image src="https://img.icons8.com/?size=16&id=75" alt="Ideas" width={14} height={14} />
                <span className="hidden sm:inline">{t('aiInsights.actions', { default: 'Actions' })}</span>
                {recommendations.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                    {recommendations.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="leads" className="space-y-3 mt-0">
              {topLeads.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 rounded-full bg-muted inline-flex mb-4">
                    <Target className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {t('aiInsights.noHotLeads', { default: 'No hot leads at the moment' })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    High-scoring leads will appear here
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {topLeads.map((lead, idx: number) => (
                      <motion.div
                        key={lead.id || idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <Card className="border-0 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-l-4 border-l-green-500">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="p-2 rounded-lg bg-green-500/10">
                                  <Image src="https://img.icons8.com/?size=20&id=18515" alt="Hot" width={18} height={18} />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm mb-1">{lead.name || 'Unknown Lead'}</h4>
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {lead.reason || 'High potential lead'}
                                  </p>
                                </div>
                              </div>
                              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold shadow-sm">
                                {lead.score || 0}/100
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={lead.score || 0} className="h-2 flex-1" />
                              <Button size="sm" variant="outline" className="h-8 text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                {lead.suggestedAction || 'Contact'}
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
            
            <TabsContent value="deals" className="space-y-3 mt-0">
              {atRiskDeals.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 rounded-full bg-muted inline-flex mb-4">
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {t('aiInsights.noAtRiskDeals', { default: 'All deals are on track' })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No deals require immediate attention
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {atRiskDeals.map((deal, idx: number) => (
                      <motion.div
                        key={deal.id || idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <Card className="border-0 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-l-4 border-l-amber-500">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="p-2 rounded-lg bg-amber-500/10">
                                  <Image src="https://img.icons8.com/?size=20&id=8nkymLDcVcxF" alt="Risk" width={18} height={18} />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm mb-1">{deal.name || 'Untitled Deal'}</h4>
                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                    {Array.isArray(deal.riskFactors) && deal.riskFactors.length > 0
                                      ? deal.riskFactors.join(', ')
                                      : 'Multiple risk factors detected'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="secondary" className="bg-amber-500 text-white font-bold shadow-sm">
                                {deal.riskScore || 0}%
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={deal.riskScore || 0} className="h-2 flex-1" />
                              <Button size="sm" variant="outline" className="h-8 text-xs">
                                View Plan
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
            
            <TabsContent value="churn" className="space-y-3 mt-0">
              {churnAlerts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 rounded-full bg-muted inline-flex mb-4">
                    <Users className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {t('aiInsights.noChurnRisk', { default: 'No churn risks detected' })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your customers are engaged and satisfied
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {churnAlerts.map((alert, idx: number) => (
                      <motion.div
                        key={alert.id || idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <Card className="border-0 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20 border-l-4 border-l-red-500">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3 flex-1">
                                <div className="p-2 rounded-lg bg-red-500/10">
                                  <Image src="https://img.icons8.com/?size=20&id=39vT8RSUxpIY" alt="Churn" width={18} height={18} />
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-semibold text-sm mb-1">{alert.customerName || 'Unknown Customer'}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {alert.primaryReason || 'Decreased engagement'}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="destructive" className="font-bold shadow-sm">
                                High Risk
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={(alert.churnProbability || 0.5) * 100} 
                                className="h-2 flex-1" 
                              />
                              <Button size="sm" variant="outline" className="h-8 text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                Retain
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
            
            <TabsContent value="recommendations" className="space-y-3 mt-0">
              {recommendations.length === 0 ? (
                <div className="text-center py-12">
                  <div className="p-4 rounded-full bg-muted inline-flex mb-4">
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">
                    {t('aiInsights.noRecommendations', { default: 'No new recommendations' })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    AI will suggest actions based on your CRM activity
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-3">
                    {recommendations.map((rec, idx: number) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                      >
                        <Card className="border-0 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border-l-4 border-l-blue-500">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3 mb-3">
                              <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
                                <Image src="https://img.icons8.com/?size=20&id=75" alt="Idea" width={18} height={18} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-sm">{rec.title || 'Recommendation'}</h4>
                                  {rec.priority === 'high' && (
                                    <Badge variant="destructive" className="h-4 px-1.5 text-xs">
                                      High
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                                  {rec.description || 'No description available'}
                                </p>
                                <Button size="sm" variant="outline" className="w-full h-8 text-xs">
                                  {rec.actionLabel || 'Take Action'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
