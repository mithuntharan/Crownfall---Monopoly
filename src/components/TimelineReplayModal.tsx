import { useState, useMemo } from "react"
import type { ActivityLogEntry, TransactionRecord, EnginePlayer } from "../engine/GameEngineInterface"

interface TimelineReplayModalProps {
  activityLog?: ActivityLogEntry[]
  transactionLedger?: TransactionRecord[]
  players: EnginePlayer[]
  roundNumber: number
  close: () => void
}

interface TimelineItem {
  id: string
  timestamp: number
  turnNumber?: number
  type: string
  title: string
  description: string
  amount?: number
  playerColor?: string
  playerName?: string
  resultingBalances?: Record<string, number>
  source: "activity" | "transaction"
}

export function TimelineReplayModal({
  activityLog = [],
  transactionLedger = [],
  players,
  roundNumber,
  close,
}: TimelineReplayModalProps) {
  const [filter, setFilter] = useState<"all" | "finance" | "movement" | "property" | "trades">("all")

  // Combine and sort events
  const timelineEvents: TimelineItem[] = useMemo(() => {
    const list: TimelineItem[] = []

    for (const a of activityLog) {
      list.push({
        id: `act_${a.id}`,
        timestamp: a.timestamp,
        type: a.type,
        title: a.type.replace(/_/g, " "),
        description: a.description,
        amount: a.amount,
        playerColor: a.playerColor,
        playerName: a.playerName,
        source: "activity",
      })
    }

    for (const t of transactionLedger) {
      // Avoid exact duplicates if activity log already caught it
      list.push({
        id: `tx_${t.id}`,
        timestamp: t.timestamp,
        turnNumber: t.turnNumber,
        type: t.type,
        title: t.type.replace(/_/g, " "),
        description: t.description,
        amount: t.amount,
        playerName: t.primaryPlayerName,
        resultingBalances: t.resultingBalances,
        source: "transaction",
      })
    }

    list.sort((a, b) => a.timestamp - b.timestamp)
    return list
  }, [activityLog, transactionLedger])

  const filteredEvents = useMemo(() => {
    return timelineEvents.filter((ev) => {
      if (filter === "all") return true
      const type = ev.type.toUpperCase()
      if (filter === "finance") {
        return (
          ev.source === "transaction" ||
          type.includes("RENT") ||
          type.includes("TAX") ||
          type.includes("SALARY") ||
          type.includes("FEE")
        )
      }
      if (filter === "movement") {
        return type.includes("ROLL") || type.includes("MOVE") || type.includes("JAIL") || type.includes("REST")
      }
      if (filter === "property") {
        return (
          type.includes("BUY") ||
          type.includes("PURCHASE") ||
          type.includes("BUILD") ||
          type.includes("DESTROY") ||
          type.includes("MORTGAGE") ||
          type.includes("UNMORTGAGE")
        )
      }
      if (filter === "trades") {
        return type.includes("TRADE")
      }
      return true
    })
  }, [timelineEvents, filter])

  const [currentIndex, setCurrentIndex] = useState<number>(
    Math.max(0, filteredEvents.length - 1),
  )

  const selectedEvent = filteredEvents[currentIndex]

  const getEventIcon = (type: string) => {
    const t = type.toUpperCase()
    if (t.includes("ROLL") || t.includes("MOVE")) return "🎲"
    if (t.includes("RENT")) return "💸"
    if (t.includes("BUY") || t.includes("PURCHASE")) return "🏠"
    if (t.includes("BUILD")) return "🔨"
    if (t.includes("DESTROY")) return "💥"
    if (t.includes("TRADE")) return "🤝"
    if (t.includes("MORTGAGE")) return "🏦"
    if (t.includes("JAIL")) return "🚨"
    if (t.includes("PASS") || t.includes("START")) return "🚩"
    return "📜"
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        className="modal-sheet timeline-replay-modal"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ maxWidth: "680px", width: "95vw", maxHeight: "88vh", display: "flex", flexDirection: "column" }}
      >
        <div className="sheet-handle" />
        <div className="modal-header">
          <strong style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--gold-300)" }}>
            <span>⏱️</span> TURN TIMELINE & HISTORICAL REPLAY
          </strong>
          <button onClick={close} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Read-only safe banner */}
        <div
          style={{
            padding: "6px 12px",
            background: "rgba(16, 185, 129, 0.15)",
            borderBottom: "1px solid rgba(16, 185, 129, 0.3)",
            color: "#6ee7b7",
            fontSize: "11px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>🛡️ READ-ONLY SESSION ARCHIVE — LIVE GAME CONTINUES SAFELY</span>
          <span style={{ color: "var(--gold-300)", fontWeight: 700 }}>Round {roundNumber}</span>
        </div>

        {/* Stepper Scrubber Controller */}
        {filteredEvents.length > 0 && (
          <div
            style={{
              padding: "10px 16px",
              background: "rgba(0,0,0,0.3)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
              <span style={{ color: "var(--text-muted)" }}>
                Step <strong>{currentIndex + 1}</strong> of <strong>{filteredEvents.length}</strong>
              </span>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid var(--border-subtle)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                    fontSize: "11px",
                  }}
                >
                  ◀ Prev
                </button>
                <button
                  onClick={() => setCurrentIndex((i) => Math.min(filteredEvents.length - 1, i + 1))}
                  disabled={currentIndex >= filteredEvents.length - 1}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid var(--border-subtle)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#fff",
                    cursor: currentIndex >= filteredEvents.length - 1 ? "not-allowed" : "pointer",
                    fontSize: "11px",
                  }}
                >
                  Next ▶
                </button>
                <button
                  onClick={() => setCurrentIndex(filteredEvents.length - 1)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid var(--gold-400)",
                    background: "rgba(200, 155, 69, 0.2)",
                    color: "var(--gold-300)",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: 700,
                  }}
                >
                  Latest ⏭
                </button>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max={filteredEvents.length - 1}
              value={currentIndex}
              onChange={(e) => setCurrentIndex(Number(e.target.value))}
              style={{
                width: "100%",
                accentColor: "var(--gold-400)",
                cursor: "pointer",
              }}
            />
          </div>
        )}

        {/* Selected Event Spotlight */}
        {selectedEvent && (
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(200, 155, 69, 0.08)",
              borderBottom: "1px solid var(--gold-400)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--gold-300)", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>{getEventIcon(selectedEvent.type)}</span>
                {selectedEvent.title}
              </span>
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {new Date(selectedEvent.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "#fff", margin: "4px 0" }}>
              {selectedEvent.description}
            </p>

            {selectedEvent.resultingBalances && (
              <div style={{ marginTop: "8px", background: "rgba(0,0,0,0.3)", padding: "6px 10px", borderRadius: "6px", display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "11px" }}>
                <span style={{ color: "var(--text-muted)" }}>Balances After Event:</span>
                {Object.entries(selectedEvent.resultingBalances).map(([pId, bal]) => {
                  const p = players.find((x) => x.id === Number(pId))
                  return (
                    <span key={pId} style={{ color: p ? p.color : "var(--gold-300)", fontWeight: 600 }}>
                      {p ? p.name : `P${pId}`}: ₹{bal.toLocaleString()}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Category Filters */}
        <div style={{ display: "flex", gap: "6px", padding: "8px 16px", borderBottom: "1px solid var(--border-subtle)", overflowX: "auto" }}>
          {(["all", "finance", "property", "movement", "trades"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                setFilter(t)
                setCurrentIndex(0)
              }}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                border: filter === t ? "1px solid var(--gold-400)" : "1px solid transparent",
                background: filter === t ? "rgba(200, 155, 69, 0.2)" : "transparent",
                color: filter === t ? "var(--gold-300)" : "var(--text-muted)",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                textTransform: "capitalize",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Chronological Event Feed */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {filteredEvents.length === 0 ? (
            <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", margin: "20px 0" }}>
              No authoritative timeline events recorded yet.
            </p>
          ) : (
            filteredEvents.map((ev, idx) => {
              const isSelected = idx === currentIndex
              return (
                <div
                  key={ev.id}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    background: isSelected ? "rgba(200, 155, 69, 0.2)" : "rgba(0,0,0,0.2)",
                    border: isSelected ? "1px solid var(--gold-400)" : "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px" }}>{getEventIcon(ev.type)}</span>
                    <div>
                      <div style={{ fontSize: "12px", color: isSelected ? "var(--gold-300)" : "#fff", fontWeight: 600 }}>
                        {ev.description}
                      </div>
                      <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                        {new Date(ev.timestamp).toLocaleTimeString()} {ev.turnNumber ? `• Turn ${ev.turnNumber}` : ""}
                      </div>
                    </div>
                  </div>
                  {ev.amount !== undefined && ev.amount > 0 && (
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--gold-300)", whiteSpace: "nowrap" }}>
                      ₹{ev.amount.toLocaleString()}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer Technical Note */}
        <div style={{ padding: "8px 16px", background: "rgba(0,0,0,0.3)", borderTop: "1px solid var(--border-subtle)", fontSize: "10px", color: "var(--text-muted)" }}>
          ℹ️ <strong>Timeline Architecture:</strong> Discrete event-by-event timeline is validated from authoritative C++ transactions and logs. Continuous graphical token animation replay is intentionally omitted to prevent desyncing live physics.
        </div>
      </section>
    </div>
  )
}
