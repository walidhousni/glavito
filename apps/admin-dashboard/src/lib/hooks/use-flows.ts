import { useEffect } from 'react'
import { useFlowsStore, type FlowsState } from '@/lib/store/flows-store'

export function useFlows(tenantId?: string): FlowsState {
  const store = useFlowsStore()
  useEffect(() => {
    // Call once per tenant change; avoid including store in deps to prevent loops
    store.fetch(tenantId)

  }, [tenantId])
  return store
}


