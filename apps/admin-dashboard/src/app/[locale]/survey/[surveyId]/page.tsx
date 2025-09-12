'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Star, Send, CheckCircle, AlertCircle, MessageSquare, Mail } from 'lucide-react';

interface SurveyData {
  surveyId: string;
  surveyType: string;
  questions: Array<{
    id: string;
    question: string;
    type: 'rating' | 'text' | 'choice';
    required?: boolean;
    options?: string[];
  }>;
  customer?: {
    firstName?: string;
    lastName?: string;
  };
  ticket?: {
    id: string;
    subject?: string;
  };
}

export default function SurveyPage() {
  const params = useParams();
  const surveyId = params?.surveyId as string;
  
  const [survey, setSurvey] = React.useState<SurveyData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, any>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  React.useEffect(() => {
    if (!surveyId) return;

    const loadSurvey = async () => {
      try {
        const response = await fetch(`/api/satisfaction/surveys/${surveyId}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setSurvey(data);
        }
      } catch (err) {
        setError('Failed to load survey');
      } finally {
        setLoading(false);
      }
    };

    loadSurvey();
  }, [surveyId]);

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    if (!survey) return;

    // Validate required questions
    const missingRequired = survey.questions
      .filter(q => q.required && !answers[q.id])
      .map(q => q.question);

    if (missingRequired.length > 0) {
      alert(`Please answer all required questions:\n${missingRequired.join('\n')}`);
      return;
    }

    setSubmitting(true);
    try {
      // Extract overall rating (first rating question)
      const ratingQuestion = survey.questions.find(q => q.type === 'rating');
      const rating = ratingQuestion ? parseInt(answers[ratingQuestion.id]) || 5 : 5;

      // Extract comment (first text question)
      const commentQuestion = survey.questions.find(q => q.type === 'text');
      const comment = commentQuestion ? answers[commentQuestion.id] : '';

      const response = await fetch(`/api/satisfaction/surveys/${surveyId}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          comment,
          customAnswers: answers,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to submit survey');
      }
    } catch (err) {
      setError('Failed to submit survey');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="text-lg font-medium text-slate-700">Loading survey...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-orange-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <div className="text-xl font-semibold text-slate-800 mb-2">Survey Not Available</div>
            <div className="text-slate-600">{error}</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-slate-800 mb-4">Thank You!</div>
            <div className="text-lg text-slate-600 mb-6">
              Your feedback has been submitted successfully. We appreciate you taking the time to help us improve our service.
            </div>
            <div className="flex items-center justify-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Response recorded</span>
              </div>
              <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>Team notified</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!survey) return null;

  const customerName = survey.customer 
    ? `${survey.customer.firstName || ''} ${survey.customer.lastName || ''}`.trim() || 'Valued Customer'
    : 'Valued Customer';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl">
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">Customer Satisfaction Survey</h1>
          <p className="text-slate-600">
            Hi {customerName}! We'd love to hear about your experience with us.
          </p>
          {survey.ticket && (
            <Badge variant="outline" className="mt-3">
              Ticket #{survey.ticket.id.slice(-6)} - {survey.ticket.subject}
            </Badge>
          )}
        </div>

        {/* Survey Form */}
        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl text-center text-slate-700">
              Your feedback helps us improve
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {survey.questions.map((question, index) => (
              <div key={question.id} className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <label className="text-base font-medium text-slate-800 block mb-4">
                      {question.question}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </label>

                    {question.type === 'rating' && (
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <button
                            key={rating}
                            type="button"
                            onClick={() => handleAnswerChange(question.id, rating)}
                            className={`w-12 h-12 rounded-xl border-2 transition-all hover:scale-110 ${
                              answers[question.id] === rating
                                ? 'border-yellow-400 bg-yellow-50'
                                : 'border-slate-200 hover:border-yellow-300'
                            }`}
                          >
                            <Star
                              className={`h-6 w-6 mx-auto ${
                                answers[question.id] >= rating
                                  ? 'text-yellow-400 fill-current'
                                  : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                        <div className="ml-4 text-sm text-slate-500">
                          {answers[question.id] ? (
                            <span className="font-medium">
                              {answers[question.id]} of 5 stars
                            </span>
                          ) : (
                            'Click to rate'
                          )}
                        </div>
                      </div>
                    )}

                    {question.type === 'choice' && question.options && (
                      <div className="space-y-3">
                        {question.options.map((option, optionIndex) => (
                          <button
                            key={optionIndex}
                            type="button"
                            onClick={() => handleAnswerChange(question.id, optionIndex)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:border-blue-300 ${
                              answers[question.id] === optionIndex
                                ? 'border-blue-400 bg-blue-50'
                                : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                answers[question.id] === optionIndex
                                  ? 'border-blue-500 bg-blue-500'
                                  : 'border-slate-300'
                              }`}>
                                {answers[question.id] === optionIndex && (
                                  <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                                )}
                              </div>
                              <span className="text-slate-700">{option}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {question.type === 'text' && (
                      <Textarea
                        value={answers[question.id] || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        placeholder="Share your thoughts..."
                        className="min-h-[100px] border-2 border-slate-200 rounded-xl focus:border-blue-400 focus:ring-blue-400/20"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-6 border-t border-slate-200">
              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                {submitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-3" />
                    Submit Survey
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-500">
          <p>This survey is secure and your responses are confidential.</p>
        </div>
      </div>
    </div>
  );
}