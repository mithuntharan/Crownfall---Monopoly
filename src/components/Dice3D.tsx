import React, { useEffect, useRef, useState } from "react"
import {
  ANIMATION_TIMINGS,
  easeOutExpo,
  easeExponentialDecel,
} from "../config/animationConfig"

export interface Dice3DProps {
  value: number
  rolling: boolean
  settling?: boolean
  settleDuration?: number
  size?: number
  dieIndex?: number
  reducedMotion?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * Standard cubic base rotations to orient face N directly forward (+Z):
 * Face 1: Front
 * Face 2: Top (rotateX -90deg brings it forward)
 * Face 3: Right (rotateY -90deg brings it forward)
 * Face 4: Left (rotateY 90deg brings it forward)
 * Face 5: Bottom (rotateX 90deg brings it forward)
 * Face 6: Back (rotateY 180deg brings it forward)
 * Opposing faces strictly sum to 7: 1-6, 2-5, 3-4.
 */
const FACE_BASE_ROTATIONS: Record<number, { rx: number; ry: number; rz: number }> = {
  1: { rx: 0, ry: 0, rz: 0 },
  2: { rx: -90, ry: 0, rz: 0 },
  3: { rx: 0, ry: -90, rz: 0 },
  4: { rx: 0, ry: 90, rz: 0 },
  5: { rx: 90, ry: 0, rz: 0 },
  6: { rx: 0, ry: 180, rz: 0 },
}

/**
 * Exact integer coordinates in 68x68 vector viewBox (2x scale for razor-sharp rendering):
 * Col 1: 18 | Col 2: 34 | Col 3: 50
 * Row 1: 18 | Row 2: 34 | Row 3: 50
 */
const FACE_VECTOR_PIPS: Record<number, Array<[number, number]>> = {
  1: [[34, 34]],
  2: [
    [18, 18],
    [50, 50],
  ],
  3: [
    [18, 18],
    [34, 34],
    [50, 50],
  ],
  4: [
    [18, 18],
    [50, 18],
    [18, 50],
    [50, 50],
  ],
  5: [
    [18, 18],
    [50, 18],
    [34, 34],
    [18, 50],
    [50, 50],
  ],
  6: [
    [18, 18],
    [50, 18],
    [18, 34],
    [50, 34],
    [18, 50],
    [50, 50],
  ],
}

/**
 * Directional ambient shading for warm ivory porcelain finish:
 * Distinguishable cubic faces with soft bevel reflections and no harsh black outlines.
 */
const FACE_SHADING: Record<
  number,
  {
    start: string
    end: string
    edgeStroke: string
    bevelStroke: string
  }
> = {
  1: {
    start: "#fefdfa",
    end: "#ede5d5",
    edgeStroke: "rgba(182, 168, 148, 0.65)",
    bevelStroke: "rgba(255, 255, 255, 0.90)",
  },
  2: {
    start: "#ffffff",
    end: "#f5eee1",
    edgeStroke: "rgba(195, 180, 160, 0.55)",
    bevelStroke: "rgba(255, 255, 255, 0.95)",
  },
  3: {
    start: "#f3ebdd",
    end: "#e3d8c5",
    edgeStroke: "rgba(175, 160, 140, 0.65)",
    bevelStroke: "rgba(255, 255, 255, 0.75)",
  },
  4: {
    start: "#ece3d3",
    end: "#dbd0bc",
    edgeStroke: "rgba(170, 155, 135, 0.65)",
    bevelStroke: "rgba(255, 255, 255, 0.70)",
  },
  5: {
    start: "#dfd4c1",
    end: "#cec1ac",
    edgeStroke: "rgba(160, 145, 125, 0.65)",
    bevelStroke: "rgba(255, 255, 255, 0.50)",
  },
  6: {
    start: "#e6dcce",
    end: "#d5c8b5",
    edgeStroke: "rgba(165, 150, 130, 0.65)",
    bevelStroke: "rgba(255, 255, 255, 0.60)",
  },
}

export default function Dice3D({
  value,
  rolling,
  settling = false,
  settleDuration = ANIMATION_TIMINGS.DICE.standard.settle,
  size = 34,
  dieIndex = 1,
  reducedMotion = false,
  className = "",
  style,
}: Dice3DProps) {
  const safeVal = Math.min(6, Math.max(1, Math.round(value) || 1))
  const safeValRef = useRef(safeVal)
  safeValRef.current = safeVal

  const cubeRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<HTMLDivElement>(null)

  // Track active 3D lifecycle independently of immediate props so we never unmount mid-frame
  const [is3DActive, setIs3DActive] = useState(rolling || settling)

  const isRollingRef = useRef(rolling)
  isRollingRef.current = rolling
  const isSettlingRef = useRef(settling)
  isSettlingRef.current = settling
  const settleDurationRef = useRef(settleDuration)
  settleDurationRef.current = settleDuration

  const halfSize = Math.round(size / 2)
  // Perspective projection compensation factor (600px perspective with +17px Z elevation)
  const perspectiveScaleComp = (600 - halfSize) / 600

  // Persistent animation lifecycle state across renders
  const animRef = useRef<{
    rafId: number | null
    phase: "idle" | "tumble" | "settle"
    tumbleStart: number
    lastTime: number
    currentAngleX: number
    currentAngleY: number
    settleStart: number
    settleStartX: number
    settleStartY: number
    settleTargetX: number
    settleTargetY: number
  }>({
    rafId: null,
    phase: "idle",
    tumbleStart: 0,
    lastTime: 0,
    currentAngleX: 0,
    currentAngleY: 0,
    settleStart: 0,
    settleStartX: 0,
    settleStartY: 0,
    settleTargetX: 0,
    settleTargetY: 0,
  })

  // Synchronize 3D active state whenever rolling or settling turns on
  useEffect(() => {
    if (rolling || settling) {
      setIs3DActive(true)
    }
  }, [rolling, settling])

  useEffect(() => {
    if (!is3DActive) {
      // Idle in 2D mode: make sure no leftover RAF
      if (animRef.current.rafId !== null) {
        cancelAnimationFrame(animRef.current.rafId)
        animRef.current.rafId = null
      }
      animRef.current.phase = "idle"
      return
    }

    // Accessible reduced-motion mode: brief subtle transition
    if (reducedMotion) {
      const duration = ANIMATION_TIMINGS.DICE.reducedMotion.settle
      const startTime = performance.now()
      const tickReduced = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(1, elapsed / duration)
        const eased = easeOutExpo(progress)
        const currentBase = FACE_BASE_ROTATIONS[safeValRef.current] || FACE_BASE_ROTATIONS[1]

        if (cubeRef.current) {
          cubeRef.current.style.transform = `translate3d(0, 0, 0) rotateX(${currentBase.rx}deg) rotateY(${currentBase.ry}deg) rotateZ(0deg) scale(${perspectiveScaleComp.toFixed(4)})`
        }

        if (progress < 1 && (isRollingRef.current || isSettlingRef.current)) {
          animRef.current.rafId = requestAnimationFrame(tickReduced)
        } else {
          animRef.current.rafId = null
          if (!isRollingRef.current && !isSettlingRef.current) {
            setIs3DActive(false)
          }
        }
      }

      animRef.current.rafId = requestAnimationFrame(tickReduced)
      return () => {
        if (animRef.current.rafId !== null) {
          cancelAnimationFrame(animRef.current.rafId)
          animRef.current.rafId = null
        }
      }
    }

    // Standard 3D animation loop
    const dirX = dieIndex === 2 ? -1 : 1
    const dirY = dieIndex === 1 ? -1 : 1
    const rollRateX = dirX * 1.05
    const rollRateY = dirY * 1.2
    const maxMicroLift = 2.4

    if (animRef.current.rafId !== null) {
      // Loop is already running, do not re-instantiate or reset angles!
      return
    }

    const now = performance.now()
    animRef.current.tumbleStart = now
    animRef.current.lastTime = now
    animRef.current.phase = isSettlingRef.current ? "settle" : "tumble"
    if (animRef.current.phase === "settle") {
      animRef.current.settleStart = now
      animRef.current.settleStartX = animRef.current.currentAngleX
      animRef.current.settleStartY = animRef.current.currentAngleY
      const targetBase = FACE_BASE_ROTATIONS[safeValRef.current] || FACE_BASE_ROTATIONS[1]
      const targetRx = targetBase.rx
      const targetRy = targetBase.ry

      const diffX = dirX > 0
        ? ((targetRx - (animRef.current.settleStartX % 360)) % 360 + 360) % 360
        : (((animRef.current.settleStartX % 360) - targetRx) % 360 + 360) % 360
      const turnsX = diffX < 90 ? 720 : 360
      animRef.current.settleTargetX = dirX > 0
        ? animRef.current.settleStartX + diffX + turnsX
        : animRef.current.settleStartX - diffX - turnsX

      const diffY = dirY > 0
        ? ((targetRy - (animRef.current.settleStartY % 360)) % 360 + 360) % 360
        : (((animRef.current.settleStartY % 360) - targetRy) % 360 + 360) % 360
      const turnsY = diffY < 90 ? 720 : 360
      animRef.current.settleTargetY = dirY > 0
        ? animRef.current.settleStartY + diffY + turnsY
        : animRef.current.settleStartY - diffY - turnsY
    }

    const tick = (currentTime: number) => {
      const anim = animRef.current
      const delta = Math.min(34, currentTime - anim.lastTime)
      anim.lastTime = currentTime

      // Seamlessly transition from tumble into settle without resetting angles
      if (anim.phase === "tumble" && isSettlingRef.current) {
        anim.phase = "settle"
        anim.settleStart = currentTime
        anim.settleStartX = anim.currentAngleX
        anim.settleStartY = anim.currentAngleY

        const targetBase = FACE_BASE_ROTATIONS[safeValRef.current] || FACE_BASE_ROTATIONS[1]
        const targetRx = targetBase.rx
        const targetRy = targetBase.ry

        const diffX = dirX > 0
          ? ((targetRx - (anim.settleStartX % 360)) % 360 + 360) % 360
          : (((anim.settleStartX % 360) - targetRx) % 360 + 360) % 360
        const turnsX = diffX < 90 ? 720 : 360
        anim.settleTargetX = dirX > 0
          ? anim.settleStartX + diffX + turnsX
          : anim.settleStartX - diffX - turnsX

        const diffY = dirY > 0
          ? ((targetRy - (anim.settleStartY % 360)) % 360 + 360) % 360
          : (((anim.settleStartY % 360) - targetRy) % 360 + 360) % 360
        const turnsY = diffY < 90 ? 720 : 360
        anim.settleTargetY = dirY > 0
          ? anim.settleStartY + diffY + turnsY
          : anim.settleStartY - diffY - turnsY
      }

      let currentRx = 0
      let currentRy = 0
      let currentTy = 0
      let currentScale = 1
      let shadowScale = 1
      let shadowAlpha = 0.55

      if (anim.phase === "tumble") {
        anim.currentAngleX += delta * rollRateX
        anim.currentAngleY += delta * rollRateY
        currentRx = anim.currentAngleX
        currentRy = anim.currentAngleY

        const tumbleElapsed = currentTime - anim.tumbleStart
        const bounceCycle = (tumbleElapsed % 170) / 170
        const lift = Math.sin(bounceCycle * Math.PI)
        currentTy = -maxMicroLift * lift
        shadowScale = 1 - lift * 0.1
        shadowAlpha = 0.55 - lift * 0.1
        currentScale = 1
      } else {
        // Exponential deceleration into authoritative face
        const activeSettleMs = settleDurationRef.current
        const effectiveDecelMs = Math.max(260, activeSettleMs - 50)
        const settleElapsed = currentTime - anim.settleStart
        const progress = Math.min(1, settleElapsed / effectiveDecelMs)
        const eased = easeExponentialDecel(progress, 4.8)

        currentRx = anim.settleStartX + (anim.settleTargetX - anim.settleStartX) * eased
        currentRy = anim.settleStartY + (anim.settleTargetY - anim.settleStartY) * eased
        anim.currentAngleX = currentRx
        anim.currentAngleY = currentRy

        const liftDecay = (1 - eased) * Math.sin(progress * Math.PI)
        currentTy = -maxMicroLift * liftDecay * 0.45
        shadowScale = 1 - liftDecay * 0.08
        shadowAlpha = 0.55 - liftDecay * 0.08
        currentScale = 1 - (1 - perspectiveScaleComp) * eased

        if (progress >= 1) {
          const finalBase = FACE_BASE_ROTATIONS[safeValRef.current] || FACE_BASE_ROTATIONS[1]
          if (cubeRef.current) {
            cubeRef.current.style.transform = `translate3d(0, 0, 0) rotateX(${finalBase.rx}deg) rotateY(${finalBase.ry}deg) rotateZ(0deg) scale(${perspectiveScaleComp.toFixed(4)})`
          }
          if (shadowRef.current) {
            shadowRef.current.style.transform = "translateX(-50%) scale(1)"
            shadowRef.current.style.opacity = "0.55"
          }

          // If settling has ended authoritatively in App.tsx, hand off to 2D SVG
          if (!isRollingRef.current && !isSettlingRef.current) {
            anim.rafId = null
            anim.phase = "idle"
            setIs3DActive(false)
            return
          }

          // If App.tsx has not yet signaled completion, hold perfectly still at resting face
          anim.rafId = requestAnimationFrame(tick)
          return
        }
      }

      const finalBase = FACE_BASE_ROTATIONS[safeValRef.current] || FACE_BASE_ROTATIONS[1]
      if (cubeRef.current) {
        cubeRef.current.style.transform = `translate3d(0, ${currentTy.toFixed(2)}px, 0) rotateX(${currentRx.toFixed(2)}deg) rotateY(${currentRy.toFixed(2)}deg) rotateZ(${finalBase.rz}deg) scale(${currentScale.toFixed(4)})`
      }
      if (shadowRef.current) {
        shadowRef.current.style.transform = `translateX(-50%) scale(${shadowScale.toFixed(2)})`
        shadowRef.current.style.opacity = shadowAlpha.toFixed(2)
      }

      anim.rafId = requestAnimationFrame(tick)
    }

    animRef.current.rafId = requestAnimationFrame(tick)

    return () => {
      if (animRef.current.rafId !== null) {
        cancelAnimationFrame(animRef.current.rafId)
        animRef.current.rafId = null
      }
    }
  }, [is3DActive, dieIndex, reducedMotion, perspectiveScaleComp])

