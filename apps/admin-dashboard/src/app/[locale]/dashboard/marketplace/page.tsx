'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMarketplace } from '@/lib/hooks/use-marketplace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  FaStar,
  FaDownload,
  FaBolt,
  FaShieldAlt,
  FaUsers,
  FaClock,
  FaSearch,
  FaFilter,
  FaTh,
  FaList,
} from 'react-icons/fa';
import { MdAutoAwesome } from 'react-icons/md';
import { MarketplaceLoading } from '@/components/marketplace/marketplace-loading';
import { ItemDetailModal } from './item-detail-modal';
import { MarketplaceItem } from '@/lib/api/marketplace-client';
import { useToast } from '@/components/ui/toast';


export default function MarketplacePage() {
  const t = useTranslations('marketplace');
  const { items, isLoading, error, filters, setFilters, reload, install, installingSlugs, installed, installedLoading, loadInstalled, updateInstallation, uninstall, seedDemo } = useMarketplace();
  const [search, setSearch] = useState(filters.search || '');
  const [category, setCategory] = useState(filters.category || '');
  const [type, setType] = useState(filters.type || '');
  const [tag, setTag] = useState(filters.tag || '');
  const [premium, setPremium] = useState<boolean | 'all'>('all');
  const [sort, setSort] = useState(filters.sort || 'updated');
  const [limit, setLimit] = useState(filters.limit || 30);
  const [page, setPage] = useState(filters.page || 1);
  const [tab, setTab] = useState<'browse' | 'installed'>('browse');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { success } = useToast();
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Compute dynamic stats:
  const totalCategories = [...new Set(items.map(i => i.category))].length;
  const avgRating = items.length ? (items.reduce((sum, i) => sum + i.rating, 0) / items.length).toFixed(1) : 0;

  useEffect(() => {
    if (tab === 'installed') loadInstalled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ ...filters, search });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b">
        <div className="relative px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold">
                {t('title', { default: 'Marketplace' })}
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                {t('subtitle', { default: 'Discover powerful integrations and workflows to supercharge your business' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => seedDemo()} size="sm">
                <MdAutoAwesome className="w-4 h-4 mr-2" />
                {t('seedDemo', { default: 'Seed Demo' })}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FaDownload className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xl font-semibold">{items.length}</p>
                    <p className="text-xs text-muted-foreground">{t('available', { default: 'Available' })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FaUsers className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xl font-semibold">{installed?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">{t('installed', { default: 'Installed' })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FaStar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xl font-semibold">{avgRating}</p>
                    <p className="text-xs text-muted-foreground">{t('avgRating', { default: 'Avg Rating' })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <FaBolt className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xl font-semibold">{totalCategories}</p>
                    <p className="text-xs text-muted-foreground">{t('categories', { default: 'Categories' })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'browse' | 'installed')} className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="browse">
                <FaSearch className="w-4 h-4 mr-2" />
                {t('browse', { default: 'Browse' })}
              </TabsTrigger>
              <TabsTrigger value="installed">
                <FaDownload className="w-4 h-4 mr-2" />
                {t('installed', { default: 'Installed' })}
              </TabsTrigger>
            </TabsList>

            {tab === 'browse' && (
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <FaTh className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <FaList className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>

          <TabsContent value="browse" className="space-y-6">
            {/* Enhanced Search and Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 mb-4">
                  <div className="lg:col-span-2 relative">
                    <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={t('searchPlaceholder', { default: 'Search integrations...' })}
                      className="pl-10"
                    />
        </div>
        <Select value={category || ''} onValueChange={(v) => setCategory(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('category', { default: 'Category' })} />
                    </SelectTrigger>
          <SelectContent>
                      <SelectItem value="all">{t('all', { default: 'All Categories' })}</SelectItem>
                      <SelectItem value="integration">Integration</SelectItem>
                      <SelectItem value="workflow">Workflow</SelectItem>
                      <SelectItem value="theme">Theme</SelectItem>
                      <SelectItem value="widget">Widget</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type || ''} onValueChange={(v) => setType(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('type', { default: 'Type' })} />
                    </SelectTrigger>
          <SelectContent>
                      <SelectItem value="all">{t('allTypes', { default: 'All Types' })}</SelectItem>
                      <SelectItem value="integration">Integration</SelectItem>
                      <SelectItem value="workflow">Workflow</SelectItem>
                      <SelectItem value="portal-theme">Portal Theme</SelectItem>
                      <SelectItem value="widget">Widget</SelectItem>
                      <SelectItem value="channel">Channel</SelectItem>
          </SelectContent>
        </Select>
                  <Input
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder={t('tagPlaceholder', { default: 'Tags...' })}
                  />
        <Select value={sort} onValueChange={(v) => setSort(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('sort', { default: 'Sort by' })} />
                    </SelectTrigger>
          <SelectContent>
                      <SelectItem value="updated">{t('sortUpdated', { default: 'Recently Updated' })}</SelectItem>
                      <SelectItem value="popular">{t('sortPopular', { default: 'Most Popular' })}</SelectItem>
                      <SelectItem value="rating">{t('sortRating', { default: 'Highest Rated' })}</SelectItem>
                      <SelectItem value="newest">{t('sortNewest', { default: 'Newest' })}</SelectItem>
          </SelectContent>
        </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={premium === true}
                        onCheckedChange={(v: boolean) => setPremium(v ? true : 'all')}
                      />
                      <FaShieldAlt className="w-4 h-4 text-muted-foreground" />
                      {t('premiumOnly', { default: 'Premium Only' })}
                    </label>
                    <Button
                      onClick={() => {
                        setFilters({
                          search,
                          category: category === 'all' ? undefined : (category || undefined),
                          type: type === 'all' ? undefined : (type || undefined),
                          tag: tag || undefined,
                          sort,
                          page: 1,
                          limit,
                          premium: premium === 'all' ? undefined : !!premium
                        });
                        setPage(1);
                        reload();
                      }}
                      disabled={isLoading}
                      size="sm"
                    >
                      <FaFilter className="w-4 h-4 mr-2" />
                      {t('search', { default: 'Apply Filters' })}
                    </Button>
      </div>

      <div className="flex items-center gap-3">
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
            <SelectContent>
              <SelectItem value="12">12</SelectItem>
              <SelectItem value="24">24</SelectItem>
              <SelectItem value="30">30</SelectItem>
              <SelectItem value="48">48</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1 || isLoading}
                        onClick={() => {
                          const p = page - 1;
                          setPage(p);
                          setFilters({ page: p, limit });
                          reload();
                        }}
                      >
                        {t('prev', { default: 'Previous' })}
                      </Button>
                      <span className="text-sm text-muted-foreground px-2">
                        {t('page', { default: 'Page {page}', page })}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoading || (items.length < limit)}
                        onClick={() => {
                          const p = page + 1;
                          setPage(p);
                          setFilters({ page: p, limit });
                          reload();
                        }}
                      >
                        {t('next', { default: 'Next' })}
                      </Button>
          </div>
        </div>
      </div>
              </CardContent>
            </Card>

            {error && (
              <Card className="border-destructive/50">
                <CardContent className="p-4">
                  <p className="text-destructive text-sm">{t('loadError', { default: 'Failed to load marketplace items' })}</p>
                </CardContent>
              </Card>
            )}

            {/* Loading State */}
            {isLoading && <MarketplaceLoading count={6} viewMode={viewMode} />}

            {/* Items Grid/List */}
            {!isLoading && (
              <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                {items.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`https://api.dicebear.com/7.x/shapes/svg?seed=${item.name}`} />
                          <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
                            {item.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <CardTitle className="text-base font-semibold truncate">
                              {item.name}
              </CardTitle>
                            {item.isPremium && (
                              <Badge variant="secondary" className="text-xs">
                                <FaShieldAlt className="w-3 h-3 mr-1" />
                                Premium
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{item.vendorName}</p>
                        </div>
                      </div>
            </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <FaStar className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="font-medium">{item.rating.toFixed(1)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <FaDownload className="w-3 h-3" />
                          <span>{item.installCount.toLocaleString()}</span>
                        </div>
                      </div>

                      <Separator />

                        <Button
                          onClick={() => { setSelectedItem(item); setShowModal(true); }}
                          disabled={!!installingSlugs?.has(item.slug)}
                        className="w-full"
                        size="sm"
                        >
                          {installingSlugs?.has(item.slug) ? (
                            <>
                              <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                              {t('installing', { default: 'Installing...' })}
                            </>
                          ) : (
                            <>
                            <FaDownload className="w-4 h-4 mr-2" />
                              {t('install', { default: 'Install' })}
                            </>
                          )}
                        </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isLoading && items.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                    <FaSearch className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{t('noItemsFound', { default: 'No items found' })}</h3>
                  <p className="text-sm text-muted-foreground">{t('noItemsFoundDescription', { default: 'Try adjusting your search criteria or browse all categories.' })}</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="installed" className="space-y-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FaDownload className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold text-sm">{t('installedItems', { default: 'Installed Items' })}</h3>
                      <p className="text-xs text-muted-foreground">
                        {installedLoading
                          ? t('loadingInstalled', { default: 'Loading installed items...' })
                          : t('installedCount', { default: '{count} items installed', count: installed?.length || 0 })
                        }
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadInstalled()}
                    disabled={installedLoading}
                  >
                    {installedLoading ? (
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
                    ) : (
                      <FaClock className="w-4 h-4 mr-2" />
                    )}
                    {t('reloadInstalled', { default: 'Refresh' })}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {installedLoading && <MarketplaceLoading count={3} viewMode="grid" />}

            {!installedLoading && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(installed || []).map((inst: any) => (
                  <Card key={inst.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`https://api.dicebear.com/7.x/shapes/svg?seed=${inst?.item?.name || inst?.itemId}`} />
                          <AvatarFallback className="bg-muted text-foreground font-semibold text-sm">
                            {(inst?.item?.name || inst?.itemId || 'UN').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <CardTitle className="text-base font-semibold truncate">
                              {inst?.item?.name || inst?.itemId}
                            </CardTitle>
                            <Badge
                              variant={inst.status === 'enabled' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {inst.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {inst?.item?.vendorName || 'Unknown Vendor'}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {inst?.item?.description || 'No description available'}
                      </p>

                      <Separator />

                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updateInstallation(inst.id, { status: inst.status === 'enabled' ? 'disabled' : 'enabled' })}
                          className="flex-1"
                        >
                          {inst.status === 'enabled' ? (
                            <>
                              <span className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                              {t('disable', { default: 'Disable' })}
                            </>
                          ) : (
                            <>
                              <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                              {t('enable', { default: 'Enable' })}
                            </>
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => uninstall(inst.id)}
                        >
                          {t('uninstall', { default: 'Remove' })}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
            )}

            {!installedLoading && (!installed || installed.length === 0) && (
              <Card>
                <CardContent className="p-12 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                    <FaDownload className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h3 className="text-base font-semibold mb-2">{t('noItemsInstalled', { default: 'No items installed' })}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{t('noItemsInstalledDescription', { default: 'Browse the marketplace to find and install integrations.' })}</p>
                  <Button onClick={() => setTab('browse')} size="sm">
                    <FaSearch className="w-4 h-4 mr-2" />
                    {t('browseMarketplace', { default: 'Browse Marketplace' })}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedItem && <ItemDetailModal
        open={showModal}
        onOpenChange={setShowModal}
        item={selectedItem}
        onInstall={(config) => {
          install(selectedItem.slug, config);
          success('Installing...');
          setShowModal(false);
        }}
        onSubmitReview={(rating, comment) => {
          // Handle review submission if needed, or let modal handle
        }}
      />}
    </div>
  );
}


