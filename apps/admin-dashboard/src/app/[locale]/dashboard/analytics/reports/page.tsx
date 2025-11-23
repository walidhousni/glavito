'use client'

import { useEffect } from 'react'
import { useRouter } from '@/i18n.config'

export default function ReportsAnalyticsRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/analytics?type=reports')
  }, [router])

  return null
}
