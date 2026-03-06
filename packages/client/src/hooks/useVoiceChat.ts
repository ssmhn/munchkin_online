import { create } from 'zustand';
import type { GameWsClient } from '../ws/WsClient';
import type { S2C_Message } from '@munchkin/shared';

// --- Constants ---

const STUN_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/** RMS threshold to consider the user "speaking" */
const SPEAKING_THRESHOLD = 0.015;
/** How often we check the audio analyser (ms) */
const ANALYSER_INTERVAL = 100;

// --- Types ---

interface PeerEntry {
  connection: RTCPeerConnection;
  remoteStream: MediaStream | null;
}

interface VoiceChatState {
  /** Whether the local microphone is muted */
  muted: boolean;
  /** Whether voice chat is active (stream acquired) */
  active: boolean;
  /** Set of player IDs currently speaking */
  speakingPlayers: Set<string>;
  /** Mute state of remote players */
  remoteMuteState: Record<string, boolean>;
  /** Error message if voice init failed */
  error: string | null;
}

interface VoiceChatStore extends VoiceChatState {
  setMuted: (muted: boolean) => void;
  setActive: (active: boolean) => void;
  setSpeaking: (playerId: string, speaking: boolean) => void;
  setRemoteMuteState: (playerId: string, muted: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useVoiceChatStore = create<VoiceChatStore>((set) => ({
  muted: true,
  active: false,
  speakingPlayers: new Set(),
  remoteMuteState: {},
  error: null,

  setMuted: (muted) => set({ muted }),
  setActive: (active) => set({ active }),
  setSpeaking: (playerId, speaking) =>
    set((state) => {
      const next = new Set(state.speakingPlayers);
      if (speaking) {
        next.add(playerId);
      } else {
        next.delete(playerId);
      }
      return { speakingPlayers: next };
    }),
  setRemoteMuteState: (playerId, muted) =>
    set((state) => ({
      remoteMuteState: { ...state.remoteMuteState, [playerId]: muted },
    })),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      muted: true,
      active: false,
      speakingPlayers: new Set(),
      remoteMuteState: {},
      error: null,
    }),
}));

// --- Voice Chat Manager (imperative, manages WebRTC lifecycle) ---

export class VoiceChatManager {
  private localStream: MediaStream | null = null;
  private peers: Map<string, PeerEntry> = new Map();
  private audioContext: AudioContext | null = null;
  private localAnalyserTimer: ReturnType<typeof setInterval> | null = null;
  private remoteAnalyserTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private wsClient: GameWsClient | null = null;
  private localPlayerId: string = '';

  private get store() {
    return useVoiceChatStore.getState();
  }

