'use client'

import { useEffect } from 'react'
import { useRouter } from '@/i18n.config'

export default function BusinessInsightsRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/dashboard/analytics?type=sales')
  }, [router])

  return null
}
