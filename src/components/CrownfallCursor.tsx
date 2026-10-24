import React, { useEffect, useRef, useState } from "react"

/**
 * Crownfall Dotter-Inspired Custom Cursor
 * 
 * Features:
 * - High performance: transforms DOM nodes directly via requestAnimationFrame,
 *   bypassing React re-renders completely during pointer movement.
 * - Precision pinpoint dot (7px) with an antique-gold outer ring.
 * - Subtle hover state over interactive elements (buttons, spaces, property cards).
 * - Restrained click feedback compression without distracting ripples.
 * - Automatically hides over text inputs, preserving standard I-beam and selection.
 * - Hardware capability guard: enabled only on devices with hover and fine pointer.
 * - Fully disabled on touch-first devices with zero overhead (returns null).
 * - Hybrid device support: dynamically hides during touch gestures and restores on mouse movement.
 * - Honors prefers-reduced-motion.
 */

const getSupportsFinePointer = (): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) return false
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches
}

export const CrownfallCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement | null>(null)
  const ringRef = useRef<HTMLDivElement | null>(null)
  const [isSupported, setIsSupported] = useState<boolean>(getSupportsFinePointer)

  // Listen for capability changes (e.g., plugging in or unplugging a mouse / keyboard dock)
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return

    const mql = window.matchMedia("(hover: hover) and (pointer: fine)")
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsSupported(Boolean(e.matches))
    }

    setIsSupported(mql.matches)

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handleMediaChange)
      return () => mql.removeEventListener("change", handleMediaChange)
    } else if (typeof mql.addListener === "function") {
      mql.addListener(handleMediaChange)
      return () => mql.removeListener(handleMediaChange)
    }
  }, [])

  useEffect(() => {
    if (!isSupported || typeof window === "undefined") return

    let mouseX = -100
    let mouseY = -100
    let ringX = -100
    let ringY = -100
    let isHovering = false
    let isClicking = false
    let isHidden = true
    let isTextTarget = false
    let animationFrameId: number | null = null
    let lastTouchTimestamp = 0

    const motionQuery = window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)")
      : null
    let prefersReducedMotion = Boolean(motionQuery?.matches)

    const handleMotionChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion = e.matches
    }

    if (motionQuery?.addEventListener) {
      motionQuery.addEventListener("change", handleMotionChange)
    } else if (motionQuery?.addListener) {
      motionQuery.addListener(handleMotionChange)
    }

    const hideCursor = () => {
      isHidden = true
      isClicking = false
      isHovering = false
      if (dotRef.current) {
        dotRef.current.style.opacity = "0"
      }
      if (ringRef.current) {
        ringRef.current.style.opacity = "0"
        ringRef.current.classList.remove("is-hovering", "is-clicking")
      }
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }
    }

    const startRenderLoop = () => {
      if (animationFrameId === null) {
        animationFrameId = requestAnimationFrame(renderLoop)
      }
    }

    const onTouchInteraction = () => {
      lastTouchTimestamp = Date.now()
      hideCursor()
    }

    const isTouchEvent = (e: Event): boolean => {
      if ("pointerType" in e && (e as PointerEvent).pointerType === "touch") {
        return true
      }
      if (Date.now() - lastTouchTimestamp < 650) {
        return true
      }
      if ("sourceCapabilities" in e && (e as any).sourceCapabilities?.firesTouchEvents) {
        return true
      }
      return false
    }

    const onPointerMove = (e: PointerEvent | MouseEvent) => {
      if (isTouchEvent(e)) {
        hideCursor()
        return
      }

      const clientX = e.clientX
      const clientY = e.clientY

      if (typeof clientX !== "number" || typeof clientY !== "number") return

      mouseX = clientX
      mouseY = clientY

      if (isHidden) {
        isHidden = false
        ringX = mouseX
        ringY = mouseY
      }

      const target = e.target as HTMLElement | null
      if (target) {
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          Boolean(target.closest?.("input, textarea, select, [contenteditable='true']"))

        isTextTarget = Boolean(isInput)

        const isClickable =
          !isInput &&
          (target.tagName === "BUTTON" ||
            target.tagName === "A" ||
            target.getAttribute?.("role") === "button" ||
            target.classList?.contains("board-space") ||
            target.classList?.contains("property-card") ||
            target.classList?.contains("price-chip") ||
            target.classList?.contains("clickable") ||
            Boolean(target.closest?.("button, a, [role='button'], .board-space, .property-card, .price-chip, .clickable")))

        isHovering = Boolean(isClickable)
      }

      startRenderLoop()
    }

    const onPointerDown = (e: PointerEvent | MouseEvent) => {
      if (isTouchEvent(e)) {
        hideCursor()
        return
      }
      isClicking = true
    }

    const onPointerUp = (e?: PointerEvent | MouseEvent) => {
      if (e && isTouchEvent(e)) {
        hideCursor()
        return
      }
      isClicking = false
    }

    const onPointerLeave = () => {
      hideCursor()
    }

    const onPointerEnter = (e: PointerEvent | MouseEvent) => {
      if (isTouchEvent(e)) {
        hideCursor()
        return
      }
      mouseX = e.clientX
      mouseY = e.clientY
      ringX = mouseX
      ringY = mouseY
      isHidden = false
      startRenderLoop()
    }

    const onVisibilityChange = () => {
      if (document.hidden) {
        hideCursor()
      }
    }

    const renderLoop = () => {
      if (isHidden) {
        if (dotRef.current) dotRef.current.style.opacity = "0"
        if (ringRef.current) ringRef.current.style.opacity = "0"
        animationFrameId = null
        return
      }

      const lerpFactor = prefersReducedMotion ? 1 : 0.22
      ringX += (mouseX - ringX) * lerpFactor
      ringY += (mouseY - ringY) * lerpFactor

      const targetOpacity = isTextTarget ? "0" : "1"

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`
        dotRef.current.style.opacity = targetOpacity
      }

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`
        ringRef.current.style.opacity = targetOpacity

        if (isHovering && !isClicking) {
          ringRef.current.classList.add("is-hovering")
          ringRef.current.classList.remove("is-clicking")
        } else if (isClicking) {
          ringRef.current.classList.add("is-clicking")
          ringRef.current.classList.remove("is-hovering")
        } else {
          ringRef.current.classList.remove("is-hovering", "is-clicking")
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop)
    }

    // Defensive touch listeners to proactively suppress and hide cursor on touch interactions
    window.addEventListener("touchstart", onTouchInteraction, { passive: true, capture: true })
    window.addEventListener("touchmove", onTouchInteraction, { passive: true, capture: true })
    window.addEventListener("touchend", onTouchInteraction, { passive: true, capture: true })
    window.addEventListener("touchcancel", onTouchInteraction, { passive: true, capture: true })

    // Pointer events for accurate fine-pointer tracking
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerdown", onPointerDown, { passive: true })
    window.addEventListener("pointerup", onPointerUp, { passive: true })
    window.addEventListener("pointercancel", onPointerLeave, { passive: true })

    // Window and document boundary handlers
    document.documentElement.addEventListener("mouseleave", onPointerLeave)
    document.documentElement.addEventListener("mouseenter", onPointerEnter)
    window.addEventListener("blur", onPointerLeave)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      window.removeEventListener("touchstart", onTouchInteraction, true)
      window.removeEventListener("touchmove", onTouchInteraction, true)
      window.removeEventListener("touchend", onTouchInteraction, true)
      window.removeEventListener("touchcancel", onTouchInteraction, true)

      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointerup", onPointerUp)
      window.removeEventListener("pointercancel", onPointerLeave)

      document.documentElement.removeEventListener("mouseleave", onPointerLeave)
      document.documentElement.removeEventListener("mouseenter", onPointerEnter)
      window.removeEventListener("blur", onPointerLeave)
      document.removeEventListener("visibilitychange", onVisibilityChange)

      if (motionQuery?.removeEventListener) {
        motionQuery.removeEventListener("change", handleMotionChange)
      } else if (motionQuery?.removeListener) {
        motionQuery.removeListener(handleMotionChange)
      }

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
        animationFrameId = null
      }

      if (dotRef.current) {
        dotRef.current.style.opacity = "0"
      }
      if (ringRef.current) {
        ringRef.current.style.opacity = "0"
        ringRef.current.classList.remove("is-hovering", "is-clicking")
      }
    }
  }, [isSupported])

  if (!isSupported) {
    return null
  }

  return (
    <div className="crownfall-cursor-wrapper" aria-hidden="true">
      <div ref={ringRef} className="crownfall-cursor-ring" />
      <div ref={dotRef} className="crownfall-cursor-dot" />
    </div>
  )
}

export default CrownfallCursor

