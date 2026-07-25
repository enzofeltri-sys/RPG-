// Tiny procedural sound effects via the raw Web Audio API — no asset files,
// so the PWA stays fully self-contained and offline-capable (increment 10
// still has zero real audio otherwise). Browsers suspend a fresh
// AudioContext until a user gesture resumes it; every call here re-resumes
// on demand, so the very first tap in the game (Title screen) is enough to
// unlock sound for the rest of the session.

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext })
    .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) {
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      // Ignore — a gesture-less resume rejection just means we stay silent
      // until the next call after an actual tap.
    });
  }
  return audioCtx;
}

function beep(frequency: number, duration: number, type: OscillatorType = 'square', volume = 0.08): void {
  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playHit(): void {
  beep(180, 0.12, 'square');
}

export function playVictory(): void {
  beep(440, 0.1, 'triangle');
  setTimeout(() => beep(660, 0.15, 'triangle'), 100);
}

export function playLevelUp(): void {
  [440, 550, 660, 880].forEach((frequency, i) => {
    setTimeout(() => beep(frequency, 0.15, 'triangle'), i * 90);
  });
}

export function playChestOpen(): void {
  beep(300, 0.08, 'sawtooth', 0.06);
  setTimeout(() => beep(520, 0.14, 'sawtooth', 0.06), 80);
}

export function playCoin(): void {
  beep(880, 0.06, 'square', 0.05);
}

export function playCraftSuccess(): void {
  beep(392, 0.09, 'triangle');
  setTimeout(() => beep(587, 0.14, 'triangle'), 90);
}

export function playQuestComplete(): void {
  beep(523, 0.09, 'triangle');
  setTimeout(() => beep(659, 0.09, 'triangle'), 90);
  setTimeout(() => beep(784, 0.18, 'triangle'), 180);
}

export function playDefeat(): void {
  beep(220, 0.2, 'sawtooth');
  setTimeout(() => beep(140, 0.3, 'sawtooth'), 150);
}
