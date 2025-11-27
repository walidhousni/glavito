'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  BookOpen,
  MessageCircle,
  Phone,
  Mail,
  Instagram,
  Sparkles,
  Clock,
  Users,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Star,
} from 'lucide-react'
import { MultiChannelChat } from '@/components/help-center/multi-channel-chat'
import { useHelpCenterStore } from '@/lib/store/help-center-store'

export default function HelpCenterRedesigned() {
  const t = useTranslations()
  const [searchQuery, setSearchQuery] = useState('')
  const store = useHelpCenterStore()
  const { searchResults, selectArticle, selectedArticle } = store

  const searchKnowledge = useCallback((query: string) => {
    store.searchKnowledge(query)
  }, [store])

  useEffect(() => {
    if (searchQuery) {
      const timeoutId = setTimeout(() => {
        searchKnowledge(searchQuery)
      }, 300)
      return () => clearTimeout(timeoutId)
    }
    return undefined;
  }, [searchQuery, searchKnowledge])

  const categories = [
    {
      icon: BookOpen,
      title: 'Getting Started',
      description: 'Learn the basics and set up your account',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      articleCount: 15,
      iconUrl: 'https://img.icons8.com/color/96/book--v1.png',
    },
    {
      icon: MessageCircle,
      title: 'Integrations',
      description: 'Connect your favorite tools and platforms',
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      articleCount: 12,
      iconUrl: 'https://img.icons8.com/color/96/api-settings--v1.png',
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Invite and manage team members',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      articleCount: 8,
      iconUrl: 'https://img.icons8.com/color/96/user-group-man-man--v1.png',
    },
    {
      icon: TrendingUp,
      title: 'Analytics',
      description: 'Track performance and insights',
      color: 'text-pink-600',
      bgColor: 'bg-pink-100 dark:bg-pink-900/30',
      articleCount: 10,
      iconUrl: 'https://img.icons8.com/color/96/statistics--v1.png',
    },
  ]

  const popularArticles = [
    { id: '1', title: 'How to connect WhatsApp Business API', views: 1234, helpful: 95 },
    { id: '2', title: 'Setting up your first automation', views: 987, helpful: 92 },
    { id: '3', title: 'Understanding ticket priorities', views: 856, helpful: 89 },
    { id: '4', title: 'Managing customer conversations', views: 743, helpful: 91 },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-5 py-2 text-sm font-medium">
              <Sparkles className="w-4 h-4 animate-pulse" />
              {t('knowledge.aiPowered') || 'AI-Powered Multi-Channel Support'}
            </div>

            {/* Title */}
            <div className="space-y-4">
              <h1 className="text-6xl font-bold tracking-tight">
                {t('knowledge.title') || 'How can we help?'}
              </h1>
              <p className="text-xl text-blue-100 max-w-3xl mx-auto">
                {t('knowledge.subtitle') || 'Get instant answers, connect on your preferred channel, or browse our comprehensive knowledge base'}
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-6 h-6 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  className="pl-14 pr-6 py-6 text-lg bg-white/95 backdrop-blur-md border-0 shadow-2xl rounded-2xl focus:ring-4 focus:ring-white/50 transition-all"
                  placeholder={t('knowledge.searchPlaceholder') || 'Search for help articles, FAQs, or ask a question...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-8 pt-8">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <BookOpen className="w-5 h-5" />
                <span className="font-semibold">150+ Articles</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <Clock className="w-5 h-5" />
                <span className="font-semibold">&lt; 2min Response</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <Users className="w-5 h-5" />
                <span className="font-semibold">10k+ Users Helped</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <Star className="w-5 h-5" />
                <span className="font-semibold">98% Satisfaction</span>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" className="w-full h-12">
            <path
              fill="currentColor"
              className="text-white dark:text-gray-900"
              d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
            ></path>
          </svg>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10 pb-20">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {categories.map((category, idx) => {
            const Icon = category.icon
            return (
              <Card
                key={idx}
                className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700"
              >
                <CardContent className="p-6 text-center space-y-4">
                  <div className={`w-16 h-16 ${category.bgColor} rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform`}>
                    <img src={category.iconUrl} alt={category.title} className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2 text-gray-900 dark:text-gray-100">
                      {category.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      {category.description}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {category.articleCount} articles
                    </Badge>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 text-sm font-medium">
                    Browse <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Popular Articles */}
        {searchQuery.length === 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Popular Articles
                </h2>
                <p className="text-sm text-muted-foreground">
                  Most viewed by the community
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {popularArticles.map((article) => (
                <Card
                  key={article.id}
                  className="group cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-200 dark:hover:border-blue-800"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {article.views} views
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            {article.helpful}% helpful
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchQuery.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                <Search className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Search Results
                </h2>
                <p className="text-sm text-muted-foreground">
                  Found {searchResults.articles.length + searchResults.faqs.length} results for "{searchQuery}"
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {searchResults.articles.map((article: any) => (
                <Card
                  key={article.id}
                  onClick={() => selectArticle(article)}
                  className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-blue-200 dark:hover:border-blue-800"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <Badge variant="secondary" className="mb-2">Article</Badge>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100 mb-2">
                          {article.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {article.snippet}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {searchResults.faqs.map((faq: any) => (
                <Card
                  key={faq.id}
                  className="cursor-pointer hover:shadow-lg transition-all border-2 hover:border-purple-200 dark:hover:border-purple-800"
                >
                  <CardContent className="p-5">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                        <HelpCircle className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                          {faq.question}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {searchResults.articles.length === 0 && searchResults.faqs.length === 0 && (
                <div className="text-center py-12">
                  <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No results found
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Try different keywords or ask our AI assistant
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Contact Options */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-2 border-blue-100 dark:border-blue-900">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Still need help?
                </h2>
                <p className="text-muted-foreground">
                  Our support team is here for you across multiple channels
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 hover:scale-105 transition-transform"
                >
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <Phone className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold">WhatsApp</div>
                    <div className="text-xs text-muted-foreground">Chat instantly</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 hover:scale-105 transition-transform"
                >
                  <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center">
                    <Instagram className="w-6 h-6 text-pink-600" />
                  </div>
                  <div>
                    <div className="font-semibold">Instagram</div>
                    <div className="text-xs text-muted-foreground">DM us</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto py-4 flex-col gap-2 hover:scale-105 transition-transform"
                >
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold">Email</div>
                    <div className="text-xs text-muted-foreground">support@example.com</div>
                  </div>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Channel Chat Widget */}
      <MultiChannelChat />
    </div>
  )
}

