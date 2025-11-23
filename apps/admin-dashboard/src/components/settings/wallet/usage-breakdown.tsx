'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FaDownload, FaCalendarAlt, FaBrain, FaChartLine } from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import { walletClient } from '@/lib/api/wallet-client';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface UsageBreakdownProps {
  channelType?: string;
}

interface ChannelUsageBreakdown {
  channelType: string;
  total: {
    outbound: number;
    delivered: number;
    failed: number;
    inbound: number;
  };
  byType: Record<string, {
    outbound: number;
    delivered: number;
    failed: number;
    cost: number;
    carrierFee: number;
    totalCost: number;
  }>;
  totals: {
    quantity: number;
    cost: number;
    carrierFee: number;
    totalCost: number;
  };
}

interface CreditsSummary {
  totalCreditsUsed: number;
  totalCreditsTopUp: number;
  netBalance: number;
}

interface AITokenSummary {
  currentBalance: number;
  currency: string;
  totalTokensUsed: number;
  totalTokensPurchased: number;
  netBalance: number;
}

interface AITokenUsageBreakdown {
  operationType: string;
  count: number;
  totalTokens: number;
}

export function UsageBreakdown({ channelType }: UsageBreakdownProps) {
  const [breakdown, setBreakdown] = useState<ChannelUsageBreakdown[]>([]);
  const [summary, setSummary] = useState<CreditsSummary | null>(null);
  const [aiTokenSummary, setAiTokenSummary] = useState<AITokenSummary | null>(null);
  const [aiTokenBreakdown, setAiTokenBreakdown] = useState<AITokenUsageBreakdown[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>(channelType || 'all');
  const [startDate, setStartDate] = useState<Date | undefined>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30); // Default to last 30 days
    return date;
  });
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const start = startDate ? startDate.toISOString().split('T')[0] : undefined;
      const end = endDate ? endDate.toISOString().split('T')[0] : undefined;
      const channel = selectedChannel === 'all' ? undefined : selectedChannel;
      
      const [breakdownData, summaryData, aiTokenSummaryData, aiTokenBreakdownData] = await Promise.all([
        walletClient.getUsageBreakdown(channel, start, end),
        walletClient.getCreditsSummary(start, end),
        walletClient.getAITokenSummary(start, end).catch(() => null),
        walletClient.getAITokenUsageBreakdown(start, end).catch(() => []),
      ]);
      
      // Ensure breakdown is always an array
      // Handle both direct array response and wrapped response
      let breakdownArray: ChannelUsageBreakdown[] = [];
      if (Array.isArray(breakdownData)) {
        breakdownArray = breakdownData;
      } else if (breakdownData && typeof breakdownData === 'object' && 'data' in breakdownData) {
        // Handle wrapped response
        breakdownArray = Array.isArray(breakdownData.data) ? breakdownData.data : [];
      } else if (breakdownData && typeof breakdownData === 'object') {
        // Handle object response - convert to array
        breakdownArray = Object.values(breakdownData);
      }
      
      // Ensure summary values are valid numbers
      let summaryDataNormalized = summaryData;
      if (summaryData && typeof summaryData === 'object') {
        summaryDataNormalized = {
          totalCreditsUsed: Number(summaryData.totalCreditsUsed) || 0,
          totalCreditsTopUp: Number(summaryData.totalCreditsTopUp) || 0,
          netBalance: Number(summaryData.netBalance) || 0,
        };
      }
      
      setBreakdown(breakdownArray);
      setSummary(summaryDataNormalized || null);
      
      // Set AI token data
      if (aiTokenSummaryData) {
        setAiTokenSummary({
          currentBalance: Number(aiTokenSummaryData.currentBalance) || 0,
          currency: aiTokenSummaryData.currency || 'USD',
          totalTokensUsed: Number(aiTokenSummaryData.totalTokensUsed) || 0,
          totalTokensPurchased: Number(aiTokenSummaryData.totalTokensPurchased) || 0,
          netBalance: Number(aiTokenSummaryData.netBalance) || 0,
        });
      }
      
      const aiBreakdownArray = Array.isArray(aiTokenBreakdownData) ? aiTokenBreakdownData : [];
      setAiTokenBreakdown(aiBreakdownArray);
    } catch (err) {
      console.error('Failed to load usage breakdown:', err);
      setBreakdown([]); // Ensure breakdown is always an array even on error
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [selectedChannel, startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const exportToCSV = () => {
    // Ensure breakdown is an array before exporting
    if (!Array.isArray(breakdown) || breakdown.length === 0) {
      return;
    }

    const headers = ['Channel', 'Message Type', 'Unit', 'Quantity', 'Outbound', 'Delivered', 'Failed', 'Inbound', 'Cost', 'Carrier Fee', 'Total Cost'];
    const rows: string[][] = [];

    for (const channelData of breakdown) {
      for (const [messageType, data] of Object.entries(channelData.byType)) {
        rows.push([
          channelData.channelType,
          messageType,
          messageType === 'image' || messageType === 'video' || messageType === 'audio' || messageType === 'document' ? 'MMS' : 'SMS',
          data.outbound.toString(),
          data.outbound.toString(),
          data.delivered.toString(),
          data.failed.toString(),
          channelData.total.inbound.toString(),
          `$${data.cost.toFixed(4)}`,
          `$${data.carrierFee.toFixed(4)}`,
          `$${data.totalCost.toFixed(4)}`,
        ]);
      }
      
      // Add totals row
      rows.push([
        channelData.channelType,
        'Total',
        '-',
        channelData.totals.quantity.toString(),
        channelData.total.outbound.toString(),
        channelData.total.delivered.toString(),
        channelData.total.failed.toString(),
        channelData.total.inbound.toString(),
        `$${channelData.totals.cost.toFixed(4)}`,
        `$${channelData.totals.carrierFee.toFixed(4)}`,
        `$${channelData.totals.totalCost.toFixed(4)}`,
      ]);
    }

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateRange = startDate && endDate 
      ? `${startDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}-${endDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`
      : 'all-time';
    link.download = `wallet-usage-${selectedChannel}-${dateRange}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    // Handle NaN, null, undefined, or invalid numbers
    const num = Number(amount);
    if (isNaN(num) || !isFinite(num)) {
      return '$0.00';
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(num);
  };

  const getMessageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      text: 'SMS',
      image: 'MMS',
      video: 'MMS',
      audio: 'MMS',
      document: 'MMS',
    };
    return labels[type] || type.toUpperCase();
  };

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Credits Used
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold">{formatCurrency(summary.totalCreditsUsed)}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Credits Top-up
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-semibold">{formatCurrency(summary.totalCreditsTopUp)}</div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Net Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className={`text-2xl font-semibold ${summary.netBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(summary.netBalance)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
                  <FaChartLine className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-lg font-semibold">Usage Breakdown</CardTitle>
              </div>
              <CardDescription className="text-xs text-muted-foreground">
                Detailed analysis of wallet activity and AI token consumption
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadData}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <MdRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={loading || breakdown.length === 0}
                className="h-8 text-xs"
              >
                <FaDownload className="w-3 h-3 mr-1.5" />
                Export
            </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Date Range</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-[240px] justify-start text-left font-normal text-xs">
                    <FaCalendarAlt className="mr-2 h-3 w-3" />
                    {startDate && endDate ? (
                      `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    ) : (
                      <span className="text-muted-foreground">Select range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    selected={startDate && endDate ? { from: startDate, to: endDate } : undefined}
                    onSelect={(range: { from?: Date; to?: Date } | undefined) => {
                      if (range) {
                        setStartDate(range.from);
                        setEndDate(range.to);
                      }
                    }}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Channel</span>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <MdRefresh className="w-5 h-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading usage breakdown...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* AI Token Usage Section */}
              {aiTokenSummary && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50">
                        <FaBrain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-semibold">AI Token Usage</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                          Consumption and purchase statistics
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Balance</p>
                        <p className="text-xl font-semibold text-purple-600 dark:text-purple-400">
                          {aiTokenSummary.currentBalance.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Used</p>
                        <p className="text-xl font-semibold text-red-600 dark:text-red-400">
                          {aiTokenSummary.totalTokensUsed.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Purchased</p>
                        <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                          {aiTokenSummary.totalTokensPurchased.toLocaleString()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net</p>
                        <p className="text-xl font-semibold">
                          {aiTokenSummary.netBalance.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    {aiTokenBreakdown.length > 0 && (
                      <div className="rounded-lg border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableHead className="h-10 text-xs font-medium text-muted-foreground">Operation</TableHead>
                              <TableHead className="h-10 text-xs font-medium text-muted-foreground text-right">Count</TableHead>
                              <TableHead className="h-10 text-xs font-medium text-muted-foreground text-right">Tokens</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                            {aiTokenBreakdown.map((item) => (
                              <TableRow key={item.operationType} className="border-b border-border/50 last:border-0">
                                <TableCell className="py-3 font-medium text-sm capitalize">
                                  {item.operationType.replace(/_/g, ' ')}
                                </TableCell>
                                <TableCell className="py-3 text-right text-sm">{item.count}</TableCell>
                                <TableCell className="py-3 text-right text-sm font-semibold">
                                  {item.totalTokens.toLocaleString()}
                                </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {/* Channel Usage Section */}
              {!Array.isArray(breakdown) || breakdown.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-2">
                    <FaChartLine className="w-8 h-8 mx-auto text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No channel usage data found</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {breakdown.map((channelData) => (
                    <div key={channelData.channelType} className="space-y-3">
                      <h3 className="text-sm font-semibold capitalize text-foreground">
                        {channelData.channelType}
                      </h3>
                      <div className="rounded-lg border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                              <TableHead className="h-10 text-xs font-medium text-muted-foreground">Unit</TableHead>
                              <TableHead className="h-10 text-xs font-medium text-muted-foreground text-right">Quantity</TableHead>
                              <TableHead className="h-10 text-xs font-medium text-muted-foreground text-right">Outbound</TableHead>
                              <TableHead className="h-10 text-xs font-medium text-muted-foreground text-right">Delivered</TableHead>
                              <TableHead className="h-10 text-xs font-medium text-muted-foreground text-right">Failed</TableHead>
                              <TableHead className="h-10 text-xs font-medium text-muted-foreground text-right">Inbound</TableHead>
                              <TableHead className="h-10 text-xs font-medium text-muted-foreground text-right">Cost</TableHead>
                              <TableHead className="h-10 text-xs font-medium text-muted-foreground text-right">Carrier Fee</TableHead>
                              <TableHead className="h-10 text-xs font-medium text-muted-foreground text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                            {Object.entries(channelData.byType).map(([messageType, data]) => (
                              <TableRow key={messageType} className="border-b border-border/50 last:border-0">
                                <TableCell className="py-3 text-sm font-medium">{getMessageTypeLabel(messageType)}</TableCell>
                                <TableCell className="py-3 text-sm text-right">{data.outbound}</TableCell>
                                <TableCell className="py-3 text-sm text-right">{data.outbound}</TableCell>
                                <TableCell className="py-3 text-sm text-right">{data.delivered}</TableCell>
                                <TableCell className="py-3 text-sm text-right">{data.failed}</TableCell>
                                <TableCell className="py-3 text-sm text-right">{channelData.total.inbound}</TableCell>
                                <TableCell className="py-3 text-sm text-right">{formatCurrency(data.cost)}</TableCell>
                                <TableCell className="py-3 text-sm text-right">{formatCurrency(data.carrierFee)}</TableCell>
                                <TableCell className="py-3 text-sm text-right font-semibold">{formatCurrency(data.totalCost)}</TableCell>
                          </TableRow>
                        ))}
                            <TableRow className="bg-muted/20 font-semibold border-t-2 border-border">
                              <TableCell className="py-3 text-sm">Total</TableCell>
                              <TableCell className="py-3 text-sm text-right">{channelData.totals.quantity}</TableCell>
                              <TableCell className="py-3 text-sm text-right">{channelData.total.outbound}</TableCell>
                              <TableCell className="py-3 text-sm text-right">{channelData.total.delivered}</TableCell>
                              <TableCell className="py-3 text-sm text-right">{channelData.total.failed}</TableCell>
                              <TableCell className="py-3 text-sm text-right">{channelData.total.inbound}</TableCell>
                              <TableCell className="py-3 text-sm text-right">{formatCurrency(channelData.totals.cost)}</TableCell>
                              <TableCell className="py-3 text-sm text-right">{formatCurrency(channelData.totals.carrierFee)}</TableCell>
                              <TableCell className="py-3 text-sm text-right">{formatCurrency(channelData.totals.totalCost)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                      </div>
                    </div>
                  ))}
                  <div className="text-xs text-muted-foreground pt-2">
                    *All prices shown in USD
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