  // Landed state: pure, flat 2D representation of the final dice faces
  if (!is3DActive) {
    return (
      <div
        className={`dice-2d-face-container ${className}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          userSelect: "none",
          ...style,
        }}
        role="img"
        aria-label={`Die showing ${safeVal}`}
      >
        <div className="dice-2d-floor-shadow" />
        <FaceVector faceNumber={safeVal} dieIndex={dieIndex} is2D={true} />
      </div>
    )
  }

  return (
    <div
      className={`dice-3d-scene ${className} ${rolling ? "is-rolling" : ""} ${settling ? "is-settling" : ""}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        perspective: "600px",
        ...style,
      }}
      role="img"
      aria-label={`Die showing ${safeVal}`}
    >
      {/* 6-face cubic geometry */}
      <div
        ref={cubeRef}
        className="dice-3d-cube"
        style={{
          width: `${size}px`,
          height: `${size}px`,
        }}
      >
        {/* Face 1: Front */}
        <div
          className="dice-3d-face face-front face-1"
          style={{ transform: `rotateY(0deg) translateZ(${halfSize}px)` }}
        >
          <FaceVector faceNumber={1} dieIndex={dieIndex} />
        </div>

        {/* Face 6: Back (1 + 6 = 7) */}
        <div
          className="dice-3d-face face-back face-6"
          style={{ transform: `rotateY(180deg) translateZ(${halfSize}px)` }}
        >
          <FaceVector faceNumber={6} dieIndex={dieIndex} />
        </div>

        {/* Face 2: Top */}
        <div
          className="dice-3d-face face-top face-2"
          style={{ transform: `rotateX(90deg) translateZ(${halfSize}px)` }}
        >
          <FaceVector faceNumber={2} dieIndex={dieIndex} />
        </div>

        {/* Face 5: Bottom (2 + 5 = 7) */}
        <div
          className="dice-3d-face face-bottom face-5"
          style={{ transform: `rotateX(-90deg) translateZ(${halfSize}px)` }}
        >
          <FaceVector faceNumber={5} dieIndex={dieIndex} />
        </div>

        {/* Face 3: Right */}
        <div
          className="dice-3d-face face-right face-3"
          style={{ transform: `rotateY(90deg) translateZ(${halfSize}px)` }}
        >
          <FaceVector faceNumber={3} dieIndex={dieIndex} />
        </div>

        {/* Face 4: Left (3 + 4 = 7) */}
        <div
          className="dice-3d-face face-left face-4"
          style={{ transform: `rotateY(-90deg) translateZ(${halfSize}px)` }}
        >
          <FaceVector faceNumber={4} dieIndex={dieIndex} />
        </div>
      </div>

      {/* Restrained contact shadow directly beneath the 34px die */}
      <div ref={shadowRef} className="dice-3d-floor-shadow" />
    </div>
  )
}

