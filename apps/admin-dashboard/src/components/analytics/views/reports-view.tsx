'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { reportsApi, CustomReport } from '@/lib/api/analytics-client'
import { toast } from '@/hooks/use-toast'
import { Loader2, Plus, FileText, Calendar, TrendingUp, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export function ReportsView() {
  const router = useRouter()
  const [reports, setReports] = useState<CustomReport[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ category: '', search: '' })

  useEffect(() => {
    loadReports()
  }, [])

  const loadReports = async () => {
    try {
      const data = await reportsApi.list()
      setReports(data)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load reports',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async (reportId: string) => {
    try {
      toast({
        title: 'Generating Report',
        description: 'Your report is being generated...',
      })
      await reportsApi.generate(reportId)
      toast({
        title: 'Success',
        description: 'Report generated successfully',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to generate report',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      !filter.search ||
      report.name.toLowerCase().includes(filter.search.toLowerCase())
    const matchesCategory = !filter.category || report.category === filter.category
    return matchesSearch && matchesCategory
  })

  const myReports = filteredReports.filter(
    (r) => r.creator && !r.isPublic
  )
  const sharedReports = filteredReports.filter((r) => r.isPublic)
  const favorites = filteredReports.filter((r) => r.isFavorite)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Reports</h1>
          <p className="text-muted-foreground">
            Build and schedule custom analytics reports
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/analytics/reports/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search reports..."
          value={filter.search}
          onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          className="max-w-sm"
        />
      </div>

      <Tabs defaultValue="my" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my">My Reports ({myReports.length})</TabsTrigger>
          <TabsTrigger value="shared">Shared ({sharedReports.length})</TabsTrigger>
          <TabsTrigger value="favorites">
            Favorites ({favorites.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="space-y-4">
          {myReports.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first custom report to get started
                </p>
                <Button onClick={() => router.push('/dashboard/analytics/reports/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Report
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myReports.map((report) => (
                <Card key={report.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          {report.name}
                        </CardTitle>
                        {report.description && (
                          <CardDescription className="mt-2">
                            {report.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <Badge variant="outline">{report.category}</Badge>
                      {report.industry && (
                        <Badge variant="secondary">{report.industry}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        <span>{report.metrics.length} metrics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {report.schedules?.length || 0} schedule
                          {report.schedules?.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {report.lastGeneratedAt && (
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>
                            Generated{' '}
                            {formatDistanceToNow(new Date(report.lastGeneratedAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          router.push(`/dashboard/analytics/reports/${report.id}`)
                        }
                        className="flex-1"
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleGenerate(report.id)}
                        className="flex-1"
                      >
                        Generate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shared" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedReports.map((report) => (
              <Card key={report.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {report.name}
                  </CardTitle>
                  {report.description && (
                    <CardDescription>{report.description}</CardDescription>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{report.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/dashboard/analytics/reports/${report.id}`)}
                    className="w-full"
                  >
                    View Report
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((report) => (
              <Card key={report.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {report.name}
                  </CardTitle>
                  {report.description && (
                    <CardDescription>{report.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/dashboard/analytics/reports/${report.id}`)}
                    className="w-full"
                  >
                    View Report
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

