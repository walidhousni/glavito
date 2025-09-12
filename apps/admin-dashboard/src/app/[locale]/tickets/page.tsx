'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  Plus,
  Filter,
  Search,
  MoreHorizontal,
  Download,
  RefreshCw,
  Grid3X3,
  List,
  SortAsc,
  SortDesc,
  Calendar,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Eye,
  MessageSquare,
  Tag,
  User,
  Building,
  Mail,
  Phone
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { CreateTicketDialog } from '@/components/tickets/create-ticket-dialog';
import { TicketDetailsDialog } from '@/components/tickets/ticket-details-dialog';
import { BulkActionsBar } from '@/components/tickets/bulk-actions-bar';
import { ModernTicketFilters } from '@/components/tickets/modern-ticket-filters';
import { TicketCard } from '@/components/tickets/ticket-card';

// Mock data
const mockTickets = [
  {
    id: '#665',
    subject: 'Login Issue',
    description: 'Unable to access premium features after subscription upgrade',
    status: 'open',
    priority: 'high',
    customer: {
      firstName: 'Floratina',
      lastName: 'Wong',
      email: 'floratina@acme.com',
      company: 'Acme Corp',
      avatar: null
    },
    assignedAgent: null,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T14:20:00Z',
    tags: ['billing', 'premium'],
    _count: { conversations: 3 }
  },
  {
    id: '#662',
    subject: 'Customer complaint',
    description: 'Product quality issues reported by customer',
    status: 'pending',
    priority: 'low',
    customer: {
      firstName: 'Melorinshop',
      lastName: 'Taylor',
      email: 'melo@techstart.com',
      company: 'TechStart Inc',
      avatar: null
    },
    assignedAgent: {
      firstName: 'Alice',
      lastName: 'Wilson',
      avatar: null
    },
    createdAt: '2024-01-14T15:20:00Z',
    updatedAt: '2024-01-15T09:10:00Z',
    tags: ['quality', 'complaint'],
    _count: { conversations: 1 }
  },
  {
    id: '#670',
    subject: 'More information required',
    description: 'Need additional details for account verification',
    status: 'pending',
    priority: 'high',
    customer: {
      firstName: 'Shoppine',
      lastName: 'Melen',
      email: 'shop@global.com',
      company: 'Global Solutions',
      avatar: null
    },
    assignedAgent: {
      firstName: 'Bob',
      lastName: 'Brown',
      avatar: null
    },
    createdAt: '2024-01-13T11:45:00Z',
    updatedAt: '2024-01-15T08:30:00Z',
    tags: ['verification', 'account'],
    _count: { conversations: 5 }
  }
];

const statusCounts = {
  all: 137,
  open: 85,
  pending: 6,
  on_hold: 17,
  closed: 29
};

