'use client'

import { useEffect } from 'react'
import { useRouter } from '@/i18n.config'

export default function CallsAnalyticsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/analytics?type=calls')
  }, [router])

  return null
}
