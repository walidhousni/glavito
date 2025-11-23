'use client';

import { useEffect, useState, useMemo } from 'react';
import { useIntegrationsStore } from '@/lib/store/integrations-store';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { IntegrationCard } from '@/components/integrations/integration-card';
import { IntegrationEmptyState } from '@/components/integrations/integration-empty-state';
import { SyncProgress } from '@/components/integrations/sync-progress';
import {
  FaSearch,
  FaChartLine,
  FaBolt,
  FaShieldAlt,
  FaClock,
  FaRocket,
  FaLink,
} from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { MappingEditor } from '@/components/integrations/mapping-editor';
import { RulesEditor } from '@/components/integrations/rules-editor';

export default function IntegrationsPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const {
    statuses,
    connectors,
    catalog,
    healthStatuses,
    syncProgress: storeSyncProgress,
    fetchStatuses,
    fetchConnectors,
    fetchCatalog,
    fetchHealthStatuses,
    manualSync,
    disableConnector,
    testConnection,
  } = useIntegrationsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState<'connected' | 'available'>('available');
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);
  const [mappingProvider, setMappingProvider] = useState<string | null>(null);
  const [rulesProvider, setRulesProvider] = useState<string | null>(null);

  useEffect(() => {
    fetchStatuses();
    fetchConnectors();
    fetchCatalog();
    fetchHealthStatuses();
  }, [fetchStatuses, fetchConnectors, fetchCatalog, fetchHealthStatuses]);

  // Poll health statuses every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchHealthStatuses();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchHealthStatuses]);

  // Determine which integrations are connected
  const connectedProviders = useMemo(() => {
    return new Set([
      ...connectors.filter((c) => c.status === 'connected' || c.status === 'syncing').map((c) => c.provider),
      ...statuses.filter((s) => s.status === 'connected').map((s) => s.integrationType),
    ]);
  }, [connectors, statuses]);

  const items = useMemo(() => catalog?.items || [], [catalog?.items]);
  const categories = useMemo(() => catalog?.categories || [], [catalog?.categories]);
  const metrics = useMemo(() => catalog?.metrics || { prebuilt: 0, avgSetupMinutes: 0, uptime: 99.9, support: '24/7' }, [catalog?.metrics]);

  // Filter integrations
  const filteredIntegrations = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = searchQuery === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      
      if (activeTab === 'connected') {
        return matchesSearch && matchesCategory && connectedProviders.has(item.provider);
      }
      
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, selectedCategory, activeTab, connectedProviders]);

  // Handle sync
  const handleSync = async (provider: string) => {
    try {
      setSyncingProvider(provider);
      await manualSync(provider, 'customers');
      toast({
        title: 'Sync completed',
        description: `Successfully synced data from ${provider}`,
      });
      await fetchConnectors();
      await fetchHealthStatuses();
      setSyncingProvider(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during sync';
      toast({
        title: 'Sync failed',
        description: errorMessage,
        variant: 'destructive',
      });
      setSyncingProvider(null);
    }
  };

  const handleDisable = async (provider: string) => {
    try {
      await disableConnector(provider);
      toast({
        title: 'Integration disabled',
        description: `${provider} has been disconnected`,
      });
      await fetchConnectors();
      await fetchHealthStatuses();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to disable integration';
      toast({
        title: 'Failed to disable',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleTestConnection = async (provider: string) => {
    try {
      await testConnection(provider);
      toast({
        title: 'Connection test successful',
        description: `${provider} is connected and healthy`,
      });
      await fetchHealthStatuses();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unable to connect';
      toast({
        title: 'Connection test failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const connectedCount = connectedProviders.size;
  const hasConnections = connectedCount > 0;

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      {/* Header */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <FaLink className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
                <p className="text-sm text-muted-foreground">
                  Connect your tools and services
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Get Started Section */}
        {!hasConnections && activeTab === 'available' && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                <FaRocket className="h-6 w-6 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold mb-2">Get started by connecting your first integration</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Sync data from your commerce store, CRM, and marketing tools
              </p>
            </CardContent>
          </Card>
        )}

        {/* Metrics */}
        {hasConnections && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: FaBolt, label: 'Pre-built', value: `${metrics.prebuilt}+` },
              { icon: FaClock, label: 'Avg Setup', value: `${metrics.avgSetupMinutes} min` },
              { icon: FaChartLine, label: 'Uptime', value: `${metrics.uptime}%` },
              { icon: FaShieldAlt, label: 'Support', value: metrics.support },
            ].map((metric) => (
              <Card key={metric.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <metric.icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xl font-semibold">{metric.value}</p>
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Search and Tabs */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Connected badge */}
            {hasConnections && (
              <Badge variant="secondary" className="h-10 px-4 flex items-center gap-2 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                {connectedCount} Active
              </Badge>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'connected' | 'available')}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="available">
                Browse All ({items.length})
              </TabsTrigger>
              <TabsTrigger value="connected">
                Connected ({connectedCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.key}
                size="sm"
                variant={selectedCategory === cat.key ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.key)}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Empty State */}
        {activeTab === 'connected' && connectedCount === 0 && (
          <IntegrationEmptyState onConnect={() => setActiveTab('available')} />
        )}

        {/* Integrations Grid */}
        {(activeTab === 'available' || connectedCount > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIntegrations.map((integration) => {
              const isConnected = connectedProviders.has(integration.provider);
              const connector = connectors.find((c) => c.provider === integration.provider);
              const status = connector?.status || 'pending';
              const syncKey = `${integration.provider}:customers`;
              const progress = storeSyncProgress[syncKey];
              const health = healthStatuses.find(h => h.integration?.provider === integration.provider);

              return (
                <div key={integration.provider} className="space-y-2">
                  <IntegrationCard
                    provider={integration.provider}
                    name={integration.name}
                    description={integration.description}
                    category={integration.category}
                    badges={integration.badges}
                    isConnected={isConnected}
                    status={status as 'pending' | 'connected' | 'syncing' | 'error' | 'disabled'}
                    healthStatus={health?.status}
                    lastSync={connector?.lastSyncAt}
                    lastError={connector?.lastError}
                    syncProgress={progress ? {
                      progress: progress.progress,
                      totalRecords: progress.totalRecords,
                      processedRecords: progress.processedRecords,
                      entity: progress.entity,
                      status: progress.status,
                      error: progress.error,
                    } : undefined}
                    onConnect={async () => {
                      await fetchConnectors();
                      await fetchHealthStatuses();
                      toast({
                        title: 'Integration connected',
                        description: `${integration.name} has been successfully connected`,
                      });
                    }}
                    onSync={() => handleSync(integration.provider)}
                    onDisable={() => handleDisable(integration.provider)}
                    onTestConnection={() => handleTestConnection(integration.provider)}
                    onViewLogs={() => router.push(`/dashboard/integrations/health?integration=${integration.provider}`)}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setMappingProvider(integration.provider)}>Mappings</Button>
                    <Button size="sm" variant="secondary" onClick={() => setRulesProvider(integration.provider)}>Rules</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* No results */}
        {filteredIntegrations.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FaSearch className="h-10 w-10 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No integrations found</h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your search or filter criteria
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sync Progress Modal */}
      {syncingProvider && (
        <SyncProgress
          provider={syncingProvider}
          providerName={items.find((i) => i.provider === syncingProvider)?.name || syncingProvider}
          isOpen={!!syncingProvider}
          onClose={() => setSyncingProvider(null)}
          progress={storeSyncProgress[`${syncingProvider}:customers`]?.progress || 0}
          entities={[]}
        />
      )}
      {/* Editors */}
      {mappingProvider && (
        <MappingEditor provider={mappingProvider} open={!!mappingProvider} onOpenChange={(v) => !v ? setMappingProvider(null) : undefined} />
      )}
      {rulesProvider && (
        <RulesEditor provider={rulesProvider} open={!!rulesProvider} onOpenChange={(v) => !v ? setRulesProvider(null) : undefined} />
      )}
    </div>
  );
}
