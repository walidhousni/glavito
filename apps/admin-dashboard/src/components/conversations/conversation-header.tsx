'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n.config'
import { Settings, Archive, Zap } from 'lucide-react'

interface ConversationHeaderProps {
  aiEnabled: boolean
}

export function ConversationHeader({ aiEnabled }: ConversationHeaderProps) {
  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Inbox</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage all conversations from one place</p>
          </div>
          {aiEnabled && (
            <Badge variant="secondary" className="gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              AI Enabled
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Link href="/tickets">
            <Button size="sm" className="gap-2">
              <Archive className="h-4 w-4" />
              View Tickets
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}


