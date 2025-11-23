'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Star, X, Download, Settings, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { marketplaceApi, type MarketplaceItem, type Review, type ExtendedMarketplaceItem } from '@/lib/api/marketplace-client';

interface ItemDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MarketplaceItem;
  onInstall: (config: Record<string, any>) => void;
  onSubmitReview?: (rating: number, comment?: string) => void;
}

export function ItemDetailModal({ open, onOpenChange, item, onInstall, onSubmitReview }: ItemDetailModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [configForm, setConfigForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    if (open) {
      setLoadingReviews(true);
      marketplaceApi.getReviews(item.slug).then(setReviews).catch(() => setReviews([])).finally(() => setLoadingReviews(false));
    }
  }, [open, item.slug]);

  const handleSubmitReview = () => {
    if (reviewRating === 0 || !onSubmitReview) return;
    setLoading(true);
    marketplaceApi.postReview(item.slug, reviewRating, reviewComment).then((newReview) => {
      setReviews(prev => [newReview, ...prev]);
      setReviewRating(0);
      setReviewComment('');
      success({ title: 'Review submitted!' });
    }).catch(() => error({ title: 'Failed to submit review' })).finally(() => setLoading(false));
    if (onSubmitReview) onSubmitReview(reviewRating, reviewComment);
  };

  const handleInstall = () => {
    setLoading(true);
    onInstall(configForm);
    setLoading(false);
  };

  // Dynamic config fields from item.content (assume schema: { fields: [{ name, type, required, placeholder }] })
  const configFields = item.content?.fields || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>
        {/* Tabs for Overview, Reviews, Configuration */}
        <div className="flex-1 overflow-y-auto">
          <div className="tabs"> {/* Use shadcn Tabs if added, or simple sections */}
            {/* Overview Section */}
            <div>
              <h3>Overview</h3>
              <p>{item.description}</p>
              {item.screenshots?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {item.screenshots.map((img, idx) => <img key={idx} src={img} alt={`Screenshot ${idx}`} className="h-48 object-cover rounded" />)}
                </div>
              )}
            </div>
            {/* Reviews Section */}
            <div>
              <h3>Reviews ({reviews.length})</h3>
              {loadingReviews ? <p>Loading reviews...</p> : (
                <div>
                  {reviews.map((r) => (
                    <div key={r.id} className="border p-2 rounded mb-2">
                      <div className="flex justify-between">
                        <span>{r.authorName}</span>
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`w-4 h-4 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />)}
                        </div>
                      </div>
                      {r.comment && <p>{r.comment}</p>}
                      <small>{new Date(r.createdAt).toLocaleDateString()}</small>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Label>Rating</Label>
                <div className="flex gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Button key={i} variant={reviewRating === i + 1 ? 'default' : 'outline'} size="sm" onClick={() => setReviewRating(i + 1)}>
                      <Star className={`w-4 h-4 ${i < reviewRating ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                    </Button>
                  ))}
                </div>
                <Label>Comment</Label>
                <Textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Share your experience..." />
                <Button onClick={handleSubmitReview} disabled={reviewRating === 0} className="mt-2">Submit Review</Button>
              </div>
            </div>
            {/* Configuration Section */}
            <div>
              <h3>Configuration</h3>
              {configFields.map((field: any) => (
                <div key={field.name} className="mb-4">
                  <Label>{field.label}</Label>
                  <Input
                    placeholder={field.placeholder}
                    type={field.type}
                    value={configForm[field.name] || ''}
                    onChange={(e) => setConfigForm({ ...configForm, [field.name]: e.target.value })}
                    required={field.required}
                  />
                </div>
              ))}
              <Button onClick={handleInstall} disabled={loading} className="mt-4">
                {loading ? 'Installing...' : 'Install'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
