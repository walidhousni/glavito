'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  FaPlus, 
  FaTimes, 
  FaSpinner, 
  FaCommentAlt, 
  FaEnvelope, 
  FaPhone, 
  FaUsers 
} from 'react-icons/fa';
import { Separator } from '@/components/ui/separator';
import { satisfactionApi } from '@/lib/api/satisfaction-client';
import { crmApi } from '@/lib/api/crm-client';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  question: string;
  type: 'rating' | 'text' | 'choice';
  required?: boolean;
  options?: string[];
}

interface CreateSurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  segmentId?: string;
  customerIds?: string[];
}

export function CreateSurveyDialog({ open, onOpenChange, onSuccess, segmentId: initialSegmentId, customerIds }: CreateSurveyDialogProps) {
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [surveyType, setSurveyType] = useState<'post_resolution' | 'periodic' | 'manual'>('manual');
  const [channel, setChannel] = useState<'email' | 'whatsapp'>('whatsapp');
  const [selectedSegmentId, setSelectedSegmentId] = useState<string>(initialSegmentId || '');
  const [segments, setSegments] = useState<Array<{ id: string; name: string; description?: string; customerCount?: number }>>([]);
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([
    { id: '1', question: 'How satisfied are you with our service?', type: 'rating', required: true },
    { id: '2', question: 'Any additional comments?', type: 'text', required: false },
  ]);
  const [newQuestion, setNewQuestion] = useState<{ question: string; type: 'rating' | 'text' | 'choice'; required: boolean; options: string[] }>({ 
    question: '', 
    type: 'rating', 
    required: false, 
    options: [] 
  });
  const [optionInput, setOptionInput] = useState('');

  // Load segments when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingSegments(true);
      crmApi.listSegments()
        .then((list) => {
          setSegments(list || []);
          if (initialSegmentId) {
            setSelectedSegmentId(initialSegmentId);
          }
        })
        .catch((error: unknown) => {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load segments';
          console.error('Failed to load segments:', errorMessage);
          toast({
            title: 'Warning',
            description: 'Could not load segments. You can still create the survey.',
            variant: 'default',
          });
        })
        .finally(() => {
          setLoadingSegments(false);
        });
    }
  }, [open, initialSegmentId, toast]);

  const addQuestion = () => {
    if (!newQuestion.question.trim()) return;
    const question: Question = {
      id: Date.now().toString(),
      question: newQuestion.question,
      type: newQuestion.type,
      required: newQuestion.required,
      options: newQuestion.type === 'choice' ? [...newQuestion.options] : undefined,
    };
    setQuestions([...questions, question]);
    setNewQuestion({ question: '', type: 'rating', required: false, options: [] });
    setOptionInput('');
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const addOption = () => {
    if (!optionInput.trim()) return;
    setNewQuestion({ ...newQuestion, options: [...newQuestion.options, optionInput.trim()] });
    setOptionInput('');
  };

  const removeOption = (index: number) => {
    setNewQuestion({ ...newQuestion, options: newQuestion.options.filter((_, i) => i !== index) });
  };

  const handleCreate = async () => {
    if (questions.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one question',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const customQuestions = questions.map(q => ({
        id: q.id,
        question: q.question,
        type: q.type,
        required: q.required,
        options: q.options || [],
      }));

      const targetSegmentId = selectedSegmentId || initialSegmentId;
      
      if ((targetSegmentId && targetSegmentId.trim()) || customerIds?.length) {
        // Send to segment or specific customers
        if (targetSegmentId && targetSegmentId.trim()) {
          // Send to segment
          const result = await satisfactionApi.sendSurveyToSegment({
            segmentId: targetSegmentId,
            channel,
            surveyType,
            customQuestions,
          });
          
          toast({
            title: 'Success',
            description: `Survey sent to ${result.successful} customer(s)${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
          });
        } else if (customerIds?.length) {
          // Send to specific customers
          const sendPromises = customerIds.map(customerId =>
            channel === 'whatsapp'
              ? satisfactionApi.sendWhatsAppSurvey({
                  customerId,
                  surveyType,
                  customQuestions,
                })
              : satisfactionApi.sendEmailSurvey({
                  customerId,
                  surveyType,
                  customQuestions,
                })
          );

          await Promise.all(sendPromises);
          
          toast({
            title: 'Success',
            description: `Survey sent to ${customerIds.length} customer(s)`,
          });
        }
      } else {
        // No segment or customers selected - just save the survey configuration
        toast({
          title: 'Info',
          description: 'Survey configuration saved. Select a segment or customers to send it.',
          variant: 'default',
        });
        // Still call onSuccess to refresh the list
        onSuccess?.();
        onOpenChange(false);
        return;
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create survey';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 bg-background border-0 shadow-xl rounded-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50">
              <FaCommentAlt className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">Create Survey</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Create a customer satisfaction survey to send via {channel === 'whatsapp' ? 'WhatsApp' : 'Email'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 flex-1 overflow-y-auto">
          <div className="space-y-6">
            {/* Survey Type & Channel */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Survey Type</Label>
                <Select value={surveyType} onValueChange={(v) => {
                  const newType = v as 'post_resolution' | 'periodic' | 'manual';
                  setSurveyType(newType);
                }}>
                  <SelectTrigger className="h-9 border-0 shadow-sm text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual" className="text-xs">Manual</SelectItem>
                    <SelectItem value="post_resolution" className="text-xs">Post Resolution</SelectItem>
                    <SelectItem value="periodic" className="text-xs">Periodic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Channel</Label>
                <Select value={channel} onValueChange={(v) => {
                  const newChannel = v as 'email' | 'whatsapp';
                  setChannel(newChannel);
                }}>
                  <SelectTrigger className="h-9 border-0 shadow-sm text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp" className="text-xs">
                      <div className="flex items-center gap-2">
                        <FaPhone className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        WhatsApp
                      </div>
                    </SelectItem>
                    <SelectItem value="email" className="text-xs">
                      <div className="flex items-center gap-2">
                        <FaEnvelope className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        Email
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Segment Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Send to Segment (Optional)</Label>
              <Select 
                value={selectedSegmentId} 
                onValueChange={setSelectedSegmentId}
                disabled={loadingSegments}
              >
                <SelectTrigger className="h-9 border-0 shadow-sm text-xs">
                  <SelectValue placeholder={loadingSegments ? "Loading segments..." : "Select a segment or leave empty"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None" className="text-xs">None (Save survey only)</SelectItem>
                  {segments.map((segment) => (
                    <SelectItem key={segment.id} value={segment.id} className="text-xs">
                      <div className="flex items-center gap-2">
                        <FaUsers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>{segment.name}</span>
                        {segment.customerCount !== undefined && (
                          <Badge variant="secondary" className="ml-auto text-[10px] h-4 px-1.5">
                            {segment.customerCount} customers
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSegmentId && (
                <p className="text-xs text-muted-foreground">
                  Survey will be sent to all customers in this segment
                </p>
              )}
              {!selectedSegmentId && !customerIds?.length && (
                <p className="text-xs text-muted-foreground">
                  Select a segment to send the survey immediately, or leave empty to save it for later
                </p>
              )}
            </div>

            <Separator className="bg-border/50" />

            {/* Questions List */}
            <div className="space-y-4">
              <Label className="text-xs font-semibold">Questions</Label>
              <div className="space-y-3">
                {questions.map((q) => (
                  <div key={q.id} className="p-3 border-0 shadow-sm rounded-lg space-y-2 bg-muted/30">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-0 shadow-sm">{q.type}</Badge>
                          {q.required && <Badge variant="destructive" className="text-[10px] h-4 px-1.5 border-0 shadow-sm">Required</Badge>}
                        </div>
                        <p className="text-xs font-medium text-foreground">{q.question}</p>
                        {q.options && q.options.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {q.options.map((opt, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[10px] h-4 px-1.5 border-0 shadow-sm">{opt}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(q.id)}
                        className="h-7 w-7"
                      >
                        <FaTimes className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Question */}
            <div className="space-y-4 p-4 border-2 border-dashed rounded-lg border-border/50">
              <Label className="text-xs font-semibold">Add New Question</Label>
              
              <div className="space-y-3">
                <Textarea
                  placeholder="Enter question text..."
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                  rows={2}
                  className="border-0 shadow-sm resize-none text-xs"
                />

                <div className="grid grid-cols-2 gap-3">
                  <Select
                    value={newQuestion.type}
                    onValueChange={(v) => {
                      const newType = v as 'rating' | 'text' | 'choice';
                      setNewQuestion({ 
                        ...newQuestion, 
                        type: newType, 
                        options: newType === 'choice' ? [] : [] 
                      });
                    }}
                  >
                    <SelectTrigger className="h-9 border-0 shadow-sm text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rating" className="text-xs">Rating (1-5)</SelectItem>
                      <SelectItem value="text" className="text-xs">Text</SelectItem>
                      <SelectItem value="choice" className="text-xs">Multiple Choice</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <input
                      type="checkbox"
                      id="required"
                      checked={newQuestion.required}
                      onChange={(e) => setNewQuestion({ ...newQuestion, required: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="required" className="text-xs">Required</Label>
                  </div>
                </div>

                {newQuestion.type === 'choice' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Options</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add option..."
                        value={optionInput}
                        onChange={(e) => setOptionInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addOption();
                          }
                        }}
                        className="h-9 border-0 shadow-sm text-xs"
                      />
                      <Button type="button" variant="outline" onClick={addOption} size="icon" className="h-9 w-9 border-0 shadow-sm">
                        <FaPlus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {newQuestion.options.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {newQuestion.options.map((opt, idx) => (
                          <Badge key={idx} variant="secondary" className="flex items-center gap-1 text-[10px] h-5 px-2 border-0 shadow-sm">
                            {opt}
                            <button
                              type="button"
                              onClick={() => removeOption(idx)}
                              className="ml-1 hover:text-red-600"
                            >
                              <FaTimes className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <Button type="button" onClick={addQuestion} variant="outline" className="w-full h-9 text-xs border-0 shadow-sm">
                  <FaPlus className="h-3.5 w-3.5 mr-2" />
                  Add Question
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-0 border-t border-border/50">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="h-9 text-xs border-0 shadow-sm">
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || questions.length === 0} className="h-9 text-xs bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 border-0 shadow-sm">
            {loading ? (
              <>
                <FaSpinner className="h-3.5 w-3.5 mr-2 animate-spin" />
                {(selectedSegmentId && selectedSegmentId.trim()) || customerIds?.length ? 'Sending...' : 'Saving...'}
              </>
            ) : (
              <>
                <FaCommentAlt className="h-3.5 w-3.5 mr-2" />
                {(selectedSegmentId && selectedSegmentId.trim()) || customerIds?.length ? 'Create & Send Survey' : 'Save Survey'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

