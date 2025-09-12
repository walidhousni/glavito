'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
  Save,
  History,
  Sparkles,
  Clock,
  Users,
  Building2,
  Target,
  BarChart3,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Star,
  DollarSign,
  Calendar,
  Tag,
  User,
  Settings,
  Bookmark,
  Trash2
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useCrmSearch } from '@/hooks/use-crm-search';
import { SearchResult, SearchFilters } from '@/lib/api/crm-search-client';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface AdvancedSearchProps {
  onResultClick?: (result: SearchResult) => void;
  onResultSelect?: (results: SearchResult[]) => void;
  className?: string;
  placeholder?: string;
  showFilters?: boolean;
  showSavedSearches?: boolean;
  maxHeight?: string;
}

export function AdvancedSearch({
  onResultClick,
  onResultSelect,
  className,
  placeholder,
  showFilters = true,
  showSavedSearches = true,
  maxHeight = '600px'
}: AdvancedSearchProps) {
  const t = useTranslations('crm.search');
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showSavedSearchesMenu, setShowSavedSearchesMenu] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    query,
    setQuery,
    filters,
    updateFilters,
    clearFilters,
    results,
    totalCount,
    facets,
    searchTime,
    suggestions,
    isLoading,
    isSearching,
    error,
    pagination,
    setPage,
    setLimit,
    search,
    quickSearch,
    semanticSearch,
    clearSearch,
    savedSearches,
    saveCurrentSearch,
    loadSavedSearch,
    deleteSavedSearch,
    searchHistory,
    updateFacetFilter,
    getFacetCount
  } = useCrmSearch({
    debounceMs: 300,
    minQueryLength: 2,
    maxResults: 20,
    autoSearch: true
  });

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen((value?.length ?? 0) >= 2 || (results?.length ?? 0) > 0);
  };

  const handleInputFocus = () => {
    if ((query?.length ?? 0) >= 2 || (results?.length ?? 0) > 0) {
      setIsOpen(true);
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onResultClick?.(result);
    setIsOpen(false);
  };

  const handleResultSelect = (result: SearchResult, selected: boolean) => {
    const newSelected = new Set(selectedResults);
    if (selected) {
      newSelected.add(result.id);
    } else {
      newSelected.delete(result.id);
    }
    setSelectedResults(newSelected);
    
    const selectedResultsArray = results.filter(r => newSelected.has(r.id));
    onResultSelect?.(selectedResultsArray);
  };

  const handleSaveSearch = async () => {
    if (!saveSearchName.trim()) return;
    
    try {
      await saveCurrentSearch(saveSearchName.trim());
      setShowSaveDialog(false);
      setSaveSearchName('');
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  };

  const handleLoadSavedSearch = async (searchId: string) => {
    try {
      await loadSavedSearch(searchId);
      setShowSavedSearchesMenu(false);
      setIsOpen(true);
    } catch (error) {
      console.error('Failed to load saved search:', error);
    }
  };

  const handleDeleteSavedSearch = async (searchId: string) => {
    try {
      await deleteSavedSearch(searchId);
    } catch (error) {
      console.error('Failed to delete saved search:', error);
    }
  };

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'lead': return <Users className="h-4 w-4" />;
      case 'deal': return <Target className="h-4 w-4" />;
      case 'customer': return <Building2 className="h-4 w-4" />;
      case 'segment': return <BarChart3 className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  const getResultColor = (type: string) => {
    switch (type) {
      case 'lead': return 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400';
      case 'deal': return 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400';
      case 'customer': return 'text-purple-600 bg-purple-50 dark:bg-purple-950 dark:text-purple-400';
      case 'segment': return 'text-orange-600 bg-orange-50 dark:bg-orange-950 dark:text-orange-400';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-950 dark:text-gray-400';
    }
  };

  const formatSearchTime = (time: number) => {
    if (time < 1000) return `${time}ms`;
    return `${(time / 1000).toFixed(1)}s`;
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder || t('placeholder')}
          className={cn(
            'pl-10 pr-20 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-900 transition-all duration-200',
            isOpen && 'ring-2 ring-blue-500/20 border-blue-300 dark:border-blue-700'
          )}
        />

        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {query && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={() => {
                clearSearch();
                setIsOpen(false);
              }}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {showFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t('filters.title')}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs"
                >
                  {t('filters.clear')}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Entity Types */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{t('filters.entities')}</Label>
                  <Select
                    value={filters.entities?.join(',') || ''}
                    onValueChange={(value) => {
                      updateFilters({
                        entities: value ? value.split(',') as any : undefined
                      });
                    }}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder={t('filters.selectEntities')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lead,deal,customer,segment">
                        {t('filters.allEntities')}
                      </SelectItem>
                      <SelectItem value="lead">{t('filters.leads')}</SelectItem>
                      <SelectItem value="deal">{t('filters.deals')}</SelectItem>
                      <SelectItem value="customer">{t('filters.customers')}</SelectItem>
                      <SelectItem value="segment">{t('filters.segments')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{t('filters.dateRange')}</Label>
                  <div className="flex space-x-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 flex-1">
                          {filters.dateFrom ? format(filters.dateFrom, 'MMM dd') : t('filters.from')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={filters.dateFrom}
                          onSelect={(date) => updateFilters({ dateFrom: date })}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 flex-1">
                          {filters.dateTo ? format(filters.dateTo, 'MMM dd') : t('filters.to')}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={filters.dateTo}
                          onSelect={(date) => updateFilters({ dateTo: date })}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Value Range */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">{t('filters.valueRange')}</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      placeholder={t('filters.minValue')}
                      value={filters.minValue || ''}
                      onChange={(e) => updateFilters({ minValue: e.target.value ? Number(e.target.value) : undefined })}
                      className="h-8"
                    />
                    <Input
                      type="number"
                      placeholder={t('filters.maxValue')}
                      value={filters.maxValue || ''}
                      onChange={(e) => updateFilters({ maxValue: e.target.value ? Number(e.target.value) : undefined })}
                      className="h-8"
                    />
                  </div>
                </div>
              </div>

              {/* Semantic Search Toggle */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="semantic-search"
                  checked={filters.semantic || false}
                  onCheckedChange={(checked) => updateFilters({ semantic: checked })}
                />
                <Label htmlFor="semantic-search" className="text-xs">
                  {t('filters.semanticSearch')}
                </Label>
                <Sparkles className="h-3 w-3 text-purple-500" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden"
            style={{ maxHeight }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {t('results.title')}
                </h3>
                {totalCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {totalCount} {t('results.found')}
                  </Badge>
                )}
                {searchTime > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatSearchTime(searchTime)}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                {showSavedSearches && (
                  <DropdownMenu open={showSavedSearchesMenu} onOpenChange={setShowSavedSearchesMenu}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Bookmark className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuItem onClick={() => setShowSaveDialog(true)}>
                        <Save className="h-4 w-4 mr-2" />
                        {t('saved.saveCurrent')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {(savedSearches || []).map((search) => (
                        <DropdownMenuItem
                          key={search.id}
                          onClick={() => handleLoadSavedSearch(search.id)}
                          className="flex items-center justify-between"
                        >
                          <span className="truncate">{search.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 ml-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSavedSearch(search.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Results */}
            <ScrollArea className="max-h-96">
              {isSearching && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    {t('results.searching')}
                  </span>
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center py-8">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                  <span className="ml-2 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </span>
                </div>
              )}

              {!isSearching && !error && (results?.length ?? 0) === 0 && (query ?? '') && (
                <div className="flex items-center justify-center py-8">
                  <Search className="h-6 w-6 text-gray-400" />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                    {t('results.noResults')}
                  </span>
                </div>
              )}

              {!isSearching && !error && (results?.length ?? 0) > 0 && (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {results.map((result) => (
                    <div
                      key={result.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                      onClick={() => handleResultClick(result)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={cn(
                          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                          getResultColor(result.type)
                        )}>
                          {getResultIcon(result.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {result.title}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {result.type}
                            </Badge>
                            {result.score && (
                              <Badge variant="secondary" className="text-xs">
                                <Star className="h-3 w-3 mr-1" />
                                {result.score}
                              </Badge>
                            )}
                          </div>
                          
                          {result.subtitle && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {result.subtitle}
                            </p>
                          )}
                          
                          {result.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 line-clamp-2">
                              {result.description}
                            </p>
                          )}
                          
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {format(new Date(result.createdAt), 'MMM dd, yyyy')}
                            </span>
                            {result.metadata.value && (
                              <span className="flex items-center">
                                <DollarSign className="h-3 w-3 mr-1" />
                                {result.metadata.value}
                              </span>
                            )}
                            {result.metadata?.tags && (result.metadata.tags?.length ?? 0) > 0 && (
                              <span className="flex items-center">
                                <Tag className="h-3 w-3 mr-1" />
                                {result.metadata.tags.slice(0, 2).join(', ')}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={selectedResults.has(result.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleResultSelect(result, e.target.checked);
                            }}
                            className="rounded border-gray-300"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {!isSearching && !error && (results?.length ?? 0) === 0 && !(query ?? '') && suggestions && (
                <div className="p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                    {t('suggestions.title')}
                  </h4>
                  <div className="space-y-2">
                    {suggestions.suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="block w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                        onClick={() => quickSearch(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Pagination */}
            {(pagination?.totalPages ?? 0) > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {t('pagination.showing', {
                    start: ((pagination?.page ?? 1) - 1) * (pagination?.limit ?? 20) + 1,
                    end: Math.min((pagination?.page ?? 1) * (pagination?.limit ?? 20), totalCount ?? 0),
                    total: totalCount ?? 0
                  })}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination?.hasPrev}
                    onClick={() => setPage((pagination?.page ?? 1) - 1)}
                    className="h-8"
                  >
                    {t('pagination.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!pagination?.hasNext}
                    onClick={() => setPage((pagination?.page ?? 1) + 1)}
                    className="h-8"
                  >
                    {t('pagination.next')}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Search Dialog */}
      <AnimatePresence>
        {showSaveDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowSaveDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 max-w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('saved.saveTitle')}
              </h3>
              <Input
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                placeholder={t('saved.namePlaceholder')}
                className="mb-4"
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(false)}
                >
                  {t('saved.cancel')}
                </Button>
                <Button
                  onClick={handleSaveSearch}
                  disabled={!saveSearchName.trim()}
                >
                  {t('saved.save')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
