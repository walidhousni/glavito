'use client';

import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { cn } from '@/lib/utils';

interface NodeType {
  type: string;
  label: string;
  description: string;
  category: string;
  iconUrl: string;
  tags: string[];
}

const nodeTypes: NodeType[] = [
  // Triggers
  { type: 'start', label: 'Start', description: 'Start the workflow', category: 'Triggers', iconUrl: 'https://img.icons8.com/?id=82749&format=png&size=96', tags: ['trigger'] },
  { type: 'webhook', label: 'Webhook', description: 'Trigger via HTTP request', category: 'Triggers', iconUrl: 'https://img.icons8.com/?id=60671&format=png&size=96', tags: ['trigger', 'api'] },
  { type: 'schedule', label: 'Schedule', description: 'Run on a schedule', category: 'Triggers', iconUrl: 'https://img.icons8.com/?id=85037&format=png&size=96', tags: ['trigger', 'time'] },
  
  // Messages
  { type: 'send_message', label: 'Send message', description: 'Send a message via the selected channel', category: 'Action', iconUrl: 'https://img.icons8.com/?id=YZPI5ITFKVFg&format=png&size=96', tags: ['messaging', 'conversation'] },
  { type: 'send_media', label: 'Send media', description: 'Send a media files via the selected channel', category: 'Action', iconUrl: 'https://img.icons8.com/?id=53435&format=png&size=96', tags: ['messaging', 'conversation'] },
  { type: 'template_message', label: 'Template Message', description: 'Send pre-defined template', category: 'Action', iconUrl: 'https://img.icons8.com/?id=111374&format=png&size=96', tags: ['messaging'] },
  { type: 'send_email', label: 'Send Email', description: 'Email notification', category: 'Action', iconUrl: 'https://img.icons8.com/?id=86171&format=png&size=96', tags: ['messaging', 'email'] },
  { type: 'send_whatsapp', label: 'WhatsApp', description: 'Send WhatsApp message', category: 'Action', iconUrl: 'https://img.icons8.com/?id=16713&format=png&size=96', tags: ['messaging'] },
  { type: 'send_instagram', label: 'Instagram', description: 'Send Instagram DM', category: 'Action', iconUrl: 'https://img.icons8.com/?id=32323&format=png&size=96', tags: ['messaging'] },
  
  // Conversation
  { type: 'add_internal_note', label: 'Add internal note', description: 'Add an internal note to a contact that is visible only to your internal team members', category: 'Action', iconUrl: 'https://img.icons8.com/?id=102479&format=png&size=96', tags: ['conversation'] },
  { type: 'add_label', label: 'Add label', description: 'Add one or multiple labels to a contact', category: 'Action', iconUrl: 'https://img.icons8.com/?id=85116&format=png&size=96', tags: ['contact'] },
  { type: 'remove_label', label: 'Remove label', description: 'Remove one or multiple labels from a contact', category: 'Action', iconUrl: 'https://img.icons8.com/?id=11997&format=png&size=96', tags: ['contact'] },
  { type: 'add_to_list', label: 'Add to list', description: 'Add a contact into one or multiple contact lists', category: 'Action', iconUrl: 'https://img.icons8.com/?id=82778&format=png&size=96', tags: ['contact'] },
  { type: 'remove_from_list', label: 'Remove from list', description: 'Remove a contact from one or multiple contact lists', category: 'Action', iconUrl: 'https://img.icons8.com/?id=102627&format=png&size=96', tags: ['contact'] },
  { type: 'update_contact', label: 'Update contact', description: 'Update one or more contact properties of a contact', category: 'Action', iconUrl: 'https://img.icons8.com/?id=82751&format=png&size=96', tags: ['contact'] },
  
  // Tickets
  { type: 'ticket_create', label: 'Create Ticket', description: 'Create new support ticket', category: 'Action', iconUrl: 'https://img.icons8.com/?id=103187&format=png&size=96', tags: ['ticket'] },
  { type: 'ticket_update', label: 'Update Ticket', description: 'Modify ticket details', category: 'Action', iconUrl: 'https://img.icons8.com/?id=82751&format=png&size=96', tags: ['ticket'] },
  { type: 'ticket_assign', label: 'Assign Ticket', description: 'Assign to agent/team', category: 'Action', iconUrl: 'https://img.icons8.com/?id=23454&format=png&size=96', tags: ['ticket'] },
  { type: 'ticket_close', label: 'Close Ticket', description: 'Mark as resolved', category: 'Action', iconUrl: 'https://img.icons8.com/?id=98374&format=png&size=96', tags: ['ticket'] },
  
  // Logic
  { type: 'condition', label: 'Condition', description: 'If/else branching', category: 'Condition', iconUrl: 'https://img.icons8.com/?id=86554&format=png&size=96', tags: [] },
  { type: 'switch', label: 'Switch', description: 'Multi-way branching', category: 'Condition', iconUrl: 'https://img.icons8.com/?id=38075&format=png&size=96', tags: [] },
  
  // Time
  { type: 'delay', label: 'Time Delay', description: 'Wait for time period', category: 'Time Delay', iconUrl: 'https://img.icons8.com/?id=85037&format=png&size=96', tags: [] },
  { type: 'wait_for_reply', label: 'Wait For Message Reply', description: 'Wait for customer reply', category: 'Wait For Message Reply', iconUrl: 'https://img.icons8.com/?id=11858&format=png&size=96', tags: ['conversation'] },
  
  // AI
  { type: 'ai_decision', label: 'AI Router', description: 'AI-powered routing', category: 'Action', iconUrl: 'https://img.icons8.com/?id=93407&format=png&size=96', tags: ['ai'] },
  { type: 'ai_analysis', label: 'AI Analysis', description: 'Analyze with AI', category: 'Action', iconUrl: 'https://img.icons8.com/?id=lTAEpm1VusIn&format=png&size=96', tags: ['ai'] },
  { type: 'sentiment_analysis', label: 'Sentiment', description: 'Detect sentiment', category: 'Action', iconUrl: 'https://img.icons8.com/?id=103133&format=png&size=96', tags: ['ai'] },
  
  // Customer
  { type: 'segment_check', label: 'Segment Check', description: 'Check customer segment', category: 'Action', iconUrl: 'https://img.icons8.com/?id=23267&format=png&size=96', tags: ['customer'] },
  { type: 'journey_tracker', label: 'Journey Stage', description: 'Track journey', category: 'Action', iconUrl: 'https://img.icons8.com/?id=63772&format=png&size=96', tags: ['customer'] },
  
  // Integrations
  { type: 'http_request', label: 'HTTP Request', description: 'Make API call', category: 'Action', iconUrl: 'https://img.icons8.com/?id=85038&format=png&size=96', tags: ['integration'] },
  { type: 'api_call', label: 'API Call', description: 'External API', category: 'Action', iconUrl: 'https://img.icons8.com/?id=85038&format=png&size=96', tags: ['integration'] },
  
  // End
  { type: 'end', label: 'End', description: 'End the workflow', category: 'Action', iconUrl: 'https://img.icons8.com/?id=82780&format=png&size=96', tags: [] },
];

