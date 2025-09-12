import { useState, useEffect, useCallback, useRef } from 'react';
import { crmSearchApi, SearchFilters, SearchResponse, SearchResult, SearchFacets, SavedSearch, SearchSuggestions } from '@/lib/api/crm-search-client';

export interface UseCrmSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  maxResults?: number;
  autoSearch?: boolean;
  initialFilters?: SearchFilters;
}

export interface UseCrmSearchReturn {
  // Search state
  query: string;
  setQuery: (query: string) => void;
  filters: SearchFilters;
  setFilters: (filters: SearchFilters) => void;
  updateFilters: (updates: Partial<SearchFilters>) => void;
  clearFilters: () => void;
  
  // Results
  results: SearchResult[];
  totalCount: number;
  facets: SearchFacets | null;
  searchTime: number;
  suggestions: SearchSuggestions | null;
  
  // Loading and error states
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  
  // Search actions
  search: (customFilters?: SearchFilters) => Promise<void>;
  quickSearch: (query: string) => Promise<void>;
  semanticSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
  
  // Saved searches
  savedSearches: SavedSearch[];
  saveCurrentSearch: (name: string) => Promise<void>;
  loadSavedSearch: (searchId: string) => Promise<void>;
  deleteSavedSearch: (searchId: string) => Promise<void>;
  
  // Search history
  searchHistory: string[];
  addToHistory: (query: string) => void;
  
  // Facets
  updateFacetFilter: (facetType: keyof SearchFacets, value: string, add: boolean) => void;
  getFacetCount: (facetType: keyof SearchFacets, value: string) => number;
}

