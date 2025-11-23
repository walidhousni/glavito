'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, MonitorDown, Upload, Clock } from 'lucide-react';
import { useCall } from '@/lib/hooks/use-call';
import { useTranslations } from 'next-intl';

interface CallPanelProps {
  callId: string;
  isCaller?: boolean;
  onEnd?: () => void;
}

export function CallPanel({ callId, isCaller = true, onEnd }: CallPanelProps) {
  const tcalls = useTranslations('calls');
  const { startWebRTC, localStream, remoteStream, endCall, startScreenShare, stopScreenShare, isScreenSharing, sendFile, receivedFiles, emitMute, emitToggleVideo, peerMuted, peerVideoEnabled } = useCall({ callId, autoConnect: true });
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const [startedAt] = useState<Date>(new Date());
  const [elapsed, setElapsed] = useState<number>(0);

  useEffect(() => {
    startWebRTC(isCaller).catch(() => { /* ignore */ });
  }, [callId, isCaller, startWebRTC]);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.getTime()) / 1000)), 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (localVideoRef.current as any).srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (remoteVideoRef.current as any).srcObject = remoteStream;
    }
  }, [remoteStream]);

  const toggleMic = () => {
    const next = !micEnabled;
    setMicEnabled(next);
    localStream?.getAudioTracks().forEach((t) => (t.enabled = next));
    try { emitMute(!next); } catch { /* noop */ }
  };

  const toggleCam = () => {
    const next = !camEnabled;
    setCamEnabled(next);
    localStream?.getVideoTracks().forEach((t) => (t.enabled = next));
    try { emitToggleVideo(next); } catch { /* noop */ }
  };

  const handleEnd = async () => {
    try { await endCall(callId); } catch { /* ignore */ }
    onEnd?.();
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border border-slate-700/60 shadow-2xl overflow-hidden backdrop-blur-xl">
      {/* Video Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 bg-black/20">
        {/* Remote Video */}
        <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-4 left-4">
            <div className="bg-black/80 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-medium">{tcalls('labels.remote')}</span>
              </div>
            </div>
          </div>
          {/* Connection Quality Indicator */}
          <div className="absolute top-4 right-4">
            <div className="bg-black/80 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/20">
              <div className="flex items-center gap-1">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`w-1 h-3 rounded-full ${i < 2 ? 'bg-green-500' : 'bg-gray-500'}`} />
                ))}
              </div>
            </div>
          </div>
          {/* Peer status badges */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <div className={`px-2 py-1 text-xs rounded-md ${peerMuted ? 'bg-red-600/70 text-white' : 'bg-emerald-600/70 text-white'}`}>{peerMuted ? 'Peer muted' : 'Peer mic on'}</div>
            <div className={`px-2 py-1 text-xs rounded-md ${peerVideoEnabled ? 'bg-emerald-600/70 text-white' : 'bg-yellow-600/70 text-white'}`}>{peerVideoEnabled ? 'Video on' : 'Video off'}</div>
          </div>
        </div>
        
        {/* Local Video */}
        <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900 overflow-hidden">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute top-4 left-4">
            <div className="bg-black/80 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-white text-sm font-medium">{tcalls('labels.you')}</span>
              </div>
            </div>
          </div>
          {/* Camera/Mic Status */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <div className={`p-2 rounded-xl backdrop-blur-sm border ${micEnabled ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'}`}>
              {micEnabled ? <Mic className="h-4 w-4 text-green-400" /> : <MicOff className="h-4 w-4 text-red-400" />}
            </div>
            <div className={`p-2 rounded-xl backdrop-blur-sm border ${camEnabled ? 'bg-green-500/20 border-green-500/30' : 'bg-red-500/20 border-red-500/30'}`}>
              {camEnabled ? <Video className="h-4 w-4 text-green-400" /> : <VideoOff className="h-4 w-4 text-red-400" />}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modern Control Bar */}
      <div className="p-6 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border-t border-slate-700/60">
        <div className="flex items-center justify-center gap-4">
          {/* Microphone Toggle */}
          <Button
            size="lg"
            className={`h-14 w-14 rounded-2xl shadow-lg transition-all duration-200 ${
              micEnabled 
                ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600' 
                : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/25'
            }`}
            onClick={toggleMic}
          >
            {micEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </Button>

          {/* Camera Toggle */}
          <Button
            size="lg"
            className={`h-14 w-14 rounded-2xl shadow-lg transition-all duration-200 ${
              camEnabled 
                ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600' 
                : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/25'
            }`}
            onClick={toggleCam}
          >
            {camEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>

          {/* Screen Share */}
          <Button
            size="lg"
            className={`h-14 w-14 rounded-2xl shadow-lg transition-all duration-200 ${
              isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
                : 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
            }`}
            onClick={() => isScreenSharing ? stopScreenShare() : startScreenShare()}
          >
            {isScreenSharing ? <MonitorDown className="h-6 w-6" /> : <MonitorUp className="h-6 w-6" />}
          </Button>

          {/* File Upload */}
          <label className="inline-flex items-center">
            <input type="file" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) await sendFile(f);
            }} />
            <Button asChild size="lg" className="h-14 w-14 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 shadow-lg transition-all duration-200">
              <span><Upload className="h-6 w-6" /></span>
            </Button>
          </label>

          {/* End Call */}
          <Button
            size="lg"
            className="h-14 w-14 rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/25 transition-all duration-200"
            onClick={handleEnd}
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
        
        {/* Call Duration & Status */}
        <div className="flex items-center justify-center mt-4 gap-6 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Connected</span>
          </div>
          <div>•</div>
          <div>HD Quality</div>
          <div>•</div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{String(Math.floor(elapsed / 60)).padStart(2,'0')}:{String(elapsed % 60).padStart(2,'0')}</span>
          </div>
        </div>
      </div>
      {/* Invite Participant */}
      <div className="px-6 pb-3">
        <label className="text-xs text-slate-500">Invite participant (userId)</label>
        <div className="flex gap-2 mt-1">
          <input id="invite-user" className="flex-1 h-9 rounded-md border px-2 bg-slate-50/50" placeholder="user_..." />
          <Button size="sm" onClick={async () => {
            try {
              const el = document.getElementById('invite-user') as HTMLInputElement | null;
              if (!el) return;
              const userId = (el.value || '').trim();
              if (!userId) return;
              const { callsApi } = await import('@/lib/api/calls-client');
              await callsApi.addParticipant(callId, { userId });
              el.value = '';
            } catch { /* noop */ }
          }}>Invite</Button>
        </div>
      </div>
      {receivedFiles.length > 0 && (
        <div className="mt-3 text-sm">
          <div className="font-medium mb-1 text-slate-900 dark:text-slate-100">{tcalls('files.receivedFiles')}</div>
          <ul className="list-disc ml-5 space-y-1">
            {receivedFiles.map((f, i) => (
              <li key={i} className="text-slate-700 dark:text-slate-300"><a className="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" href={f.url} download={f.name}>{f.name}</a> <span className="opacity-60">({(f.size/1024).toFixed(1)} KB)</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}


