'use client'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { publicKnowledgeApi } from '@/lib/api/public-knowledge-client'
import { publicChatApi } from '@/lib/api/public-chat-client'
import { Button } from '@/components/ui/button'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/toast'
import { Badge } from '@/components/ui/badge'
import { Search, MessageCircle, Mail, Phone, ExternalLink, BookOpen, HelpCircle, Sparkles, ArrowRight, Clock, Users, Star } from 'lucide-react'

export default function PublicHelpCenterPage() {
  const t = useTranslations()
  const params = useSearchParams()
  const { success } = useToast()
  const [q, setQ] = useState('')
  const [data, setData] = useState<{ articles: Array<{ id: string; title: string; snippet: string }>; faqs: Array<{ id: string; question: string; answer: string }> }>({ articles: [], faqs: [] })
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<{ id: string; title: string; content: string } | null>(null)
  const [chatSession, setChatSession] = useState<string | null>(null)
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; ts: number }>>([])
  const [chatSending, setChatSending] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Array<{ id: string; title: string }>>([])
  const [emailOpen, setEmailOpen] = useState(false)
  const [emailAddr, setEmailAddr] = useState('')
  const [emailMsg, setEmailMsg] = useState('')
  const [resumed, setResumed] = useState(false)

  const sanitize = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
  useEffect(() => {
    // Resume via token if present
    const token = params?.get('token') || ''
    if (token) {
      (async () => {
        try {
          const res = await publicChatApi.resume(token)
          if (res?.ok && res.sessionId) {
            setChatSession(res.sessionId)
            if (typeof window !== 'undefined') localStorage.setItem('helpcenter_session', res.sessionId)
            setResumed(true)
            success('Resumed chat session')
          }
        } catch {/* ignore */ }
      })()
    }
    // Restore session and connect SSE
    const sid = (typeof window !== 'undefined') ? (localStorage.getItem('helpcenter_session') || '') : ''
    if (sid) {
      setChatSession(sid)
      const es = publicChatApi.stream(sid)
      if (es) {
        es.onmessage = (ev) => {
          try {
            const data = JSON.parse(ev.data)
            if (data?.type === 'message' && data?.message?.text) {
              setChatMessages(prev => [...prev, { role: data.message.role || 'assistant', text: sanitize(String(data.message.text)), ts: Date.now() }])
            }
          } catch { /* ignore */ }
        }
        es.onerror = () => { try { es.close() } catch { /* ignore */ } }
      }
    }
  }, [params, success])

  useEffect(() => {
    let cancelled = false
    async function run() {
      setLoading(true)
      try {
        const res = await publicKnowledgeApi.search(null, q, 10)
        if (!cancelled) setData(res)
      } catch {
        if (!cancelled) setData({ articles: [], faqs: [] })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [q])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-6xl mx-auto px-6 py-16">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              {t('knowledge.aiPowered') || 'AI-Powered Support'}
            </div>
            <h1 className="text-5xl font-bold tracking-tight">
              {t('knowledge.title') || 'Help Center'}
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              {t('knowledge.subtitle') || 'Find answers to common questions, get instant help from our AI assistant, or connect with our support team'}
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto mt-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  className="pl-12 pr-4 py-4 text-lg bg-white/95 backdrop-blur-sm border-0 shadow-lg rounded-2xl focus:ring-2 focus:ring-white/50"
                  placeholder={t('knowledge.searchPlaceholder') || 'Search for help articles, FAQs, or ask a question...'}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex justify-center gap-8 mt-12 text-sm">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <span>{t('knowledge.articlesCount') || '150+ Articles'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{t('knowledge.avgResponseTime') || '< 2min Response'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{t('knowledge.helpedUsers') || '10k+ Users Helped'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-8 relative z-10">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="glass-card hover-card group cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t('knowledge.chatWithAI') || 'Chat with AI Assistant'}</h3>
              <p className="text-sm text-muted-foreground">{t('knowledge.chatDescription') || 'Get instant answers from our intelligent assistant'}</p>
            </CardContent>
          </Card>

          <Card className="glass-card hover-card group cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t('knowledge.browseArticles') || 'Browse Articles'}</h3>
              <p className="text-sm text-muted-foreground">{t('knowledge.articlesDescription') || 'Explore our comprehensive knowledge base'}</p>
            </CardContent>
          </Card>

          <Card className="glass-card hover-card group cursor-pointer">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t('knowledge.contactSupport') || 'Contact Support'}</h3>
              <p className="text-sm text-muted-foreground">{t('knowledge.supportDescription') || 'Reach out to our expert support team'}</p>
            </CardContent>
          </Card>
        </div>

        {/* AI Chat Assistant */}
        <Card className="glass-card shadow-xl mb-8">
          <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  {t('knowledge.chat') || 'AI Assistant'}
                  {resumed ? <Badge variant="secondary" className="bg-green-100 text-green-700">Resumed</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground font-normal">{t('knowledge.chatSubtitle') || 'Get instant answers powered by AI'}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="border rounded-xl p-4 max-h-80 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
              {(chatMessages || []).map((m, idx) => (
                <div key={idx} className={`mb-4 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block max-w-[80%] px-4 py-2 rounded-2xl ${m.role === 'user'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                      : 'bg-white dark:bg-gray-700 shadow-sm border'
                    }`}>
                    <p className="text-sm">{m.text}</p>
                  </div>
                </div>
              ))}
              {!chatMessages.length && (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{t('knowledge.chatStart') || 'Start the conversation by asking a question.'}</p>
                </div>
              )}
            </div>

            {!!suggestions.length && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">{t('knowledge.suggestions') || 'Suggested articles:'}</p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <Button
                      key={s.id}
                      variant="outline"
                      size="sm"
                      className="text-xs rounded-full"
                      onClick={async () => {
                        try {
                          const full = await publicKnowledgeApi.getArticle(null, s.id)
                          setSelected(full)
                        } catch { /* ignore */ }
                      }}
                    >
                      {s.title}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Input
                className="flex-1 rounded-xl"
                placeholder={t('knowledge.chatPlaceholder') || 'Type your question...'}
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && chatInput.trim() && !chatSending) {
                    setChatSending(true)
                    setChatError(null)
                    try {
                      if (!chatSession) {
                        const started = await publicChatApi.start()
                        const sid = started.sessionId || null
                        setChatSession(sid)
                        if (typeof window !== 'undefined' && sid) localStorage.setItem('helpcenter_session', sid)
                      }
                      const now = Date.now()
                      setChatMessages(prev => [...prev, { role: 'user', text: chatInput, ts: now }])
                      const res = await publicChatApi.message(chatSession, chatInput)
                      const sid = res.sessionId || chatSession
                      if (!chatSession && sid) setChatSession(sid)
                      const reply = res.reply || ''
                      setChatMessages(prev => [...prev, { role: 'assistant', text: reply, ts: Date.now() }])
                      setSuggestions(res.suggestions || [])
                    } catch {
                      setChatError(t('common.error') || 'Something went wrong. Please try again.')
                    } finally {
                      setChatInput('')
                      setChatSending(false)
                    }
                  }
                }}
              />
              <Button
                disabled={!chatInput.trim() || chatSending}
                className="rounded-xl px-6"
                onClick={async () => {
                  if (!chatInput.trim()) return
                  setChatSending(true)
                  setChatError(null)
                  try {
                    if (!chatSession) {
                      const started = await publicChatApi.start()
                      const sid = started.sessionId || null
                      setChatSession(sid)
                      if (typeof window !== 'undefined' && sid) localStorage.setItem('helpcenter_session', sid)
                    }
                    const now = Date.now()
                    setChatMessages(prev => [...prev, { role: 'user', text: chatInput, ts: now }])
                    const res = await publicChatApi.message(chatSession, chatInput)
                    const sid = res.sessionId || chatSession
                    if (!chatSession && sid) setChatSession(sid)
                    const reply = res.reply || ''
                    setChatMessages(prev => [...prev, { role: 'assistant', text: reply, ts: Date.now() }])
                    setSuggestions(res.suggestions || [])
                  } catch {
                    setChatError(t('common.error') || 'Something went wrong. Please try again.')
                  } finally {
                    setChatInput('')
                    setChatSending(false)
                  }
                }}
              >
                {chatSending ? t('common.sending') || 'Sending...' : t('common.send') || 'Send'}
              </Button>
            </div>

            {!!chatError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{chatError}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground items-center pt-2 border-t">
              <button
                className="flex items-center gap-2 hover:text-green-600 transition-colors"
                onClick={async (e) => {
                  e.preventDefault()
                  try {
                    // Ensure session so the backend can link WA sender to this session
                    let sid = chatSession
                    if (!sid) {
                      const started = await publicChatApi.start()
                      sid = started.sessionId || null
                      setChatSession(sid)
                      if (typeof window !== 'undefined' && sid) localStorage.setItem('helpcenter_session', sid)
                    }
                    const popup = window.open('', '_blank')
                    const link = await publicChatApi.whatsappLink(sid || undefined)
                    if (link?.url) {
                      if (popup) popup.location.href = link.url
                      else window.location.href = link.url
                    }
                  } catch {/* ignore */ }
                }}
              >
                <Phone className="w-4 h-4" />
                {t('knowledge.continueWhatsapp') || 'Continue on WhatsApp'}
              </button>
              <button
                className="flex items-center gap-2 hover:text-blue-600 transition-colors"
                onClick={() => setEmailOpen(true)}
              >
                <Mail className="w-4 h-4" />
                {t('knowledge.askByEmail') || 'Ask via Email'}
              </button>
              <button
                className="flex items-center gap-2 hover:text-purple-600 transition-colors"
                onClick={async () => {
                  try {
                    if (!chatSession) {
                      const started = await publicChatApi.start()
                      const sid = started.sessionId || null
                      setChatSession(sid)
                      if (typeof window !== 'undefined' && sid) localStorage.setItem('helpcenter_session', sid)
                    }
                    const sid2 = chatSession || (typeof window !== 'undefined' ? (localStorage.getItem('helpcenter_session') || '') : '')
                    if (!sid2) return
                    const res = await publicChatApi.magicLink(sid2)
                    if (res?.ok && res.token) {
                      const base = window.location.origin + window.location.pathname
                      const url = `${base}?token=${encodeURIComponent(res.token)}`
                      await navigator.clipboard?.writeText(url)
                      success('Resume link copied')
                    }
                  } catch {/* ignore */ }
                }}
              >
                <ExternalLink className="w-4 h-4" />
                {t('knowledge.getResumeLink') || 'Get resume link'}
              </button>
            </div>
          </CardContent>
        </Card>

        {emailOpen && (
          <Card className="glass-card shadow-xl mb-8">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  {t('knowledge.askByEmail') || 'Contact Support via Email'}
                  <p className="text-sm text-muted-foreground font-normal">{t('knowledge.emailSubtitle') || 'Send us a message and we\'ll get back to you'}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('knowledge.emailAddress') || 'Email Address'}</Label>
                <Input
                  className="rounded-xl"
                  value={emailAddr}
                  onChange={(e) => setEmailAddr(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('knowledge.message') || 'Message'}</Label>
                <Input
                  className="rounded-xl min-h-[100px]"
                  value={emailMsg}
                  onChange={(e) => setEmailMsg(e.target.value)}
                  placeholder={t('knowledge.messagePlaceholder') || 'Describe your question or issue in detail...'}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  className="rounded-xl"
                  onClick={async () => {
                    try {
                      const res = await publicChatApi.email(chatSession, emailAddr, emailMsg)
                      if (res?.ok) setEmailOpen(false)
                    } catch {/* ignore */ }
                  }}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {t('common.send') || 'Send Message'}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setEmailOpen(false)}
                >
                  {t('common.cancel') || 'Cancel'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Knowledge Base Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Articles Section */}
          <Card className="glass-card shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  {t('knowledge.articles') || 'Help Articles'}
                  <p className="text-sm text-muted-foreground font-normal">{t('knowledge.articlesSubtitle') || 'Comprehensive guides and tutorials'}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                  <span className="ml-3 text-sm text-muted-foreground">{t('common.loading') || 'Loading...'}</span>
                </div>
              )}

              {!loading && ((data?.articles?.length ?? 0) === 0) && (
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{t('knowledge.noResults') || 'No articles found'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('knowledge.tryDifferentSearch') || 'Try a different search term'}</p>
                </div>
              )}

              <div className="space-y-3">
                {(data?.articles || []).map((a) => (
                  <div
                    key={a.id}
                    className="group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-600 hover:shadow-md transition-all duration-200 cursor-pointer bg-white dark:bg-gray-800/50"
                    onClick={async () => {
                      try {
                        const full = await publicKnowledgeApi.getArticle(null, a.id)
                        setSelected(full)
                      } catch {
                        // ignore
                      }
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                          {a.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.snippet}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all ml-2 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FAQs Section */}
          <Card className="glass-card shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  {t('knowledge.faqs') || 'Frequently Asked Questions'}
                  <p className="text-sm text-muted-foreground font-normal">{t('knowledge.faqsSubtitle') || 'Quick answers to common questions'}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  <span className="ml-3 text-sm text-muted-foreground">{t('common.loading') || 'Loading...'}</span>
                </div>
              )}

              {!loading && ((data?.faqs?.length ?? 0) === 0) && (
                <div className="text-center py-8">
                  <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{t('knowledge.noResults') || 'No FAQs found'}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('knowledge.tryDifferentSearch') || 'Try a different search term'}</p>
                </div>
              )}

              <div className="space-y-3">
                {(data?.faqs || []).map((f) => (
                  <div
                    key={f.id}
                    className="group p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-800/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Q</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{f.question}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{f.answer}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected Article */}
        {selected && (
          <Card className="glass-card shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  {selected.title || 'Article'}
                  <p className="text-sm text-muted-foreground font-normal">{t('knowledge.fullArticle') || 'Complete article content'}</p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="kb-prose max-w-none" dangerouslySetInnerHTML={{ __html: String(selected.content || '') }} />
              <div className="mt-8 pt-6 border-t flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <button className="flex items-center gap-2 hover:text-green-600 transition-colors">
                    <Star className="w-4 h-4" />
                    {t('knowledge.helpful') || 'Was this helpful?'}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setSelected(null)}
                >
                  {t('knowledge.backToSearch') || 'Back to Search'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-12">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">{t('knowledge.stillNeedHelp') || 'Still need help?'}</h3>
            <p className="text-muted-foreground mb-6">
              {t('knowledge.contactDescription') || 'Our support team is here to help you with any questions or issues you might have.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="rounded-xl" onClick={() => setEmailOpen(true)}>
                <Mail className="w-4 h-4 mr-2" />
                {t('knowledge.contactSupport') || 'Contact Support'}
              </Button>
              <Button variant="outline" className="rounded-xl">
                <Phone className="w-4 h-4 mr-2" />
                {t('knowledge.scheduleCall') || 'Schedule a Call'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        {/* WhatsApp Floating Button */}
        <button
          className="group relative w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center animate-float"
          onClick={async (e) => {
            e.preventDefault()
            try {
              let sid = chatSession
              if (!sid) {
                const started = await publicChatApi.start()
                sid = started.sessionId || null
                setChatSession(sid)
                if (typeof window !== 'undefined' && sid) localStorage.setItem('helpcenter_session', sid)
              }
              const popup = window.open('', '_blank')
              const link = await publicChatApi.whatsappLink(sid || undefined)
              if (link?.url) {
                if (popup) popup.location.href = link.url
                else window.location.href = link.url
              }
            } catch {/* ignore */ }
          }}
        >
          <Phone className="w-6 h-6" />

          {/* Tooltip */}
          <div className="absolute right-16 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
            {t('knowledge.continueWhatsapp') || 'Continue on WhatsApp'}
            <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
          </div>

          {/* Pulse animation */}
          <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
        </button>

        {/* Email Floating Button */}
        <button
          className="group relative w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center animate-float"
          style={{ animationDelay: '0.5s' }}
          onClick={() => setEmailOpen(true)}
        >
          <Mail className="w-6 h-6" />

          {/* Tooltip */}
          <div className="absolute right-16 top-1/2 transform -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
            {t('knowledge.askByEmail') || 'Ask via Email'}
            <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-gray-900"></div>
          </div>

          {/* Pulse animation */}
          <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-20"></div>
        </button>
      </div>
    </div>
  )
}


