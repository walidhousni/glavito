'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Phone, 
  Instagram, 
  Mail, 
  Shield, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import { useHelpCenterStore } from '@/lib/store/help-center-store'
import { ChannelType } from '@/lib/api/help-center-client'

interface ChannelConnectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Optional confetti
let confetti: any = null
try {
  confetti = require('canvas-confetti')
} catch {
  // confetti not installed
}

export function ChannelConnectModal({ open, onOpenChange }: ChannelConnectModalProps) {
  const [step, setStep] = useState<'select' | 'input' | 'verify' | 'success'>('select')
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>(null)
  const [contact, setContact] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const { linkChannel, verifyChannel, refreshChannelStatus } = useHelpCenterStore()

  const channels = [
    {
      type: 'whatsapp' as ChannelType,
      name: 'WhatsApp',
      icon: Phone,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      description: 'Continue conversation on WhatsApp',
      placeholder: '+1 (555) 123-4567',
      iconUrl: 'https://img.icons8.com/color/96/whatsapp--v1.png',
    },
    {
      type: 'instagram' as ChannelType,
      name: 'Instagram',
      icon: Instagram,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100 dark:bg-pink-900/30',
      description: 'Chat via Instagram Direct',
      placeholder: '@username',
      iconUrl: 'https://img.icons8.com/color/96/instagram-new--v1.png',
    },
    {
      type: 'email' as ChannelType,
      name: 'Email',
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      description: 'Receive updates via email',
      placeholder: 'you@example.com',
      iconUrl: 'https://img.icons8.com/color/96/new-post--v1.png',
    },
  ]

  const selectedChannelConfig = channels.find(c => c.type === selectedChannel)

  const handleChannelSelect = (channel: ChannelType) => {
    setSelectedChannel(channel)
    setStep('input')
    setError(null)
  }

  const handleSubmitContact = async () => {
    if (!selectedChannel || !contact) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await linkChannel(selectedChannel, contact)
      
      if (result.success) {
        if (result.requiresVerification) {
          setStep('verify')
        } else {
          setStep('success')
          fireConfetti()
          setTimeout(() => {
            onOpenChange(false)
            resetModal()
          }, 2000)
        }
      } else {
        setError(result.error || 'Failed to link channel')
      }
    } catch (err: any) {
      setError(err?.message || 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!selectedChannel || !verificationCode) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await verifyChannel(selectedChannel as 'whatsapp' | 'instagram', verificationCode)
      
      if (result.success) {
        setStep('success')
        await refreshChannelStatus()
        fireConfetti()
        setTimeout(() => {
          onOpenChange(false)
          resetModal()
        }, 2000)
      } else {
        setError(result.error || 'Invalid verification code')
      }
    } catch (err: any) {
      setError(err?.message || 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const fireConfetti = () => {
    if (confetti) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      })
    }
  }

  const resetModal = () => {
    setStep('select')
    setSelectedChannel(null)
    setContact('')
    setVerificationCode('')
    setError(null)
  }

  const handleBack = () => {
    if (step === 'input') {
      setStep('select')
      setContact('')
      setError(null)
    } else if (step === 'verify') {
      setStep('input')
      setVerificationCode('')
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) resetModal()
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {step === 'select' && 'Connect Channel'}
            {step === 'input' && `Connect ${selectedChannelConfig?.name}`}
            {step === 'verify' && `Verify ${selectedChannelConfig?.name}`}
            {step === 'success' && 'Connected!'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Choose how you\'d like to continue the conversation'}
            {step === 'input' && `Enter your ${selectedChannelConfig?.name} contact details`}
            {step === 'verify' && `Enter the verification code sent to your ${selectedChannelConfig?.name}`}
            {step === 'success' && `${selectedChannelConfig?.name} has been successfully connected`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: Select Channel */}
          {step === 'select' && (
            <div className="space-y-3">
              {channels.map((channel) => (
                <button
                  key={channel.type}
                  onClick={() => handleChannelSelect(channel.type)}
                  className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${channel.bgColor} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <img src={channel.iconUrl} alt={channel.name} className="w-8 h-8" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{channel.name}</h3>
                      <p className="text-sm text-muted-foreground">{channel.description}</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 ${channel.color.replace('text-', 'border-')} group-hover:bg-current group-hover:text-white transition-all flex items-center justify-center`}>
                      <div className="w-2 h-2 rounded-full bg-current"></div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Input Contact */}
          {step === 'input' && selectedChannelConfig && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className={`w-16 h-16 ${selectedChannelConfig.bgColor} rounded-2xl flex items-center justify-center`}>
                  <img src={selectedChannelConfig.iconUrl} alt={selectedChannelConfig.name} className="w-10 h-10" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">
                  {selectedChannel === 'whatsapp' && 'Phone Number'}
                  {selectedChannel === 'instagram' && 'Instagram Handle'}
                  {selectedChannel === 'email' && 'Email Address'}
                </Label>
                <Input
                  id="contact"
                  placeholder={selectedChannelConfig.placeholder}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="text-center text-lg"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Shield className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Secure connection. We'll send a verification code.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleSubmitContact}
                  disabled={!contact || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Verify */}
          {step === 'verify' && selectedChannelConfig && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className={`w-16 h-16 ${selectedChannelConfig.bgColor} rounded-2xl flex items-center justify-center`}>
                  <img src={selectedChannelConfig.iconUrl} alt={selectedChannelConfig.name} className="w-10 h-10" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit code to
                </p>
                <p className="font-semibold">{contact}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-2xl tracking-widest font-mono"
                  maxLength={6}
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleVerify}
                  disabled={verificationCode.length !== 6 || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify'
                  )}
                </Button>
              </div>

              <button
                onClick={handleSubmitContact}
                className="w-full text-sm text-blue-600 hover:text-blue-700 transition-colors"
              >
                Didn't receive code? Resend
              </button>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 'success' && selectedChannelConfig && (
            <div className="py-8 space-y-6">
              <div className="flex items-center justify-center">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  Successfully Connected!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your {selectedChannelConfig.name} is now linked to this conversation
                </p>
              </div>

              <div className="flex items-center justify-center gap-2">
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

