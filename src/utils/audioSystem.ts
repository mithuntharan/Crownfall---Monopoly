/**
 * Crownfall - Web Audio & Haptic System
 * Synthesizes vintage royal Indian tones with zero external dependencies.
 */

export interface GamePreferences {
  theme?: "light"
  animationSpeed: "slow" | "normal" | "fast"
  soundEffects: boolean
  masterVolume: number // 0 to 100
  hapticFeedback: boolean
  reducedMotion: boolean
  layoutDiagnostics?: boolean
}

export const DEFAULT_PREFERENCES: GamePreferences = {
  theme: "light",
  animationSpeed: "normal",
  soundEffects: true,
  masterVolume: 80,
  hapticFeedback: true,
  reducedMotion: false,
  layoutDiagnostics: false,
}

const STORAGE_KEY = "crownfall_game_preferences"
const LEGACY_STORAGE_KEY = "dominion_game_preferences"

export function loadPreferences(): GamePreferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_PREFERENCES, ...parsed, theme: "light" }
    }
  } catch (_) {}
  return { ...DEFAULT_PREFERENCES }
}

export function savePreferences(prefs: GamePreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...prefs, theme: "light" }))
  } catch (_) {}
}

class AudioManager {
  private ctx: AudioContext | null = null
  private playedEvents = new Set<string>()
  private volumeMultiplier = 0.8

  setMasterVolume(percent: number) {
    this.volumeMultiplier = Math.max(0, Math.min(1, percent / 100))
  }

  private getContext(): AudioContext | null {
    if (typeof window === "undefined") return null
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  playTone(
    freq: number,
    type: OscillatorType = "sine",
    duration = 0.15,
    gainVal = 0.1,
  ) {
    if (this.volumeMultiplier <= 0) return
    const ctx = this.getContext()
    if (!ctx) return
    try {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const effectiveGain = gainVal * this.volumeMultiplier
      osc.type = type
      osc.frequency.setValueAtTime(freq, ctx.currentTime)
      gain.gain.setValueAtTime(effectiveGain, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + duration,
      )
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + duration)
    } catch (_) {}
  }

  /** Deduplicated event sound trigger */
  playEventSoundOnce(eventId: string, soundFn: () => void) {
    if (!eventId || this.playedEvents.has(eventId)) return
    this.playedEvents.add(eventId)
    // Keep set bounded to last 200 events
    if (this.playedEvents.size > 200) {
      const first = this.playedEvents.values().next().value
      if (first) this.playedEvents.delete(first)
    }
    soundFn()
  }

  /** Dice roll percussive rattle */
  playDiceRoll() {
    for (let i = 0; i < 4; i++) {
      window.setTimeout(() => {
        this.playTone(200 + Math.random() * 250, "square", 0.05, 0.08)
      }, i * 55)
    }
  }

  /** Token movement completion (tactile snap) */
  playMoveComplete() {
    this.playTone(320, "triangle", 0.08, 0.1)
    window.setTimeout(() => this.playTone(240, "sine", 0.12, 0.08), 50)
  }

  /** Cash gain / reward */
  playCash() {
    this.playTone(587.33, "triangle", 0.09, 0.12) // D5
    window.setTimeout(() => {
      this.playTone(880, "triangle", 0.2, 0.15) // A5
    }, 80)
  }

  /** Property purchase (warm chord) */
  playPurchase() {
    this.playTone(440, "sine", 0.1, 0.12)
    window.setTimeout(() => this.playTone(554.37, "sine", 0.1, 0.12), 80)
    window.setTimeout(() => this.playTone(659.25, "sine", 0.25, 0.15), 160)
  }

  /** Rent payment outflow */
  playRentPayment() {
    this.playTone(392, "sawtooth", 0.12, 0.1) // G4
    window.setTimeout(() => this.playTone(293.66, "sine", 0.2, 0.12), 100) // D4
  }

  /** Building construction (ascending mallet triad) */
  playBuild() {
    this.playTone(329.63, "triangle", 0.08, 0.1) // E4
    window.setTimeout(() => this.playTone(440, "triangle", 0.08, 0.12), 70) // A4
    window.setTimeout(() => this.playTone(659.25, "sine", 0.2, 0.15), 140) // E5
  }

  /** Voluntary destruction refund (coin jingle) */
  playDestroyRefund() {
    this.playTone(659.25, "sine", 0.08, 0.1)
    window.setTimeout(() => this.playTone(523.25, "sine", 0.1, 0.12), 70)
    window.setTimeout(() => this.playTone(783.99, "triangle", 0.18, 0.14), 140)
  }

  /** Turn change chime */
  playTurnChange() {
    this.playTone(523.25, "sine", 0.1, 0.08) // C5
    window.setTimeout(() => this.playTone(659.25, "sine", 0.16, 0.09), 90) // E5
  }

  /** General notification */
  playNotification() {
    this.playTone(523.25, "sine", 0.1, 0.1)
    window.setTimeout(() => this.playTone(783.99, "sine", 0.18, 0.12), 100)
  }

  /** Action success */
  playActionSuccess() {
    this.playTone(587.33, "sine", 0.08, 0.1)
    window.setTimeout(() => this.playTone(880, "sine", 0.18, 0.12), 80)
  }

  /** Warning / rejected action (low soft double buzz) */
  playWarning() {
    this.playTone(220, "sawtooth", 0.12, 0.12)
    window.setTimeout(() => this.playTone(180, "sawtooth", 0.18, 0.12), 130)
  }
}

export const audioSystem = new AudioManager()

export function triggerHaptic(duration = 25) {
  try {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(duration)
    }
  } catch (_) {}
}