  /**
   * Initialize voice chat: acquire mic, set up local speaking detection.
   */
  async init(wsClient: GameWsClient, localPlayerId: string): Promise<void> {
    this.wsClient = wsClient;
    this.localPlayerId = localPlayerId;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // Start muted by default
      this.setLocalMuted(true);

      this.store.setActive(true);
      this.store.setError(null);

      // Set up local speaking detection
      this.setupLocalSpeakingDetection();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access microphone';
      console.error('[VoiceChat] Mic access error:', message);
      this.store.setError(message);
    }
  }

  /**
   * Handle an incoming voice-related S2C message.
   */
  async handleMessage(msg: S2C_Message): Promise<void> {
    switch (msg.type) {
      case 'VOICE_OFFER':
        await this.handleOffer(msg.payload.fromPlayerId, msg.payload.sdp);
        break;
      case 'VOICE_ANSWER':
        await this.handleAnswer(msg.payload.fromPlayerId, msg.payload.sdp);
        break;
      case 'VOICE_ICE_CANDIDATE':
        await this.handleIceCandidate(
          msg.payload.fromPlayerId,
          msg.payload.candidate,
          msg.payload.sdpMid,
          msg.payload.sdpMLineIndex
        );
        break;
      case 'VOICE_STATE':
        this.store.setRemoteMuteState(msg.payload.playerId, msg.payload.muted);
        break;
    }
  }

  /**
   * Create a peer connection and send an offer to a remote player.
   */
  async connectToPeer(remotePlayerId: string): Promise<void> {
    if (!this.localStream || !this.wsClient) return;
    if (this.peers.has(remotePlayerId)) return;

    const pc = this.createPeerConnection(remotePlayerId);

    // Add local tracks
    for (const track of this.localStream.getTracks()) {
      pc.addTrack(track, this.localStream);
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    this.wsClient.send({
      type: 'VOICE_OFFER',
      payload: {
        targetPlayerId: remotePlayerId,
        sdp: offer.sdp!,
      },
    });
  }

  /**
   * Toggle local mute state.
   */
  toggleMute(): void {
    const newMuted = !this.store.muted;
    this.setLocalMuted(newMuted);
  }

  /**
   * Set local mute state and broadcast via WS.
   */
  setLocalMuted(muted: boolean): void {
    this.store.setMuted(muted);

    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        track.enabled = !muted;
      }
    }

    if (muted) {
      this.store.setSpeaking(this.localPlayerId, false);
    }

    this.wsClient?.send({
      type: 'VOICE_STATE',
      payload: { muted },
    });
  }

  /**
   * Disconnect a single peer.
   */
  disconnectPeer(remotePlayerId: string): void {
    const peer = this.peers.get(remotePlayerId);
    if (peer) {
      peer.connection.close();
      this.peers.delete(remotePlayerId);
    }

    const timer = this.remoteAnalyserTimers.get(remotePlayerId);
    if (timer) {
      clearInterval(timer);
      this.remoteAnalyserTimers.delete(remotePlayerId);
    }

    this.store.setSpeaking(remotePlayerId, false);
  }

  /**
   * Full cleanup: close all peers, stop stream, reset store.
   */
  destroy(): void {
    // Close all peer connections
    for (const [id] of this.peers) {
      this.disconnectPeer(id);
    }
    this.peers.clear();

    // Stop local analyser
    if (this.localAnalyserTimer) {
      clearInterval(this.localAnalyserTimer);
      this.localAnalyserTimer = null;
    }

    // Stop local stream tracks
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.wsClient = null;
    this.store.reset();
  }

  /** List of connected peer IDs */
  get connectedPeerIds(): string[] {
    return Array.from(this.peers.keys());
  }

  // --- Private methods ---

  private createPeerConnection(remotePlayerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(STUN_SERVERS);

    const entry: PeerEntry = { connection: pc, remoteStream: null };
    this.peers.set(remotePlayerId, entry);

    pc.onicecandidate = (event) => {
      if (event.candidate && this.wsClient) {
        this.wsClient.send({
          type: 'VOICE_ICE_CANDIDATE',
          payload: {
            targetPlayerId: remotePlayerId,
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
          },
        });
      }
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) {
        entry.remoteStream = stream;
        this.playRemoteAudio(remotePlayerId, stream);
        this.setupRemoteSpeakingDetection(remotePlayerId, stream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.warn(`[VoiceChat] Peer ${remotePlayerId} connection: ${pc.connectionState}`);
        this.disconnectPeer(remotePlayerId);
      }
    };

    return pc;
  }

  private async handleOffer(fromPlayerId: string, sdp: string): Promise<void> {
    if (!this.localStream || !this.wsClient) return;

    // If we already have a connection to this peer, close it first
    if (this.peers.has(fromPlayerId)) {
      this.disconnectPeer(fromPlayerId);
    }

    const pc = this.createPeerConnection(fromPlayerId);

    // Add local tracks
    for (const track of this.localStream.getTracks()) {
      pc.addTrack(track, this.localStream);
    }

    await pc.setRemoteDescription({ type: 'offer', sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    this.wsClient.send({
      type: 'VOICE_ANSWER',
      payload: {
        targetPlayerId: fromPlayerId,
        sdp: answer.sdp!,
      },
    });
  }

  private async handleAnswer(fromPlayerId: string, sdp: string): Promise<void> {
    const peer = this.peers.get(fromPlayerId);
    if (!peer) return;
    await peer.connection.setRemoteDescription({ type: 'answer', sdp });
  }

  private async handleIceCandidate(
    fromPlayerId: string,
    candidate: string,
    sdpMid: string | null,
    sdpMLineIndex: number | null
  ): Promise<void> {
    const peer = this.peers.get(fromPlayerId);
    if (!peer) return;
    await peer.connection.addIceCandidate({ candidate, sdpMid, sdpMLineIndex });
  }

  private playRemoteAudio(remotePlayerId: string, stream: MediaStream): void {
    // Create an invisible audio element to play the remote stream
    const audio = new Audio();
    audio.srcObject = stream;
    audio.autoplay = true;
    // Needed in some browsers
    audio.play().catch((err) => {
      console.warn(`[VoiceChat] Auto-play blocked for ${remotePlayerId}:`, err);
    });
  }

  private setupLocalSpeakingDetection(): void {
    if (!this.localStream) return;

    this.audioContext = new AudioContext();
    const source = this.audioContext.createMediaStreamSource(this.localStream);
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Float32Array(analyser.fftSize);

    this.localAnalyserTimer = setInterval(() => {
      if (this.store.muted) return;
      analyser.getFloatTimeDomainData(dataArray);
      const rms = Math.sqrt(
        dataArray.reduce((sum, v) => sum + v * v, 0) / dataArray.length
      );
      this.store.setSpeaking(this.localPlayerId, rms > SPEAKING_THRESHOLD);
    }, ANALYSER_INTERVAL);
  }

  private setupRemoteSpeakingDetection(
    remotePlayerId: string,
    stream: MediaStream
  ): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const source = this.audioContext.createMediaStreamSource(stream);
    const analyser = this.audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Float32Array(analyser.fftSize);

    const timer = setInterval(() => {
      analyser.getFloatTimeDomainData(dataArray);
      const rms = Math.sqrt(
        dataArray.reduce((sum, v) => sum + v * v, 0) / dataArray.length
      );
      this.store.setSpeaking(remotePlayerId, rms > SPEAKING_THRESHOLD);
    }, ANALYSER_INTERVAL);

    this.remoteAnalyserTimers.set(remotePlayerId, timer);
  }
}
