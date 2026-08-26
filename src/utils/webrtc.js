// WebRTC Multi-Peer Voice Chat Manager for Indian Monopoly

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:openrelay.metered.ca:80" },
    { urls: "stun:stun.relay.metered.ca:80" }
  ]
};

class VoiceChatManager {
  constructor() {
    this.socket = null;
    this.roomId = null;
    this.playerId = null;
    this.localStream = null;
    this.streamPromise = null;
    this.audioContext = null;
    this.playbackAudioCtx = null;
    this.analyser = null;
    this.peers = new Map(); // socketId -> { connection, playerId, audioEl, gainNode }
    this.voiceStates = new Map(); // playerId -> { isMuted, isDeafened, isSpeaking }
    
    this.isMuted = false;
    this.isDeafened = false;
    this.isSpeaking = false;
    this.micAvailable = false;
    this.isActive = false;
    this.onVoiceStatesChange = null;

    this.speakingSilenceTimeout = null;
    this.analyserInterval = null;

    // Universal audio unlock listener
    if (typeof window !== "undefined") {
      const unlockAudio = () => {
        if (this.audioContext && this.audioContext.state === "suspended") {
          this.audioContext.resume().catch(() => {});
        }
        if (this.playbackAudioCtx && this.playbackAudioCtx.state === "suspended") {
          this.playbackAudioCtx.resume().catch(() => {});
        }
        this.peers.forEach(({ audioEl }) => {
          if (audioEl && audioEl.paused) {
            audioEl.play().catch(() => {});
          }
        });
      };
      window.addEventListener("click", unlockAudio, { passive: true });
      window.addEventListener("touchstart", unlockAudio, { passive: true });
      window.addEventListener("keydown", unlockAudio, { passive: true });
    }
  }

  async joinVoice(socket, roomId, playerId, onVoiceStatesChange) {
    this.socket = socket;
    this.roomId = roomId;
    this.playerId = playerId;
    this.onVoiceStatesChange = onVoiceStatesChange;
    this.isActive = true;

    // 1. Request Microphone Stream
    this.streamPromise = this.acquireMicrophone();
    await this.streamPromise;

    // Set initial self voice state
    this.setPlayerVoiceState(this.playerId, {
      isMuted: this.isMuted,
      isDeafened: this.isDeafened,
      isSpeaking: false
    });

    // 2. Setup Socket Signaling Listeners
    this.setupSignalingListeners();

    // 3. Emit voice-join to room (Existing peers in the room will initiate offers to this new peer)
    this.socket.emit("voice-join", { roomId, playerId });

    this.broadcastVoiceState();
  }

