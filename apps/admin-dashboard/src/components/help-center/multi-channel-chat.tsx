'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  MessageCircle, 
  X, 
  Send, 
  Phone, 
  Instagram, 
  Mail, 
  Globe,
  Check,
  CheckCheck,
  Clock,
  AlertCircle,
  Loader2,
  Plus
} from 'lucide-react'
import { useHelpCenterStore } from '@/lib/store/help-center-store'
import { ChannelConnectModal } from './channel-connect-modal'
import { cn } from '@/lib/utils'

export function MultiChannelChat() {
  const {
    sessionId,
    messages,
    isChatOpen,
    activeChannel,
    linkedChannels,
    channelStatuses,
    isLoading,
    toggleChat,
    sendMessage,
    initSession,
    refreshChannelStatus,
    switchChannel,
  } = useHelpCenterStore()

  const [input, setInput] = useState('')
  const [showChannelModal, setShowChannelModal] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initSession()
  }, [])

  useEffect(() => {
    if (sessionId) {
      refreshChannelStatus()
    }
  }, [sessionId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    
    const text = input
    setInput('')
    await sendMessage(text, true)
  }

  const getChannelBadge = (channel: string) => {
    const config: Record<string, { icon: any; color: string; label: string }> = {
      web: { icon: Globe, color: 'text-blue-600', label: 'Web' },
      whatsapp: { icon: Phone, color: 'text-green-600', label: 'WhatsApp' },
      instagram: { icon: Instagram, color: 'text-pink-600', label: 'Instagram' },
      email: { icon: Mail, color: 'text-blue-600', label: 'Email' },
    }
    return config[channel] || config.web
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />
      default:
        return null
    }
  }

  const channelButtons = [
    {
      id: 'web' as const,
      icon: Globe,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      label: 'Web',
      available: true,
    },
    {
      id: 'whatsapp' as const,
      icon: Phone,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      label: 'WhatsApp',
      available: linkedChannels?.whatsapp?.linked && linkedChannels?.whatsapp?.verified,
    },
    {
      id: 'instagram' as const,
      icon: Instagram,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100 dark:bg-pink-900/30',
      label: 'Instagram',
      available: linkedChannels?.instagram?.linked && linkedChannels?.instagram?.verified,
    },
    {
      id: 'email' as const,
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      label: 'Email',
      available: linkedChannels?.email?.linked,
    },
  ]

  return (
    <>
      {/* Chat Bubble */}
      {!isChatOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50 animate-bounce"
        >
          <MessageCircle className="w-7 h-7" />
          {messages.length > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">
              {messages.length}
            </div>
          )}
        </button>
      )}

      {/* Chat Widget */}
      {isChatOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Support Chat</h3>
                <div className="flex items-center gap-1 text-xs text-white/80">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  Online
                </div>
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Channel Selector */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-2 overflow-x-auto">
              {channelButtons.map((channel) => {
                const Icon = channel.icon
                const isActive = activeChannel === channel.id
                const isConnected = channelStatuses[channel.id] === 'connected'

                return (
                  <button
                    key={channel.id}
                    onClick={() => channel.available && switchChannel(channel.id)}
                    disabled={!channel.available}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                      isActive && channel.available
                        ? `${channel.bgColor} ${channel.color} ring-2 ring-current/20`
                        : channel.available
                        ? "hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                        : "opacity-40 cursor-not-allowed text-gray-400"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-medium whitespace-nowrap">{channel.label}</span>
                    {isConnected && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                  </button>
                )
              })}
              <button
                onClick={() => setShowChannelModal(true)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs font-medium">Add</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Start a Conversation
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ask a question or browse our help articles
                </p>
              </div>
            )}

            {messages.map((message, idx) => {
              const channelBadge = getChannelBadge(message.channel || 'web')
              const ChannelIcon = channelBadge.icon

              return (
                <div
                  key={idx}
                  className={cn(
                    "flex gap-2",
                    message.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2 space-y-1",
                      message.role === 'user'
                        ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                        : "bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600"
                    )}
                  >
                    {message.channel && message.channel !== 'web' && (
                      <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
                        <ChannelIcon className="w-3 h-3" />
                        <span>{channelBadge.label}</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                    <div className="flex items-center gap-1 justify-end text-xs opacity-60">
                      <span>{new Date(message.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {message.role === 'user' && getStatusIcon(message.status)}
                    </div>
                  </div>
                </div>
              )
            })}

            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white dark:bg-gray-700 rounded-2xl px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-600">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Type your message..."
                className="flex-1 rounded-xl"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="rounded-xl px-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Powered by AI • Secure & Private
            </p>
          </div>
        </div>
      )}

      {/* Channel Connect Modal */}
      <ChannelConnectModal
        open={showChannelModal}
        onOpenChange={setShowChannelModal}
      />
    </>
  )
}

