'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FaDownload, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { useWallet } from '@/lib/hooks/use-wallet';
import type { BalanceHistoryItem, WalletTransaction } from '@/lib/api/wallet-client';

interface WalletHistoryProps {
  channelType: string;
  channelName: string;
}

export function WalletHistory({ channelType, channelName }: WalletHistoryProps) {
  const { getHistory, getTransactions } = useWallet();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [history, setHistory] = useState<BalanceHistoryItem[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [channelType, period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [historyData, transactionsData] = await Promise.all([
        getHistory(channelType, period),
        getTransactions(channelType, 20),
      ]);
      setHistory(historyData);
      setTransactions(transactionsData);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Balance', 'Usage', 'Transactions'];
    const rows = history.map((item) => [
      item.date,
      item.balance.toString(),
      item.usage.toString(),
      item.transactions.toString(),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `wallet-history-${channelType}-${period}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <FaArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'usage':
        return <FaArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return null;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'text-green-600';
      case 'usage':
        return 'text-red-600';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usage History</CardTitle>
              <CardDescription>Balance and usage trends for {channelName}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={(v) => setPeriod(v as '7d' | '30d' | '90d')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportToCSV} disabled={loading || history.length === 0}>
                <FaDownload className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading history...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No history available</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Current Balance</div>
                  <div className="text-2xl font-bold">
                    ${history[history.length - 1]?.balance.toLocaleString() || '0'}
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Usage</div>
                  <div className="text-2xl font-bold">
                    ${history.reduce((sum, item) => sum + item.usage, 0).toLocaleString()}
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground">Transactions</div>
                  <div className="text-2xl font-bold">
                    {history.reduce((sum, item) => sum + item.transactions, 0)}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Usage</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.slice(-14).reverse().map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(item.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${item.balance.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right ${item.usage > 0 ? 'text-red-600' : ''}`}>
                          {item.usage > 0 ? `-$${item.usage.toLocaleString()}` : '-'}
                        </TableCell>
                        <TableCell className="text-right">{item.transactions}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest credit transactions for {channelName}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No transactions found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      {new Date(tx.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTransactionIcon(tx.type)}
                        <span className="capitalize">{tx.type}</span>
                      </div>
                    </TableCell>
                    <TableCell>{tx.description || '-'}</TableCell>
                    <TableCell className={`text-right font-medium ${getTransactionColor(tx.type)}`}>
                      {tx.amount > 0 ? '+' : ''}${tx.amount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