export function useCrmSearch(options: UseCrmSearchOptions = {}): UseCrmSearchReturn {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    maxResults = 20,
    autoSearch = true,
    initialFilters = {}
  } = options;

  // Search state
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    limit: maxResults,
    page: 1,
    ...initialFilters
  });
  
  // Results state
  const [results, setResults] = useState<SearchResult[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [facets, setFacets] = useState<SearchFacets | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [suggestions, setSuggestions] = useState<SearchSuggestions | null>(null);
  
  // Loading and error states
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: maxResults,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  
  // Saved searches state
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  
  // Refs for debouncing
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | undefined>(undefined);

  // Helper functions
  const addToHistory = useCallback((searchQuery: string) => {
    if (searchQuery.trim()) {
      setSearchHistory(prev => {
        const prevArray = Array.isArray(prev) ? prev : [];
        const filtered = prevArray.filter(q => q !== searchQuery);
        return [searchQuery, ...filtered].slice(0, 10);
      });
    }
  }, []);

  const loadSavedSearches = useCallback(async () => {
    try {
      const searches = await crmSearchApi.getSavedSearches();
      setSavedSearches(Array.isArray(searches) ? searches : []);
    } catch (err) {
      console.error('Failed to load saved searches:', err);
      setSavedSearches([]);
    }
  }, []);

  const loadSearchHistory = useCallback(async () => {
    try {
      const history = await crmSearchApi.getSearchHistory(10);
      setSearchHistory(Array.isArray(history) ? history : []);
    } catch (err) {
      console.error('Failed to load search history:', err);
      setSearchHistory([]);
    }
  }, []);

  const loadFacets = useCallback(async () => {
    try {
      const facetsData = await crmSearchApi.getFacets();
      setFacets(facetsData);
    } catch (err) {
      console.error('Failed to load facets:', err);
    }
  }, []);

  // Main search function
  const performSearch = useCallback(async (customFilters?: SearchFilters) => {
    const searchFilters = customFilters || {
      ...filters,
      query: query || undefined
    };

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsSearching(true);
    setError(null);

    try {
      const response: SearchResponse = await crmSearchApi.search(searchFilters);
      
      if (!abortControllerRef.current.signal.aborted) {
        const safeResults = Array.isArray(response?.results) ? response.results : [];
        const safeFacets = (response && (response as any).facets) ? response.facets : null;
        const safeSuggestions = Array.isArray(response?.suggestions)
          ? { history: [], suggestions: response.suggestions!, popular: [] }
          : null;
        const safePagination = response?.pagination ? response.pagination : {
          page: 1,
          limit: searchFilters.limit ?? maxResults,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        };

        setResults(safeResults);
        setTotalCount(Number(response?.totalCount ?? safeResults.length));
        setFacets(safeFacets);
        setSearchTime(Number(response?.searchTime ?? 0));
        setSuggestions(safeSuggestions);
        setPagination(safePagination);
        
        // Add to search history if query provided
        if (searchFilters.query) {
          addToHistory(searchFilters.query);
        }
      }
    } catch (err) {
      if (!abortControllerRef.current.signal.aborted) {
        const errorMessage = err instanceof Error ? err.message : 'Search failed';
        setError(errorMessage);
        console.error('Search error:', err);
      }
    } finally {
      if (!abortControllerRef.current.signal.aborted) {
        setIsSearching(false);
      }
    }
  }, [query, filters, addToHistory]);

  // Debounced search function
  const debouncedSearch = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      performSearch();
    }, debounceMs);
  }, [debounceMs, performSearch]);

  // Load initial data
  useEffect(() => {
    loadSavedSearches();
    loadSearchHistory();
    loadFacets();
  }, [loadSavedSearches, loadSearchHistory, loadFacets]);

  // Auto-search when query or filters change
  useEffect(() => {
    const qLen = (query ?? '').length;
    const filterCount = Object.keys(filters ?? {}).length;
    if (autoSearch && (qLen >= minQueryLength || filterCount > 2)) {
      debouncedSearch();
    }
  }, [query, filters, autoSearch, minQueryLength, debouncedSearch]);

  // Quick search function
  const quickSearch = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    await performSearch({
      ...filters,
      query: searchQuery,
      page: 1
    });
  }, [filters, performSearch]);

  // Semantic search function
  const semanticSearch = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    await performSearch({
      ...filters,
      query: searchQuery,
      semantic: true,
      page: 1
    });
  }, [filters, performSearch]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setTotalCount(0);
    setFacets(null);
    setSearchTime(0);
    setSuggestions(null);
    setError(null);
    setPagination({
      page: 1,
      limit: maxResults,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    });
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [maxResults]);

  // Update filters
  const updateFilters = useCallback((updates: Partial<SearchFilters>) => {
    setFilters(prev => ({
      ...prev,
      ...updates,
      page: 1 // Reset to first page when filters change
    }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      limit: maxResults,
      page: 1
    });
  }, [maxResults]);

  // Pagination functions
  const setPage = useCallback((page: number) => {
    setFilters(prev => ({ ...prev, page }));
  }, []);

  const setLimit = useCallback((limit: number) => {
    setFilters(prev => ({ ...prev, limit, page: 1 }));
  }, []);

  // Saved searches functions
  const saveCurrentSearch = useCallback(async (name: string) => {
    try {
      await crmSearchApi.saveSearch(name, {
        ...filters,
        query: query || undefined
      });
      await loadSavedSearches();
    } catch (err) {
      console.error('Failed to save search:', err);
      throw err;
    }
  }, [filters, query, loadSavedSearches]);

  const loadSavedSearch = useCallback(async (searchId: string) => {
    try {
      const savedSearch = savedSearches.find(s => s.id === searchId);
      if (savedSearch) {
        setQuery(savedSearch.query || '');
        setFilters({
          ...savedSearch.filters,
          page: 1
        });
        await performSearch({
          ...savedSearch.filters,
          query: savedSearch.query,
          page: 1
        });
      }
    } catch (err) {
      console.error('Failed to load saved search:', err);
    }
  }, [savedSearches, performSearch]);

  const deleteSavedSearch = useCallback(async (searchId: string) => {
    try {
      await crmSearchApi.deleteSavedSearch(searchId);
      await loadSavedSearches();
    } catch (err) {
      console.error('Failed to delete saved search:', err);
      throw err;
    }
  }, [loadSavedSearches]);

  // Facet filter functions
  const updateFacetFilter = useCallback((facetType: keyof SearchFacets, value: string, add: boolean) => {
    const filterKey = getFilterKeyFromFacetType(facetType);
    if (!filterKey) return;

    setFilters(prev => {
      const currentValues = (prev[filterKey] as string[]) || [];
      let newValues: string[];

      if (add) {
        newValues = [...currentValues, value];
      } else {
        newValues = currentValues.filter(v => v !== value);
      }

      return {
        ...prev,
        [filterKey]: newValues.length > 0 ? newValues : undefined,
        page: 1
      };
    });
  }, []);

  const getFacetCount = useCallback((facetType: keyof SearchFacets, value: string): number => {
    if (!facets) return 0;
    
    const facetArray = facets[facetType] as Array<{ value: string; count: number }>;
    const facet = facetArray?.find(f => f.value === value);
    return facet?.count || 0;
  }, [facets]);

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
    // Search state
    query,
    setQuery,
    filters,
    setFilters,
    updateFilters,
    clearFilters,
    
    // Results
    results,
    totalCount,
    facets,
    searchTime,
    suggestions,
    
    // Loading and error states
    isLoading: false,
    isSearching,
    error,
    
    // Pagination
    pagination,
    setPage,
    setLimit,
    
    // Search actions
    search: performSearch,
    quickSearch,
    semanticSearch,
    clearSearch,
    
    // Saved searches
    savedSearches,
    saveCurrentSearch,
    loadSavedSearch,
    deleteSavedSearch,
    
    // Search history
    searchHistory,
    addToHistory,
    
    // Facets
    updateFacetFilter,
    getFacetCount
  };
}

// Helper function to map facet types to filter keys
function getFilterKeyFromFacetType(facetType: keyof SearchFacets): keyof SearchFilters | null {
  const mapping: Record<string, keyof SearchFilters> = {
    'leadStatus': 'leadStatus',
    'dealStage': 'dealStage',
    'dealPipeline': 'dealPipeline',
    'companies': 'companies',
    'sources': 'sources',
    'assignedTo': 'assignedTo',
    'tags': 'tags'
  };
  
  return mapping[facetType] || null;
}

// Hook for quick search with minimal setup
export function useQuickSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await crmSearchApi.quickSearch(searchQuery);
      setResults(response.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback((searchQuery: string) => {
    const debouncedFn = debounce(search, 300);
    debouncedFn(searchQuery);
  }, [search]);

  useEffect(() => {
    if (query) {
      debouncedSearch(query);
    } else {
      setResults([]);
    }
  }, [query, debouncedSearch]);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    search
  };
}

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}