// Web Audio API Synthesizer for POS, KOT, and Guest Notifications
// Operates completely offline without external audio files

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (err) {
    console.warn('AudioContext not available:', err);
    return null;
  }
};

// Unlock AudioContext on first user interaction anywhere on the window
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      }).catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('touchstart', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

/**
 * 1. Play Success / Ready Chime (Restaurant Counter Bell)
 * Used when an order or KOT is marked READY
 */
export const playReadySound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    
    // Joyful ascending arpeggio (C5 -> E5 -> G5 -> C6)
    const notes = [
      { freq: 523.25, time: 0, dur: 0.18, vol: 0.25 }, // C5
      { freq: 659.25, time: 0.08, dur: 0.18, vol: 0.28 }, // E5
      { freq: 783.99, time: 0.16, dur: 0.22, vol: 0.3 }, // G5
      { freq: 1046.50, time: 0.24, dur: 0.55, vol: 0.35 } // C6 (long bell ring)
    ];

    notes.forEach(n => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.freq, now + n.time);

      gain.gain.setValueAtTime(0.001, now + n.time);
      gain.gain.linearRampToValueAtTime(n.vol, now + n.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + n.time + n.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + n.time);
      osc.stop(now + n.time + n.dur);
    });
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
};

/**
 * 2. Play Cancel / Warning Tone
 * Used when KOT or order item is CANCELLED / NOT AVAILABLE
 */
export const playCancelSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    
    // Descending minor warning tone (466Hz -> 370Hz)
    const tones = [
      { freq: 466.16, time: 0, dur: 0.2, vol: 0.3 },
      { freq: 369.99, time: 0.15, dur: 0.4, vol: 0.32 }
    ];

    tones.forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(t.freq, now + t.time);

      gain.gain.setValueAtTime(0.001, now + t.time);
      gain.gain.linearRampToValueAtTime(t.vol, now + t.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.time + t.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + t.time);
      osc.stop(now + t.time + t.dur);
    });
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
};

/**
 * 3. Play Thermal Printer Feed Sound
 * Used when KOT or Receipt is sent to printer
 */
export const playPrintSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Rapid mechanical ticks resembling a dot-matrix or thermal line feed
    for (let i = 0; i < 4; i++) {
      const startTime = now + (i * 0.07);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1400 + (i * 120), startTime);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.04);
    }
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
};

/**
 * 4. Play New Order Arrival Chime
 * Used when guest or staff places a new KOT
 */
export const playNewOrderSound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    
    // Distinct double ping (784Hz -> 1046Hz)
    const tones = [
      { freq: 783.99, time: 0, dur: 0.28, vol: 0.25 },
      { freq: 1046.50, time: 0.12, dur: 0.5, vol: 0.3 }
    ];

    tones.forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(t.freq, now + t.time);

      gain.gain.setValueAtTime(0.001, now + t.time);
      gain.gain.linearRampToValueAtTime(t.vol, now + t.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.time + t.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + t.time);
      osc.stop(now + t.time + t.dur);
    });
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
};

/**
 * 5. General Notification Chime
 */
export const playChimeSound = () => {
  playNewOrderSound();
};

/**
 * 6. High Priority / Rush Chime
 * Used when staff marks an item or KOT ticket as High Priority
 */
export const playPrioritySound = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    
    // Urgent energetic rising chime (A5 -> D6 -> F#6)
    const tones = [
      { freq: 880.00, time: 0, dur: 0.12, vol: 0.3 },
      { freq: 1174.66, time: 0.08, dur: 0.16, vol: 0.35 },
      { freq: 1479.98, time: 0.18, dur: 0.35, vol: 0.4 }
    ];

    tones.forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(t.freq, now + t.time);

      gain.gain.setValueAtTime(0.001, now + t.time);
      gain.gain.linearRampToValueAtTime(t.vol, now + t.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.time + t.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + t.time);
      osc.stop(now + t.time + t.dur);
    });
  } catch (e) {
    console.warn('Audio playback error:', e);
  }
};

/**
 * 7. Authentic Walkie-Talkie Push-to-Talk Mic Chirp (Start of transmission)
 * Classic Motorola / VHF radio squelch chirp
 */
export const playWalkieTalkieChirp = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    
    // Quick dual-tone chirp (2470Hz -> 1860Hz)
    const tones = [
      { freq: 2470, time: 0, dur: 0.045, vol: 0.28 },
      { freq: 1860, time: 0.045, dur: 0.05, vol: 0.3 }
    ];

    tones.forEach(t => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(t.freq, now + t.time);

      gain.gain.setValueAtTime(0.001, now + t.time);
      gain.gain.linearRampToValueAtTime(t.vol, now + t.time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t.time + t.dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + t.time);
      osc.stop(now + t.time + t.dur);
    });
  } catch (e) {
    console.warn('Walkie chirp error:', e);
  }
};

/**
 * 8. Walkie-Talkie Roger Beep (End of transmission)
 * Squelch tail / Roger beep indicating transmission released
 */
export const playWalkieRogerBeep = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1750, now); // Classic 1750Hz repeater tone

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.09);
  } catch (e) {
    console.warn('Walkie Roger beep error:', e);
  }
};

/**
 * 9. Walkie-Talkie Direct Call / Ring Tone
 * Alerting cashier or guest to an incoming voice call
 */
export const playWalkieCallRing = () => {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    
    // 3 quick pulsing radio attention beeps
    for (let i = 0; i < 3; i++) {
      const startTime = now + (i * 0.16);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(1046.5, startTime); // C6 tone

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.28, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.1);
    }
  } catch (e) {
    console.warn('Walkie call ring error:', e);
  }
};

