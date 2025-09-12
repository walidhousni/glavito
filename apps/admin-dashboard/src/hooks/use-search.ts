import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { searchApi } from '@/lib/api/search-client';

export interface SearchResult {
  id: string;
  type: 'ticket' | 'customer' | 'knowledge' | 'user' | 'team';
  title: string;
  description?: string;
  url: string;
  metadata?: {
    status?: string;
    priority?: string;
    customerName?: string;
    email?: string;
    company?: string;
    phone?: string;
    category?: string;
    viewCount?: number;
    helpfulCount?: number;
    createdAt?: string;
  };
  relevanceScore?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  searchTime: number;
  suggestions?: string[];
}

interface UseSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  maxResults?: number;
}

// Transform the existing API response to our expected format
type ApiTicket = { id: string; subject?: string; status?: string; priority?: string; customer?: { firstName?: string; lastName?: string; email?: string }; createdAt?: string };
type ApiCustomer = { id: string; firstName?: string; lastName?: string; email?: string; company?: string; phone?: string; createdAt?: string };
type ApiArticle = { id: string; title: string; category?: string; viewCount?: number; helpfulCount?: number; createdAt?: string };
type ApiFaq = { id: string; title: string; viewCount?: number; createdAt?: string };
type ApiResponseShape = {
  tickets?: ApiTicket[];
  customers?: ApiCustomer[];
  knowledge?: { articles?: ApiArticle[]; faqs?: ApiFaq[] };
};

function transformSearchResponse(apiResponse: ApiResponseShape): SearchResult[] {
  const results: SearchResult[] = [];

  // Transform tickets
  if (apiResponse.tickets) {
    apiResponse.tickets.forEach((ticket) => {
      results.push({
        id: ticket.id,
        type: 'ticket',
        title: ticket.subject || `Ticket #${ticket.id}`,
        description: `${ticket.status?.toUpperCase() || 'UNKNOWN'} • ${ticket.priority?.toUpperCase() || 'MEDIUM'} • ${ticket.customer?.firstName || ticket.customer?.email || 'Unknown Customer'}`,
        url: `/tickets/${ticket.id}`,
        metadata: {
          status: ticket.status,
          priority: ticket.priority,
          customerName: ticket.customer ? `${ticket.customer.firstName || ''} ${ticket.customer.lastName || ''}`.trim() : '',
          createdAt: ticket.createdAt,
        },
      });
    });
  }

  // Transform customers
  if (apiResponse.customers) {
    apiResponse.customers.forEach((customer) => {
      results.push({
        id: customer.id,
        type: 'customer',
        title: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email || 'Unknown Customer',
        description: `${customer.email || ''} ${customer.company ? `• ${customer.company}` : ''}`,
        url: `/customers/${customer.id}`,
        metadata: {
          email: customer.email,
          company: customer.company,
          phone: customer.phone,
          createdAt: customer.createdAt,
        },
      });
    });
  }

  // Transform knowledge base articles
  if (apiResponse.knowledge?.articles) {
    apiResponse.knowledge.articles.forEach((article) => {
      results.push({
        id: article.id,
        type: 'knowledge',
        title: article.title,
        description: `${article.category || 'General'} • ${article.viewCount || 0} views`,
        url: `/knowledge/${article.id}`,
        metadata: {
          category: article.category,
          viewCount: article.viewCount,
          helpfulCount: article.helpfulCount,
          createdAt: article.createdAt,
        },
      });
    });
  }

  // Transform FAQs
  if (apiResponse.knowledge?.faqs) {
    apiResponse.knowledge.faqs.forEach((faq) => {
      results.push({
        id: faq.id,
        type: 'knowledge',
        title: faq.title,
        description: `FAQ • ${faq.viewCount || 0} views`,
        url: `/knowledge/faqs/${faq.id}`,
        metadata: {
          category: 'FAQ',
          viewCount: faq.viewCount,
          createdAt: faq.createdAt,
        },
      });
    });
  }

  return results;
}

export function useSearch(options: UseSearchOptions = {}) {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    maxResults = 10,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTime, setSearchTime] = useState(0);

  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minQueryLength) {
      setResults([]);
      setSuggestions([]);
      setTotalCount(0);
      setSearchTime(0);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const startTime = Date.now();
      
      // Use the existing search API client
      const apiResponse = await searchApi.federated(searchQuery);
      
      // Transform the response to our expected format
      const transformedResults = transformSearchResponse(apiResponse);
      
      // Limit results
      const limitedResults = transformedResults.slice(0, maxResults);
      
      const searchTime = Date.now() - startTime;
      
      setResults(limitedResults);
      setTotalCount(transformedResults.length);
      setSearchTime(searchTime);
      setSuggestions([]); // The existing API doesn't provide suggestions yet
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
      setSuggestions([]);
      setTotalCount(0);
      setSearchTime(0);
    } finally {
      setIsLoading(false);
    }
  }, [minQueryLength, maxResults]);

  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, debounceMs);
  }, [performSearch, debounceMs]);

  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    debouncedSearch(newQuery);
  }, [debouncedSearch]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setTotalCount(0);
    setSearchTime(0);
    setError(null);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const navigateToResult = useCallback((result: SearchResult) => {
    try {
      if (result.type === 'ticket') {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const parts = String(currentPath || '').split('/').filter(Boolean);
        const maybeLocale = parts[0];
        const supportedLocales = ['en', 'fr', 'ar'];
        const prefix = supportedLocales.includes(maybeLocale) ? `/${maybeLocale}` : '';
        const target = `${prefix}/dashboard/tickets?ticket=${encodeURIComponent(result.id)}`;
        router.push(target);
        return;
      }
      if (result.type === 'customer') {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const parts = String(currentPath || '').split('/').filter(Boolean);
        const maybeLocale = parts[0];
        const supportedLocales = ['en', 'fr', 'ar'];
        const prefix = supportedLocales.includes(maybeLocale) ? `/${maybeLocale}` : '';
        const target = `${prefix}/dashboard/customers?customerId=${encodeURIComponent(result.id)}`;
        router.push(target);
        return;
      }
    } catch {
      /* fall through */
    }
    router.push(result.url);
  }, [router]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    results,
    isLoading,
    error,
    suggestions,
    totalCount,
    searchTime,
    handleQueryChange,
    clearSearch,
    navigateToResult,
    performSearch,
  };
}