let context: AudioContext | undefined;
export function playSound(kind: 'click' | 'door', enabled: boolean) {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    void context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = kind === 'door' ? 'sawtooth' : 'sine';
    oscillator.frequency.setValueAtTime(kind === 'door' ? 95 : 700, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'door' ? 35 : 350, context.currentTime + 0.12);
    gain.gain.setValueAtTime(0.025, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + (kind === 'door' ? 0.35 : 0.1));
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
  } catch { /* Audio is optional; content and navigation remain usable. */ }
}
