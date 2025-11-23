'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useBilling } from '@/lib/hooks/use-billing';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function InvoiceList() {
  const t = useTranslations('settings.billing.invoices');
  const { invoices, loading, error, loadInvoices } = useBilling();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // Ensure invoices is always an array
  const invoicesList = Array.isArray(invoices) ? invoices : [];

  const getStatusBadge = (status: string) => {
    const config = {
      paid: { label: 'Paid', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
      open: { label: 'Open', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      overdue: { label: 'Overdue', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      void: { label: 'Void', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
      draft: { label: 'Draft', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
    };

    const statusConfig = config[status.toLowerCase() as keyof typeof config] || config.pending;

    return (
      <Badge className={cn('text-xs', statusConfig.color)}>
        {statusConfig.label}
      </Badge>
    );
  };

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(timestamp * 1000));
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Convert cents to dollars
  };

  const handleDownloadPDF = (invoice: typeof invoicesList[0]) => {
    if (invoice.hostedInvoiceUrl) {
      window.open(invoice.hostedInvoiceUrl, '_blank');
    } else {
      toast({
        title: 'Invoice not available',
        description: 'PDF download is not available for this invoice',
        variant: 'destructive',
      });
    }
  };

  const filteredInvoices = invoicesList.filter((invoice) => {
    const matchesSearch =
      (invoice.number?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
      invoice.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || invoice.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoicesList.length,
    paid: invoicesList.filter((i) => i.status.toLowerCase() === 'paid').length,
    pending: invoicesList.filter((i) => i.status.toLowerCase() === 'pending' || i.status.toLowerCase() === 'open').length,
    overdue: invoicesList.filter((i) => i.status.toLowerCase() === 'overdue').length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
            <p className="text-xs text-muted-foreground">Paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
            <p className="text-xs text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Invoice History</CardTitle>
              <CardDescription>View and download your invoices</CardDescription>
            </div>
            <Button variant="outline" onClick={() => loadInvoices()}>
              <Icon name="refresh" className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                All
              </Button>
              <Button
                variant={filterStatus === 'paid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('paid')}
              >
                Paid
              </Button>
              <Button
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('pending')}
              >
                Pending
              </Button>
              <Button
                variant={filterStatus === 'overdue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('overdue')}
              >
                Overdue
              </Button>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">Invoice</th>
                  <th className="text-left p-3 text-sm font-medium">Date</th>
                  <th className="text-left p-3 text-sm font-medium">Amount</th>
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                  <th className="text-right p-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div className="font-medium text-sm">{invoice.number || invoice.id}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm">{formatDate(invoice.created)}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm font-medium">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </div>
                    </td>
                    <td className="p-3">{getStatusBadge(invoice.status)}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.hostedInvoiceUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPDF(invoice)}
                          >
                            <Icon name="download" className="w-4 h-4" />
                          </Button>
                        )}
                        {invoice.hostedInvoiceUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(invoice.hostedInvoiceUrl!, '_blank')}
                          >
                            <Icon name="eye" className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <Icon name="fileText" className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2">No invoices found</h3>
                      <p className="text-sm text-muted-foreground">
                        {searchQuery
                          ? 'Try adjusting your search or filters'
                          : 'Invoices will appear here once you have billing activity'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

