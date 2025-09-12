'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMarketplace } from '@/lib/hooks/use-marketplace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export default function MarketplacePage() {
  const t = useTranslations('marketplace');
  const { items, isLoading, error, filters, setFilters, reload, install, installingSlugs } = useMarketplace();
  const [search, setSearch] = useState(filters.search || '');
  const [category, setCategory] = useState(filters.category || '');
  const [type, setType] = useState(filters.type || '');
  const [tag, setTag] = useState(filters.tag || '');
  const [premium, setPremium] = useState<boolean | 'all'>('all');
  const [sort, setSort] = useState(filters.sort || 'updated');
  const [limit, setLimit] = useState(filters.limit || 30);
  const [page, setPage] = useState(filters.page || 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
        <div className="md:col-span-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('searchPlaceholder')} />
        </div>
        <Select value={category || ''} onValueChange={(v) => setCategory(v)}>
          <SelectTrigger><SelectValue placeholder={t('category')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="integration">integration</SelectItem>
            <SelectItem value="workflow">workflow</SelectItem>
            <SelectItem value="theme">theme</SelectItem>
            <SelectItem value="widget">widget</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type || ''} onValueChange={(v) => setType(v)}>
          <SelectTrigger><SelectValue placeholder={t('type')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="integration">integration</SelectItem>
            <SelectItem value="workflow">workflow</SelectItem>
            <SelectItem value="portal-theme">portal-theme</SelectItem>
            <SelectItem value="widget">widget</SelectItem>
            <SelectItem value="channel">channel</SelectItem>
          </SelectContent>
        </Select>
        <div>
          <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder={t('tagPlaceholder')} />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v)}>
          <SelectTrigger><SelectValue placeholder={t('sort')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="updated">{t('sortUpdated')}</SelectItem>
            <SelectItem value="popular">{t('sortPopular')}</SelectItem>
            <SelectItem value="rating">{t('sortRating')}</SelectItem>
            <SelectItem value="newest">{t('sortNewest')}</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => { setFilters({ search, category: category === 'all' ? undefined : (category || undefined), type: type === 'all' ? undefined : (type || undefined), tag: tag || undefined, sort, page: 1, limit, premium: premium === 'all' ? undefined : !!premium }); setPage(1); reload(); }} disabled={isLoading}>{t('search')}</Button>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox checked={premium === true} onCheckedChange={(v: boolean) => setPremium(v ? true : 'all')} />
          {t('premiumOnly')}
        </label>
        <div className="ml-auto flex items-center gap-2">
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue placeholder="limit" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="48">48</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => { const p = page - 1; setPage(p); setFilters({ page: p, limit }); reload(); }}>{t('prev')}</Button>
            <div className="text-sm text-muted-foreground">{t('page', { page })}</div>
            <Button variant="outline" size="sm" disabled={isLoading || (items.length < limit)} onClick={() => { const p = page + 1; setPage(p); setFilters({ page: p, limit }); reload(); }}>{t('next')}</Button>
          </div>
        </div>
      </div>
      {error && <div className="text-red-600 text-sm">{t('loadError')}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{item.name}</span>
                {item.isPremium && <span className="text-xs text-amber-600">Premium</span>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-3">{item.description}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>{item.vendorName}</span>
                <span>★ {item.rating.toFixed(1)} · {item.installCount} installs</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Button onClick={() => install(item.slug)} disabled={!!installingSlugs?.has(item.slug)}>
                  {installingSlugs?.has(item.slug) ? t('installing') : t('install')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


