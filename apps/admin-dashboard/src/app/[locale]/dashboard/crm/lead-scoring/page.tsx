'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { leadScoringApi, type LeadScoringModel, type ModelAnalytics } from '@/lib/api/lead-scoring-client';
import { Plus, RefreshCw, TrendingUp, Users, Target, Zap, BarChart3, Settings, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LeadScoringPage() {
  const { push } = useToast();
  const [models, setModels] = useState<LeadScoringModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<LeadScoringModel | null>(null);
  const [analytics, setAnalytics] = useState<ModelAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [bulkScoreLoading, setBulkScoreLoading] = useState(false);

  const [newModel, setNewModel] = useState({
    name: '',
    description: '',
    industry: '',
    weightConfig: {
      demographic: 0.3,
      engagement: 0.4,
      behavioral: 0.3
    }
  });

  useEffect(() => {
    void loadModels();
  }, []);

  useEffect(() => {
    if (selectedModel) {
      loadAnalytics(selectedModel.id);
    }
  }, [selectedModel]);

  async function loadModels() {
    try {
      setIsLoading(true);
      const data = await leadScoringApi.listScoringModels();
      setModels(data);
      if (data.length > 0 && !selectedModel) {
        setSelectedModel(data[0]);
      }
    } catch {
      push('Failed to load scoring models', 'error');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadAnalytics(modelId: string) {
    try {
      const data = await leadScoringApi.getModelAnalytics(modelId);
      setAnalytics(data);
    } catch {
      // Silent fail - analytics is optional
    }
  }

  async function handleCreateModel() {
    try {
      await leadScoringApi.createScoringModel({
        ...newModel,
        rules: []
      });
      push('Scoring model created successfully', 'success');
      setCreateDialogOpen(false);
      setNewModel({
        name: '',
        description: '',
        industry: '',
        weightConfig: {
          demographic: 0.3,
          engagement: 0.4,
          behavioral: 0.3
        }
      });
      loadModels();
    } catch {
      push('Failed to create scoring model', 'error');
    }
  }

  async function handleBulkScore() {
    try {
      setBulkScoreLoading(true);
      const result = await leadScoringApi.bulkScoreLeads(selectedModel?.id);
      push(`Successfully scored ${result.updated} leads`, 'success');
      if (selectedModel) {
        loadAnalytics(selectedModel.id);
      }
    } catch {
      push('Failed to bulk score leads', 'error');
    } finally {
      setBulkScoreLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent flex items-center gap-3">
            <Image 
              src="https://img.icons8.com/?size=48&id=6690" 
              alt="Lead Scoring" 
              width={32} 
              height={32} 
            />
            Lead Scoring Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage scoring models and analyze lead quality with AI-powered insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadModels()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Model
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Models</CardTitle>
              <Image src="https://img.icons8.com/?size=24&id=Yj5svDsC4jQA" alt="" width={20} height={20} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{models.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {models.filter(m => m.isActive).length} active
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads Scored</CardTitle>
              <Users className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {models.reduce((sum, m) => sum + m.totalLeadsScored, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Across all models
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
              <Target className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics ? analytics.statistics.avgScore : '-'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Current model average
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-5 w-5 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {analytics ? `${analytics.statistics.conversionRate.toFixed(1)}%` : '-'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Leads to deals
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Models List */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-1"
        >
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image src="https://img.icons8.com/?size=24&id=Yj5svDsC4jQA" alt="" width={20} height={20} />
                Scoring Models
              </CardTitle>
              <CardDescription>Select a model to view analytics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : models.length === 0 ? (
                <div className="text-center py-8">
                  <Image 
                    src="https://img.icons8.com/?size=64&id=6690" 
                    alt="" 
                    width={48} 
                    height={48} 
                    className="mx-auto mb-3 opacity-50" 
                  />
                  <p className="text-sm text-muted-foreground">No scoring models yet</p>
                  <Button size="sm" className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-3 w-3 mr-2" />
                    Create Your First Model
                  </Button>
                </div>
              ) : (
                models.map((model, index) => (
                  <motion.div
                    key={model.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                  >
                    <Card
                      className={cn(
                        'cursor-pointer transition-all duration-200 hover:shadow-lg',
                        selectedModel?.id === model.id
                          ? 'ring-2 ring-primary shadow-lg'
                          : 'hover:ring-1 hover:ring-gray-300'
                      )}
                      onClick={() => setSelectedModel(model)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              {model.name}
                              {model.isDefault && (
                                <Badge variant="default" className="text-xs">Default</Badge>
                              )}
                            </CardTitle>
                            {model.industry && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {model.industry}
                              </Badge>
                            )}
                          </div>
                          {!model.isActive && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Leads Scored:</span>
                          <span className="font-semibold">{model.totalLeadsScored.toLocaleString()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Analytics Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="lg:col-span-2"
        >
          {selectedModel ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="distribution">Distribution</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card className="border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      Model Performance
                    </CardTitle>
                    <CardDescription>{selectedModel.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {analytics ? (
                      <>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Average Score</Label>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <Progress value={analytics.statistics.avgScore} className="h-3" />
                              </div>
                              <span className="text-2xl font-bold">{analytics.statistics.avgScore}</span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Conversion Rate</Label>
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <Progress value={analytics.statistics.conversionRate} className="h-3" />
                              </div>
                              <span className="text-2xl font-bold">{analytics.statistics.conversionRate.toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Lead Statistics</Label>
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                              <span className="text-sm text-muted-foreground">Total Leads</span>
                              <span className="text-lg font-bold">{analytics.statistics.totalLeads}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-green-100 dark:bg-green-950/30">
                              <span className="text-sm text-muted-foreground">Converted</span>
                              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                {analytics.statistics.convertedLeads}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-medium">Actions</Label>
                          <div className="flex flex-wrap gap-2">
                            <Button 
                              size="sm" 
                              onClick={handleBulkScore}
                              disabled={bulkScoreLoading}
                            >
                              {bulkScoreLoading ? (
                                <>
                                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  Scoring...
                                </>
                              ) : (
                                <>
                                  <Zap className="h-4 w-4 mr-2" />
                                  Bulk Score All Leads
                                </>
                              )}
                            </Button>
                            <Button size="sm" variant="outline">
                              <Settings className="h-4 w-4 mr-2" />
                              Configure Rules
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                        <p className="text-sm text-muted-foreground mt-4">Loading analytics...</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="distribution" className="space-y-4">
                <Card className="border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle>Score Distribution</CardTitle>
                    <CardDescription>Distribution of lead scores across ranges</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {analytics ? (
                      <div className="space-y-4">
                        {Object.entries(analytics.statistics.scoreDistribution).map(([range, count]) => {
                          const total = analytics.statistics.totalLeads;
                          const percentage = total > 0 ? (count / total) * 100 : 0;
                          
                          return (
                            <div key={range} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium">{range}</span>
                                <span className="text-muted-foreground">{count} leads ({percentage.toFixed(1)}%)</span>
                              </div>
                              <Progress value={percentage} className="h-2" />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card className="border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle>Model Configuration</CardTitle>
                    <CardDescription>Weight configuration and thresholds</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Demographic Weight</Label>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Progress 
                              value={(selectedModel.weightConfig.demographic || 0) * 100} 
                              className="h-2" 
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {((selectedModel.weightConfig.demographic || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Engagement Weight</Label>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Progress 
                              value={(selectedModel.weightConfig.engagement || 0) * 100} 
                              className="h-2" 
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {((selectedModel.weightConfig.engagement || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Behavioral Weight</Label>
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <Progress 
                              value={(selectedModel.weightConfig.behavioral || 0) * 100} 
                              className="h-2" 
                            />
                          </div>
                          <span className="text-sm font-medium w-12 text-right">
                            {((selectedModel.weightConfig.behavioral || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <Button size="sm" variant="outline" className="w-full">
                        <Settings className="h-4 w-4 mr-2" />
                        Edit Model Configuration
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card className="border-0 shadow-xl">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Image 
                  src="https://img.icons8.com/?size=80&id=6690" 
                  alt="" 
                  width={64} 
                  height={64} 
                  className="opacity-50 mb-4" 
                />
                <h3 className="text-lg font-semibold mb-2">No Model Selected</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Select a scoring model from the list to view detailed analytics and configuration
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>

      {/* Create Model Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Scoring Model
            </DialogTitle>
            <DialogDescription>
              Create a new lead scoring model to evaluate lead quality
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Model Name *</Label>
              <Input
                id="name"
                placeholder="e.g., E-commerce Lead Scoring"
                value={newModel.name}
                onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe how this model evaluates leads..."
                value={newModel.description}
                onChange={(e) => setNewModel({ ...newModel, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry (Optional)</Label>
              <Select
                value={newModel.industry}
                onValueChange={(value) => setNewModel({ ...newModel, industry: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="e-commerce">E-commerce</SelectItem>
                  <SelectItem value="automotive">Automotive</SelectItem>
                  <SelectItem value="healthcare">Healthcare</SelectItem>
                  <SelectItem value="real-estate">Real Estate</SelectItem>
                  <SelectItem value="hospitality">Hospitality</SelectItem>
                  <SelectItem value="saas">SaaS</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateModel} disabled={!newModel.name}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Create Model
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

