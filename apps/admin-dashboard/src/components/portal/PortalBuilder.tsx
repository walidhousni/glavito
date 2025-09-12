'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePortalStore } from '@/lib/store/portal-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Globe, Upload, Save, Send } from 'lucide-react';

export function PortalBuilder() {
  const { portal, pages, widgets, themes, isLoading, loadAll, savePortal, publish, upsertPage, deletePage, upsertWidget, deleteWidget, upsertTheme } = usePortalStore();
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('support');
  const [customDomain, setCustomDomain] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (portal) {
      setName(portal.name || 'Customer Portal');
      setSubdomain(portal.subdomain || 'support');
      setCustomDomain((portal.customDomain as string) || '');
      const seo = (portal.seoSettings || {}) as { title?: string; description?: string };
      setSeoTitle(seo.title || '');
      setSeoDescription(seo.description || '');
    }
  }, [portal]);

  const saveBasic = async () => {
    await savePortal({ name, subdomain, customDomain: customDomain || null, seoSettings: { title: seoTitle, description: seoDescription } });
  };

  const addPage = async () => {
    const ts = Date.now().toString(36);
    await upsertPage({ name: `Page ${pages.length + 1}`, slug: `page-${ts}`, title: `Page ${pages.length + 1}`, content: '<div class="container">Hello</div>', pageType: 'custom', isActive: true, sortOrder: pages.length });
  };

  const addWidget = async () => {
    const ts = Date.now().toString(36);
    await upsertWidget({ name: `Widget ${widgets.length + 1}`, type: 'faq_search', configuration: { placeholder: 'Search...' }, position: { area: 'hero', order: widgets.length }, isActive: true, sortOrder: widgets.length, portalId: portal?.id });
  };

  const activeTheme = useMemo(() => themes.find(t => t.isActive) || themes[0], [themes]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customer Portal</CardTitle>
          <CardDescription>Configure your portal basics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>Subdomain</Label>
              <div className="flex items-center gap-2">
                <Input value={subdomain} onChange={(e) => setSubdomain(e.target.value)} />
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> {subdomain}.yourapp.com</span>
              </div>
            </div>
            <div>
              <Label>Custom Domain (optional)</Label>
              <Input placeholder="support.yourdomain.com" value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>SEO Title</Label>
              <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
            </div>
            <div>
              <Label>SEO Description</Label>
              <Input value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={saveBasic}><Save className="h-4 w-4 mr-2" />Save</Button>
            <Button onClick={publish} variant="outline"><Send className="h-4 w-4 mr-2" />Publish</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pages</CardTitle>
          <CardDescription>Manage portal pages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <Button onClick={addPage}><Plus className="h-4 w-4 mr-2" />Add Page</Button>
          </div>
          <div className="space-y-3">
            {pages.map((p) => (
              <div key={p.id || p.slug} className="p-3 border rounded-lg flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.title}</div>
                  <div className="text-xs text-muted-foreground">/{p.slug} · {p.pageType || 'custom'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={async () => {
                    await upsertPage({ ...p, title: p.title + ' *' });
                  }}>Save</Button>
                  {p.id && (
                    <Button variant="outline" size="sm" onClick={() => deletePage(p.id!)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {pages.length === 0 && <div className="text-sm text-muted-foreground">No pages yet.</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Widgets</CardTitle>
          <CardDescription>Add blocks like FAQ search, ticket form, and more</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Button onClick={addWidget}><Plus className="h-4 w-4 mr-2" />Add Widget</Button>
          </div>
          <div className="space-y-3">
            {widgets.map((w) => (
              <div key={w.id || w.name} className="p-3 border rounded-lg flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{w.name}</div>
                  <div className="text-xs text-muted-foreground">{w.type}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={async () => upsertWidget({ ...w })}><Save className="h-4 w-4 mr-2" />Save</Button>
                  {w.id && (<Button variant="outline" size="sm" onClick={async () => deleteWidget(w.id!)}><Trash2 className="h-4 w-4" /></Button>)}
                </div>
              </div>
            ))}
            {widgets.length === 0 && <div className="text-sm text-muted-foreground">No widgets yet.</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme</CardTitle>
          <CardDescription>Colors and layout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Primary</Label>
              <Input type="color" defaultValue={(activeTheme?.colors as any)?.primary || '#3B82F6'} onBlur={(e) => upsertTheme({ id: activeTheme?.id, name: activeTheme?.name || 'Default', colors: { ...(activeTheme?.colors || {}), primary: e.target.value }, isActive: true })} />
            </div>
            <div>
              <Label>Secondary</Label>
              <Input type="color" defaultValue={(activeTheme?.colors as any)?.secondary || '#8B5CF6'} onBlur={(e) => upsertTheme({ id: activeTheme?.id, name: activeTheme?.name || 'Default', colors: { ...(activeTheme?.colors || {}), secondary: e.target.value }, isActive: true })} />
            </div>
            <div className="flex items-end">
              <Button variant="outline"><Upload className="h-4 w-4 mr-2" />Upload CSS</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


