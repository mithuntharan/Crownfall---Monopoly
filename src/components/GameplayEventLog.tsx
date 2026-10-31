import React, { useState, useMemo, useRef, useEffect } from "react"

export interface GameplayEventEntry {
  id: string | number
  timestamp: number
  turnNumber?: number
  playerId?: number
  playerName: string
  playerColor?: string
  propertyId?: string
  propertyName?: string
  type: string
  title?: string
  description: string
  amount?: number
  sequenceNumber?: number
}

export interface GameplayEventLogProps {
  isOpen: boolean
  onToggle?: () => void
  onClose?: () => void
  events: GameplayEventEntry[]
  onClear?: () => void
  isEmbedded?: boolean
}

export type EventLogCategory =
  | "ALL"
  | "TURNS_DICE"
  | "RENT_PAYMENTS"
  | "PROPERTIES"
  | "CONSTRUCTION"
  | "CHANCE_CHEST"
  | "MOVEMENT_LOCATIONS"
  | "SYSTEM_ERRORS"

export const EVENT_LOG_CATEGORIES: { id: EventLogCategory; label: string; icon: string }[] = [
  { id: "ALL", label: "Full Log", icon: "" },
  { id: "TURNS_DICE", label: "Turns & Dice", icon: "" },
  { id: "RENT_PAYMENTS", label: "Rent & Payments", icon: "" },
  { id: "PROPERTIES", label: "Properties", icon: "" },
  { id: "CONSTRUCTION", label: "Construction", icon: "" },
  { id: "CHANCE_CHEST", label: "Chance & Chest", icon: "" },
  { id: "MOVEMENT_LOCATIONS", label: "Movement & Locations", icon: "" },
  { id: "SYSTEM_ERRORS", label: "System & Errors", icon: "" },
]

