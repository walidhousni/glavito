'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Search, Ticket, Users, MessageSquare, FileText, Plus } from 'lucide-react';
import { ticketsApi } from '@/lib/api/tickets-client';
import { customersApi } from '@/lib/api/customers-client';
import { conversationsApi } from '@/lib/api/conversations-client';
import { useAuthStore } from '@/lib/store/auth-store';

interface SearchResult {
  id: string;
  type: 'ticket' | 'customer' | 'conversation' | 'action';
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  action: () => void;
}

export function GlobalSearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const router = useRouter();
  const t = useTranslations('search');
  const { user } = useAuthStore();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  // Save recent search
  const saveRecentSearch = useCallback((query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recent-searches', JSON.stringify(updated));
  }, [recentSearches]);

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Search function with debounce
  useEffect(() => {
    if (!query || query.length < 2) {
      setResults(getQuickActions());
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const [tickets, customers, conversations] = await Promise.all([
          ticketsApi.advancedSearch({
            q: query,
            limit: 5,
          }).catch(() => ({ data: [] })),
          customersApi.search(query, { limit: 5 }).catch(() => []),
          conversationsApi.search({ query, limit: 5 }).catch(() => ({ data: [] })),
        ]);

        const searchResults: SearchResult[] = [];

        // Add ticket results
        const ticketData = Array.isArray((tickets as any)?.data) ? (tickets as any).data : [];
        ticketData.forEach((ticket: any) => {
          searchResults.push({
            id: ticket.id,
            type: 'ticket',
            title: ticket.subject || `Ticket #${ticket.id}`,
            subtitle: ticket.status,
            icon: Ticket,
            action: () => {
              router.push(`/dashboard/tickets?ticket=${ticket.id}`);
              setOpen(false);
              saveRecentSearch(query);
            },
          });
        });

        // Add customer results
        const customerData = Array.isArray(customers) ? customers : [];
        customerData.forEach((customer: any) => {
          const name = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email;
          searchResults.push({
            id: customer.id,
            type: 'customer',
            title: name,
            subtitle: customer.email || customer.company,
            icon: Users,
            action: () => {
              router.push(`/dashboard/customers?id=${customer.id}`);
              setOpen(false);
              saveRecentSearch(query);
            },
          });
        });

        // Add conversation results
        const convData = Array.isArray((conversations as any)?.data)
          ? (conversations as any).data
          : Array.isArray(conversations)
          ? conversations
          : [];
        convData.forEach((conv: any) => {
          searchResults.push({
            id: conv.id,
            type: 'conversation',
            title: conv.subject || `Conversation #${conv.id}`,
            subtitle: conv.status,
            icon: MessageSquare,
            action: () => {
              router.push(`/dashboard/tickets?conversation=${conv.id}`);
              setOpen(false);
              saveRecentSearch(query);
            },
          });
        });

        setResults(searchResults);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, router, saveRecentSearch]);

  // Quick actions when no query
  const getQuickActions = (): SearchResult[] => {
    return [
      {
        id: 'create-ticket',
        type: 'action',
        title: t('actions.createTicket', { fallback: 'Create new ticket' }),
        subtitle: t('actions.createTicketDesc', { fallback: 'Open a new support ticket' }),
        icon: Plus,
        action: () => {
          router.push('/dashboard/tickets?action=create');
          setOpen(false);
        },
      },
      {
        id: 'create-conversation',
        type: 'action',
        title: t('actions.startConversation', { fallback: 'Start conversation' }),
        subtitle: t('actions.startConversationDesc', { fallback: 'Begin a new conversation' }),
        icon: MessageSquare,
        action: () => {
          router.push('/dashboard/tickets?action=conversation');
          setOpen(false);
        },
      },
      {
        id: 'add-customer',
        type: 'action',
        title: t('actions.addCustomer', { fallback: 'Add customer' }),
        subtitle: t('actions.addCustomerDesc', { fallback: 'Create new customer record' }),
        icon: Users,
        action: () => {
          router.push('/dashboard/customers?action=create');
          setOpen(false);
        },
      },
    ];
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground bg-background border rounded-lg hover:bg-accent transition-colors"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">{t('placeholder', { fallback: 'Search...' })}</span>
        <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder={t('placeholder', { fallback: 'Search tickets, customers, conversations...' })}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {loading ? t('searching', { fallback: 'Searching...' }) : t('noResults', { fallback: 'No results found' })}
          </CommandEmpty>

          {/* Recent searches */}
          {!query && recentSearches.length > 0 && (
            <>
              <CommandGroup heading={t('recent', { fallback: 'Recent' })}>
                {recentSearches.map((search, index) => (
                  <CommandItem
                    key={index}
                    onSelect={() => setQuery(search)}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    <span>{search}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}

          {/* Quick actions */}
          {!query && (
            <CommandGroup heading={t('quickActions', { fallback: 'Quick Actions' })}>
              {getQuickActions().map((action) => (
                <CommandItem key={action.id} onSelect={action.action}>
                  <action.icon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{action.title}</span>
                    {action.subtitle && (
                      <span className="text-xs text-muted-foreground">{action.subtitle}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Search results */}
          {query && results.length > 0 && (
            <>
              {results.filter(r => r.type === 'ticket').length > 0 && (
                <CommandGroup heading={t('tickets', { fallback: 'Tickets' })}>
                  {results.filter(r => r.type === 'ticket').map((result) => (
                    <CommandItem key={result.id} onSelect={result.action}>
                      <result.icon className="mr-2 h-4 w-4" />
                      <div className="flex flex-col flex-1">
                        <span>{result.title}</span>
                        {result.subtitle && (
                          <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.filter(r => r.type === 'customer').length > 0 && (
                <CommandGroup heading={t('customers', { fallback: 'Customers' })}>
                  {results.filter(r => r.type === 'customer').map((result) => (
                    <CommandItem key={result.id} onSelect={result.action}>
                      <result.icon className="mr-2 h-4 w-4" />
                      <div className="flex flex-col flex-1">
                        <span>{result.title}</span>
                        {result.subtitle && (
                          <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {results.filter(r => r.type === 'conversation').length > 0 && (
                <CommandGroup heading={t('conversations', { fallback: 'Conversations' })}>
                  {results.filter(r => r.type === 'conversation').map((result) => (
                    <CommandItem key={result.id} onSelect={result.action}>
                      <result.icon className="mr-2 h-4 w-4" />
                      <div className="flex flex-col flex-1">
                        <span>{result.title}</span>
                        {result.subtitle && (
                          <span className="text-xs text-muted-foreground">{result.subtitle}</span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
