'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { satisfactionApi, SatisfactionAnalytics } from '@/lib/api/satisfaction-client';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  TrendingUp, 
  MessageSquare, 
  Users, 
  Star,
  Calendar,
  Download,
  RefreshCw,
  Filter
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function SurveyAnalyticsPage() {
  const t = useTranslations('surveys');
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<SatisfactionAnalytics | null>(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    channel: '',
    surveyType: '',
  });

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const data = await satisfactionApi.getSurveyAnalytics({
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        channel: filters.channel || undefined,
        surveyType: filters.surveyType || undefined,
      });
      setAnalytics(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load survey analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const ratingData = analytics ? [
    { name: '1', value: analytics.satisfactionBreakdown.totalResponses > 0 ? 
      (analytics.satisfactionBreakdown.totalResponses - analytics.satisfactionBreakdown.positivePct - analytics.satisfactionBreakdown.neutralPct - analytics.satisfactionBreakdown.negativePct) : 0 },
    { name: '2', value: analytics.satisfactionBreakdown.negativePct },
    { name: '3', value: analytics.satisfactionBreakdown.neutralPct },
    { name: '4', value: analytics.satisfactionBreakdown.positivePct * 0.5 },
    { name: '5', value: analytics.satisfactionBreakdown.positivePct * 0.5 },
  ] : [];

  const channelData = analytics ? Object.entries(analytics.channelBreakdown).map(([channel, count]) => ({
    channel: channel.charAt(0).toUpperCase() + channel.slice(1),
    count,
  })) : [];

  if (loading && !analytics) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading survey analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Survey Analytics</h1>
          <p className="text-muted-foreground mt-1">View survey responses and insights</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={loadAnalytics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Channel</label>
              <Select value={filters.channel} onValueChange={(v) => setFilters({ ...filters, channel: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Channels</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Survey Type</label>
              <Select value={filters.surveyType} onValueChange={(v) => setFilters({ ...filters, surveyType: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="post_resolution">Post Resolution</SelectItem>
                  <SelectItem value="periodic">Periodic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={loadAnalytics} className="mt-4" disabled={loading}>
            Apply Filters
          </Button>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Surveys</p>
                <p className="text-2xl font-bold">{analytics?.totalSurveys || 0}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold">{analytics?.responseRate.toFixed(1) || 0}%</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                <p className="text-2xl font-bold">{analytics?.averageRating.toFixed(1) || 0}/5</p>
              </div>
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Responses</p>
                <p className="text-2xl font-bold">{analytics?.satisfactionBreakdown.totalResponses || 0}</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ratingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Channel Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ channel, count }) => `${channel}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Trend Over Time */}
        {analytics?.trendData && analytics.trendData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Trend Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analytics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="rating" stroke="#8884d8" name="Average Rating" />
                  <Line type="monotone" dataKey="responseCount" stroke="#82ca9d" name="Response Count" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Top Issues */}
      {analytics?.topIssues && analytics.topIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.topIssues.map((issue, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{issue.issue}</p>
                    <p className="text-sm text-muted-foreground">Impact: {issue.impact.toFixed(1)}%</p>
                  </div>
                  <Badge variant="secondary">{issue.count} occurrences</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

