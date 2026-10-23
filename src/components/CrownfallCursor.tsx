import React, { useEffect, useRef, useState } from "react"

/**
 * Crownfall Dotter-Inspired Custom Cursor
 * 
 * Features:
 * - Ultra-high performance: transforms DOM nodes directly via requestAnimationFrame,
 *   bypassing React re-renders completely during pointer movement.
 * - Precision pinpoint dot (6px) with an elegant lagging/smooth antique-gold ring.
 * - Subtle hover state over interactive elements (buttons, spaces, property cards).
 * - Restrained click feedback compression without distracting ripples.
 * - Automatically hides over text inputs, preserving standard I-beam and selection.
 * - Hardware capability guard: enabled ONLY on fine pointer devices with hover.
 * - Fully disabled on touchscreens / mobile devices with zero DOM overhead.
 * - Honors prefers-reduced-motion.
 */
export const CrownfallCursor: React.FC = () => {
  const dotRef = useRef<HTMLDivElement | null>(null)
  const ringRef = useRef<HTMLDivElement | null>(null)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    // Only enable if device supports hover and has a fine pointer (mouse/trackpad)
    if (typeof window === "undefined" || !window.matchMedia) return
    const mqHover = window.matchMedia("(hover: hover) and (pointer: fine)")
    if (!mqHover.matches) return

    setSupported(true)

    let mouseX = -100
    let mouseY = -100
    let ringX = -100
    let ringY = -100
    let isHovering = false
    let isClicking = false
    let isHidden = true
    let isTextTarget = false
    let animationFrameId: number | null = null

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const lerpFactor = prefersReducedMotion ? 1 : 0.22

    const onPointerMove = (e: PointerEvent) => {
      // Ignore simulated touches or pen events without fine precision
      if (e.pointerType === "touch") return

      mouseX = e.clientX
      mouseY = e.clientY

      if (isHidden) {
        isHidden = false
        ringX = mouseX
        ringY = mouseY
      }

      // Check target element to detect interactive or text input elements
      const target = e.target as HTMLElement | null
      if (target) {
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable ||
          Boolean(target.closest("input, textarea, select, [contenteditable='true']"))

        isTextTarget = isInput

        const isClickable =
          !isInput &&
          (target.tagName === "BUTTON" ||
            target.tagName === "A" ||
            target.getAttribute("role") === "button" ||
            target.classList.contains("board-space") ||
            target.classList.contains("property-card") ||
            target.classList.contains("price-chip") ||
            target.classList.contains("clickable") ||
            Boolean(target.closest("button, a, [role='button'], .board-space, .property-card, .price-chip")))

        isHovering = Boolean(isClickable)
      }
    }

    const onPointerDown = () => {
      isClicking = true
    }

    const onPointerUp = () => {
      isClicking = false
    }

    const onPointerLeave = () => {
      isHidden = true
    }

    const onPointerEnter = () => {
      isHidden = false
    }

    const renderLoop = () => {
      // Smooth interpolation for the outer ring
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
    document.addEventListener("mouseleave", onPointerLeave)
    document.addEventListener("mouseenter", onPointerEnter)

    animationFrameId = requestAnimationFrame(renderLoop)

    return () => {
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointerup", onPointerUp)
      document.removeEventListener("mouseleave", onPointerLeave)
      document.removeEventListener("mouseenter", onPointerEnter)
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [])

  if (!supported) return null

  return (
    <div className="crownfall-cursor-wrapper" aria-hidden="true">
      <div ref={ringRef} className="crownfall-cursor-ring" />
      <div ref={dotRef} className="crownfall-cursor-dot" />
    </div>
  )
}

export default CrownfallCursor
