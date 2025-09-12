'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MonitorUp, MonitorDown, Upload } from 'lucide-react';
import { useCall } from '@/lib/hooks/use-call';
import { useTranslations } from 'next-intl';

interface CallPanelProps {
  callId: string;
  isCaller?: boolean;
  onEnd?: () => void;
}

export function CallPanel({ callId, isCaller = true, onEnd }: CallPanelProps) {
  const tcalls = useTranslations('calls');
  const { startWebRTC, localStream, remoteStream, endCall, startScreenShare, stopScreenShare, isScreenSharing, sendFile, receivedFiles } = useCall({ callId, autoConnect: true });
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    startWebRTC(isCaller).catch(() => { /* ignore */ });
  }, [callId, isCaller, startWebRTC]);

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
  };

  const toggleCam = () => {
    const next = !camEnabled;
    setCamEnabled(next);
    localStream?.getVideoTracks().forEach((t) => (t.enabled = next));
  };

  const handleEnd = async () => {
    try { await endCall(callId); } catch { /* ignore */ }
    onEnd?.();
  };

  return (
    <div className="mt-3 rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-background dark:bg-slate-800">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative rounded overflow-hidden bg-black">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-48 object-cover" />
          <div className="absolute top-2 left-2 text-xs px-2 py-1 bg-black/60 text-white rounded">{tcalls('labels.remote')}</div>
        </div>
        <div className="relative rounded overflow-hidden bg-black">
          <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-48 object-cover" />
          <div className="absolute top-2 left-2 text-xs px-2 py-1 bg-black/60 text-white rounded">{tcalls('labels.you')}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button variant={micEnabled ? 'secondary' : 'destructive'} size="sm" onClick={toggleMic}>
          {micEnabled ? <Mic className="h-4 w-4 mr-2" /> : <MicOff className="h-4 w-4 mr-2" />}
          {micEnabled ? tcalls('controls.mute') : tcalls('controls.unmute')}
        </Button>
        <Button variant={camEnabled ? 'secondary' : 'destructive'} size="sm" onClick={toggleCam}>
          {camEnabled ? <Video className="h-4 w-4 mr-2" /> : <VideoOff className="h-4 w-4 mr-2" />}
          {camEnabled ? tcalls('controls.cameraOff') : tcalls('controls.cameraOn')}
        </Button>
        {!isScreenSharing ? (
          <Button variant="secondary" size="sm" onClick={() => startScreenShare()}>
            <MonitorUp className="h-4 w-4 mr-2" /> {tcalls('controls.shareScreen')}
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => stopScreenShare()}>
            <MonitorDown className="h-4 w-4 mr-2" /> {tcalls('controls.stopShare')}
          </Button>
        )}
        <label className="inline-flex items-center">
          <input type="file" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) await sendFile(f);
          }} />
          <Button asChild variant="secondary" size="sm">
            <span><Upload className="h-4 w-4 mr-2" /> {tcalls('controls.sendFile')}</span>
          </Button>
        </label>
        <Button variant="destructive" size="sm" onClick={handleEnd}>
          <PhoneOff className="h-4 w-4 mr-2" /> {tcalls('controls.end')}
        </Button>
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


