'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Image from 'next/image';
import {
  Plus,
  Trash2,
  Send,
  Eye,
  Check,
  X,
  FileText,
  User,
  ChevronDown,
  ChevronUp,
  Clock,
  TrendingUp,
  Package
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { quotesApi, Quote, CreateQuoteDto, QuoteLineItem, QuoteStats } from '@/lib/api/quotes-client';
import { AnimatedCounter } from '@/components/crm/animated-counter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Icons8 URLs
const icons8 = {
  quote: 'https://img.icons8.com/?id=DKTqU9lz7DHM&format=png&size=48',
  document: 'https://img.icons8.com/?id=12221&format=png&size=48',
  dollar: 'https://img.icons8.com/?id=10360&format=png&size=48',
  calendar: 'https://img.icons8.com/?id=7856&format=png&size=48',
  send: 'https://img.icons8.com/?id=10365&format=png&size=48',
  check: 'https://img.icons8.com/?id=10357&format=png&size=48',
  close: 'https://img.icons8.com/?id=10356&format=png&size=48',
  edit: 'https://img.icons8.com/?id=10369&format=png&size=48',
  eye: 'https://img.icons8.com/?id=10362&format=png&size=48',
  user: 'https://img.icons8.com/?id=37913&format=png&size=48',
  building: 'https://img.icons8.com/?id=xuvGCOXi8Wyg&format=png&size=48',
  chart: 'https://img.icons8.com/?id=SROvvC91x7DL&format=png&size=48',
  plus: 'https://img.icons8.com/?id=24717&format=png&size=48',
  copy: 'https://img.icons8.com/?id=10364&format=png&size=48',
  download: 'https://img.icons8.com/?id=10363&format=png&size=48',
  package: 'https://img.icons8.com/?id=13014&format=png&size=48',
  signature: 'https://img.icons8.com/?id=11663&format=png&size=48',
  clock: 'https://img.icons8.com/?id=7856&format=png&size=48',
  trending: 'https://img.icons8.com/?id=SROvvC91x7DL&format=png&size=48',
};

export default function QuotesPage() {
  const t = useTranslations('quotes');
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isQuoteDialogOpen, setIsQuoteDialogOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [quoteStats, setQuoteStats] = useState<QuoteStats | null>(null);
  const [newQuoteData, setNewQuoteData] = useState<Partial<CreateQuoteDto>>({
    title: '',
    description: '',
    lineItems: [],
    taxRate: 0,
    discountAmount: 0,
    validityDays: 30,
    terms: '',
    notes: '',
    signatureRequired: false,
  });
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    void fetchQuotes();
    void fetchQuoteStats();
  }, [statusFilter]);

  const fetchQuotes = async () => {
    try {
      const filters = statusFilter !== 'all' ? { status: statusFilter.toUpperCase() } : undefined;
      const fetchedQuotes = await quotesApi.listQuotes(filters);
      setQuotes(fetchedQuotes);
    } catch (error) {
      push(t('messages.fetchQuotesFailed'), 'error');
      console.error('Failed to fetch quotes:', error);
    }
  };

  const fetchQuoteStats = async () => {
    try {
      const stats = await quotesApi.getQuoteStats();
      setQuoteStats(stats);
    } catch (error) {
      push(t('messages.fetchStatsFailed'), 'error');
      console.error('Failed to fetch quote stats:', error);
    }
  };

  const handleCreateOrUpdateQuote = async () => {
    try {
      if (!newQuoteData.title || !newQuoteData.lineItems || newQuoteData.lineItems.length === 0) {
        push(t('messages.fillRequiredFields'), 'info');
        return;
      }

      await quotesApi.createQuote(newQuoteData as CreateQuoteDto);
      push(t('messages.quoteCreated'), 'success');
      setIsQuoteDialogOpen(false);
      resetQuoteForm();
      void fetchQuotes();
      void fetchQuoteStats();
    } catch (error) {
      push(t('messages.saveQuoteFailed'), 'error');
      console.error('Failed to save quote:', error);
    }
  };

  const handleSendQuote = async (quoteId: string) => {
    try {
      await quotesApi.sendQuote(quoteId);
      push(t('messages.quoteSent'), 'success');
      void fetchQuotes();
    } catch (error) {
      push(t('messages.sendQuoteFailed'), 'error');
      console.error('Failed to send quote:', error);
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    try {
      await quotesApi.acceptQuote(quoteId);
      push(t('messages.quoteAccepted'), 'success');
      void fetchQuotes();
      void fetchQuoteStats();
    } catch (error) {
      push(t('messages.acceptQuoteFailed'), 'error');
      console.error('Failed to accept quote:', error);
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    try {
      await quotesApi.rejectQuote(quoteId);
      push(t('messages.quoteRejected'), 'success');
      void fetchQuotes();
      void fetchQuoteStats();
    } catch (error) {
      push(t('messages.rejectQuoteFailed'), 'error');
      console.error('Failed to reject quote:', error);
    }
  };

  const handleViewQuote = async (quoteId: string) => {
    try {
      const quote = await quotesApi.getQuote(quoteId);
      setSelectedQuote(quote);
      setIsDetailDialogOpen(true);
    } catch (error) {
      push(t('messages.fetchQuoteDetailFailed'), 'error');
      console.error('Failed to fetch quote detail:', error);
    }
  };

  const resetQuoteForm = () => {
    setNewQuoteData({
      title: '',
      description: '',
      lineItems: [],
      taxRate: 0,
      discountAmount: 0,
      validityDays: 30,
      terms: '',
      notes: '',
      signatureRequired: false,
    });
  };

  const addLineItem = () => {
    setNewQuoteData(prev => ({
      ...prev,
      lineItems: [
        ...(prev.lineItems || []),
        {
          name: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          taxRate: 0,
        }
      ]
    }));
  };

  const updateLineItem = (index: number, key: keyof QuoteLineItem, value: string | number) => {
    setNewQuoteData(prev => {
      const updatedLineItems = [...(prev.lineItems || [])];
      updatedLineItems[index] = {
        ...updatedLineItems[index],
        [key]: value
      };
      return { ...prev, lineItems: updatedLineItems };
    });
  };

  const removeLineItem = (index: number) => {
    setNewQuoteData(prev => ({
      ...prev,
      lineItems: (prev.lineItems || []).filter((_, i) => i !== index)
    }));
  };

  const calculateLineItemTotal = (item: QuoteLineItem) => {
    const subtotal = item.unitPrice * item.quantity;
    const discount = item.discount || 0;
    return subtotal - discount;
  };

  const calculateQuoteTotal = () => {
    const lineItems = newQuoteData.lineItems || [];
    const subtotal = lineItems.reduce((sum, item) => sum + calculateLineItemTotal(item), 0);
    const discount = newQuoteData.discountAmount || 0;
    const afterDiscount = subtotal - discount;
    const tax = afterDiscount * (newQuoteData.taxRate || 0);
    return afterDiscount + tax;
  };

  const getStatusBadgeVariant = (status: string): "default" | "destructive" | "secondary" | "outline" | undefined => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'accepted') return 'default'; // Use default with green styling
    if (statusLower === 'sent' || statusLower === 'viewed') return 'default';
    if (statusLower === 'rejected' || statusLower === 'expired') return 'destructive';
    return 'secondary';
  };

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'accepted') return <Check className="h-4 w-4" />;
    if (statusLower === 'sent') return <Send className="h-4 w-4" />;
    if (statusLower === 'viewed') return <Eye className="h-4 w-4" />;
    if (statusLower === 'rejected') return <X className="h-4 w-4" />;
    if (statusLower === 'expired') return <Clock className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const toggleRowExpansion = (quoteId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [quoteId]: !prev[quoteId]
    }));
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        {/* Header */}
        <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-2 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-white/20 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between p-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600 bg-clip-text text-transparent">
                {t('title')}
              </h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Image src={icons8.quote} alt="" width={20} height={20} className="opacity-70" />
                {t('subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => {
                resetQuoteForm();
                setIsQuoteDialogOpen(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                {t('actions.createQuote')}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {quoteStats && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('stats.totalQuotes')}</CardTitle>
                  <Image src={icons8.document} alt="" width={20} height={20} className="opacity-70" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    <AnimatedCounter value={quoteStats.total} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('stats.totalValue')}: {formatCurrency(quoteStats.totalValue)}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Card className="border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('stats.acceptedQuotes')}</CardTitle>
                  <Image src={icons8.check} alt="" width={20} height={20} className="opacity-70" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    <AnimatedCounter value={quoteStats.byStatus.accepted} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatCurrency(quoteStats.acceptedValue)} {t('stats.accepted')}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Card className="border-l-4 border-l-amber-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('stats.acceptanceRate')}</CardTitle>
                  <Image src={icons8.trending} alt="" width={20} height={20} className="opacity-70" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    <AnimatedCounter value={quoteStats.acceptanceRate} decimals={1} suffix="%" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('stats.conversionMetric')}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card className="border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t('stats.avgTimeToAccept')}</CardTitle>
                  <Image src={icons8.clock} alt="" width={20} height={20} className="opacity-70" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    <AnimatedCounter value={quoteStats.avgTimeToAccept} suffix={t('stats.days')} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('stats.avgAcceptTime')}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview" className="gap-2">
              <FileText className="h-4 w-4" />
              {t('tabs.allQuotes')}
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('tabs.statistics')}
            </TabsTrigger>
          </TabsList>

          {/* All Quotes Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('list.title')}</CardTitle>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder={t('list.filterByStatus')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('list.allStatuses')}</SelectItem>
                      <SelectItem value="draft">{t('list.draft')}</SelectItem>
                      <SelectItem value="sent">{t('list.sent')}</SelectItem>
                      <SelectItem value="viewed">{t('list.viewed')}</SelectItem>
                      <SelectItem value="accepted">{t('list.accepted')}</SelectItem>
                      <SelectItem value="rejected">{t('list.rejected')}</SelectItem>
                      <SelectItem value="expired">{t('list.expired')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>{t('list.quoteNumber')}</TableHead>
                        <TableHead>{t('list.title')}</TableHead>
                        <TableHead>{t('list.customer')}</TableHead>
                        <TableHead>{t('list.amount')}</TableHead>
                        <TableHead>{t('list.status')}</TableHead>
                        <TableHead>{t('list.validUntil')}</TableHead>
                        <TableHead className="text-right">{t('list.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            {t('list.noQuotes')}
                          </TableCell>
                        </TableRow>
                      ) : (
                        quotes.map((quote) => (
                          <TableRow key={quote.id} className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleRowExpansion(quote.id)}
                              >
                                {expandedRows[quote.id] ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{quote.quoteNumber}</TableCell>
                            <TableCell className="font-medium">{quote.title}</TableCell>
                            <TableCell>
                              {quote.customer ? (
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-muted-foreground" />
                                  <span>{quote.customer.firstName} {quote.customer.lastName}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              {formatCurrency(parseFloat(quote.total.toString()), quote.currency)}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(quote.status)} className="gap-1">
                                {getStatusIcon(quote.status)}
                                {quote.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {quote.validUntil ? (
                                <span className={cn(
                                  "text-sm",
                                  new Date(quote.validUntil) < new Date() && "text-red-600 dark:text-red-400 font-medium"
                                )}>
                                  {formatDate(quote.validUntil)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => void handleViewQuote(quote.id)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{t('actions.view')}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                {quote.status === 'DRAFT' && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => void handleSendQuote(quote.id)}
                                        >
                                          <Send className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>{t('actions.send')}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}

                                {(quote.status === 'SENT' || quote.status === 'VIEWED') && (
                                  <>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => void handleAcceptQuote(quote.id)}
                                          >
                                            <Check className="h-4 w-4 text-green-600" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>{t('actions.accept')}</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => void handleRejectQuote(quote.id)}
                                          >
                                            <X className="h-4 w-4 text-red-600" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>{t('actions.reject')}</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats" className="mt-4 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image src={icons8.chart} alt="" width={24} height={24} />
                    {t('stats.quotesByStatus')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {quoteStats && (
                    <div className="space-y-3">
                      {Object.entries(quoteStats.byStatus).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusBadgeVariant(status)}>
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </Badge>
                          </div>
                          <span className="text-xl font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Image src={icons8.dollar} alt="" width={24} height={24} />
                    {t('stats.revenueOverview')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {quoteStats && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">{t('stats.totalQuoteValue')}</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {formatCurrency(quoteStats.totalValue)}
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground">{t('stats.acceptedValue')}</p>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(quoteStats.acceptedValue)}
                        </p>
                      </div>
                      <Separator />
                      <div>
                        <p className="text-sm text-muted-foreground">{t('stats.conversionRate')}</p>
                        <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {quoteStats.acceptanceRate.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create/Edit Quote Dialog */}
      <Dialog open={isQuoteDialogOpen} onOpenChange={setIsQuoteDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image src={icons8.plus} alt="" width={24} height={24} />
              {t('dialog.createQuote')}
            </DialogTitle>
            <DialogDescription>
              {t('dialog.createQuoteDescription')}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">{t('dialog.basicInfo')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quote-title">{t('dialog.title')} *</Label>
                    <Input
                      id="quote-title"
                      value={newQuoteData.title || ''}
                      onChange={(e) => setNewQuoteData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder={t('dialog.titlePlaceholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quote-validity">{t('dialog.validityDays')}</Label>
                    <Input
                      id="quote-validity"
                      type="number"
                      value={newQuoteData.validityDays || 30}
                      onChange={(e) => setNewQuoteData(prev => ({ ...prev, validityDays: parseInt(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quote-description">{t('dialog.description')}</Label>
                  <Textarea
                    id="quote-description"
                    value={newQuoteData.description || ''}
                    onChange={(e) => setNewQuoteData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder={t('dialog.descriptionPlaceholder')}
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              {/* Line Items */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{t('dialog.lineItems')}</h3>
                  <Button onClick={addLineItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('dialog.addLineItem')}
                  </Button>
                </div>

                {newQuoteData.lineItems && newQuoteData.lineItems.length > 0 ? (
                  <div className="space-y-3">
                    {newQuoteData.lineItems.map((item, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-12 gap-2 p-3 border rounded-md bg-muted/20"
                      >
                        <div className="col-span-4 space-y-1">
                          <Label>{t('dialog.itemName')}</Label>
                          <Input
                            value={item.name}
                            onChange={(e) => updateLineItem(index, 'name', e.target.value)}
                            placeholder={t('dialog.itemNamePlaceholder')}
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label>{t('dialog.quantity')}</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label>{t('dialog.unitPrice')}</Label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label>{t('dialog.discount')}</Label>
                          <Input
                            type="number"
                            value={item.discount || 0}
                            onChange={(e) => updateLineItem(index, 'discount', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="col-span-1 space-y-1">
                          <Label>{t('dialog.total')}</Label>
                          <div className="text-sm font-semibold pt-2">
                            ${calculateLineItemTotal(item).toFixed(2)}
                          </div>
                        </div>
                        <div className="col-span-1 flex items-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLineItem(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-md">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>{t('dialog.noLineItems')}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">{t('dialog.pricing')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quote-tax">{t('dialog.taxRate')} (%)</Label>
                    <Input
                      id="quote-tax"
                      type="number"
                      step="0.01"
                      value={newQuoteData.taxRate || 0}
                      onChange={(e) => setNewQuoteData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quote-discount">{t('dialog.discountAmount')}</Label>
                    <Input
                      id="quote-discount"
                      type="number"
                      step="0.01"
                      value={newQuoteData.discountAmount || 0}
                      onChange={(e) => setNewQuoteData(prev => ({ ...prev, discountAmount: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-md">
                  <div className="flex items-center justify-between text-lg font-bold">
                    <span>{t('dialog.totalAmount')}</span>
                    <span className="text-2xl text-blue-600 dark:text-blue-400">
                      ${calculateQuoteTotal().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Terms & Notes */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">{t('dialog.termsAndNotes')}</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="quote-terms">{t('dialog.terms')}</Label>
                    <Textarea
                      id="quote-terms"
                      value={newQuoteData.terms || ''}
                      onChange={(e) => setNewQuoteData(prev => ({ ...prev, terms: e.target.value }))}
                      placeholder={t('dialog.termsPlaceholder')}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quote-notes">{t('dialog.notes')}</Label>
                    <Textarea
                      id="quote-notes"
                      value={newQuoteData.notes || ''}
                      onChange={(e) => setNewQuoteData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder={t('dialog.notesPlaceholder')}
                      rows={3}
                    />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuoteDialogOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={() => void handleCreateOrUpdateQuote()}>
              {t('actions.createQuote')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quote Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image src={icons8.document} alt="" width={24} height={24} />
              {selectedQuote?.quoteNumber}
            </DialogTitle>
            <DialogDescription>
              {selectedQuote?.title}
            </DialogDescription>
          </DialogHeader>

                {selectedQuote && (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">{t('detail.status')}</Label>
                    <div className="mt-1">
                      <Badge variant={getStatusBadgeVariant(selectedQuote.status)} className="gap-1">
                        {getStatusIcon(selectedQuote.status)}
                        {selectedQuote.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">{t('detail.validUntil')}</Label>
                    <p className="font-medium mt-1">
                      {selectedQuote.validUntil ? formatDate(selectedQuote.validUntil) : '—'}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Line Items */}
                <div>
                  <h3 className="font-semibold mb-3">{t('detail.lineItems')}</h3>
                  <div className="space-y-2">
                    {selectedQuote.lineItems && selectedQuote.lineItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} × ${parseFloat(item.unitPrice.toString()).toFixed(2)}
                          </p>
                        </div>
                        <p className="font-semibold">
                          ${parseFloat(item.total?.toString() || '0').toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('detail.subtotal')}</span>
                    <span>${parseFloat(selectedQuote.subtotal.toString()).toFixed(2)}</span>
                  </div>
                  {selectedQuote.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('detail.discount')}</span>
                      <span className="text-red-600">-${parseFloat(selectedQuote.discountAmount.toString()).toFixed(2)}</span>
                    </div>
                  )}
                  {selectedQuote.taxRate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t('detail.tax')} ({(selectedQuote.taxRate * 100).toFixed(1)}%)</span>
                      <span>${parseFloat(selectedQuote.taxAmount.toString()).toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>{t('detail.total')}</span>
                    <span className="text-blue-600 dark:text-blue-400">
                      ${parseFloat(selectedQuote.total.toString()).toFixed(2)} {selectedQuote.currency}
                    </span>
                  </div>
                </div>

                {selectedQuote.terms && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">{t('detail.terms')}</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedQuote.terms}</p>
                    </div>
                  </>
                )}

                {selectedQuote.notes && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">{t('detail.notes')}</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedQuote.notes}</p>
                    </div>
                  </>
                )}

                {selectedQuote.activities && selectedQuote.activities.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-3">{t('detail.activity')}</h3>
                      <div className="space-y-2">
                        {selectedQuote.activities.map((activity) => (
                          <div key={activity.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50">
                            <div className="mt-1">
                              {getStatusIcon(activity.type)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{activity.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(activity.createdAt)}
                                {activity.user && ` · ${activity.user.firstName} ${activity.user.lastName}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              {t('actions.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
