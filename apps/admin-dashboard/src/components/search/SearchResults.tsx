'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  Ticket,
  User,
  Users,
  BookOpen,
  Building2,
  Clock,
  ArrowRight,
  Search,
  Loader2,
} from 'lucide-react';
import { SearchResult } from '@/hooks/use-search';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SearchResultsProps {
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
  query: string;
  totalCount: number;
  searchTime: number;
  onResultClick: (result: SearchResult) => void;
  className?: string;
}

const typeIcons = {
  ticket: Ticket,
  customer: Building2,
  knowledge: BookOpen,
  user: User,
  team: Users,
};

const typeColors = {
  ticket: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  customer: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  knowledge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  user: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  team: 'bg-pink-100 text-pink-700 dark:bg-pink-900/20 dark:text-pink-400',
};

export function SearchResults({
  results,
  isLoading,
  error,
  query,
  totalCount,
  searchTime,
  onResultClick,
  className,
}: SearchResultsProps) {
  const t = useTranslations();

  if (isLoading) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <Search className="h-6 w-6 mx-auto mb-2 text-red-400" />
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!query || query.length < 2) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <Search className="h-6 w-6 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">{t('common.searchPlaceholder')}</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className={cn('p-4 text-center', className)}>
        <Search className="h-6 w-6 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-500">{t('search.noResults')}</p>
        <p className="text-xs text-gray-400 mt-1">
          {t('search.tryDifferent')}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      {/* Search Stats */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-xs text-gray-500">
          {totalCount} results in {searchTime}ms
        </p>
      </div>

      {/* Results */}
      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence>
          {results.map((result, index) => {
            const Icon = typeIcons[result.type];
            const typeColor = typeColors[result.type];

            return (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0 group"
                onClick={() => onResultClick(result)}
              >
                <div className="flex items-start space-x-3">
                  <div className={cn('p-1.5 rounded-md flex-shrink-0', typeColor)}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {result.title}
                      </h4>
                      <ArrowRight className="h-3.5 w-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
                    </div>
                    
                    {result.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {result.description}
                      </p>
                    )}
                    
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {result.type}
                      </Badge>
                      
                      {result.metadata?.createdAt && (
                        <div className="flex items-center text-xs text-gray-400">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(result.metadata.createdAt).toLocaleDateString()}
                        </div>
                      )}
                      
                      {result.metadata?.status && (
                        <Badge 
                          variant="outline" 
                          className={cn(
                            'text-xs',
                            result.metadata.status === 'open' && 'border-green-300 text-green-700',
                            result.metadata.status === 'closed' && 'border-gray-300 text-gray-700',
                            result.metadata.status === 'in_progress' && 'border-blue-300 text-blue-700',
                          )}
                        >
                          {result.metadata.status}
                        </Badge>
                      )}
                      
                      {result.metadata?.priority && (
                        <Badge 
                          variant="outline"
                          className={cn(
                            'text-xs',
                            result.metadata.priority === 'high' && 'border-red-300 text-red-700',
                            result.metadata.priority === 'medium' && 'border-yellow-300 text-yellow-700',
                            result.metadata.priority === 'low' && 'border-gray-300 text-gray-700',
                          )}
                        >
                          {result.metadata.priority}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}