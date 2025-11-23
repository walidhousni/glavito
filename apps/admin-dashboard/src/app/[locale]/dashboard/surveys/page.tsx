'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SatisfactionSurvey } from '@/lib/api/satisfaction-client';
import { useToast } from '@/hooks/use-toast';
import { CreateSurveyDialog } from '@/components/surveys/create-survey-dialog';
import { 
  FaCommentAlt, 
  FaPlus, 
  FaSync,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaChartLine,
  FaEye,
  FaStar
} from 'react-icons/fa';
import { useRouter } from '@/i18n.config';
import { cn } from '@/lib/utils';

export default function SurveysPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [surveys, setSurveys] = useState<SatisfactionSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);

  const loadSurveys = async () => {
    setLoading(true);
    try {
      // Since we don't have a list endpoint, we'll show a message
      // In a real implementation, you'd fetch from an endpoint like GET /satisfaction/surveys
      setSurveys([]);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load surveys';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSurveys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp':
        return <FaPhone className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'email':
        return <FaEnvelope className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <FaCommentAlt className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'responded':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'sent':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'delivered':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'expired':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50">
              <FaCommentAlt className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Surveys</h1>
          </div>
          <p className="text-sm text-muted-foreground">Create and manage customer satisfaction surveys</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSurveys} disabled={loading} className="h-9 text-xs border-0 shadow-sm">
            <FaSync className={`h-3.5 w-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setOpenCreateDialog(true)} className="h-9 text-xs bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 border-0 shadow-sm">
            <FaPlus className="h-3.5 w-3.5 mr-2" />
            Create Survey
          </Button>
          <Button variant="outline" onClick={() => router.push('/dashboard/surveys/analytics')} className="h-9 text-xs border-0 shadow-sm">
            <FaChartLine className="h-3.5 w-3.5 mr-2" />
            View Analytics
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Total Surveys</p>
                <p className="text-xl font-semibold text-foreground">{surveys.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
                <FaCommentAlt className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Responded</p>
                <p className="text-xl font-semibold text-foreground">
                  {surveys.filter(s => s.status === 'responded').length}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/50">
                <FaEye className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Average Rating</p>
                <p className="text-xl font-semibold text-foreground">
                  {surveys.length > 0
                    ? (surveys.reduce((sum, s) => sum + (s.rating || 0), 0) / surveys.filter(s => s.rating).length).toFixed(1)
                    : '0'}
                  <span className="text-xs text-muted-foreground">/5</span>
                </p>
              </div>
              <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/50">
                <FaStar className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Response Rate</p>
                <p className="text-xl font-semibold text-foreground">
                  {surveys.length > 0
                    ? ((surveys.filter(s => s.status === 'responded').length / surveys.length) * 100).toFixed(1)
                    : '0'}%
                </p>
              </div>
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50">
                <FaCalendarAlt className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Surveys List */}
      {loading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <FaSync className="h-6 w-6 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading surveys...</p>
          </CardContent>
        </Card>
      ) : surveys.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/50 w-fit mx-auto mb-4">
              <FaCommentAlt className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-base font-semibold mb-2 text-foreground">No surveys yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first survey to start collecting customer feedback
            </p>
            <Button onClick={() => setOpenCreateDialog(true)} className="h-9 text-xs bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 border-0 shadow-sm">
              <FaPlus className="h-3.5 w-3.5 mr-2" />
              Create Survey
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {surveys.map((survey) => (
            <Card key={survey.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50">
                        {getChannelIcon(survey.channel)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">
                          Survey #{survey.id.slice(0, 8)}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {survey.surveyType} • {survey.channel}
                        </p>
                      </div>
                    </div>
                    
                    {survey.rating && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <FaStar
                              key={i}
                              className={`h-3.5 w-3.5 ${
                                survey.rating && i < survey.rating
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs font-medium text-foreground">{survey.rating}/5</span>
                      </div>
                    )}
                    
                    {survey.comment && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {survey.comment}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={cn("text-[10px] h-5 px-2 border-0 shadow-sm", getStatusColor(survey.status))}>
                      {survey.status}
                    </Badge>
                    {survey.respondedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(survey.respondedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Survey Dialog */}
      <CreateSurveyDialog
        open={openCreateDialog}
        onOpenChange={setOpenCreateDialog}
        onSuccess={() => {
          loadSurveys();
          toast({
            title: 'Success',
            description: 'Survey created successfully',
          });
        }}
        segmentId={undefined}
      />
    </div>
  );
}