const categories = [
  'All',
  'Action',
  'Condition',
  'Wait For Message Reply',
  'Time Delay',
];

interface NodeSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectNode: (nodeType: string) => void;
}

export function NodeSelectionDialog({ open, onOpenChange, onSelectNode }: NodeSelectionDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredNodes = useMemo(() => {
    return nodeTypes.filter(node => {
      const matchesSearch = !searchQuery || 
        node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = selectedCategory === 'All' || node.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  const handleSelectNode = (nodeType: string) => {
    onSelectNode(nodeType);
    onOpenChange(false);
    setSearchQuery('');
    setSelectedCategory('All');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden bg-background border-0 shadow-xl rounded-xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogTitle className="text-xl font-semibold text-foreground">Select a node</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-[calc(90vh-80px)] overflow-hidden">
          {/* Search and Filters */}
          <div className="px-6 py-4 space-y-4 border-b border-border/50 bg-muted/30">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by keyword"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-10 border-0 shadow-sm bg-background focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
                  onClick={() => setSearchQuery('')}
                >
                  <FaTimes className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
            
            {/* Category Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "rounded-full text-xs h-8 px-4 border-0 shadow-sm transition-all",
                    selectedCategory === category 
                      ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white" 
                      : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  {category}
                </Button>
              ))}
              {selectedCategory !== 'All' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategory('All')}
                  className="rounded-full text-xs h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>
          
          {/* Nodes Grid - Scrollable */}
          <ScrollArea className="flex-1 px-6 py-4">
            <div className="pr-4">
              {filteredNodes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
                  {filteredNodes.map(node => (
                    <Card
                      key={node.type}
                      className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 group border-0 shadow-sm bg-card"
                      onClick={() => handleSelectNode(node.type)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center border border-blue-100 dark:border-blue-900 group-hover:border-blue-300 dark:group-hover:border-blue-700 transition-colors">
                            <img 
                              src={node.iconUrl} 
                              alt={node.label}
                              className="h-7 w-7 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-foreground mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {node.label}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-2">
                              {node.description}
                            </p>
                            {node.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {node.tags.slice(0, 2).map(tag => (
                                  <Badge 
                                    key={tag} 
                                    variant="secondary" 
                                    className="text-[10px] px-2 py-0.5 h-5 bg-muted text-muted-foreground border-0"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center mb-4">
                    <FaSearch className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-base mb-2 text-foreground">No nodes found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Try adjusting your search terms or category filters
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

