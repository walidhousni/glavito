'use client'

import { useEffect } from 'react'
import { useRouter } from '@/i18n.config'

export default function DashboardsAnalyticsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/analytics?type=dashboards')
  }, [router])

  return null
}
