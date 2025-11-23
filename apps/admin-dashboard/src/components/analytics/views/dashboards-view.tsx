'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { dashboardsApi, DashboardLayout } from '@/lib/api/analytics-client'
import { toast } from '@/hooks/use-toast'
import { Loader2, Plus, Eye, Star, Copy, Trash2, Edit, LayoutDashboard } from 'lucide-react'

export function DashboardsView() {
  const router = useRouter()
  const [dashboards, setDashboards] = useState<DashboardLayout[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState('')
  const [newDashboardDescription, setNewDashboardDescription] = useState('')

  useEffect(() => {
    loadDashboards()
  }, [])

  const loadDashboards = async () => {
    try {
      const data = await dashboardsApi.list()
      const normalized: DashboardLayout[] = Array.isArray(data)
        ? data
        : (data as unknown as { items?: DashboardLayout[] })?.items ?? []
      setDashboards(normalized)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load dashboards',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newDashboardName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Dashboard name is required',
        variant: 'destructive',
      })
      return
    }

    try {
      const dashboard = await dashboardsApi.create({
        name: newDashboardName,
        description: newDashboardDescription,
        layout: [],
        widgets: [],
      })
      
      setDashboards([...dashboards, dashboard])
      setCreateDialogOpen(false)
      setNewDashboardName('')
      setNewDashboardDescription('')
      
      toast({
        title: 'Success',
        description: 'Dashboard created successfully',
      })
      
      router.push(`/dashboard/analytics/dashboards/${dashboard.id}/edit`)
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to create dashboard',
        variant: 'destructive',
      })
    }
  }

  const handleDuplicate = async (dashboardId: string, name: string) => {
    try {
      const newDashboard = await dashboardsApi.duplicate(dashboardId, `${name} (Copy)`)
      setDashboards([...dashboards, newDashboard])
      toast({
        title: 'Success',
        description: 'Dashboard duplicated successfully',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to duplicate dashboard',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (dashboardId: string) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) return

    try {
      await dashboardsApi.delete(dashboardId)
      setDashboards(dashboards.filter((d) => d.id !== dashboardId))
      toast({
        title: 'Success',
        description: 'Dashboard deleted successfully',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete dashboard',
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

  const dashboardsArray: DashboardLayout[] = Array.isArray(dashboards) ? dashboards : []
  const myDashboards: DashboardLayout[] = dashboardsArray.filter((d: DashboardLayout) => !d.isPublic)
  const sharedDashboards: DashboardLayout[] = dashboardsArray.filter((d: DashboardLayout) => d.isPublic)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Custom Dashboards</h1>
          <p className="text-muted-foreground">
            Create and manage your personalized analytics dashboards
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Dashboard
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Dashboard</DialogTitle>
              <DialogDescription>
                Create a new custom dashboard with drag-and-drop widgets
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  placeholder="My Dashboard"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={newDashboardDescription}
                  onChange={(e) => setNewDashboardDescription(e.target.value)}
                  placeholder="A brief description of what this dashboard shows"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Dashboard</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="my" className="space-y-6">
        <TabsList>
          <TabsTrigger value="my">My Dashboards ({myDashboards.length})</TabsTrigger>
          <TabsTrigger value="shared">Shared ({sharedDashboards.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="my" className="space-y-4">
          {myDashboards.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <LayoutDashboard className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No dashboards yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first custom dashboard to get started
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Dashboard
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myDashboards.map((dashboard) => (
                <Card key={dashboard.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          {dashboard.name}
                          {dashboard.isDefault && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                        </CardTitle>
                        {dashboard.description && (
                          <CardDescription className="mt-2">
                            {dashboard.description}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      {dashboard.role && <Badge variant="outline">{dashboard.role}</Badge>}
                      {dashboard.industry && <Badge variant="secondary">{dashboard.industry}</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>{dashboard.widgets.length} widgets</span>
                      <span>{dashboard.viewCount || 0} views</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/analytics/dashboards/${dashboard.id}`)}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/analytics/dashboards/${dashboard.id}/edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicate(dashboard.id, dashboard.name)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(dashboard.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shared" className="space-y-4">
          {sharedDashboards.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <LayoutDashboard className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No shared dashboards</h3>
                <p className="text-muted-foreground">
                  Shared dashboards from your team will appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedDashboards.map((dashboard) => (
                <Card key={dashboard.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{dashboard.name}</CardTitle>
                    {dashboard.description && (
                      <CardDescription>{dashboard.description}</CardDescription>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {dashboard.role && <Badge variant="outline">{dashboard.role}</Badge>}
                      {dashboard.industry && <Badge variant="secondary">{dashboard.industry}</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span>{dashboard.widgets.length} widgets</span>
                      <span>{dashboard.viewCount || 0} views</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/dashboard/analytics/dashboards/${dashboard.id}`)}
                      className="w-full"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Dashboard
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

