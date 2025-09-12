import { useCallback, useEffect } from 'react'
import { useCollaborationStore, type CollaborationState } from '@/lib/store/collaboration-store'

export function useCollaboration(): CollaborationState {
  const state = useCollaborationStore()

  const init = useCallback(() => {
    state.fetchChannels()
    const today = new Date().toISOString().slice(0, 10)
    state.fetchShifts({ date: today })
  }, [state])

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    if (!state.selectedChannelId) return
    state.fetchChannelDetails(state.selectedChannelId)
  }, [state.selectedChannelId, state])

  return state
}


