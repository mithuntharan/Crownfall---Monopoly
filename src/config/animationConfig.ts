/**
 * CROWNFALL — CENTRALIZED EXPONENTIAL ANIMATION CONFIGURATION
 * Single source of truth for animation easings, durations, and adaptive movement schedules.
 *
 * Design Philosophy:
 * - Fluid motion system based primarily on exponential ease-out.
 * - Accelerates or responds immediately when triggered.
 * - Decelerates naturally and smoothly toward resting positions.
 * - Avoids excessive bouncing, overshooting, shaking, or abrupt stops.
 * - Preserves authoritative game state separation.
 */

// ─── CANONICAL EASING CURVES ──────────────────────────────────────────────────

/**
 * Standard exponential ease-out curve (CSS cubic-bezier approximation).
 * Instant responsive acceleration followed by a natural, long exponential deceleration tail.
 * Zero overshoot: settles precisely at target without bouncing.
 */
export const EASE_OUT_EXPO = "cubic-bezier(0.16, 1, 0.3, 1)"

/**
 * High-deceleration exponential ease-out (Robert Penner easeOutExpo).
 * Suitable for physics-based settling (e.g. dice rotational momentum loss).
 */
export const EASE_OUT_EXPO_DECEL = "cubic-bezier(0.19, 1, 0.22, 1)"

/**
 * Symmetrical exponential ease-in-out curve.
 * Used for continuous looping or bidirectional transitions where appropriate.
 */
export const EASE_IN_OUT_EXPO = "cubic-bezier(0.87, 0, 0.13, 1)"

/**
 * Clean linear easing for continuous uniform-rate operations.
 */
export const EASE_LINEAR = "linear"

// ─── MATHEMATICAL EASING FUNCTIONS (JS / RAF) ────────────────────────────────

/**
 * Pure normalized exponential ease-out: f(t) = 1 - 2^(-10t)
 * At t=0 -> 0. At t=1 -> 1.
 * Rapid initial response with smooth asymptotic deceleration.
 */
export function easeOutExpo(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return 1 - Math.pow(2, -10 * t)
}

/**
 * Smooth exponential deceleration with configurable decay rate k.
 * Normalized so f(0) = 0 and f(1) = 1.
 */
export function easeExponentialDecel(t: number, k: number = 6): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  const denom = 1 - Math.exp(-k)
  return (1 - Math.exp(-k * t)) / denom
}

// ─── STANDARDIZED ANIMATION TIMINGS (MS) ─────────────────────────────────────

export const ANIMATION_TIMINGS = {
  /** Button interactions: 100–160 ms */
  BUTTON: {
    hover: 140,
    press: 100,
    active: 120,
  },

  /** Small indicators & markers: 160–240 ms */
  INDICATOR: {
    badge: 180,
    buildingMarker: 200,
    mortgagePill: 180,
    timerBadge: 200,
  },

  /** Tab switching: 180–260 ms */
  TAB: {
    switchDuration: 200,
    indicatorFade: 180,
  },

  /** Cards & modal panels: 220–360 ms */
  PANEL: {
    backdropFade: 220,
    sheetScaleIn: 260,
    cardOpen: 240,
    drawerSlideIn: 240,
  },

  /** Center notifications: 200–350 ms */
  NOTIFICATION: {
    enter: 240,
    dismiss: 200,
    holdDuration: 2400,
  },

  /**
   * Dice rolling & settling: 700–1100 ms total
   * Tumble phase: rapid 3D rotation
   * Settle phase: exponential deceleration into authoritative face
   */
  DICE: {
    standard: {
      tumble: 480,
      settle: 420,
      total: 900,
      viewHold: 160,
    },
    fast: {
      tumble: 360,
      settle: 340,
      total: 700,
      viewHold: 100,
    },
    slow: {
      tumble: 580,
      settle: 480,
      total: 1060,
      viewHold: 200,
    },
    reducedMotion: {
      tumble: 80,
      settle: 120,
      total: 200,
      viewHold: 40,
    },
  },

  /**
   * Token movement: Adaptive to distance.
   * Controlled special movement: 340–380 ms (Jail, Card jump)
   */
  TOKEN: {
    controlledTransit: 360,
    landingHold: 80,
  },

  /** End-game royal finale: 280–360 ms */
  GAMEOVER: {
    reveal: 320,
  },
} as const

// ─── ADAPTIVE TOKEN MOVEMENT SCHEDULE GENERATOR ──────────────────────────────

export interface StepSchedule {
  totalMs: number
  stepDurations: number[]
}

/**
 * Computes an adaptive, distance-aware step duration schedule for token walking.
 * - Short walks (1-3 spaces): ~180-220 ms/step (deliberate, legible)
 * - Medium walks (4-7 spaces): ~120-150 ms/step (fluid, natural)
 * - Long walks (8-12 spaces): ~90-110 ms/step (snappy, never sluggish)
 *
 * Final steps apply an exponential deceleration schedule so the token lands cleanly
 * on its target space without abrupt snapping or overshooting.
 */
export function getAdaptiveStepSchedule(
  stepsToWalk: number,
  animationSpeed?: "slow" | "normal" | "fast",
  reducedMotion?: boolean,
): StepSchedule {
  if (reducedMotion) {
    const stepDur = 25
    return {
      totalMs: Math.max(stepDur, stepsToWalk * stepDur),
      stepDurations: Array(Math.max(1, stepsToWalk)).fill(stepDur),
    }
  }

  const speedMultiplier =
    animationSpeed === "fast" ? 0.75 : animationSpeed === "slow" ? 1.35 : 1.0

  if (stepsToWalk <= 0) {
    return {
      totalMs: Math.round(ANIMATION_TIMINGS.TOKEN.controlledTransit * speedMultiplier),
      stepDurations: [Math.round(ANIMATION_TIMINGS.TOKEN.controlledTransit * speedMultiplier)],
    }
  }

  // Base cruising duration per step, scaled adaptively by total distance
  let baseStepMs = 170
  if (stepsToWalk === 1) {
    baseStepMs = 220
  } else if (stepsToWalk === 2) {
    baseStepMs = 190
  } else if (stepsToWalk <= 4) {
    baseStepMs = 150
  } else if (stepsToWalk <= 7) {
    baseStepMs = 125
  } else if (stepsToWalk <= 10) {
    baseStepMs = 105
  } else {
    baseStepMs = 95
  }

  baseStepMs = Math.round(baseStepMs * speedMultiplier)

  // Compute individual step durations with exponential ease-out for landing steps
  const stepDurations: number[] = []
  for (let i = 0; i < stepsToWalk; i++) {
    const remainingSteps = stepsToWalk - 1 - i
    if (remainingSteps === 0) {
      // Final landing step: gentle exponential cushion
      stepDurations.push(Math.round(baseStepMs * 1.35))
    } else if (remainingSteps === 1 && stepsToWalk > 2) {
      // Penultimate step: preliminary deceleration
      stepDurations.push(Math.round(baseStepMs * 1.15))
    } else if (i === 0 && stepsToWalk > 3) {
      // First step: quick responsive takeoff
      stepDurations.push(Math.round(baseStepMs * 1.1))
    } else {
      // Steady cruising velocity
      stepDurations.push(baseStepMs)
    }
  }

  const totalMs = stepDurations.reduce((acc, d) => acc + d, 0)
  return { totalMs, stepDurations }
}
