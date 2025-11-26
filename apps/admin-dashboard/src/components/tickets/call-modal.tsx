'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCall } from '@/lib/hooks/use-call';
import { callsApi, type CallRecord } from '@/lib/api/calls-client';
import { useToast } from '@/components/ui/toast';

interface CallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  customerName: string;
  customerPhone?: string | null;
  channelType?: string;
  callType: 'voice' | 'video';
}

export function CallModal({
  open,
  onOpenChange,
  conversationId,
  customerName,
  customerPhone,
  channelType,
  callType,
}: CallModalProps) {
  const { success, error: toastError } = useToast();
  const [call, setCall] = useState<CallRecord | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    setCurrentCall,
    error,
    localStream,
    remoteStream,
    startWebRTC,
    emitMute,
    emitToggleVideo,
    endCall: endCallHook,
  } = useCall({ callId: call?.id, autoConnect: !!call?.id });

  // Initialize call when modal opens
  useEffect(() => {
    if (open && !call) {
      handleStartCall();
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [open]);

  // Update local video stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Update remote video stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Start call duration timer
  useEffect(() => {
    if (call && call.status === 'active') {
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    }
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, [call?.status]);

  const handleStartCall = async () => {
    setIsConnecting(true);
    try {
      // Determine if we should use Twilio (phone channel) or WebRTC (WhatsApp/browser)
      const useTwilio = channelType === 'phone' || channelType === 'sms';
      
      if (useTwilio && customerPhone) {
        // Use Twilio for phone calls
        // startOutbound creates the call record and initiates the Twilio call
        try {
          const callData = await callsApi.startOutbound({
            to: customerPhone,
            conversationId,
            type: callType,
          });
          setCall(callData);
          setCurrentCall(callData);
        } catch (twilioError) {
          console.error('Twilio call initiation failed:', twilioError);
          toastError('Failed to initiate phone call. Please check Twilio configuration.');
          onOpenChange(false);
          return;
        }
      } else {
        // Use WebRTC for browser-based calls (WhatsApp, web, etc.)
        const callData = await callsApi.create({
          conversationId,
          type: callType,
          metadata: {
            provider: 'webrtc',
            channelType,
          },
        });
        setCall(callData);
        setCurrentCall(callData);
        
        // Start WebRTC connection
        try {
          await startWebRTC(true);
        } catch (webrtcError) {
          console.error('WebRTC initialization failed:', webrtcError);
          toastError('Failed to start video call. Please check your camera/microphone permissions.');
          if (callData.id) {
            await callsApi.end(callData.id);
          }
          setCall(null);
          setCurrentCall(null);
          onOpenChange(false);
          return;
        }
      }
      
      success('Call initiated');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start call';
      toastError(errorMessage);
      onOpenChange(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleEndCall = async () => {
    if (!call) return;
    
    try {
      await callsApi.end(call.id);
      await endCallHook(call.id);
      
      // Stop all media tracks
      localStream?.getTracks().forEach((track) => track.stop());
      remoteStream?.getTracks().forEach((track) => track.stop());
      
      setCall(null);
      setCurrentCall(null);
      setCallDuration(0);
      onOpenChange(false);
      success('Call ended');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end call';
      toastError(errorMessage);
    }
  };

  const handleToggleMute = () => {
    if (!localStream) return;
    const audioTracks = localStream.getAudioTracks();
    audioTracks.forEach((track) => {
      track.enabled = isMuted;
    });
    setIsMuted(!isMuted);
    emitMute(!isMuted);
  };

  const handleToggleVideo = () => {
    if (!localStream) return;
    const videoTracks = localStream.getVideoTracks();
    videoTracks.forEach((track) => {
      track.enabled = !isVideoEnabled;
    });
    setIsVideoEnabled(!isVideoEnabled);
    emitToggleVideo(!isVideoEnabled);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <span>{callType === 'video' ? 'Video Call' : 'Voice Call'}</span>
            {call && (
              <Badge variant={call.status === 'active' ? 'default' : 'secondary'}>
                {call.status === 'active' ? formatDuration(callDuration) : call.status}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center p-6 space-y-6">
          {/* Customer Info */}
          <div className="flex flex-col items-center space-y-2">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white text-2xl font-semibold">
                {customerName[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h3 className="font-semibold text-lg">{customerName}</h3>
              {customerPhone && (
                <p className="text-sm text-muted-foreground">{customerPhone}</p>
              )}
            </div>
          </div>

          {/* Video Streams (for video calls) */}
          {callType === 'video' && (
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
              {/* Remote Video */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={cn(
                  'w-full h-full object-cover',
                  !remoteStream && 'hidden'
                )}
              />
              
              {/* Local Video (Picture-in-Picture) */}
              {localStream && (
                <div className="absolute top-4 right-4 w-32 aspect-video bg-black rounded-lg overflow-hidden border-2 border-white">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Connecting/No Stream State */}
              {!remoteStream && (
                <div className="absolute inset-0 flex items-center justify-center">
                  {isConnecting ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                      <p className="text-white text-sm">Connecting...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="bg-gray-700 text-white text-xl">
                          {customerName[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-white text-sm">Waiting for connection...</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Call Status */}
          {callType === 'voice' && (
            <div className="flex flex-col items-center gap-2">
              {isConnecting ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Connecting...</p>
                </>
              ) : call?.status === 'active' ? (
                <>
                  <div className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center">
                    <Phone className="h-8 w-8 text-white" />
                  </div>
                  <p className="text-sm text-muted-foreground">Call in progress</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{error || 'Call status: ' + call?.status}</p>
              )}
            </div>
          )}

          {/* Call Controls */}
          <div className="flex items-center gap-4">
            {/* Mute Toggle */}
            <Button
              variant={isMuted ? 'destructive' : 'outline'}
              size="lg"
              className="h-14 w-14 rounded-full"
              onClick={handleToggleMute}
              disabled={!call || call.status !== 'active'}
            >
              {isMuted ? (
                <MicOff className="h-6 w-6" />
              ) : (
                <Mic className="h-6 w-6" />
              )}
            </Button>

            {/* Video Toggle (for video calls) */}
            {callType === 'video' && (
              <Button
                variant={!isVideoEnabled ? 'destructive' : 'outline'}
                size="lg"
                className="h-14 w-14 rounded-full"
                onClick={handleToggleVideo}
                disabled={!call || call.status !== 'active'}
              >
                {isVideoEnabled ? (
                  <Video className="h-6 w-6" />
                ) : (
                  <VideoOff className="h-6 w-6" />
                )}
              </Button>
            )}

            {/* End Call */}
            <Button
              variant="destructive"
              size="lg"
              className="h-14 w-14 rounded-full"
              onClick={handleEndCall}
              disabled={!call}
            >
              <PhoneOff className="h-6 w-6" />
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="w-full p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

