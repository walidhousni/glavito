'use client'
import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from 'next-intl'
import { useCollaboration } from '@/lib/hooks/use-collaboration'

export default function CollaborationPage() {
  const t = useTranslations()
  const collab = useCollaboration()
  const [content, setContent] = useState('')
  const [name, setName] = useState('')
  const [shiftTitle, setShiftTitle] = useState('')
  const [shiftStart, setShiftStart] = useState('')
  const [shiftEnd, setShiftEnd] = useState('')
  const [addUserId, setAddUserId] = useState('')
  const [dmQuery, setDmQuery] = useState('')

  const selected = useMemo(() => collab.channels.find(c => c.id === collab.selectedChannelId) || null, [collab.channels, collab.selectedChannelId])
  // DM search and create (debounced)
  useEffect(() => {
    let active = true
    if (!dmQuery.trim()) { collab.searchUsers(''); return }
    const h = setTimeout(() => { if (active) collab.searchUsers(dmQuery) }, 250)
    return () => { active = false; clearTimeout(h) }
  }, [dmQuery, collab])

  const sortedChannels = useMemo(() => [...collab.channels].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), [collab.channels])

  async function createChannel() {
    if (!name.trim()) return
    const id = await collab.createChannel({ name, type: 'topic' })
    if (id) collab.selectChannel(id)
    setName('')
  }

  async function send() {
    if (!content.trim()) return
    await collab.sendMessage(content)
    setContent('')
  }

  async function addParticipantToChannel() {
    if (!addUserId.trim()) return
    await collab.addParticipant(addUserId)
    setAddUserId('')
  }

  async function removeParticipantFromChannel(userId: string) {
    await collab.removeParticipant(userId)
  }

  async function startDM(otherUserId: string) {
    try {
      const resId = await collab.startDM(otherUserId)
      if (resId) collab.selectChannel(resId)
      setDmQuery('')
    } catch {
      // ignore
    }
  }

  async function createShift() {
    if (!shiftStart || !shiftEnd) return
    await collab.createShift({ title: shiftTitle, startTime: shiftStart, endTime: shiftEnd })
    const today = new Date().toISOString().slice(0,10)
    await collab.fetchShifts({ date: today })
    setShiftTitle(''); setShiftStart(''); setShiftEnd('')
  }

  return (
    <div className="flex h-[calc(100vh-6rem)]">
      <div className="w-80 border-r p-3 space-y-3">
        <div className="flex gap-2">
          <Input placeholder={t('common.search')} />
        </div>
        <div className="flex gap-2">
          <Input placeholder={t('common.create') || 'Create'} value={name} onChange={(e)=>setName(e.target.value)} />
          <Button onClick={createChannel}>{t('common.create') || 'Create'}</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{t('collaboration.startDM') || 'Start DM'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Input placeholder={t('collaboration.searchUsersPlaceholder') || 'Search users...'} value={dmQuery} onChange={(e)=>setDmQuery(e.target.value)} />
              {!collab.dmSearching && collab.dmResults.length > 0 && (
                <div className="border rounded overflow-auto max-h-40">
                  {collab.dmResults.map(u => (
                    <Button key={u.id} variant="ghost" className="w-full justify-start" onClick={()=>startDM(u.id)}>
                      {u.label} <span className="text-xs text-muted-foreground ml-2">{u.email}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('common.today') || 'Today'} {t('common.coverage') || 'Coverage'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {collab.shifts.length === 0 && <div className="text-sm text-muted-foreground">{t('collaboration.noShifts') || 'No shifts'}</div>}
              {collab.shifts.map((s)=> (
                <div key={s.id} className="text-sm">
                  <span className="font-medium">{s.title || (t('collaboration.shift') || 'Shift')}</span> • {new Date(s.startTime).toLocaleTimeString()} - {new Date(s.endTime).toLocaleTimeString()}
                </div>
              ))}
              <div className="mt-2 space-y-2">
                <Input placeholder={t('collaboration.shiftTitle') || 'Title'} value={shiftTitle} onChange={(e)=>setShiftTitle(e.target.value)} />
                <Input type="datetime-local" value={shiftStart} onChange={(e)=>setShiftStart(e.target.value)} />
                <Input type="datetime-local" value={shiftEnd} onChange={(e)=>setShiftEnd(e.target.value)} />
                <Button onClick={createShift} size="sm">{t('common.create') || 'Create'}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-1 overflow-auto">
          {sortedChannels.map((ch) => (
            <Button key={ch.id} variant={selected?.id===ch.id?'secondary':'ghost'} className="w-full justify-start" onClick={()=>collab.selectChannel(ch.id)}>
              #{ch.name}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex-1">
        {!selected && (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{t('collaboration.selectChannel') || 'Select a channel'}</div>
        )}
        {selected && (
          <div className="h-full flex flex-col">
            <Card className="m-3">
              <CardHeader>
                <CardTitle>#{selected.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  <div className="text-xs text-muted-foreground mb-1">{t('collaboration.participants') || 'Participants'}</div>
                  <div className="flex flex-col gap-2 mb-2">
                    {collab.participants.map((p)=> (
                      <div key={p.userId} className="flex items-center justify-between border rounded px-2 py-1">
                        <div className="text-xs">
                          {p.user.firstName} {p.user.lastName}
                          <span className="ml-2 text-muted-foreground">{p.role}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={()=>startDM(p.userId)}>{t('collaboration.dmShort') || 'DM'}</Button>
                          <Button size="sm" variant="destructive" onClick={()=>removeParticipantFromChannel(p.userId)}>{t('common.remove') || 'Remove'}</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder={t('collaboration.userIdPlaceholder') || 'User ID'} value={addUserId} onChange={(e)=>setAddUserId(e.target.value)} />
                    <Button size="sm" onClick={addParticipantToChannel}>{t('common.create') || 'Create'}</Button>
                  </div>
                </div>
                <div className="h-[60vh] overflow-auto space-y-2">
                  {collab.messages.map((m)=> (
                    <div key={m.id} className="text-sm">
                      <span className="text-muted-foreground">{new Date(m.createdAt).toLocaleTimeString()}</span> {m.content}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-3">
                  <Input placeholder={(t('collaboration.writeWithMention') || 'Write @mention')} value={content} onChange={(e)=>setContent(e.target.value)} onKeyDown={(e)=>{ if (e.key==='Enter') send() }} />
                  <Button onClick={send}>{t('common.send')||'Send'}</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}