export default function TicketsPage() {
  const t = useTranslations('tickets');
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleSelectTicket = (ticketId: string, selected: boolean) => {
    if (selected) {
      setSelectedTickets(prev => [...prev, ticketId]);
    } else {
      setSelectedTickets(prev => prev.filter(id => id !== ticketId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTickets(mockTickets.map(ticket => ticket.id));
    } else {
      setSelectedTickets([]);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleBulkAction = async (action: string, params?: unknown) => {
    console.log('Bulk action:', action, params, 'on tickets:', selectedTickets);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSelectedTickets([]);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
      pending: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300',
      on_hold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
    };
    return colors[status] || colors.open;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'text-green-600 dark:text-green-400',
      medium: 'text-blue-600 dark:text-blue-400',
      high: 'text-orange-600 dark:text-orange-400',
      urgent: 'text-red-600 dark:text-red-400',
      critical: 'text-red-700 dark:text-red-300'
    };
    return colors[priority] || colors.medium;
  };

  const getPriorityIcon = (priority: string) => {
    if (priority === 'urgent' || priority === 'critical') {
      return <AlertTriangle className="h-3 w-3" />;
    }
    return null;
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return t('justNow');
    if (diffInHours < 24) return t('hoursAgo', { hours: diffInHours });
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return t('daysAgo', { days: diffInDays });
    
    return created.toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            {t('refresh')}
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('newTicket')}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(statusCounts).map(([status, count]) => (
          <motion.div
            key={status}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card 
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md border-2',
                filterStatus === status 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                  : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700'
              )}
              onClick={() => setFilterStatus(status)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                      {status === 'all' ? t('allTickets') : t(`status.${status}`)}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {count}
                    </p>
                  </div>
                  <div className={cn(
                    'p-2 rounded-lg',
                    status === 'all' && 'bg-gray-100 dark:bg-gray-800',
                    status === 'open' && 'bg-blue-100 dark:bg-blue-900/20',
                    status === 'pending' && 'bg-orange-100 dark:bg-orange-900/20',
                    status === 'on_hold' && 'bg-yellow-100 dark:bg-yellow-900/20',
                    status === 'closed' && 'bg-green-100 dark:bg-green-900/20'
                  )}>
                    {status === 'all' && <List className="h-5 w-5 text-gray-600 dark:text-gray-400" />}
                    {status === 'open' && <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
                    {status === 'pending' && <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />}
                    {status === 'on_hold' && <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />}
                    {status === 'closed' && <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Modern Filters */}
      <ModernTicketFilters
        filters={{
          search: searchQuery,
          status: filterStatus === 'all' ? [] : [filterStatus],
          priority: [],
          assignee: [],
          customer: [],
          channel: [],
          team: [],
          dateRange: { from: null, to: null },
          tags: [],
          special: []
        }}
        onFiltersChange={(newFilters) => {
          setSearchQuery(newFilters.search);
          setFilterStatus(newFilters.status.length > 0 ? newFilters.status[0] : 'all');
        }}
        onClearFilters={() => {
          setSearchQuery('');
          setFilterStatus('all');
        }}
      />

      {/* Controls */}
      <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4">
              {/* Sort Controls */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created">{t('sortBy.created')}</SelectItem>
                  <SelectItem value="updated">{t('sortBy.updated')}</SelectItem>
                  <SelectItem value="priority">{t('sortBy.priority')}</SelectItem>
                  <SelectItem value="status">{t('sortBy.status')}</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 px-3"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 px-3"
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Download className="h-4 w-4 mr-2" />
                    {t('export')}
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {t('refresh')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              {t('ticketsList')}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedTickets.length === mockTickets.length}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-gray-500">
                {selectedTickets.length > 0 
                  ? t('selectedCount', { count: selectedTickets.length })
                  : t('selectAll')
                }
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === 'list' ? (
            <div className="space-y-0">
              {mockTickets.map((ticket, index) => (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    'flex items-center p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors cursor-pointer',
                    selectedTickets.includes(ticket.id) && 'bg-blue-50 dark:bg-blue-950/20'
                  )}
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <div className="flex items-center space-x-4 flex-1">
                    <Checkbox
                      checked={selectedTickets.includes(ticket.id)}
                      onCheckedChange={(checked) => handleSelectTicket(ticket.id, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      {/* Ticket ID */}
                      <div className="flex-shrink-0">
                        <Badge variant="outline" className="font-mono text-xs">
                          {ticket.id}
                        </Badge>
                      </div>

                      {/* Customer Avatar */}
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={ticket.customer.avatar} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {ticket.customer.firstName[0]}{ticket.customer.lastName[0]}
                        </AvatarFallback>
                      </Avatar>

                      {/* Ticket Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {ticket.subject}
                          </h3>
                          <div className="flex items-center space-x-1">
                            {getPriorityIcon(ticket.priority)}
                            <span className={cn('text-xs font-medium', getPriorityColor(ticket.priority))}>
                              {t(`priority.${ticket.priority}`)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span className="truncate">
                              {ticket.customer.firstName} {ticket.customer.lastName}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Building className="h-3 w-3" />
                            <span className="truncate">{ticket.customer.company}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{getTimeAgo(ticket.createdAt)}</span>
                          </div>
                          {ticket._count.conversations > 0 && (
                            <div className="flex items-center space-x-1">
                              <MessageSquare className="h-3 w-3" />
                              <span>{ticket._count.conversations}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status & Assignment */}
                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <Badge className={getStatusColor(ticket.status)}>
                          {t(`status.${ticket.status}`)}
                        </Badge>
                        
                        {ticket.assignedAgent ? (
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={ticket.assignedAgent.avatar} />
                              <AvatarFallback className="text-xs">
                                {ticket.assignedAgent.firstName[0]}{ticket.assignedAgent.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {ticket.assignedAgent.firstName}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {t('unassigned')}
                          </Badge>
                        )}

                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mockTickets.map((ticket, index) => (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    selected={selectedTickets.includes(ticket.id)}
                    onSelect={(selected) => handleSelectTicket(ticket.id, selected)}
                    onClick={() => setSelectedTicketId(ticket.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedTickets.length > 0 && (
          <BulkActionsBar
            selectedCount={selectedTickets.length}
            onAction={handleBulkAction}
            onClear={() => setSelectedTickets([])}
          />
        )}
      </AnimatePresence>

      {/* Dialogs */}
      <CreateTicketDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          handleRefresh();
        }}
      />

      {selectedTicketId && (
        <TicketDetailsDialog
          ticketId={selectedTicketId}
          open={!!selectedTicketId}
          onOpenChange={(open) => !open && setSelectedTicketId(null)}
        />
      )}
    </div>
  );
}