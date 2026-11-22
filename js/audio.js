// Efectos con Web Audio y voz con speechSynthesis. Todo es opcional:
// si falta una API, la app sigue funcionando en silencio.
const VOICE_LOCALES = { es: 'es-ES', en: 'en-GB', de: 'de-DE', tr: 'tr-TR' };

class AudioEngine {
  constructor() {
    this.enabled = false;
    this.ctx = null;
    this.master = null;
    this.unlocked = false;
    this.lastSpeak = 0;
    this.chimesOn = false; // sonidos del pomodoro (independientes del sonido general)
    this.lapMusic = null;
    this.raceMusic = null;
    this.radioSound = null;
    this.raceMusicWanted = false;
    this.raceMusicBlocked = false;
    const unlock = () => this.unlock();
    ['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
  }

  playLapMusic() {
    if (!this.enabled) return;
    if (!this.lapMusic) {
      this.lapMusic = new Audio(new URL('../assets/f1-to-do-list.mp3', import.meta.url));
      this.lapMusic.volume = 0.12;
    }
    if (!this.lapMusic.paused && !this.lapMusic.ended) return;
    this.lapMusic.currentTime = 0;
    const playback = this.lapMusic.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(error => console.error('No se pudo reproducir la música de la vuelta.', error));
    }
  }

  stopLapMusic() {
    if (!this.lapMusic) return;
    this.lapMusic.pause();
    this.lapMusic.currentTime = 0;
  }

  playRadioSound() {
    if (!this.enabled) return;
    if (!this.radioSound) {
      this.radioSound = new Audio(new URL('../assets/f1-radio-sound.mp3', import.meta.url));
    }
    this.radioSound.currentTime = 0;
    const playback = this.radioSound.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(error => console.error('No se pudo reproducir el sonido de radio.', error));
    }
  }

  setRaceMusic(on) {
    this.raceMusicWanted = !!on;
    if (!this.enabled || !this.raceMusicWanted) {
      this.pauseRaceMusic();
      return;
    }
    this.syncRaceMusic();
  }

  pauseRaceMusic() {
    if (!this.raceMusic) return;
    this.raceMusic.pause();
    this.raceMusic.currentTime = 0;
  }

  syncRaceMusic() {
    if (!this.enabled || !this.raceMusicWanted || this.raceMusicBlocked) return;
    if (!this.raceMusic) {
      this.raceMusic = new Audio(new URL('../assets/f1-cars-racing.mp3', import.meta.url));
      this.raceMusic.loop = true;
      this.raceMusic.volume = 0.65;
    }
    if (!this.raceMusic.paused && !this.raceMusic.ended) return;
    const playback = this.raceMusic.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(error => {
        this.raceMusicBlocked = true;
        console.error('No se pudo reproducir la música de carrera.', error);
      });
    }
  }

  unlock() {
    if (!this.enabled && !this.chimesOn) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      try {
        if (!this.ctx) {
          this.ctx = new AC();
          this.master = this.ctx.createGain();
          this.master.gain.value = 0.6;
          this.master.connect(this.ctx.destination);
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.unlocked = true;
      } catch (e) { /* sin audio */ }
    }
    if (this.enabled) {
      this.raceMusicBlocked = false;
      this.syncRaceMusic();
    }
  }

  setEnabled(on) {
    this.enabled = !!on;
    if (this.enabled) {
      this.unlock();
      this.syncRaceMusic();
    }
    else {
      this.stopLapMusic();
      this.pauseRaceMusic();
      if (this.radioSound) {
        this.radioSound.pause();
        this.radioSound.currentTime = 0;
      }
      if ('speechSynthesis' in window) try { speechSynthesis.cancel(); } catch (e) {}
    }
  }

  ready() { return this.enabled && this.ctx && this.ctx.state === 'running'; }

  // Avisos del pomodoro: suenan aunque los efectos de carrera estén apagados.
  chime(name) {
    if (!this.chimesOn) return;
    const prev = this.enabled; this.enabled = true; this.unlock(); this.enabled = prev;
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    try {
      if (name === 'workStart') {
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, now + i * 0.13, 0.35, 'triangle', 0.28));
      } else if (name === 'workEnd') {
        for (let i = 0; i < 3; i++) {
          this.tone(1318, now + i * 0.42, 0.9, 'sine', 0.32);
          this.tone(2637, now + i * 0.42, 0.25, 'sine', 0.08);
        }
      } else if (name === 'breakStart') {
        [784, 659, 523].forEach((f, i) => this.tone(f, now + i * 0.22, 0.7, 'sine', 0.26));
      } else if (name === 'breakEnd') {
        [880, 1175, 880, 1175].forEach((f, i) => this.tone(f, now + i * 0.16, 0.22, 'triangle', 0.26));
      }
    } catch (e) { /* ignorar */ }
  }

  noise(dur) {
    const c = this.ctx, len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(); s.buffer = buf; return s;
  }

  tone(freq, start, dur, type = 'sine', vol = 0.2) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(this.master); o.start(start); o.stop(start + dur + 0.05);
  }

  sfx(name) {
    if (!this.ready()) return;
    const c = this.ctx, now = c.currentTime;
    try {
      if (name === 'overtake') {
        const n = this.noise(0.9), f = c.createBiquadFilter(), g = c.createGain();
        f.type = 'bandpass'; f.Q.value = 1.4;
        f.frequency.setValueAtTime(300, now); f.frequency.exponentialRampToValueAtTime(2600, now + 0.45); f.frequency.exponentialRampToValueAtTime(500, now + 0.9);
        g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.35, now + 0.4); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
        n.connect(f); f.connect(g); g.connect(this.master); n.start(now);
      } else if (name === 'gun') {
        for (let i = 0; i < 7; i++) {
          const n = this.noise(0.05), f = c.createBiquadFilter(), g = c.createGain(), t0 = now + i * 0.065;
          f.type = 'highpass'; f.frequency.value = 1800;
          g.gain.setValueAtTime(0.25, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
          n.connect(f); f.connect(g); g.connect(this.master); n.start(t0);
        }
      } else if (name === 'tool') {
        this.tone(1400, now, 0.08, 'square', 0.06); this.tone(1100, now + 0.1, 0.08, 'square', 0.06);
      } else if (name === 'reminder') {
        [880, 1175, 1568].forEach((f, i) => this.tone(f, now + i * 0.16, 0.35, 'triangle', 0.22));
      } else if (name === 'victory') {
        [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, now + i * 0.14, i === 5 ? 0.8 : 0.22, 'triangle', 0.22));
      } else if (name === 'lights') {
        this.tone(660, now, 0.18, 'square', 0.08);
      } else if (name === 'go') {
        this.tone(990, now, 0.4, 'square', 0.1);
      }
    } catch (e) { /* ignorar */ }
  }

  // Voz: cancela la anterior para no superponer.
  speak(text, lang) {
    if (!this.enabled || !('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const loc = VOICE_LOCALES[lang] || 'es-ES';
      u.lang = loc;
      const voices = speechSynthesis.getVoices() || [];
      const v = voices.find(v => v.lang === loc) || voices.find(v => v.lang && v.lang.toLowerCase().startsWith(lang));
      if (v) u.voice = v;
      u.rate = 1.08; u.volume = 0.9;
      speechSynthesis.speak(u);
    } catch (e) { /* ignorar */ }
  }

  stopVoice() {
    if ('speechSynthesis' in window) try { speechSynthesis.cancel(); } catch (e) {}
  }
}

export const audio = new AudioEngine();
