'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { quotesApi, type Quote, type QuoteLineItem } from '@/lib/api/quotes-client';
import {
  Plus,
  X,
  DollarSign,
  FileText,
  Save,
  Send,
  Calculator
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuoteBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote?: Quote | null;
  onSave?: () => void;
}

export function QuoteBuilder({ open, onOpenChange, quote, onSave }: QuoteBuilderProps) {
  const { push } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    taxRate: 0,
    discountAmount: 0,
    validityDays: 30,
    terms: '',
    notes: '',
    currency: 'USD'
  });

  const [lineItems, setLineItems] = useState<Array<Omit<QuoteLineItem, 'id' | 'total' | 'sortOrder'>>>([
    { name: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }
  ]);

  useEffect(() => {
    if (quote && open) {
      setFormData({
        title: quote.title,
        description: quote.description || '',
        taxRate: quote.taxRate,
        discountAmount: Number(quote.discountAmount),
        validityDays: 30,
        terms: quote.terms || '',
        notes: quote.notes || '',
        currency: quote.currency
      });
      setLineItems(quote.lineItems?.map(item => ({
        name: item.name,
        description: item.description || '',
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        discount: Number(item.discount || 0),
        taxRate: item.taxRate || 0
      })) || [{ name: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }]);
    } else if (open) {
      // Reset form
      setFormData({
        title: '',
        description: '',
        taxRate: 0,
        discountAmount: 0,
        validityDays: 30,
        terms: '',
        notes: '',
        currency: 'USD'
      });
      setLineItems([{ name: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }]);
    }
  }, [quote, open]);

  function addLineItem() {
    setLineItems([...lineItems, { name: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }]);
  }

  function removeLineItem(index: number) {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  }

  function updateLineItem(index: number, field: keyof QuoteLineItem, value: any) {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    setLineItems(updated);
  }

  function calculateLineTotal(item: Omit<QuoteLineItem, 'id' | 'total' | 'sortOrder'>): number {
    const subtotal = item.quantity * item.unitPrice;
    const discountAmount = item.discount || 0;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * ((item.taxRate || 0) / 100);
    return taxableAmount + taxAmount;
  }

  function calculateTotals() {
    const subtotal = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const discountAmount = formData.discountAmount;
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (formData.taxRate / 100);
    const total = taxableAmount + taxAmount;

    return { subtotal, taxAmount, total };
  }

  const { subtotal, taxAmount, total } = calculateTotals();

  async function handleSave(sendImmediately: boolean = false) {
    try {
      setIsSubmitting(true);

      if (!formData.title) {
        push('Please enter a quote title', 'error');
        return;
      }

      if (lineItems.some(item => !item.name || item.quantity <= 0 || item.unitPrice < 0)) {
        push('Please complete all line items', 'error');
        return;
      }

      const quoteData = {
        ...formData,
        lineItems
      };

      if (quote) {
        // Update existing quote
        await quotesApi.updateQuote(quote.id, quoteData);
        push('Quote updated successfully', 'success');
      } else {
        // Create new quote
        const newQuote = await quotesApi.createQuote(quoteData);
        
        // Send immediately if requested
        if (sendImmediately && newQuote.id) {
          await quotesApi.sendQuote(newQuote.id);
          push('Quote created and sent successfully', 'success');
        } else {
          push('Quote created successfully', 'success');
        }
      }

      onSave?.();
      onOpenChange(false);
    } catch (error) {
      push('Failed to save quote', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: formData.currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image 
              src="https://img.icons8.com/?size=24&id=DKTqU9lz7DHM" 
              alt="" 
              width={20} 
              height={20} 
            />
            {quote ? 'Edit Quote' : 'Create New Quote'}
          </DialogTitle>
          <DialogDescription>
            {quote ? `Editing quote #${quote.quoteNumber}` : 'Fill in the details to create a professional quote'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Quote Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Website Development Proposal"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="MAD">MAD (د.م.)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of what this quote covers..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Line Items
                </CardTitle>
                <Button size="sm" variant="outline" onClick={addLineItem}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <AnimatePresence>
                  {lineItems.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="relative"
                    >
                      <Card className={cn(
                        "border-l-4",
                        index % 2 === 0 ? "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20" : "border-l-purple-500 bg-purple-50/50 dark:bg-purple-950/20"
                      )}>
                        <CardContent className="pt-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <Badge variant="secondary" className="text-xs">
                              Item {index + 1}
                            </Badge>
                            {lineItems.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-950"
                                onClick={() => removeLineItem(index)}
                              >
                                <X className="h-3 w-3 text-red-600" />
                              </Button>
                            )}
                          </div>

                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-xs">Item Name *</Label>
                              <Input
                                placeholder="Product or service name"
                                value={item.name}
                                onChange={(e) => updateLineItem(index, 'name', e.target.value)}
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Description</Label>
                              <Input
                                placeholder="Optional description"
                                value={item.description || ''}
                                onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                className="h-9 text-sm"
                              />
                            </div>
                          </div>

                          <div className="grid gap-3 grid-cols-3">
                            <div className="space-y-2">
                              <Label className="text-xs">Quantity *</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="h-9 text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Unit Price *</Label>
                              <div className="relative">
                                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.unitPrice}
                                  onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                  className="h-9 text-sm pl-7"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-xs">Discount</Label>
                              <div className="relative">
                                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={item.discount || 0}
                                  onChange={(e) => updateLineItem(index, 'discount', parseFloat(e.target.value) || 0)}
                                  className="h-9 text-sm pl-7"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm font-medium text-muted-foreground">Line Total:</span>
                            <span className="text-lg font-bold">{formatCurrency(calculateLineTotal(item))}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Totals */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
              <CardHeader>
                <CardTitle className="text-base">Quote Totals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-sm">Tax Rate (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={formData.taxRate}
                      onChange={(e) => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Overall Discount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.discountAmount}
                        onChange={(e) => setFormData({ ...formData, discountAmount: parseFloat(e.target.value) || 0 })}
                        className="h-9 pl-8"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-medium text-red-600">-{formatCurrency(formData.discountAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({formData.taxRate}%):</span>
                    <span className="font-medium">{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-lg font-bold pt-2 border-t">
                    <span>Total:</span>
                    <span className="text-green-600 dark:text-green-400">{formatCurrency(total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Details */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-base">Additional Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="terms">Terms & Conditions</Label>
                  <Textarea
                    id="terms"
                    placeholder="Payment terms, delivery terms, etc..."
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notes for internal use only (not visible to customer)"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validityDays">Valid For (days)</Label>
                  <Input
                    id="validityDays"
                    type="number"
                    min="1"
                    value={formData.validityDays}
                    onChange={(e) => setFormData({ ...formData, validityDays: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          {!quote && (
            <Button onClick={() => handleSave(true)} disabled={isSubmitting} variant="secondary">
              <Send className="h-4 w-4 mr-2" />
              Create & Send
            </Button>
          )}
          <Button onClick={() => handleSave(false)} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {quote ? 'Update Quote' : 'Save as Draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

