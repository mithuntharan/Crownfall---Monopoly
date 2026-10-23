import React, { useEffect, useRef } from "react"

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
 * - Hardware capability guard: enabled on devices with hover and fine pointer.
 * - Fully disabled on touch-only devices with zero overhead.
 * - Honors prefers-reduced-motion.
 */
export const CrownfallCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement | null>(null)
  const ringRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    // Hardware check: don't track on touch-only devices
    const isTouchOnly =
      window.matchMedia &&
      window.matchMedia("(pointer: coarse) and not (hover: hover) and not (any-pointer: fine)").matches

    if (isTouchOnly) return

    let mouseX = -100
    let mouseY = -100
    let ringX = -100
    let ringY = -100
    let isHovering = false
    let isClicking = false
    let isHidden = true
    let isTextTarget = false
    let animationFrameId: number | null = null

    const prefersReducedMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const lerpFactor = prefersReducedMotion ? 1 : 0.22

    const onPointerMove = (e: MouseEvent | PointerEvent) => {
      if ((e as PointerEvent).pointerType === "touch") return

      mouseX = e.clientX
      mouseY = e.clientY

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
    }

    const onPointerDown = (e: MouseEvent | PointerEvent) => {
      if ((e as PointerEvent).pointerType === "touch") return
      isClicking = true
    }

    const onPointerUp = () => {
      isClicking = false
    }

    const onPointerLeave = () => {
      isHidden = true
    }

    const onPointerEnter = (e: MouseEvent | PointerEvent) => {
      if ((e as PointerEvent).pointerType === "touch") return
      isHidden = false
      mouseX = (e as MouseEvent).clientX
      mouseY = (e as MouseEvent).clientY
    }

    const renderLoop = () => {
      ringX += (mouseX - ringX) * lerpFactor
      ringY += (mouseY - ringY) * lerpFactor

      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`
        dotRef.current.style.opacity = isHidden || isTextTarget ? "0" : "1"
      }

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`
        ringRef.current.style.opacity = isHidden || isTextTarget ? "0" : "1"

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

    window.addEventListener("pointermove", onPointerMove, { passive: true })
    window.addEventListener("pointerdown", onPointerDown, { passive: true })
    window.addEventListener("pointerup", onPointerUp, { passive: true })
    document.documentElement.addEventListener("mouseleave", onPointerLeave)
    document.documentElement.addEventListener("mouseenter", onPointerEnter)

    animationFrameId = requestAnimationFrame(renderLoop)

    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointerup", onPointerUp)
      document.documentElement.removeEventListener("mouseleave", onPointerLeave)
      document.documentElement.removeEventListener("mouseenter", onPointerEnter)
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [])

  return (
    <div className="crownfall-cursor-wrapper" aria-hidden="true">
      <div ref={ringRef} className="crownfall-cursor-ring" />
      <div ref={dotRef} className="crownfall-cursor-dot" />
    </div>
  )
}

export default CrownfallCursor