  async acquireMicrophone() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          },
          video: false
        });
        this.micAvailable = true;
        this.setupAudioAnalyser();
      }
    } catch (err) {
      console.warn("Microphone access unavailable or denied. Entering listen-only mode.", err);
      this.micAvailable = false;
      this.isMuted = true;
    }
  }

  setupAudioAnalyser() {
    if (!this.localStream) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.audioContext = new AudioCtx();
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume().catch(() => {});
      }

      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = 0.3;
      source.connect(this.analyser);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      this.analyserInterval = setInterval(() => {
        if (!this.isActive || this.isMuted || this.isDeafened) {
          if (this.isSpeaking) {
            this.isSpeaking = false;
            this.setPlayerVoiceState(this.playerId, { isSpeaking: false });
            this.broadcastVoiceState();
          }
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // Volume threshold for active speaking detection
        const SPEAKING_THRESHOLD = 14;
        if (average > SPEAKING_THRESHOLD) {
          if (!this.isSpeaking) {
            this.isSpeaking = true;
            this.setPlayerVoiceState(this.playerId, { isSpeaking: true });
            this.broadcastVoiceState();
          }
          if (this.speakingSilenceTimeout) {
            clearTimeout(this.speakingSilenceTimeout);
            this.speakingSilenceTimeout = null;
          }
        } else if (this.isSpeaking && !this.speakingSilenceTimeout) {
          this.speakingSilenceTimeout = setTimeout(() => {
            this.isSpeaking = false;
            this.setPlayerVoiceState(this.playerId, { isSpeaking: false });
            this.broadcastVoiceState();
            this.speakingSilenceTimeout = null;
          }, 250);
        }
      }, 80);
    } catch (e) {
      console.warn("Audio analyser setup error", e);
    }
  }

  setupSignalingListeners() {
    if (!this.socket) return;

    // Existing peer sees new peer joined -> existing peer initiates offer
    this.socket.on("voice-peer-joined", async ({ socketId, playerId }) => {
      await this.streamPromise;
      this.initiatePeerConnection(socketId, playerId);
    });

    // Received offer from peer -> answer
    this.socket.on("voice-offer", async ({ callerSocketId, callerPlayerId, offer }) => {
      await this.streamPromise;
      const pc = this.createPeerConnection(callerSocketId, callerPlayerId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.socket.emit("voice-answer", {
          targetSocketId: callerSocketId,
          answeringPlayerId: this.playerId,
          answer
        });
      } catch (err) {
        console.error("Error answering WebRTC offer:", err);
      }
    });

    // Received answer from peer
    this.socket.on("voice-answer", async ({ answeringSocketId, answer }) => {
      const peer = this.peers.get(answeringSocketId);
      if (peer && peer.connection) {
        try {
          if (peer.connection.signalingState !== "closed" && peer.connection.signalingState === "have-local-offer") {
            await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
          }
        } catch (err) {
          console.error("Error setting remote description from answer:", err);
        }
      }
    });

    // Received ICE candidate
    this.socket.on("voice-ice-candidate", async ({ fromSocketId, candidate }) => {
      const peer = this.peers.get(fromSocketId);
      if (peer && peer.connection && candidate) {
        try {
          await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      }
    });

    // Peer voice state update (mute, deafen, speaking)
    this.socket.on("voice-state-update", ({ playerId, isMuted, isDeafened, isSpeaking }) => {
      if (playerId) {
        this.setPlayerVoiceState(playerId, { isMuted, isDeafened, isSpeaking });
      }
    });

    // Peer left voice
    this.socket.on("voice-peer-left", ({ socketId, playerId }) => {
      this.closePeer(socketId);
      if (playerId) {
        this.voiceStates.delete(playerId);
        if (this.onVoiceStatesChange) {
          this.onVoiceStatesChange(new Map(this.voiceStates));
        }
      }
    });
  }

  createPeerConnection(targetSocketId, targetPlayerId) {
    if (this.peers.has(targetSocketId)) {
      this.closePeer(targetSocketId);
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Create HTMLAudioElement for peer
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    audioEl.playsInline = true;
    audioEl.muted = this.isDeafened;
    audioEl.setAttribute("data-peer-socket", targetSocketId);
    document.body.appendChild(audioEl);

    const peerObj = {
      connection: pc,
      playerId: targetPlayerId,
      audioEl,
      gainNode: null
    };

    this.peers.set(targetSocketId, peerObj);

    // Attach local audio tracks
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Handle incoming audio stream
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];
        audioEl.srcObject = remoteStream;
        const playPromise = audioEl.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.log("Audio autoplay prevented, will resume on click:", err);
          });
        }

        // Also route through Web Audio API for direct hardware output
        try {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) {
            if (!this.playbackAudioCtx || this.playbackAudioCtx.state === "closed") {
              this.playbackAudioCtx = new AudioCtx();
            }
            if (this.playbackAudioCtx.state === "suspended") {
              this.playbackAudioCtx.resume().catch(() => {});
            }
            const source = this.playbackAudioCtx.createMediaStreamSource(remoteStream);
            const gainNode = this.playbackAudioCtx.createGain();
            gainNode.gain.value = this.isDeafened ? 0 : 1.0;
            source.connect(gainNode);
            gainNode.connect(this.playbackAudioCtx.destination);
            peerObj.gainNode = gainNode;
          }
        } catch (e) {
          console.log("Web Audio routing fallback to audio element", e);
        }
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && this.socket) {
        this.socket.emit("voice-ice-candidate", {
          targetSocketId,
          candidate: event.candidate
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
        this.closePeer(targetSocketId);
      }
    };

    return pc;
  }

  async initiatePeerConnection(targetSocketId, targetPlayerId) {
    await this.streamPromise;
    const pc = this.createPeerConnection(targetSocketId, targetPlayerId);
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      });
      await pc.setLocalDescription(offer);

      this.socket.emit("voice-offer", {
        targetSocketId,
        callerPlayerId: this.playerId,
        offer
      });
    } catch (err) {
      console.error("Error creating WebRTC offer:", err);
    }
  }

  setPlayerVoiceState(playerId, newState) {
    if (!playerId) return;
    const current = this.voiceStates.get(playerId) || { isMuted: false, isDeafened: false, isSpeaking: false };
    const updated = { ...current, ...newState };
    this.voiceStates.set(playerId, updated);
    if (this.onVoiceStatesChange) {
      this.onVoiceStatesChange(new Map(this.voiceStates));
    }
  }

  broadcastVoiceState() {
    if (!this.socket || !this.roomId) return;
    this.socket.emit("voice-state-update", {
      roomId: this.roomId,
      playerId: this.playerId,
      isMuted: this.isMuted,
      isDeafened: this.isDeafened,
      isSpeaking: this.isSpeaking
    });
  }

  toggleMic() {
    this.isMuted = !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.isMuted;
      });
    }
    if (this.isMuted) {
      this.isSpeaking = false;
    }
    this.setPlayerVoiceState(this.playerId, { isMuted: this.isMuted, isSpeaking: this.isSpeaking });
    this.broadcastVoiceState();
    return this.isMuted;
  }

  toggleDeafen() {
    this.isDeafened = !this.isDeafened;
    this.peers.forEach(({ audioEl, gainNode }) => {
      if (audioEl) {
        audioEl.muted = this.isDeafened;
      }
      if (gainNode) {
        gainNode.gain.value = this.isDeafened ? 0 : 1.0;
      }
    });

    if (this.isDeafened && !this.isMuted) {
      this.toggleMic();
    }

    this.setPlayerVoiceState(this.playerId, { isDeafened: this.isDeafened });
    this.broadcastVoiceState();
    return this.isDeafened;
  }

  closePeer(socketId) {
    const peer = this.peers.get(socketId);
    if (peer) {
      if (peer.connection) {
        peer.connection.close();
      }
      if (peer.audioEl) {
        peer.audioEl.srcObject = null;
        peer.audioEl.remove();
      }
      this.peers.delete(socketId);
    }
  }

  leaveVoice() {
    this.isActive = false;
    if (this.analyserInterval) clearInterval(this.analyserInterval);
    if (this.speakingSilenceTimeout) clearTimeout(this.speakingSilenceTimeout);

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.audioContext && this.audioContext.state !== "closed") {
      this.audioContext.close().catch(() => {});
    }

    if (this.playbackAudioCtx && this.playbackAudioCtx.state !== "closed") {
      this.playbackAudioCtx.close().catch(() => {});
    }

    this.peers.forEach((_, socketId) => this.closePeer(socketId));
    this.peers.clear();

    if (this.socket && this.roomId) {
      this.socket.emit("voice-leave", { roomId: this.roomId, playerId: this.playerId });
    }

    this.voiceStates.clear();
    if (this.onVoiceStatesChange) {
      this.onVoiceStatesChange(new Map());
    }
  }
}

export const voiceManager = new VoiceChatManager();
