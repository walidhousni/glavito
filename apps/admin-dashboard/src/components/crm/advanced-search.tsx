'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  Filter,
  X,
  ChevronDown,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
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
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            
            <Input
              ref={inputRef}
              value={query}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder={placeholder || t('placeholder')}
              className="pl-10 pr-20"
            />

            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
              {query && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
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
                  className="h-6 w-6 p-0"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                >
                  <Filter className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command>
            <CommandInput placeholder={placeholder || t('placeholder')} value={query} onValueChange={setQuery} />
            <CommandList>
              <CommandEmpty>
                {isSearching ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    {t('results.searching')}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-6">
                    <Search className="h-4 w-4 mr-2 text-muted-foreground" />
                    {t('results.noResults')}
                  </div>
                )}
              </CommandEmpty>
              
              {results && results.length > 0 && (
                <>
                  <CommandGroup heading={`${totalCount} ${t('results.found')}`}>
                    {results.map((result) => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => handleResultClick(result)}
                        className="flex items-center gap-3 p-3"
                      >
                        <div className={cn(
                          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                          getResultColor(result.type)
                        )}>
                          {getResultIcon(result.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{result.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {result.type}
                            </Badge>
                          </div>
                          {result.subtitle && (
                            <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                          )}
                        </div>
                        <div className="ml-2">
                          <input
                            type="checkbox"
                            checked={selectedResults.has(result.id)}
                            onChange={(e) => handleResultSelect(result, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
              
              {suggestions && suggestions.suggestions && suggestions.suggestions.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading={t('suggestions.title')}>
                    {suggestions.suggestions.map((suggestion, index) => (
                      <CommandItem
                        key={index}
                        onSelect={() => quickSearch(suggestion)}
                        className="flex items-center gap-2"
                      >
                        <History className="h-4 w-4 text-muted-foreground" />
                        <span>{suggestion}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <Card className="mt-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {t('filters.title')}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-xs h-8"
              >
                {t('filters.clear')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Entity Types */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('filters.entities')}</Label>
                <Select
                  value={filters.entities?.join(',') || ''}
                  onValueChange={(value) => {
                    updateFilters({
                      entities: value ? value.split(',') as ('lead' | 'deal' | 'customer' | 'segment')[] : undefined
                    });
                  }}
                >
                  <SelectTrigger>
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
                <Label className="text-sm font-medium">{t('filters.dateRange')}</Label>
                <div className="flex space-x-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="flex-1">
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
                      <Button variant="outline" size="sm" className="flex-1">
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
                <Label className="text-sm font-medium">{t('filters.valueRange')}</Label>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    placeholder={t('filters.minValue')}
                    value={filters.minValue || ''}
                    onChange={(e) => updateFilters({ minValue: e.target.value ? Number(e.target.value) : undefined })}
                  />
                  <Input
                    type="number"
                    placeholder={t('filters.maxValue')}
                    value={filters.maxValue || ''}
                    onChange={(e) => updateFilters({ maxValue: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </div>
              </div>
            </div>

            {/* Semantic Search Toggle */}
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Switch
                id="semantic-search"
                checked={filters.semantic || false}
                onCheckedChange={(checked) => updateFilters({ semantic: checked })}
              />
              <Label htmlFor="semantic-search" className="text-sm">
                {t('filters.semanticSearch')}
              </Label>
              <Sparkles className="h-4 w-4 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Searches Menu */}
      {showSavedSearches && (
        <div className="mt-2">
          <DropdownMenu open={showSavedSearchesMenu} onOpenChange={setShowSavedSearchesMenu}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full">
                <Bookmark className="h-4 w-4 mr-2" />
                {t('saved.title')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
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
        </div>
      )}

      {/* Save Search Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSaveDialog(false)}>
          <Card className="w-96 max-w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle>{t('saved.saveTitle')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                placeholder={t('saved.namePlaceholder')}
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
