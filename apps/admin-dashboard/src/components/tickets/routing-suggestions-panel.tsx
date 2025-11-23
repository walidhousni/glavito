'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Brain,
  User,
  Users,
  Zap,
  TrendingUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Languages,
  Target,
  BarChart3,
} from 'lucide-react';
import { ticketsApi } from '@/lib/api/tickets-client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RoutingSuggestion {
  agentId: string;
  score: number;
  agent: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    avatar: string | null;
    skills: string[];
    languages: string[];
  } | null;
  reasoning: {
    capacityScore: number;
    skillMatch: number;
    languageMatch: number;
    teamAlign: number;
    performanceScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    currentLoad: number;
    maxCapacity: number;
    languageMatchDetails?: string;
    teamMatchDetails?: string;
  };
}

interface RoutingSuggestionsPanelProps {
  ticketId: string;
  onAssign?: (agentId: string) => Promise<void>;
  onAutoAssign?: () => Promise<void>;
  limit?: number;
  showAutoAssignButton?: boolean;
}

export function RoutingSuggestionsPanel({
  ticketId,
  onAssign,
  onAutoAssign,
  limit = 5,
  showAutoAssignButton = true,
}: RoutingSuggestionsPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<RoutingSuggestion[]>([]);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSuggestions();
  }, [ticketId, limit]);

  async function loadSuggestions() {
    try {
      setLoading(true);
      setError(null);
      const data = await ticketsApi.getRoutingSuggestions(ticketId, limit);
      setSuggestions(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load routing suggestions';
      setError(errorMessage);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAssign(agentId: string) {
    if (!onAssign) return;
    try {
      setAssigning(agentId);
      await onAssign(agentId);
      toast({
        title: 'Ticket assigned',
        description: 'The ticket has been assigned successfully',
      });
    } catch (err) {
      toast({
        title: 'Assignment failed',
        description: err instanceof Error ? err.message : 'Failed to assign ticket',
        variant: 'destructive',
      });
    } finally {
      setAssigning(null);
    }
  }

  async function handleAutoAssign() {
    if (!onAutoAssign) return;
    try {
      setAutoAssigning(true);
      await onAutoAssign();
      toast({
        title: 'Ticket auto-assigned',
        description: 'The ticket has been assigned to the best agent',
      });
      await loadSuggestions();
    } catch (err) {
      toast({
        title: 'Auto-assignment failed',
        description: err instanceof Error ? err.message : 'Failed to auto-assign ticket',
        variant: 'destructive',
      });
    } finally {
      setAutoAssigning(false);
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400';
    if (score >= 0.6) return 'text-blue-600 dark:text-blue-400';
    if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'outline' => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Smart Routing Suggestions
          </CardTitle>
          <CardDescription>Analyzing ticket to find the best agents...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-16 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Smart Routing Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Smart Routing Suggestions
          </CardTitle>
          <CardDescription>No eligible agents found for routing</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No agents with auto-assignment enabled are available. Please assign manually or enable auto-assignment for agents.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              Smart Routing Suggestions
            </CardTitle>
            <CardDescription>
              AI-powered agent recommendations based on skills, capacity, and language
            </CardDescription>
          </div>
          {showAutoAssignButton && onAutoAssign && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoAssign}
              disabled={autoAssigning}
            >
              {autoAssigning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Auto-Assign
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.map((suggestion, index) => {
          if (!suggestion.agent) return null;

          const agent = suggestion.agent;
          const reasoning = suggestion.reasoning;
          const score = suggestion.score;
          const agentName = `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || agent.email;

          return (
            <div
              key={suggestion.agentId}
              className={cn(
                'rounded-lg border p-4 transition-all hover:shadow-md',
                index === 0 && 'border-primary bg-primary/5',
                index === 0 && score >= 0.8 && 'border-green-500 bg-green-50 dark:bg-green-950/20'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={agent.avatar || undefined} />
                    <AvatarFallback>
                      {agentName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{agentName}</p>
                      {index === 0 && score >= 0.8 && (
                        <Badge variant="default" className="text-xs bg-green-500">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Best Match
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{agent.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className={cn('text-lg font-bold', getScoreColor(score))}>
                      {Math.round(score * 100)}%
                    </div>
                    <div className="text-xs text-muted-foreground">Match Score</div>
                  </div>
                  {onAssign && (
                    <Button
                      size="sm"
                      variant={index === 0 && score >= 0.8 ? 'default' : 'outline'}
                      onClick={() => handleAssign(suggestion.agentId)}
                      disabled={assigning === suggestion.agentId}
                    >
                      {assigning === suggestion.agentId ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Assign'
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Score Breakdown */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Overall Match</span>
                  <span className="font-medium">{Math.round(score * 100)}%</span>
                </div>
                <Progress value={score * 100} className="h-2" />
              </div>

              {/* Reasoning Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Capacity */}
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-muted-foreground">Capacity</div>
                    <div className="font-medium">
                      {reasoning.currentLoad}/{reasoning.maxCapacity} tickets
                    </div>
                    <Progress value={reasoning.capacityScore * 100} className="h-1 mt-1" />
                  </div>
                </div>

                {/* Skills Match */}
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-muted-foreground">Skills Match</div>
                    <div className="font-medium">
                      {reasoning.matchedSkills.length}/{reasoning.matchedSkills.length + reasoning.missingSkills.length}
                    </div>
                    <Progress value={reasoning.skillMatch * 100} className="h-1 mt-1" />
                  </div>
                </div>

                {/* Language */}
                {reasoning.languageMatchDetails && (
                  <div className="flex items-center gap-2">
                    <Languages className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-muted-foreground">Language</div>
                      <div className="font-medium flex items-center gap-1">
                        {reasoning.languageMatch > 0.5 ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        {reasoning.languageMatchDetails}
                      </div>
                    </div>
                  </div>
                )}

                {/* Team */}
                {reasoning.teamMatchDetails && (
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-muted-foreground">Team</div>
                      <div className="font-medium flex items-center gap-1">
                        {reasoning.teamAlign > 0.5 ? (
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        ) : (
                          <XCircle className="h-3 w-3 text-red-500" />
                        )}
                        {reasoning.teamMatchDetails}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Skills Display */}
              {reasoning.matchedSkills.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex flex-wrap gap-1">
                    {reasoning.matchedSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1 text-green-500" />
                        {skill}
                      </Badge>
                    ))}
                    {reasoning.missingSkills.length > 0 &&
                      reasoning.missingSkills.slice(0, 2).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs opacity-60">
                          {skill}
                        </Badge>
                      ))}
                    {reasoning.missingSkills.length > 2 && (
                      <Badge variant="outline" className="text-xs opacity-60">
                        +{reasoning.missingSkills.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={loadSuggestions}
          >
            <TrendingUp className="h-3.5 w-3.5 mr-2" />
            Refresh Suggestions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

