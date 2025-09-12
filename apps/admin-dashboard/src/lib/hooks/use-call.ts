'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { callsApi, type CallRecord } from '@/lib/api/calls-client';

type PeerConnection = RTCPeerConnection;
type MediaStreamRef = MediaStream;

export interface UseCallOptions {
  callId?: string;
  autoConnect?: boolean;
}

export function useCall({ callId, autoConnect = true }: UseCallOptions = {}) {
  const [currentCall, setCurrentCall] = useState<CallRecord | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<PeerConnection | null>(null);
  const localStreamRef = useRef<MediaStreamRef | null>(null);
  const remoteStreamRef = useRef<MediaStreamRef | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStreamRef | null>(null);
  const [localStream, setLocalStream] = useState<MediaStreamRef | null>(null);
  const screenStreamRef = useRef<MediaStreamRef | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const [receivedFiles, setReceivedFiles] = useState<Array<{ name: string; size: number; url: string }>>([]);

  useEffect(() => {
    if (!autoConnect || !callId) return;
    const authStorage = typeof window !== 'undefined' ? window.localStorage.getItem('auth-storage') : null;
    const token = authStorage ? (JSON.parse(authStorage)?.state?.tokens?.accessToken as string | undefined) : undefined;
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');
    const socket = io(`${base}/calls`, { auth: { token }, transports: ['websocket', 'polling'], timeout: 10000 });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      socket.emit('join-call', { callId });
    });
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', (e) => setError(e.message));

    return () => {
      socket.emit('leave-call', { callId });
      socket.disconnect();
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    };
  }, [callId, autoConnect]);

  const sendSignal = useCallback((payload: { type: 'offer' | 'answer' | 'candidate'; data: RTCSessionDescriptionInit | RTCIceCandidateInit; to?: string }) => {
    if (!socketRef.current || !callId) return;
    socketRef.current.emit('signal', { callId, ...payload });
  }, [callId]);

  const createCall = useCallback(async (params: { conversationId?: string; type: 'voice' | 'video'; metadata?: Record<string, unknown> }) => {
    const call = await callsApi.create(params);
    setCurrentCall(call);
    return call;
  }, []);

  const endCall = useCallback(async (id?: string) => {
    const target = id || currentCall?.id;
    if (!target) return null;
    const updated = await callsApi.end(target);
    setCurrentCall(updated);
    return updated;
  }, [currentCall?.id]);

  const initPeer = useCallback(async (audio = true, video = true) => {
    const iceServers: RTCIceServer[] = [];
    const stun = (process.env.NEXT_PUBLIC_STUN_URLS || '').split(',').map((u) => u.trim()).filter(Boolean);
    if (stun.length) iceServers.push({ urls: stun });
    const turnUrls = (process.env.NEXT_PUBLIC_TURN_URLS || '').split(',').map((u) => u.trim()).filter(Boolean);
    if (turnUrls.length) {
      iceServers.push({
        urls: turnUrls,
        username: process.env.NEXT_PUBLIC_TURN_USERNAME || undefined,
        credential: process.env.NEXT_PUBLIC_TURN_CREDENTIAL || undefined,
      });
    }

    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal({ type: 'candidate', data: e.candidate });
    };

    pc.ontrack = (e) => {
      const [stream] = e.streams;
      remoteStreamRef.current = stream;
      setRemoteStream(stream);
    };

    // Data channel for file transfer (callee path)
    pc.ondatachannel = (evt) => {
      const channel = evt.channel;
      dataChannelRef.current = channel;
      setupDataChannelHandlers(channel);
    };

    // Media
    const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
    localStreamRef.current = stream;
    setLocalStream(stream);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    // WS signaling handlers
    socketRef.current?.on('signal', async (payload: { type: 'offer' | 'answer' | 'candidate'; data: RTCSessionDescriptionInit | RTCIceCandidateInit }) => {
      if (!pcRef.current) return;
      if (payload.type === 'offer') {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.data as RTCSessionDescriptionInit));
        const answer = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answer);
        sendSignal({ type: 'answer', data: answer });
      } else if (payload.type === 'answer') {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.data as RTCSessionDescriptionInit));
      } else if (payload.type === 'candidate') {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.data as RTCIceCandidateInit));
        } catch (e) {
          console.error('addIceCandidate failed', e);
        }
      }
    });

    return pc;
  }, [sendSignal]);

  const startWebRTC = useCallback(async (asCaller: boolean) => {
    if (!callId) return;
    const pc = await initPeer(true, true);
    // Data channel for file transfer (caller path)
    if (asCaller) {
      const channel = pc.createDataChannel('file');
      dataChannelRef.current = channel;
      setupDataChannelHandlers(channel);
    }
    if (asCaller) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({ type: 'offer', data: offer });
    } else {
      // callee waits for offer via WS handler above
    }
  }, [callId, initPeer, sendSignal]);

  function setupDataChannelHandlers(channel: RTCDataChannel) {
    channel.binaryType = 'arraybuffer';
    // Receiving state
    let currentFile: { name: string; size: number; received: number; chunks: ArrayBuffer[] } | null = null;
    channel.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        try {
          const meta = JSON.parse(ev.data) as { type: 'file-meta'; name: string; size: number };
          if (meta?.type === 'file-meta' && meta.name && meta.size >= 0) {
            currentFile = { name: meta.name, size: meta.size, received: 0, chunks: [] };
          }
        } catch (e) {
          console.error('file-meta parse failed', e);
        }
      } else {
        if (!currentFile) return;
        const chunk = ev.data as ArrayBuffer;
        currentFile.chunks.push(chunk);
        currentFile.received += (chunk as ArrayBuffer).byteLength;
        if (currentFile.received >= currentFile.size) {
          const blob = new Blob(currentFile.chunks);
          const url = URL.createObjectURL(blob);
          setReceivedFiles((prev) => prev.concat({ name: currentFile?.name || 'file', size: currentFile?.size || blob.size, url }));
          currentFile = null;
        }
      }
    };
  }

  const stopScreenShare = useCallback(async () => {
    if (!pcRef.current) return;
    const screen = screenStreamRef.current;
    screen?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);
    // Restore camera
    const camTrack = localStreamRef.current?.getVideoTracks()[0] || null;
    const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
    if (sender && camTrack) await sender.replaceTrack(camTrack);
  }, []);

  const startScreenShare = useCallback(async () => {
    if (!pcRef.current) return;
    const screen = await (navigator.mediaDevices as unknown as { getDisplayMedia: (constraints?: MediaStreamConstraints) => Promise<MediaStream> }).getDisplayMedia({ video: true, audio: false });
    screenStreamRef.current = screen;
    setIsScreenSharing(true);
    const screenTrack = screen.getVideoTracks()[0];
    const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
    if (sender) await sender.replaceTrack(screenTrack);
    screenTrack.onended = async () => {
      await stopScreenShare();
    };
  }, [stopScreenShare]);

  const sendFile = useCallback(async (file: File) => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') return;
    const buffer = await file.arrayBuffer();
    const header = JSON.stringify({ type: 'file-meta', name: file.name, size: buffer.byteLength });
    dataChannelRef.current.send(header);
    const chunkSize = 16 * 1024;
    for (let offset = 0; offset < buffer.byteLength; offset += chunkSize) {
      const chunk = buffer.slice(offset, Math.min(offset + chunkSize, buffer.byteLength));
      dataChannelRef.current.send(chunk);
    }
  }, []);

  return { currentCall, setCurrentCall, isConnected, error, sendSignal, createCall, endCall, startWebRTC, localStream, remoteStream, startScreenShare, stopScreenShare, isScreenSharing, sendFile, receivedFiles };
}


