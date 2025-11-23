'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface Domain {
  id: string;
  domain: string;
  type: 'primary' | 'alias';
  sslStatus: 'active' | 'pending' | 'failed';
  dnsHealth: 'healthy' | 'warning' | 'error';
  verified: boolean;
  createdAt: Date;
}

interface DNSRecord {
  type: 'A' | 'CNAME' | 'TXT' | 'MX';
  name: string;
  value: string;
  status: 'verified' | 'pending' | 'failed';
}

export function DomainManager() {
  const t = useTranslations('settings.whiteLabel.domains');
  const [domains, setDomains] = useState<Domain[]>([
    {
      id: '1',
      domain: 'app.example.com',
      type: 'primary',
      sslStatus: 'active',
      dnsHealth: 'healthy',
      verified: true,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      id: '2',
      domain: 'support.example.com',
      type: 'alias',
      sslStatus: 'pending',
      dnsHealth: 'warning',
      verified: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  ]);

  const [newDomain, setNewDomain] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);

  const dnsRecords: DNSRecord[] = [
    {
      type: 'A',
      name: '@',
      value: '192.0.2.1',
      status: 'verified',
    },
    {
      type: 'CNAME',
      name: 'www',
      value: 'app.example.com',
      status: 'verified',
    },
  ];

  const emailAuthRecords: DNSRecord[] = [
    {
      type: 'TXT',
      name: '@',
      value: 'v=spf1 include:_spf.example.com ~all',
      status: 'verified',
    },
    {
      type: 'TXT',
      name: 'dkim._domainkey',
      value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...',
      status: 'verified',
    },
    {
      type: 'TXT',
      name: '_dmarc',
      value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com',
      status: 'pending',
    },
  ];

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { label: 'Active', color: 'bg-green-100 text-green-800' },
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
      healthy: { label: 'Healthy', color: 'bg-green-100 text-green-800' },
      warning: { label: 'Warning', color: 'bg-yellow-100 text-yellow-800' },
      error: { label: 'Error', color: 'bg-red-100 text-red-800' },
      verified: { label: 'Verified', color: 'bg-green-100 text-green-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge className={cn('text-xs', config.color)}>
        {config.label}
      </Badge>
    );
  };

  const handleAddDomain = async () => {
    if (!newDomain) {
      toast({
        title: 'Error',
        description: 'Please enter a valid domain name.',
        variant: 'destructive',
      });
      return;
    }

    const domain: Domain = {
      id: Date.now().toString(),
      domain: newDomain,
      type: 'alias',
      sslStatus: 'pending',
      dnsHealth: 'warning',
      verified: false,
      createdAt: new Date(),
    };

    setDomains([...domains, domain]);
    setNewDomain('');
    setShowAddDialog(false);

    toast({
      title: 'Domain added',
      description: 'Please configure DNS records to verify your domain.',
    });
  };

  const handleValidateDNS = async (domainId: string) => {
    toast({
      title: 'Validating DNS',
      description: 'Checking DNS configuration...',
    });

    // Simulate validation
    setTimeout(() => {
      toast({
        title: 'DNS validated',
        description: 'Your DNS records are configured correctly.',
      });
    }, 2000);
  };

  const handleProvisionSSL = async (domainId: string) => {
    toast({
      title: 'Provisioning SSL',
      description: 'Requesting SSL certificate...',
    });

    // Simulate SSL provisioning
    setTimeout(() => {
      toast({
        title: 'SSL provisioned',
        description: 'SSL certificate has been issued successfully.',
      });
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{t('title')}</h2>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button>
              <Icon name="plus" className="w-4 h-4 mr-2" />
              {t('addDomain')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('addDomain')}</DialogTitle>
              <DialogDescription>
                Add a custom domain to your white label setup
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain Name</Label>
                <Input
                  id="domain"
                  placeholder="app.yourdomain.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddDomain}>Add Domain</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Domains List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Domains</CardTitle>
          <CardDescription>
            Manage your custom domains and SSL certificates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <Icon name="globe" className="w-5 h-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{domain.domain}</p>
                      {domain.type === 'primary' && (
                        <Badge variant="outline" className="text-xs">
                          {t('primaryDomain')}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <span>{t('sslStatus')}:</span>
                        {getStatusBadge(domain.sslStatus)}
                      </div>
                      <div className="flex items-center gap-1">
                        <span>{t('dnsHealth')}:</span>
                        {getStatusBadge(domain.dnsHealth)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDomain(domain)}
                  >
                    <Icon name="settings" className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                  {domain.sslStatus === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleProvisionSSL(domain.id)}
                    >
                      {t('provisionSSL')}
                    </Button>
                  )}
                  {!domain.verified && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleValidateDNS(domain.id)}
                    >
                      {t('validateDNS')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* DNS Configuration */}
      {selectedDomain && (
        <Card>
          <CardHeader>
            <CardTitle>DNS Configuration: {selectedDomain.domain}</CardTitle>
            <CardDescription>
              Configure these DNS records to verify and activate your domain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="dns" className="w-full">
              <TabsList>
                <TabsTrigger value="dns">DNS Records</TabsTrigger>
                <TabsTrigger value="email">{t('emailAuth')}</TabsTrigger>
              </TabsList>

              <TabsContent value="dns" className="space-y-4 mt-4">
                <div className="rounded-lg border">
                  <div className="grid grid-cols-4 gap-4 p-3 bg-muted font-medium text-sm">
                    <div>Type</div>
                    <div>Name</div>
                    <div>Value</div>
                    <div>Status</div>
                  </div>
                  {dnsRecords.map((record, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-4 gap-4 p-3 border-t items-center"
                    >
                      <div>
                        <Badge variant="outline">{record.type}</Badge>
                      </div>
                      <div className="font-mono text-sm">{record.name}</div>
                      <div className="font-mono text-xs text-muted-foreground truncate">
                        {record.value}
                      </div>
                      <div>{getStatusBadge(record.status)}</div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="email" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">{t('spfRecord')}</h4>
                    <div className="p-3 bg-muted rounded-lg font-mono text-sm">
                      {emailAuthRecords[0].value}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">{t('dkimRecord')}</h4>
                    <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all">
                      {emailAuthRecords[1].value}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">{t('dmarcRecord')}</h4>
                    <div className="p-3 bg-muted rounded-lg font-mono text-sm">
                      {emailAuthRecords[2].value}
                    </div>
                  </div>

                  <Button className="w-full" onClick={() => handleValidateDNS(selectedDomain.id)}>
                    <Icon name="checkCircle" className="w-4 h-4 mr-2" />
                    Validate Email Authentication
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

