import cashRegisterMp3 from "../assets/sounds/cash-register.mp3";

// High-Fidelity Audio Engine with Authentic Cash Register Recording
class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.cashBuffer = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
        this.loadAudioFiles();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  async loadAudioFiles() {
    try {
      if (!this.cashBuffer && this.ctx) {
        const res = await fetch(cashRegisterMp3);
        const arrayBuf = await res.arrayBuffer();
        this.cashBuffer = await this.ctx.decodeAudioData(arrayBuf);
      }
    } catch (e) {
      console.warn("Audio buffer load error", e);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Original, tactile wooden pawn step sound
  playTokenStep() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = "sine";
      osc.frequency.setValueAtTime(170 + Math.random() * 30, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(75, this.ctx.currentTime + 0.06);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.22, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.06);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.06);
    } catch (e) {
      console.warn(e);
    }
  }

  // Original, physical dice tumble sound
  playDiceRoll() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;

      for (let i = 0; i < 7; i++) {
        setTimeout(() => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(160 + Math.random() * 140, this.ctx.currentTime);
          gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.05);
        }, i * 50);
      }
    } catch (e) {
      console.warn(e);
    }
  }

  // Authentic Recorded Cash Register (Ka-Ching) Sound Effect
  playCashRegister() {
    if (this.muted) return;
    const now = Date.now();
    if (this.lastCashRegisterTime && now - this.lastCashRegisterTime < 300) {
      return; // Single crisp trigger per transaction event
    }
    this.lastCashRegisterTime = now;
    try {
      this.init();
      if (!this.ctx) return;

      if (this.cashBuffer) {
        const source = this.ctx.createBufferSource();
        source.buffer = this.cashBuffer;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.45;
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start();
      } else {
        // Instant HTML5 Audio fallback
        const audio = new Audio(cashRegisterMp3);
        audio.volume = 0.45;
        audio.play().catch(() => {});
      }
    } catch (e) {
      console.warn(e);
    }
  }

  playCardDraw() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(450, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.10, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.15);
    } catch (e) {}
  }

  playCard() { this.playCardDraw(); }

  // Unified single transaction sound for all money gains, payments, property purchases, and taxes
  playCashGain() { this.playCashRegister(); }
  playCashPaid() { this.playCashRegister(); }
  playBuy() { this.playCashRegister(); }
  playMoney() { this.playCashRegister(); }
  playMoneyGone() { this.playCashRegister(); }

  playJail() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(55, t + 0.4);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    } catch (e) {}
  }

  playFanfare() {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const chord = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      chord.forEach((freq, i) => {
        setTimeout(() => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
          gain.gain.setValueAtTime(0.10, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start();
          osc.stop(this.ctx.currentTime + 0.5);
        }, i * 100);
      });
    } catch (e) {}
  }
}

export const sounds = new SoundFX();
