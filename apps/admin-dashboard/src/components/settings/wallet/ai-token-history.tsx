'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FaDownload, FaArrowUp, FaArrowDown, FaBrain } from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import { walletClient } from '@/lib/api/wallet-client';

interface AITokenTransaction {
  id: string;
  type: 'purchase' | 'refund' | 'usage' | 'adjustment' | 'bonus';
  amount: number;
  currency: string;
  description?: string;
  operationType?: string;
  operationId?: string;
  createdAt: string;
}

export function AITokenHistory() {
  const [transactions, setTransactions] = useState<AITokenTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleRefresh = () => {
    loadTransactions();
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await walletClient.getAITokenTransactions(50);
      setTransactions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load AI token transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Amount', 'Description', 'Operation Type'];
    const rows = transactions.map((tx) => [
      new Date(tx.createdAt).toLocaleString(),
      tx.type,
      tx.amount.toString(),
      tx.description || '',
      tx.operationType || '',
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-token-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTransactionBadge = (type: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      purchase: { variant: 'default', className: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800' },
      refund: { variant: 'default', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800' },
      bonus: { variant: 'default', className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800' },
      adjustment: { variant: 'default', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800' },
      usage: { variant: 'destructive', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800' },
    };
    return variants[type] || { variant: 'outline', className: '' };
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
      case 'refund':
      case 'bonus':
      case 'adjustment':
        return <FaArrowUp className="w-3 h-3" />;
      case 'usage':
        return <FaArrowDown className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const formatAmount = (amount: number) => {
    const num = Number(amount);
    if (isNaN(num) || !isFinite(num)) {
      return '0';
    }
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toLocaleString()}`;
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50">
                <FaBrain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-lg font-semibold">AI Token Transactions</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">
              Complete history of AI token purchases, usage, and adjustments
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="h-8 w-8 p-0"
            >
              <MdRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={loading || transactions.length === 0}
              className="h-8 text-xs"
            >
              <FaDownload className="w-3 h-3 mr-1.5" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-2">
              <MdRefresh className="w-5 h-5 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading transactions...</p>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <FaBrain className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No transactions found</p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="h-10 text-xs font-medium text-muted-foreground">Date</TableHead>
                  <TableHead className="h-10 text-xs font-medium text-muted-foreground">Type</TableHead>
                  <TableHead className="h-10 text-xs font-medium text-muted-foreground text-right">Amount</TableHead>
                  <TableHead className="h-10 text-xs font-medium text-muted-foreground">Description</TableHead>
                  <TableHead className="h-10 text-xs font-medium text-muted-foreground">Operation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx, idx) => {
                  const badge = getTransactionBadge(tx.type);
                  return (
                    <TableRow key={tx.id} className="border-b border-border/50 last:border-0">
                      <TableCell className="py-3">
                        <div className="text-sm font-medium">
                          {new Date(tx.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant={badge.variant} className={`${badge.className} gap-1.5 text-xs font-medium`}>
                          {getTransactionIcon(tx.type)}
                          <span className="capitalize">{tx.type}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <span className={`text-sm font-semibold ${
                          tx.type === 'usage' 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          {formatAmount(tx.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 max-w-xs">
                        <p className="text-sm text-foreground truncate" title={tx.description || undefined}>
                          {tx.description || <span className="text-muted-foreground">—</span>}
                        </p>
                      </TableCell>
                      <TableCell className="py-3">
                        {tx.operationType ? (
                          <span className="text-xs text-muted-foreground capitalize font-medium">
                            {tx.operationType.replace(/_/g, ' ')}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

