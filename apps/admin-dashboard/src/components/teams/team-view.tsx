'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
// conversationsApi imported below
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Users, ChevronDown, RefreshCw, Activity, AlertTriangle } from 'lucide-react'
import { conversationsApi } from '@/lib/api/conversations-client'
import { aiApi } from '@/lib/api/ai-client'
import { useAuthStore } from '@/lib/store/auth-store'

interface TeamMemberLite {
  id: string
  userId: string
  user?: { id: string; firstName?: string; lastName?: string; email?: string; avatar?: string; status?: string }
  role?: string
  isActive?: boolean
}

interface TeamLite {
  id: string
  name: string
  color?: string
  memberCount?: number
  members?: TeamMemberLite[]
}

export function TeamView() {
  const t = useTranslations('teams')
  const { user } = useAuthStore()
  const [teams, setTeams] = React.useState<TeamLite[]>([])
  const [loading, setLoading] = React.useState<boolean>(false)
  const [selectedTeam, setSelectedTeam] = React.useState<TeamLite | null>(null)
  const [metrics, setMetrics] = React.useState<{ active?: number; queue?: number; slaRisk?: number }>({})
  const [aiMode, setAiMode] = React.useState<'off'|'draft'|'auto'>('off')
  const [activeConversationId, setActiveConversationId] = React.useState<string | undefined>(undefined)

  const loadTeams = React.useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      // includeMembers=true to render avatars
      const list = await conversationsApi.listTeams(true)
      const arr: TeamLite[] = Array.isArray(list) ? (list as TeamLite[]) : []
      setTeams(arr)
      if (!selectedTeam && arr.length) setSelectedTeam(arr[0])
    } catch {
      setTeams([])
    } finally {
      setLoading(false)
    }
  }, [selectedTeam])

  React.useEffect(() => { loadTeams() }, [loadTeams])

  React.useEffect(() => {
    let mounted = true
    aiApi.getAutopilotConfig().then(cfg => {
      if (!mounted) return
      if (cfg?.mode) setAiMode(cfg.mode)
    }).catch(() => void 0)
    return () => { mounted = false }
  }, [])

  // Track active conversation from panel for assignment actions
  React.useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent<{ conversationId?: string }>)?.detail
        setActiveConversationId(detail?.conversationId)
      } catch { /* noop */ }
    }
    const key = 'glavito:conversation:active'
    window.addEventListener(key, handler as EventListener)
    return () => window.removeEventListener(key, handler as EventListener)
  }, [])

  // Fetch simple metrics for the selected team (best-effort placeholder)
  React.useEffect(() => {
    let mounted = true
    async function load() {
      if (!selectedTeam) { setMetrics({}); return }
      try {
        // Reuse unified inbox with teamId to compute counts
        const res = await conversationsApi.getUnifiedInbox({ teamId: selectedTeam.id, limit: 1 })
        const total = Number(res?.data?.pagination?.total || 0)
        // Approximate metrics from summary if present
        const active = Number(res?.data?.summary?.activeConversations || 0)
        const high = Number(res?.data?.summary?.highPriorityConversations || 0)
        if (mounted) setMetrics({ active, queue: Math.max(0, total - active), slaRisk: high })
      } catch {
        if (mounted) setMetrics({ active: 0, queue: 0, slaRisk: 0 })
      }
    }
    load()
    return () => { mounted = false }
  }, [selectedTeam])

  const dispatchFilter = (detail: Record<string, unknown>) => {
    try {
      window.dispatchEvent(new CustomEvent('glavito:tickets:filters', { detail }))
    } catch { /* noop */ }
  }

  const onSelectMember = (m?: TeamMemberLite) => {
    if (!m?.userId) {
      // Clear member filter but keep team filter
      dispatchFilter({ assignedAgentId: '' })
      return
    }
    dispatchFilter({ assignedAgentId: m.userId, teamId: selectedTeam?.id || '' })
  }

  const onSelectTeam = async (team: TeamLite) => {
    setSelectedTeam(team)
    dispatchFilter({ teamId: team.id, assignedAgentId: '' })
    // Lazily load members when missing
    if (!team.members) {
      try {
        const members = await conversationsApi.getTeamMembers(team.id)
        setTeams(prev => prev.map(ti => ti.id === team.id ? { ...ti, members } : ti))
      } catch { /* ignore */ }
    }
  }

  const members = (selectedTeam?.members || []).slice(0, 8)
  const extra = Math.max(0, (selectedTeam?.members?.length || 0) - members.length)

  return (
    <div className="p-3 border-b bg-background/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Users className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground">Team View</div>
            <div className="text-[10px] text-muted-foreground/80">{t('membersList')}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Quick actions */}
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => dispatchFilter({ teamId: selectedTeam?.id || '', assignedAgentId: '' })}>
            {t('actions.viewTeam')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                AI: {aiMode}
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {(['off','draft','auto'] as const).map(mode => (
                <DropdownMenuItem key={mode} onClick={async () => {
                  try {
                    setAiMode(mode)
                    await aiApi.setAutopilotConfig({ mode })
                  } catch { /* ignore */ }
                }}>
                  {mode}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                <span className="mr-1 truncate max-w-[120px]">{selectedTeam?.name || t('title')}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t('members')}</DropdownMenuLabel>
              {teams.map(tm => (
                <DropdownMenuItem key={tm.id} onClick={() => onSelectTeam(tm)}>
                  <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: tm.color || '#888' }} />
                  <span className="truncate">{tm.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={loadTeams} disabled={loading}>
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
          </Button>
        </div>
      </div>

      {/* Performance chips */}
      <div className="flex items-center gap-2 mb-2" title={`SLA at risk: ${Number(metrics.slaRisk || 0)}`}>
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs">
          <Activity className="h-3 w-3 text-emerald-600" />
          <span>Active</span>
          <span className="font-semibold">{Number(metrics.active || 0)}</span>
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs">
          <Users className="h-3 w-3 text-blue-600" />
          <span>Queue</span>
          <span className="font-semibold">{Number(metrics.queue || 0)}</span>
        </div>
        <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs">
          <AlertTriangle className="h-3 w-3 text-amber-600" />
          <span>SLA</span>
          <span className="font-semibold">{Number(metrics.slaRisk || 0)}</span>
        </div>
      </div>

      {/* Members row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => dispatchFilter({ teamId: selectedTeam?.id || '', assignedAgentId: '' })}>All</Button>
        {members.map(m => {
          const name = `${m.user?.firstName || ''} ${m.user?.lastName || ''}`.trim() || (m.user?.email || 'Agent')
          const initials = (m.user?.firstName?.[0] || '') + (m.user?.lastName?.[0] || '') || 'A'
          const active = Boolean(m.isActive)
          return (
            <button key={m.id} className="relative group" onClick={() => onSelectMember(m)} title={name}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-muted text-muted-foreground text-xs">{initials.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className={active ? 'status-dot status-success absolute -bottom-0.5 -right-0.5' : 'status-dot status-warning absolute -bottom-0.5 -right-0.5'} />
            </button>
          )
        })}
        {extra > 0 && (
          <div className="h-8 px-2 rounded-full bg-muted text-muted-foreground text-xs inline-flex items-center">+{extra}</div>
        )}
      </div>

      {/* Inline assignment quick actions when a conversation is active */}
      {activeConversationId && selectedTeam && (
        <div className="mt-2 flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={async () => {
              try {
                if (!user?.id) return
                await conversationsApi.assign(activeConversationId, { agentId: user.id, teamId: selectedTeam.id })
                dispatchFilter({ teamId: selectedTeam.id, assignedAgentId: user.id })
              } catch { /* noop */ }
            }}
          >
            Assign to me
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={async () => {
              try {
                await conversationsApi.assign(activeConversationId, { teamId: selectedTeam.id })
                dispatchFilter({ teamId: selectedTeam.id })
              } catch { /* noop */ }
            }}
          >
            <Users className="h-3 w-3 mr-1" />Assign to team
          </Button>
          {members.map(m => (
            <Button
              key={`assign_${m.id}`}
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={async () => {
                try {
                  await conversationsApi.assign(activeConversationId, { agentId: m.userId, teamId: selectedTeam.id })
                  dispatchFilter({ teamId: selectedTeam.id, assignedAgentId: m.userId })
                } catch { /* noop */ }
              }}
            >
              <Avatar className="h-6 w-6 mr-2"><AvatarFallback className="bg-muted text-muted-foreground text-[10px]">{(m.user?.firstName?.[0] || 'A')}{(m.user?.lastName?.[0] || '').toUpperCase()}</AvatarFallback></Avatar>
              {m.user?.firstName || 'Agent'}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}

export default TeamView


