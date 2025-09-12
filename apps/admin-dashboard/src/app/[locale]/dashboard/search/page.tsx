'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { searchApi } from '@/lib/api/search-client';

export default function FederatedSearchPage() {
  const [q, setQ] = React.useState('');
  const [result, setResult] = React.useState<{ tickets: any[]; customers: any[]; knowledge: { articles: any[]; faqs: any[] } } | null>(null);
  const [loading, setLoading] = React.useState(false);

  const run = async (query: string) => {
    if (!query || query.trim().length < 2) { setResult(null); return; }
    try { setLoading(true); const data = await searchApi.federated(query); setResult(data); } finally { setLoading(false); }
  };

  React.useEffect(() => {
    const t = setTimeout(() => run(q), 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="p-6 space-y-4">
      <Input placeholder="Search everything..." value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-medium">Tickets</h3>
            {result?.tickets?.map((t) => (
              <div key={t.id} className="text-sm truncate">{t.subject}</div>
            )) || (!loading && <div className="text-sm text-muted-foreground">No results</div>)}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-medium">Customers</h3>
            {result?.customers?.map((c) => (
              <div key={c.id} className="text-sm truncate">{c.firstName} {c.lastName} {c.email ? `· ${c.email}` : ''}</div>
            )) || (!loading && <div className="text-sm text-muted-foreground">No results</div>)}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-medium">Knowledge</h3>
            {result?.knowledge?.articles?.map((a) => (
              <div key={a.id} className="text-sm truncate">{a.title}</div>
            )) || (!loading && <div className="text-sm text-muted-foreground">No results</div>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


