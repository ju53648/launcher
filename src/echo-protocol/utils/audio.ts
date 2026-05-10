type ToneKind = "menu" | "choice-stable" | "choice-tense" | "choice-danger" | "warning" | "ending";

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

class EchoAudioEngine {
  private audioContext: AudioContext | null = null;
  private initialized = false;
  private readonly masterVolume = 0.16;

  private ensureContext() {
    if (this.initialized) {
      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
      this.audioContext = AudioContextClass ? new AudioContextClass() : null;
      this.initialized = true;
    } catch {
      this.audioContext = null;
    }
  }

  resume() {
    this.ensureContext();
    void this.audioContext?.resume();
  }

  private playTone(
    frequency: number,
    duration: number,
    waveform: OscillatorType,
    volumeScale = 1,
    detune = 0
  ) {
    this.resume();
    if (!this.audioContext) {
      return;
    }

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();
    const volume = this.audioContext.createGain();

    oscillator.type = waveform;
    oscillator.frequency.value = frequency;
    oscillator.detune.value = detune;
    envelope.gain.setValueAtTime(0.001, now);
    envelope.gain.linearRampToValueAtTime(0.16, now + 0.02);
    envelope.gain.exponentialRampToValueAtTime(0.001, now + duration);
    volume.gain.setValueAtTime(this.masterVolume * volumeScale, now);

    oscillator.connect(envelope);
    envelope.connect(volume);
    volume.connect(this.audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }

  play(kind: ToneKind) {
    switch (kind) {
      case "menu":
        this.playTone(420, 0.08, "triangle", 0.9);
        window.setTimeout(() => this.playTone(560, 0.12, "sine", 0.85), 40);
        break;
      case "choice-stable":
        this.playTone(470, 0.08, "triangle", 0.8);
        window.setTimeout(() => this.playTone(620, 0.12, "sine", 0.7), 35);
        break;
      case "choice-tense":
        this.playTone(320, 0.1, "triangle", 0.9, -140);
        window.setTimeout(() => this.playTone(410, 0.16, "sawtooth", 0.65, -50), 35);
        break;
      case "choice-danger":
        this.playTone(250, 0.12, "sawtooth", 1, -220);
        window.setTimeout(() => this.playTone(180, 0.22, "triangle", 0.7, -80), 50);
        break;
      case "warning":
        this.playTone(180, 0.2, "sine", 0.8);
        window.setTimeout(() => this.playTone(130, 0.24, "triangle", 0.7), 80);
        break;
      case "ending":
        this.playTone(520, 0.1, "triangle", 0.85);
        window.setTimeout(() => this.playTone(390, 0.24, "sine", 0.65), 60);
        window.setTimeout(() => this.playTone(260, 0.45, "triangle", 0.6), 140);
        break;
    }
  }
}

export const echoAudio = new EchoAudioEngine();
