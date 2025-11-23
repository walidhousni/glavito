'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Star, Loader2, AlertTriangle } from 'lucide-react'
import { defaultTheme } from '@/lib/design-tokens'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
// Inline simple radio-group usage to avoid missing component import
import { Label } from '@/components/ui/label'
import { NextIntlClientProvider, useTranslations } from 'next-intl'
import enMsgs from '../../../../messages/en.json'
import frMsgs from '../../../../messages/fr.json'
import arMsgs from '../../../../messages/ar.json'

interface SurveyQuestionBase {
  id: string
  text: string
  type: 'rating' | 'text' | 'choice'
}

interface SurveyQuestionChoice extends SurveyQuestionBase {
  type: 'choice'
  options?: string[]
}

type SurveyQuestion = SurveyQuestionBase | SurveyQuestionChoice

interface SurveyDetails {
  surveyId: string
  surveyType?: string
  questions: SurveyQuestion[]
  customer?: { firstName?: string | null; lastName?: string | null }
  ticket?: { id: string; subject?: string | null }
}

// Public survey translation keys are accessed via useTranslations('publicSurvey')

// Using inline access; no explicit RootMessages type needed

function SurveyContent({ surveyId, tenantId, isRTL }: { surveyId: string; tenantId?: string; isRTL: boolean }) {
  const t = useTranslations('publicSurvey')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [details, setDetails] = useState<SurveyDetails | null>(null)

  const [rating, setRating] = useState<number>(0)
  const [comment, setComment] = useState<string>('')
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const fullName = useMemo(() => {
    const fn = details?.customer?.firstName || ''
    const ln = details?.customer?.lastName || ''
    const name = `${fn} ${ln}`.trim()
    return name || 'there'
  }, [details])

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/satisfaction/surveys/${encodeURIComponent(surveyId)}`, { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || data?.error) {
        setError(data?.error || t('error'))
        setDetails(null)
        return
      }
      setDetails(data as SurveyDetails)
      const overall = (data?.questions || []).find((q: SurveyQuestion) => q.type === 'rating')
      if (overall) setRating(0)
    } catch {
      setError(t('error'))
      setDetails(null)
    } finally {
      setLoading(false)
    }
  }, [surveyId, t])

  useEffect(() => { void load() }, [load])

  const handleSetAnswer = (qid: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qid]: value }))
  }

  const handleSubmit = async () => {
    if (!details?.surveyId) return
    try {
      setSubmitting(true)
      setError(null)
      const body: { rating: number; comment?: string; customAnswers?: Record<string, unknown> } = {
        rating: Math.max(1, Math.min(5, Number(rating || 5))),
      }
      if (comment?.trim()) body.comment = comment.trim()
      if (Object.keys(answers).length) body.customAnswers = answers
      const res = await fetch(`/satisfaction/surveys/${encodeURIComponent(details.surveyId)}/response${tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : ''}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j?.message || 'Submission failed')
      }
      setSubmitted(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t('loading')}</span>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <Card className="max-w-xl w-full">
          <CardHeader className="text-center">
            <CheckCircle className="h-10 w-10 text-green-600 mx-auto" />
            <CardTitle className="mt-2">{t('thanks')}</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-muted-foreground">
            <p>{t('recorded')}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className={`flex items-center gap-2 text-red-600 mb-4 ${isRTL ? 'justify-end' : ''}`}>
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          ) : null}

          {details ? (
            <div className="space-y-6">
              <div>
                <p className={`text-sm text-muted-foreground ${isRTL ? 'text-right' : ''}`}>
                  {t('intro')
                    .replace('{name}', fullName)
                    .replace('{subject}', details.ticket?.subject ? t('subjectSuffix').replace('{subject}', details.ticket.subject || '') : '')}
                </p>
              </div>

              {/* Overall Rating */}
              <div className="space-y-2">
                <Label className={`text-sm ${isRTL ? 'text-right w-full inline-block' : ''}`}>{t('overall')}</Label>
                <div className="flex gap-2" role="radiogroup" aria-label="Overall satisfaction">
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      aria-pressed={rating === n}
                      className={`p-2 rounded-md border transition-colors ${rating >= n ? 'bg-yellow-100 border-yellow-300' : 'bg-background border-input hover:bg-muted'}`}
                    >
                      <Star className={`h-6 w-6 ${rating >= n ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional comment */}
              <div className="space-y-2">
                <Label htmlFor="comment" className={isRTL ? 'text-right w-full inline-block' : ''}>{t('commentLabel')}</Label>
                <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell us a bit more…" dir={isRTL ? 'rtl' : 'ltr'} />
              </div>

              {/* Dynamic Questions */}
              {details.questions?.length ? (
                <div className="space-y-4">
                  {details.questions.map((q) => (
                    <div key={q.id} className="space-y-2">
                      <Label className="text-sm">{q.text}</Label>
                      {q.type === 'text' ? (
                        <Textarea value={answers[q.id] || ''} onChange={(e) => handleSetAnswer(q.id, e.target.value)} dir={isRTL ? 'rtl' : 'ltr'} />
                      ) : q.type === 'choice' ? (
                        <div role="radiogroup" aria-label={q.text} className="space-y-2">
                          {(q as SurveyQuestionChoice).options?.map((opt) => {
                            const checked = (answers[q.id] || '') === opt
                            return (
                              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={q.id}
                                  value={opt}
                                  checked={checked}
                                  onChange={() => handleSetAnswer(q.id, opt)}
                                  className="h-4 w-4"
                                />
                                <span>{opt}</span>
                              </label>
                            )
                          })}
                        </div>
                      ) : q.type === 'rating' ? (
                        <div className="flex gap-2" role="radiogroup" aria-label={q.text}>
                          {[1,2,3,4,5].map((n) => (
                            <button
                              key={n}
                              onClick={() => handleSetAnswer(q.id, String(n))}
                              aria-pressed={(answers[q.id] || '') === String(n)}
                              className={`p-2 rounded-md border transition-colors ${(answers[q.id] || '') >= String(n) ? 'bg-yellow-100 border-yellow-300' : 'bg-background border-input hover:bg-muted'}`}
                            >
                              <Star className={`h-5 w-5 ${(answers[q.id] || '') >= String(n) ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="pt-2 flex justify-end">
                <Button onClick={handleSubmit} disabled={submitting || rating === 0} style={{ background: ((details as unknown as { brandingConfig?: { colors?: { primary?: string } } , branding?: { colors?: { primary?: string } }, metadata?: { brandingConfig?: { colors?: { primary?: string } } } })?.brandingConfig?.colors?.primary) || ((details as unknown as { branding?: { colors?: { primary?: string } } })?.branding?.colors?.primary) || ((details as unknown as { metadata?: { brandingConfig?: { colors?: { primary?: string } } } })?.metadata?.brandingConfig?.colors?.primary) || defaultTheme.colors.primary, color: '#fff' }}>
                  {submitting ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> {t('submitting')}</span>
                  ) : t('submit')}
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SurveyPage({ params }: { params: { surveyId: string } }) {
  const searchParams = useSearchParams()
  const tenantId = searchParams.get('tenant') || undefined
  const lang = (searchParams.get('lang') || 'en').toLowerCase()
  type SupportedLang = 'en' | 'fr' | 'ar'
  const selectedLang: SupportedLang = (['en', 'fr', 'ar'] as const).includes(lang as SupportedLang) ? (lang as SupportedLang) : 'en'
  const bundles = { en: enMsgs, fr: frMsgs, ar: arMsgs } as const
  const messages = bundles[selectedLang] as unknown as Record<string, unknown>
  const isRTL = selectedLang === 'ar'

  return (
    <NextIntlClientProvider locale={selectedLang} messages={messages}>
      <SurveyContent surveyId={params.surveyId} tenantId={tenantId} isRTL={isRTL} />
    </NextIntlClientProvider>
  )
}