export function matchGameplayEventCategory(type: string, category: EventLogCategory): boolean {
  if (category === "ALL") return true
  const t = (type || "").toLowerCase().trim()

  switch (category) {
    case "TURNS_DICE":
      return (
        t === "roll" ||
        t === "roll_move" ||
        t === "turn" ||
        t === "turn_start" ||
        t === "turn_change" ||
        t === "extra_turn" ||
        t === "double" ||
        t === "doubles" ||
        t === "timeout" ||
        t === "turn_timeout" ||
        t === "end_turn" ||
        t === "skip" ||
        t === "skipped"
      )
    case "RENT_PAYMENTS":
      return (
        t === "rent" ||
        t === "tax" ||
        t === "fine" ||
        t === "fee" ||
        t === "payment" ||
        t === "reward" ||
        t === "start_pass" ||
        t === "pass_start" ||
        t === "start_bonus" ||
        t === "bankruptcy" ||
        t === "bankrupt" ||
        t === "capital"
      )
    case "PROPERTIES":
      return (
        t === "buy" ||
        t === "bought" ||
        t === "purchase" ||
        t === "decline" ||
        t === "declined" ||
        t === "mortgage" ||
        t === "mortgaged" ||
        t === "unmortgage" ||
        t === "unmortgaged" ||
        t === "trade" ||
        t.startsWith("trade")
      )
    case "CONSTRUCTION":
      return (
        t === "build" ||
        t === "building" ||
        t === "house" ||
        t === "hotel" ||
        t === "upgrade" ||
        t === "demolish" ||
        t === "sell" ||
        t === "destroy" ||
        t === "destruction"
      )
    case "CHANCE_CHEST":
      return (
        t === "chance" ||
        t === "chest" ||
        t === "community_chest" ||
        t === "card" ||
        t === "card_draw"
      )
    case "MOVEMENT_LOCATIONS":
      return (
        t === "move" ||
        t === "movement" ||
        t === "jail" ||
        t === "jail_enter" ||
        t === "jail_exit" ||
        t === "in_jail" ||
        t === "rest" ||
        t === "rest_house" ||
        t === "club" ||
        t === "start" ||
        t === "teleport" ||
        t === "visiting_jail"
      )
    case "SYSTEM_ERRORS":
      return (
        t === "system" ||
        t === "error" ||
        t === "rejected" ||
        t === "reject" ||
        t === "invalid" ||
        t === "resign" ||
        t === "resignation" ||
        t === "session_ended" ||
        t === "game_over" ||
        t === "settings" ||
        t === "rules"
      )
    default:
      return false
  }
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: string; bg: string; color: string; border: string; accentBorder: string; isImportant: boolean }
> = {
  roll: { label: "ROLL", icon: "", bg: "#f1f5f9", color: "#334155", border: "#cbd5e1", accentBorder: "transparent", isImportant: false },
  roll_move: { label: "ROLL", icon: "", bg: "#f1f5f9", color: "#334155", border: "#cbd5e1", accentBorder: "transparent", isImportant: false },
  ROLL_MOVE: { label: "ROLL", icon: "", bg: "#f1f5f9", color: "#334155", border: "#cbd5e1", accentBorder: "transparent", isImportant: false },
  buy: { label: "BOUGHT", icon: "", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", accentBorder: "#059669", isImportant: true },
  BUY: { label: "BOUGHT", icon: "", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", accentBorder: "#059669", isImportant: true },
  decline: { label: "DECLINED", icon: "", bg: "#f8fafc", color: "#64748b", border: "#e2e8f0", accentBorder: "transparent", isImportant: false },
  DECLINE: { label: "DECLINED", icon: "", bg: "#f8fafc", color: "#64748b", border: "#e2e8f0", accentBorder: "transparent", isImportant: false },
  rent: { label: "RENT", icon: "", bg: "#fff1f2", color: "#9f1239", border: "#fecdd3", accentBorder: "#e11d48", isImportant: true },
  RENT: { label: "RENT", icon: "", bg: "#fff1f2", color: "#9f1239", border: "#fecdd3", accentBorder: "#e11d48", isImportant: true },
  build: { label: "BUILD", icon: "", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", accentBorder: "#16a34a", isImportant: true },
  BUILD: { label: "BUILD", icon: "", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", accentBorder: "#16a34a", isImportant: true },
  demolish: { label: "DEMOLISH", icon: "", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#ca8a04", isImportant: false },
  DEMOLISH: { label: "DEMOLISH", icon: "", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#ca8a04", isImportant: false },
  destroy: { label: "DESTROY", icon: "", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#ca8a04", isImportant: false },
  chance: { label: "CHANCE", icon: "", bg: "#faf5ff", color: "#6b21a8", border: "#e9d5ff", accentBorder: "#9333ea", isImportant: false },
  CHANCE: { label: "CHANCE", icon: "", bg: "#faf5ff", color: "#6b21a8", border: "#e9d5ff", accentBorder: "#9333ea", isImportant: false },
  chest: { label: "CHEST", icon: "", bg: "#fdf2f8", color: "#9d174d", border: "#fbcfe8", accentBorder: "#db2777", isImportant: false },
  CHEST: { label: "CHEST", icon: "", bg: "#fdf2f8", color: "#9d174d", border: "#fbcfe8", accentBorder: "#db2777", isImportant: false },
  tax: { label: "TAX", icon: "", bg: "#fff1f2", color: "#9f1239", border: "#fecdd3", accentBorder: "#e11d48", isImportant: true },
  TAX: { label: "TAX", icon: "", bg: "#fff1f2", color: "#9f1239", border: "#fecdd3", accentBorder: "#e11d48", isImportant: true },
  jail: { label: "JAIL", icon: "", bg: "#fff7ed", color: "#9a3412", border: "#fed7aa", accentBorder: "#ea580c", isImportant: true },
  JAIL: { label: "JAIL", icon: "", bg: "#fff7ed", color: "#9a3412", border: "#fed7aa", accentBorder: "#ea580c", isImportant: true },
  rest: { label: "REST HOUSE", icon: "", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#d97706", isImportant: false },
  REST: { label: "REST HOUSE", icon: "", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#d97706", isImportant: false },
  club: { label: "ROYAL CLUB", icon: "", bg: "#fefce8", color: "#78350f", border: "#fef08a", accentBorder: "#d97706", isImportant: false },
  CLUB: { label: "ROYAL CLUB", icon: "", bg: "#fefce8", color: "#78350f", border: "#fef08a", accentBorder: "#d97706", isImportant: false },
  bankruptcy: { label: "BANKRUPT", icon: "", bg: "#fef2f2", color: "#991b1b", border: "#fecaca", accentBorder: "#b91c1c", isImportant: true },
  BANKRUPTCY: { label: "BANKRUPT", icon: "", bg: "#fef2f2", color: "#991b1b", border: "#fecaca", accentBorder: "#b91c1c", isImportant: true },
  turn_change: { label: "TURN", icon: "", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#d97706", isImportant: true },
  TURN_CHANGE: { label: "TURN", icon: "", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#d97706", isImportant: true },
  reward: { label: "REWARD", icon: "", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", accentBorder: "#22c55e", isImportant: true },
  start_pass: { label: "REWARD", icon: "", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", accentBorder: "#22c55e", isImportant: true },
  START_PASS: { label: "REWARD", icon: "", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", accentBorder: "#22c55e", isImportant: true },
  timeout: { label: "TIMEOUT", icon: "", bg: "#fef2f2", color: "#991b1b", border: "#fecaca", accentBorder: "#dc2626", isImportant: true },
  mortgage: { label: "MORTGAGE", icon: "", bg: "#f5f3ff", color: "#5b21b6", border: "#ddd6fe", accentBorder: "#7c3aed", isImportant: false },
  MORTGAGE: { label: "MORTGAGE", icon: "", bg: "#f5f3ff", color: "#5b21b6", border: "#ddd6fe", accentBorder: "#7c3aed", isImportant: false },
  unmortgage: { label: "UNMORTGAGE", icon: "", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", accentBorder: "#059669", isImportant: false },
  UNMORTGAGE: { label: "UNMORTGAGE", icon: "", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", accentBorder: "#059669", isImportant: false },
  resign: { label: "RESIGNED", icon: "", bg: "#f8fafc", color: "#475569", border: "#cbd5e1", accentBorder: "#94a3b8", isImportant: true },
  RESIGN: { label: "RESIGNED", icon: "", bg: "#f8fafc", color: "#475569", border: "#cbd5e1", accentBorder: "#94a3b8", isImportant: true },
  resignation: { label: "RESIGNED", icon: "", bg: "#f8fafc", color: "#475569", border: "#cbd5e1", accentBorder: "#94a3b8", isImportant: true },
  game_over: { label: "GAME OVER", icon: "", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#ca8a04", isImportant: true },
  GAME_OVER: { label: "GAME OVER", icon: "", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#ca8a04", isImportant: true },
  system: { label: "SYSTEM", icon: "", bg: "#f8fafc", color: "#475569", border: "#cbd5e1", accentBorder: "#94a3b8", isImportant: false },
  error: { label: "ERROR", icon: "", bg: "#fef2f2", color: "#991b1b", border: "#fecaca", accentBorder: "#dc2626", isImportant: true },
}

export function GameplayEventLog({ isOpen, onToggle, onClose, events, onClear: _onClear, isEmbedded = false }: GameplayEventLogProps) {
  const handleToggle = onClose || onToggle || (() => {})
  const [activeCategory, setActiveCategory] = useState<EventLogCategory>("ALL")

  // Deduplicate and filter events
  const deduplicatedEvents = useMemo(() => {
    const seen = new Set<string>()
    const result: GameplayEventEntry[] = []
    for (const evt of events) {
      const key = `${evt.id}_${evt.timestamp}_${evt.type}`
      if (!seen.has(key)) {
        seen.add(key)
        result.push(evt)
      }
    }
    // Sort chronologically: oldest first, newest last
    return result.sort((a, b) => {
      if (a.sequenceNumber !== undefined && b.sequenceNumber !== undefined) {
        return a.sequenceNumber - b.sequenceNumber
      }
      return a.timestamp - b.timestamp
    })
  }, [events])

  // Count events per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: deduplicatedEvents.length,
      TURNS_DICE: 0,
      RENT_PAYMENTS: 0,
      PROPERTIES: 0,
      CONSTRUCTION: 0,
      CHANCE_CHEST: 0,
      MOVEMENT_LOCATIONS: 0,
      SYSTEM_ERRORS: 0,
    }
    for (const evt of deduplicatedEvents) {
      if (matchGameplayEventCategory(evt.type, "TURNS_DICE")) counts.TURNS_DICE++
      if (matchGameplayEventCategory(evt.type, "RENT_PAYMENTS")) counts.RENT_PAYMENTS++
      if (matchGameplayEventCategory(evt.type, "PROPERTIES")) counts.PROPERTIES++
      if (matchGameplayEventCategory(evt.type, "CONSTRUCTION")) counts.CONSTRUCTION++
      if (matchGameplayEventCategory(evt.type, "CHANCE_CHEST")) counts.CHANCE_CHEST++
      if (matchGameplayEventCategory(evt.type, "MOVEMENT_LOCATIONS")) counts.MOVEMENT_LOCATIONS++
      if (matchGameplayEventCategory(evt.type, "SYSTEM_ERRORS")) counts.SYSTEM_ERRORS++
    }
    return counts
  }, [deduplicatedEvents])

  // Filter for active tab
  const displayedEvents = useMemo(() => {
    return deduplicatedEvents.filter((evt) => matchGameplayEventCategory(evt.type, activeCategory))
  }, [deduplicatedEvents, activeCategory])

  // Smart auto-scroll: keep scrolled to bottom only if user was already at or near bottom
  const feedRef = useRef<HTMLDivElement | null>(null)
  const isNearBottomRef = useRef<boolean>(true)

  const handleScroll = () => {
    const el = feedRef.current
    if (!el) return
    const threshold = 40
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold
  }

  useEffect(() => {
    const el = feedRef.current
    if (!el) return
    if (isNearBottomRef.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [displayedEvents.length, activeCategory])

  const eventLogBody = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* 8 Category Tabs Bar */}
      <div className="event-log-tabs-bar custom-scrollbar">
        {EVENT_LOG_CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id
          const count = categoryCounts[cat.id] ?? 0
          return (
            <button
              key={cat.id}
              type="button"
              className={`event-log-cat-btn ${isActive ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.icon ? <span>{cat.icon}</span> : null}
              <span>{cat.label}</span>
              <span className={`event-log-cat-count ${isActive ? "active" : ""}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Events List */}
      <div
        ref={feedRef}
        onScroll={handleScroll}
        className="event-log-feed custom-scrollbar"
      >
        {displayedEvents.length === 0 ? (
          <div className="event-log-empty-state">
            <span className="event-log-empty-title">[LOG EMPTY]</span>
            <span className="event-log-empty-desc">
              {deduplicatedEvents.length === 0
                ? "No events recorded in this session yet."
                : "No events match this category tab."}
            </span>
          </div>
        ) : (
          displayedEvents.map((evt, idx) => {
            const typeKey = evt.type.toLowerCase()
            const cfg = TYPE_CONFIG[typeKey] || TYPE_CONFIG[evt.type] || TYPE_CONFIG.roll
            return (
              <div
                key={evt.id || `evt_${idx}`}
                className={`event-log-entry-card ${cfg.isImportant ? "is-important" : ""}`}
                style={{
                  borderLeft: cfg.isImportant ? `4px solid ${cfg.accentBorder}` : undefined,
                }}
              >
                {cfg.icon ? (
                  <span className="event-log-icon">
                    {cfg.icon}
                  </span>
                ) : null}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      marginBottom: "3px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span
                        className={`event-type-badge badge-${typeKey}`}
                        style={{
                          borderColor: cfg.border,
                          background: cfg.bg,
                          color: cfg.color,
                        }}
                      >
                        {cfg.label}
                      </span>
                      {evt.turnNumber !== undefined && (
                        <span className="event-turn-pill">
                          Turn #{evt.turnNumber}
                        </span>
                      )}
                    </div>
                    <span className="event-timestamp">
                      {new Date(evt.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="event-desc-text">
                    <strong className="event-player-name">
                      {evt.playerName}:
                    </strong>{" "}
                    {evt.description}
                  </div>
                  {evt.amount !== undefined && evt.amount !== 0 && (
                    <div className="event-amount-wrapper">
                      <span
                        className={`event-amount-pill ${evt.amount > 0 ? "gain" : "loss"}`}
                      >
                        {evt.amount > 0 ? `+₹${evt.amount.toLocaleString()}` : `-₹${Math.abs(evt.amount).toLocaleString()}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="event-log-footer">
        <span>
          Showing {displayedEvents.length} of {deduplicatedEvents.length} events
        </span>
      </div>
    </div>
  )

  if (isEmbedded) {
    return eventLogBody
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="modal-backdrop"
      onClick={handleToggle}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        background: "rgba(15, 23, 42, 0.6)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px 10px",
      }}
    >
      <div
        className="event-log-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="event-log-card-header">
          <div>
            <strong className="event-log-card-title">
              CROWNFALL CHRONICLE · EVENT LOG
            </strong>
            <span className="event-log-card-subtitle">
              Authoritative chronological game events · Oldest to newest
            </span>
          </div>
          <button
            onClick={handleToggle}
            aria-label="Close event log"
            className="event-log-close-btn"
          >
            ✕
          </button>
        </div>

        {eventLogBody}
      </div>
    </div>
  )
}

export default GameplayEventLog
