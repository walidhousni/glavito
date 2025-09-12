'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Search, X, Command } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearch } from '@/hooks/use-search';
import { SearchResults } from './SearchResults';
import { cn } from '@/lib/utils';

interface SearchDropdownProps {
  placeholder?: string;
  className?: string;
  onClose?: () => void;
}

export function SearchDropdown({ 
  placeholder, 
  className,
  onClose 
}: SearchDropdownProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    query,
    results,
    isLoading,
    error,
    totalCount,
    searchTime,
    handleQueryChange,
    clearSearch,
    navigateToResult,
  } = useSearch({
    debounceMs: 300,
    minQueryLength: 2,
    maxResults: 8,
  });

  // Handle click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsFocused(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Cmd/Ctrl + K to focus search
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
        setIsFocused(true);
      }

      // Escape to close
      if (event.key === 'Escape') {
        setIsOpen(false);
        setIsFocused(false);
        inputRef.current?.blur();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleQueryChange(value);
    setIsOpen(value.length >= 2 || results.length > 0);
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    if (query.length >= 2 || results.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = () => {
    // Delay blur to allow for dropdown interactions
    setTimeout(() => {
      setIsFocused(false);
    }, 150);
  };

  const handleClear = () => {
    clearSearch();
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const handleResultClick = (result: any) => {
    navigateToResult(result);
    setIsOpen(false);
    setIsFocused(false);
    onClose?.();
  };

  const shouldShowDropdown = isOpen && (query.length >= 2 || results.length > 0);

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        
        <Input
          ref={inputRef}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder || t('common.searchPlaceholder')}
          className={cn(
            'pl-10 pr-20 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-900 transition-all duration-200',
            isFocused && 'ring-2 ring-blue-500/20 border-blue-300 dark:border-blue-700'
          )}
        />

        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {query && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={handleClear}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          <div className="hidden sm:flex items-center space-x-1 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {shouldShowDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden"
          >
            <SearchResults
              results={results}
              isLoading={isLoading}
              error={error}
              query={query}
              totalCount={totalCount}
              searchTime={searchTime}
              onResultClick={handleResultClick}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}