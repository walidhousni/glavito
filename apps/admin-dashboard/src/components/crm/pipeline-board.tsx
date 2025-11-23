'use client';

import * as React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { GripVertical, MoreVertical, DollarSign, Calendar, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { DealItem } from '@/lib/api/crm-client';

interface PipelineBoardProps {
  deals: DealItem[];
  stages: Array<{ id: string; name: string; color?: string }>;
  onDealMove?: (dealId: string, newStage: string) => void;
  onDealClick?: (deal: DealItem) => void;
  onDealEdit?: (deal: DealItem) => void;
  onDealDelete?: (dealId: string) => void;
  isLoading?: boolean;
}

interface DealsByStage {
  [stage: string]: DealItem[];
}

function formatCurrency(amount?: number, currency?: string): string {
  if (!amount) return '$0';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStageColor(stage: string): string {
  switch (stage.toUpperCase()) {
    case 'NEW':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'QUALIFIED':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'PROPOSAL':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'NEGOTIATION':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'WON':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'LOST':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function DealCard({
  deal,
  index,
  onDealClick,
  onDealEdit,
  onDealDelete,
}: {
  deal: DealItem;
  index: number;
  onDealClick?: (deal: DealItem) => void;
  onDealEdit?: (deal: DealItem) => void;
  onDealDelete?: (dealId: string) => void;
}) {
  return (
    <Draggable draggableId={deal.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={cn(
            'mb-2 transition-shadow',
            snapshot.isDragging && 'shadow-lg'
          )}
        >
          <Card
            className={cn(
              'cursor-pointer hover:shadow-md transition-shadow',
              snapshot.isDragging && 'rotate-2'
            )}
            onClick={() => onDealClick?.(deal)}
          >
            <CardHeader className="p-3 pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2 flex-1">
                  <div
                    {...provided.dragHandleProps}
                    className="mt-1 cursor-grab active:cursor-grabbing"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm font-semibold line-clamp-2">
                      {deal.title || deal.name || 'Untitled Deal'}
                    </CardTitle>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" className="h-6 w-6 p-0">
                      <span className="sr-only">Open menu</span>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onDealClick?.(deal)}>
                      View details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDealEdit?.(deal)}>
                      Edit deal
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDealDelete?.(deal.id)}
                      className="text-destructive"
                    >
                      Delete deal
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <DollarSign className="h-4 w-4" />
                {formatCurrency(deal.valueAmount, deal.valueCurrency)}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="truncate">Unassigned</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>Today</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}

export function PipelineBoard({
  deals,
  stages,
  onDealMove,
  onDealClick,
  onDealEdit,
  onDealDelete,
  isLoading,
}: PipelineBoardProps) {
  // Group deals by stage
  const dealsByStage = React.useMemo(() => {
    const grouped: DealsByStage = {};
    stages.forEach((stage) => {
      grouped[stage.id] = [];
    });
    deals.forEach((deal) => {
      const stageKey = deal.stage.toUpperCase();
      if (grouped[stageKey]) {
        grouped[stageKey].push(deal);
      }
    });
    return grouped;
  }, [deals, stages]);

  // Calculate stage totals
  const stageTotals = React.useMemo(() => {
    const totals: { [key: string]: { count: number; value: number } } = {};
    stages.forEach((stage) => {
      const stageDeals = dealsByStage[stage.id] || [];
      totals[stage.id] = {
        count: stageDeals.length,
        value: stageDeals.reduce((sum, deal) => sum + (deal.valueAmount || 0), 0),
      };
    });
    return totals;
  }, [dealsByStage, stages]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside the list
    if (!destination) {
      return;
    }

    // No movement
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // Move to different stage
    if (destination.droppableId !== source.droppableId) {
      onDealMove?.(draggableId, destination.droppableId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading pipeline...</div>
      </div>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = dealsByStage[stage.id] || [];
          const total = stageTotals[stage.id];

          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-80"
            >
              <div className="bg-muted/50 rounded-lg p-3 h-full flex flex-col">
                {/* Stage Header */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn('font-semibold', getStageColor(stage.id))}
                      >
                        {stage.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {total.count}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-primary">
                    {formatCurrency(total.value)}
                  </div>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'flex-1 min-h-[200px] rounded-md transition-colors',
                        snapshot.isDraggingOver && 'bg-muted'
                      )}
                    >
                      {stageDeals.length === 0 && !snapshot.isDraggingOver ? (
                        <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                          No deals
                        </div>
                      ) : (
                        stageDeals.map((deal, index) => (
                          <DealCard
                            key={deal.id}
                            deal={deal}
                            index={index}
                            onDealClick={onDealClick}
                            onDealEdit={onDealEdit}
                            onDealDelete={onDealDelete}
                          />
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}