/**
 * High-definition vector face renderer:
 * 1. Warm ivory porcelain background with fine bevel reflections.
 * 2. Crisp, high-contrast dark charcoal/near-black pips with tactile depth.
 * 3. Zero CSS filters (eliminates browser layer flattening/pixelation).
 */
function FaceVector({ faceNumber, dieIndex, is2D: _is2D = false }: { faceNumber: number; dieIndex: number; is2D?: boolean }) {
  const pips = FACE_VECTOR_PIPS[faceNumber] || []
  const shading = FACE_SHADING[faceNumber] || FACE_SHADING[1]
  const gradId = `ivoryDieGrad_${dieIndex}_${faceNumber}`

  return (
    <svg
      viewBox="0 0 68 68"
      width="34"
      height="34"
      style={{ display: "block", overflow: "visible", position: "relative", zIndex: 1 }}
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={shading.start} />
          <stop offset="100%" stopColor={shading.end} />
        </linearGradient>
      </defs>

      {/* Warm ivory face body with rounded corners */}
      <rect
        x="1"
        y="1"
        width="66"
        height="66"
        rx="10"
        ry="10"
        fill={`url(#${gradId})`}
        stroke={shading.edgeStroke}
        strokeWidth="1.2"
      />

      {/* Subtle fine inner bevel highlight that catches light on polished ivory */}
      <rect
        x="2.5"
        y="2.5"
        width="63"
        height="63"
        rx="8.5"
        ry="8.5"
        fill="none"
        stroke={shading.bevelStroke}
        strokeWidth="1"
      />

      {/* Clean, high-contrast charcoal/near-black vector pips */}
      {pips.map(([cx, cy], i) => (
        <g key={i}>
          {/* Subtle lower specular lip reflection of engraved pip in ivory */}
          <circle cx={cx} cy={cy + 0.6} r="4.8" fill="rgba(255, 255, 255, 0.65)" />
          {/* Dark charcoal recessed pip body */}
          <circle cx={cx} cy={cy} r="4.6" fill="#1e2229" />
          {/* Crisp tactile core for hardware antialiasing */}
          <circle cx={cx} cy={cy} r="3.8" fill="#252932" />
          {/* Sunken upper shadow of engraved dot */}
          <circle cx={cx} cy={cy - 0.6} r="3.2" fill="#14171c" />
        </g>
      ))}
    </svg>
  )
}
