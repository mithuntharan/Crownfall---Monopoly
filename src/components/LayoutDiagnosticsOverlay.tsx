import { useEffect, useState } from "react"

interface OverflowIssue {
  elementSelector: string
  issueType: "HORIZONTAL_OVERFLOW" | "VERTICAL_OVERFLOW" | "CLIPPED_CONTENT" | "BOUNDS_EXCEEDED"
  details: string
}

export function LayoutDiagnosticsOverlay({ enabled = false }: { enabled?: boolean }) {
  const [issues, setIssues] = useState<OverflowIssue[]>([])
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 390,
  )
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== "undefined" ? window.innerHeight : 844,
  )
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    const checkLayout = () => {
      setViewportWidth(window.innerWidth)
      setViewportHeight(window.innerHeight)

      const detectedIssues: OverflowIssue[] = []
      const containersToCheck = [
        ".game-screen",
        ".game-topbar",
        ".board-grid",
        ".game-controls",
        ".game-shortcuts",
        ".modal-sheet",
        ".turn-banner",
        ".player-strip",
        ".portfolio-summary",
      ]

      for (const sel of containersToCheck) {
        const els = document.querySelectorAll(sel)
        els.forEach((el, idx) => {
          const htmlEl = el as HTMLElement
          const label = els.length > 1 ? `${sel}[${idx}]` : sel

          // Check horizontal overflow
          if (htmlEl.scrollWidth > htmlEl.clientWidth + 2) {
            detectedIssues.push({
              elementSelector: label,
              issueType: "HORIZONTAL_OVERFLOW",
              details: `Content width (${htmlEl.scrollWidth}px) exceeds container (${htmlEl.clientWidth}px) by ${htmlEl.scrollWidth - htmlEl.clientWidth}px`,
            })
          }

          // Check if extending outside window
          const rect = htmlEl.getBoundingClientRect()
          if (rect.right > window.innerWidth + 2) {
            detectedIssues.push({
              elementSelector: label,
              issueType: "BOUNDS_EXCEEDED",
              details: `Extends ${Math.round(rect.right - window.innerWidth)}px past right viewport edge`,
            })
          }
          if (rect.left < -2) {
            detectedIssues.push({
              elementSelector: label,
              issueType: "BOUNDS_EXCEEDED",
              details: `Extends ${Math.round(-rect.left)}px past left viewport edge`,
            })
          }
        })
      }

      setIssues(detectedIssues)
    }

    const interval = window.setInterval(checkLayout, 1000)
    checkLayout()

    window.addEventListener("resize", checkLayout)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("resize", checkLayout)
    }
  }, [enabled])

  if (!enabled) return null

  return (
    <div
      className="layout-diagnostics-container"
      style={{
        position: "fixed",
        top: "70px",
        right: "12px",
        zIndex: 9999,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          background: issues.length > 0 ? "rgba(185, 28, 28, 0.95)" : "rgba(16, 185, 129, 0.92)",
          border: issues.length > 0 ? "1.5px solid #f87171" : "1px solid #34d399",
          color: "#fff",
          borderRadius: "8px",
          padding: "4px 8px",
          fontSize: "10px",
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.35)",
        }}
      >
        <span>{issues.length > 0 ? "[!]" : "[OK]"}</span>
        <span>
          {viewportWidth}×{viewportHeight} · {issues.length === 0 ? "LAYOUT OK" : `${issues.length} OVERFLOWS`}
        </span>
      </button>

      {isExpanded && (
        <div
          style={{
            position: "absolute",
            top: "34px",
            right: "0",
            width: "300px",
            maxHeight: "360px",
            overflowY: "auto",
            background: "rgba(17, 29, 56, 0.97)",
            border: "1px solid var(--gold)",
            borderRadius: "10px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            padding: "10px",
            color: "#fff",
            fontSize: "11px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid rgba(255,255,255,0.15)",
              paddingBottom: "6px",
              marginBottom: "8px",
            }}
          >
            <strong style={{ color: "var(--gold-light)", fontSize: "11px" }}>
              LAYOUT AUDIT ({viewportWidth}px)
            </strong>
            <button
              onClick={() => setIsExpanded(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#ccc",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginBottom: "8px", fontSize: "10px", color: "#bbb" }}>
            Viewport: <strong>{viewportWidth}px</strong> width × <strong>{viewportHeight}px</strong> height
          </div>

          {issues.length === 0 ? (
            <div style={{ color: "#6ee7b7", padding: "8px 0" }}>
              ✓ No horizontal overflow or viewport clipping detected. Containers fit within viewport.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {issues.map((issue, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid #ef4444",
                    borderRadius: "6px",
                    padding: "6px",
                  }}
                >
                  <strong style={{ color: "#fca5a5", display: "block" }}>
                    {issue.elementSelector}
                  </strong>
                  <div style={{ color: "#fecaca", fontSize: "10px", marginTop: "2px" }}>
                    {issue.details}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
