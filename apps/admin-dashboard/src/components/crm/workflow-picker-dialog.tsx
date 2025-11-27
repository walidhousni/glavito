'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api/config';

interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

interface WorkflowPickerDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (workflowId: string) => Promise<void> | void;
}

export function WorkflowPickerDialog({ open, onOpenChange, onConfirm }: WorkflowPickerDialogProps) {
  const t = useTranslations('workflows');
  const [loading, setLoading] = React.useState(false);
  const [workflows, setWorkflows] = React.useState<WorkflowItem[]>([]);
  const [query, setQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      try {
        setLoading(true);
        const res = await api.get('/workflows');
        const data = (res as any)?.data?.data ?? res.data ?? [];
        if (!mounted) return;
        const items: WorkflowItem[] = Array.isArray(data)
          ? data.map((w: any) => ({ id: String(w.id), name: String(w.name || 'Untitled'), description: w.description, isActive: !!w.isActive }))
          : [];
        setWorkflows(items);
      } catch {
        setWorkflows([]);
      } finally {
        setLoading(false);
      }
    };
    if (open) run();
    return () => { mounted = false; };
  }, [open]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter((w) => (w.name || '').toLowerCase().includes(q) || (w.description || '').toLowerCase().includes(q));
  }, [query, workflows]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!confirming) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {t('title') || 'Select Workflow'}
          </DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Choose a workflow to execute for this customer segment
          </p>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Input
              placeholder={t('list.search') || 'Search workflows...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Workflows List */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <ScrollArea className="h-80">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading && (
                  <div className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading workflows...</p>
                  </div>
                )}
                
                {!loading && filtered.length === 0 && (
                  <div className="p-6 text-center">
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                      <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No workflows found</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Try adjusting your search terms</p>
                  </div>
                )}
                
                {filtered.map((wf) => (
                  <button
                    key={wf.id}
                    className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      selectedId === wf.id 
                        ? 'bg-blue-50 dark:bg-blue-950 border-r-2 border-blue-600' 
                        : ''
                    }`}
                    onClick={() => setSelectedId(wf.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {wf.name}
                          </h4>
                          <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            wf.isActive 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
                              wf.isActive ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            {wf.isActive ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                        {wf.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                            {wf.description}
                          </p>
                        )}
                      </div>
                      
                      {selectedId === wf.id && (
                        <div className="ml-3 flex-shrink-0">
                          <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
              Cancel
            </Button>
            <Button
              className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              disabled={!selectedId || confirming}
              onClick={async () => {
                if (!selectedId) return;
                try {
                  setConfirming(true);
                  await onConfirm(selectedId);
                  onOpenChange(false);
                } finally {
                  setConfirming(false);
                }
              }}
            >
              {confirming ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Running...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Run Workflow
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


