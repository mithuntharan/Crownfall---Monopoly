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
  { id: "ALL", label: "Full Log", icon: "📋" },
  { id: "TURNS_DICE", label: "Turns & Dice", icon: "🎲" },
  { id: "RENT_PAYMENTS", label: "Rent & Payments", icon: "💰" },
  { id: "PROPERTIES", label: "Properties", icon: "🏠" },
  { id: "CONSTRUCTION", label: "Construction", icon: "🏗️" },
  { id: "CHANCE_CHEST", label: "Chance & Chest", icon: "🃏" },
  { id: "MOVEMENT_LOCATIONS", label: "Movement & Locations", icon: "📍" },
  { id: "SYSTEM_ERRORS", label: "System & Errors", icon: "⚙️" },
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
  roll: { label: "ROLL", icon: "🎲", bg: "#f1f5f9", color: "#334155", border: "#cbd5e1", accentBorder: "transparent", isImportant: false },
  roll_move: { label: "ROLL", icon: "🎲", bg: "#f1f5f9", color: "#334155", border: "#cbd5e1", accentBorder: "transparent", isImportant: false },
  ROLL_MOVE: { label: "ROLL", icon: "🎲", bg: "#f1f5f9", color: "#334155", border: "#cbd5e1", accentBorder: "transparent", isImportant: false },
  buy: { label: "BOUGHT", icon: "🏛️", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", accentBorder: "#059669", isImportant: true },
  BUY: { label: "BOUGHT", icon: "🏛️", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", accentBorder: "#059669", isImportant: true },
  decline: { label: "DECLINED", icon: "🚫", bg: "#f8fafc", color: "#64748b", border: "#e2e8f0", accentBorder: "transparent", isImportant: false },
  DECLINE: { label: "DECLINED", icon: "🚫", bg: "#f8fafc", color: "#64748b", border: "#e2e8f0", accentBorder: "transparent", isImportant: false },
  rent: { label: "RENT", icon: "💸", bg: "#fff1f2", color: "#9f1239", border: "#fecdd3", accentBorder: "#e11d48", isImportant: true },
  RENT: { label: "RENT", icon: "💸", bg: "#fff1f2", color: "#9f1239", border: "#fecdd3", accentBorder: "#e11d48", isImportant: true },
  build: { label: "BUILD", icon: "🏗️", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", accentBorder: "#16a34a", isImportant: true },
  BUILD: { label: "BUILD", icon: "🏗️", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", accentBorder: "#16a34a", isImportant: true },
  demolish: { label: "DEMOLISH", icon: "🏚️", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#ca8a04", isImportant: false },
  DEMOLISH: { label: "DEMOLISH", icon: "🏚️", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#ca8a04", isImportant: false },
  destroy: { label: "DESTROY", icon: "🏚️", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#ca8a04", isImportant: false },
  chance: { label: "CHANCE", icon: "✨", bg: "#faf5ff", color: "#6b21a8", border: "#e9d5ff", accentBorder: "#9333ea", isImportant: false },
  CHANCE: { label: "CHANCE", icon: "✨", bg: "#faf5ff", color: "#6b21a8", border: "#e9d5ff", accentBorder: "#9333ea", isImportant: false },
  chest: { label: "CHEST", icon: "💎", bg: "#fdf2f8", color: "#9d174d", border: "#fbcfe8", accentBorder: "#db2777", isImportant: false },
  CHEST: { label: "CHEST", icon: "💎", bg: "#fdf2f8", color: "#9d174d", border: "#fbcfe8", accentBorder: "#db2777", isImportant: false },
  tax: { label: "TAX", icon: "⚖️", bg: "#fff1f2", color: "#9f1239", border: "#fecdd3", accentBorder: "#e11d48", isImportant: true },
  TAX: { label: "TAX", icon: "⚖️", bg: "#fff1f2", color: "#9f1239", border: "#fecdd3", accentBorder: "#e11d48", isImportant: true },
  jail: { label: "JAIL", icon: "🔒", bg: "#fff7ed", color: "#9a3412", border: "#fed7aa", accentBorder: "#ea580c", isImportant: true },
  JAIL: { label: "JAIL", icon: "🔒", bg: "#fff7ed", color: "#9a3412", border: "#fed7aa", accentBorder: "#ea580c", isImportant: true },
  rest: { label: "REST HOUSE", icon: "☕", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#d97706", isImportant: false },
  REST: { label: "REST HOUSE", icon: "☕", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#d97706", isImportant: false },
  club: { label: "ROYAL CLUB", icon: "👑", bg: "#fefce8", color: "#78350f", border: "#fef08a", accentBorder: "#d97706", isImportant: false },
  CLUB: { label: "ROYAL CLUB", icon: "👑", bg: "#fefce8", color: "#78350f", border: "#fef08a", accentBorder: "#d97706", isImportant: false },
  bankruptcy: { label: "BANKRUPT", icon: "💀", bg: "#fef2f2", color: "#991b1b", border: "#fecaca", accentBorder: "#b91c1c", isImportant: true },
  BANKRUPTCY: { label: "BANKRUPT", icon: "💀", bg: "#fef2f2", color: "#991b1b", border: "#fecaca", accentBorder: "#b91c1c", isImportant: true },
  turn_change: { label: "TURN", icon: "👤", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#d97706", isImportant: true },
  TURN_CHANGE: { label: "TURN", icon: "👤", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#d97706", isImportant: true },
  reward: { label: "REWARD", icon: "🌟", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", accentBorder: "#22c55e", isImportant: true },
  start_pass: { label: "REWARD", icon: "🌟", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", accentBorder: "#22c55e", isImportant: true },
  START_PASS: { label: "REWARD", icon: "🌟", bg: "#f0fdf4", color: "#166534", border: "#bbf7d0", accentBorder: "#22c55e", isImportant: true },
  timeout: { label: "TIMEOUT", icon: "⌛", bg: "#fef2f2", color: "#991b1b", border: "#fecaca", accentBorder: "#dc2626", isImportant: true },
  mortgage: { label: "MORTGAGE", icon: "📜", bg: "#f5f3ff", color: "#5b21b6", border: "#ddd6fe", accentBorder: "#7c3aed", isImportant: false },
  MORTGAGE: { label: "MORTGAGE", icon: "📜", bg: "#f5f3ff", color: "#5b21b6", border: "#ddd6fe", accentBorder: "#7c3aed", isImportant: false },
  unmortgage: { label: "UNMORTGAGE", icon: "🔓", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", accentBorder: "#059669", isImportant: false },
  UNMORTGAGE: { label: "UNMORTGAGE", icon: "🔓", bg: "#ecfdf5", color: "#065f46", border: "#a7f3d0", accentBorder: "#059669", isImportant: false },
  resign: { label: "RESIGNED", icon: "🏳️", bg: "#f8fafc", color: "#475569", border: "#cbd5e1", accentBorder: "#94a3b8", isImportant: true },
  RESIGN: { label: "RESIGNED", icon: "🏳️", bg: "#f8fafc", color: "#475569", border: "#cbd5e1", accentBorder: "#94a3b8", isImportant: true },
  resignation: { label: "RESIGNED", icon: "🏳️", bg: "#f8fafc", color: "#475569", border: "#cbd5e1", accentBorder: "#94a3b8", isImportant: true },
  game_over: { label: "GAME OVER", icon: "🏆", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#ca8a04", isImportant: true },
  GAME_OVER: { label: "GAME OVER", icon: "🏆", bg: "#fefce8", color: "#854d0e", border: "#fef08a", accentBorder: "#ca8a04", isImportant: true },
  system: { label: "SYSTEM", icon: "⚙️", bg: "#f8fafc", color: "#475569", border: "#cbd5e1", accentBorder: "#94a3b8", isImportant: false },
  error: { label: "ERROR", icon: "⚠️", bg: "#fef2f2", color: "#991b1b", border: "#fecaca", accentBorder: "#dc2626", isImportant: true },
}

export function GameplayEventLog({ isOpen, onToggle, onClose, events, onClear: _onClear }: GameplayEventLogProps) {
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

  return (
    <>
      {isOpen && (
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
            style={{
              width: "580px",
              maxWidth: "min(580px, 96vw)",
              maxHeight: "calc(100dvh - 24px)",
              height: "min(640px, calc(100dvh - 24px))",
              background: "linear-gradient(180deg, #fefdfb 0%, #f7f3ea 100%)",
              border: "1.5px solid var(--gold, #b45309)",
              borderRadius: "14px",
              boxShadow: "0 20px 48px rgba(15, 23, 42, 0.22), 0 4px 12px rgba(0,0,0,0.08)",
              display: "flex",
              flexDirection: "column",
              color: "#0f172a",
              fontFamily: "'DM Sans', sans-serif",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1.5px solid rgba(180, 130, 40, 0.3)",
                padding: "12px 18px",
                background: "#f4ede0",
                flexShrink: 0,
              }}
            >
              <div>
                <strong
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "17px",
                    fontWeight: 800,
                    color: "#451a03",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    letterSpacing: "0.02em",
                  }}
                >
                  <span>📜</span> CROWNFALL CHRONICLE · EVENT LOG
                </strong>
                <span style={{ fontSize: "11px", color: "#64748b", display: "block", marginTop: "2px", fontWeight: 500 }}>
                  Authoritative chronological game events · Oldest to newest
                </span>
              </div>
              <button
                onClick={handleToggle}
                aria-label="Close event log"
                style={{
                  background: "rgba(0, 0, 0, 0.05)",
                  border: "1px solid rgba(180, 130, 40, 0.35)",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  color: "#475569",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 700,
                  transition: "all 0.15s ease",
                }}
              >
                ✕
              </button>
            </div>

            {/* 8 Category Tabs Bar */}
            <div
              className="event-log-tabs-bar"
              style={{
                display: "flex",
                gap: "6px",
                overflowX: "auto",
                padding: "8px 12px",
                background: "#ede5d5",
                borderBottom: "1px solid rgba(180, 130, 40, 0.25)",
                scrollbarWidth: "thin",
                scrollbarColor: "var(--gold, #b45309) transparent",
                WebkitOverflowScrolling: "touch",
                flexShrink: 0,
              }}
            >
              {EVENT_LOG_CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id
                const count = categoryCounts[cat.id] ?? 0
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      whiteSpace: "nowrap",
                      padding: "6px 11px",
                      minHeight: "34px",
                      borderRadius: "7px",
                      fontSize: "11px",
                      fontFamily: "'Oswald', 'DM Sans', sans-serif",
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      transition: "all 0.18s ease",
                      border: isActive
                        ? "1px solid #711f31"
                        : "1px solid rgba(180, 130, 40, 0.25)",
                      background: isActive
                        ? "linear-gradient(135deg, #881337 0%, #9f1239 100%)"
                        : "rgba(255, 255, 255, 0.8)",
                      color: isActive ? "#ffffff" : "#475569",
                      boxShadow: isActive ? "0 2px 6px rgba(136, 19, 55, 0.35)" : "none",
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span
                      style={{
                        padding: "1px 5px",
                        borderRadius: "10px",
                        fontSize: "9.5px",
                        fontWeight: 800,
                        background: isActive
                          ? "rgba(255, 255, 255, 0.25)"
                          : "rgba(0, 0, 0, 0.08)",
                        color: isActive ? "#ffffff" : "#334155",
                      }}
                    >
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
              style={{
                padding: "10px 14px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                flex: 1,
                background: "#f9f7f2",
              }}
            >
              {displayedEvents.length === 0 ? (
                <div
                  style={{
                    padding: "48px 16px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: "13px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "28px", opacity: 0.7 }}>📭</span>
                  <span>
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
                      style={{
                        background: "#fffdf9",
                        border: "1px solid rgba(202, 192, 175, 0.45)",
                        borderLeft: cfg.isImportant ? `4px solid ${cfg.accentBorder}` : "1px solid rgba(202, 192, 175, 0.45)",
                        borderRadius: "7px",
                        padding: "8px 12px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                        boxShadow: "0 1px 3px rgba(60, 50, 40, 0.05)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "16px",
                          lineHeight: 1,
                          marginTop: "2px",
                          flexShrink: 0,
                        }}
                      >
                        {cfg.icon}
                      </span>
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
                              style={{
                                fontSize: "9.5px",
                                fontWeight: 800,
                                letterSpacing: "0.06em",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: cfg.bg,
                                color: cfg.color,
                                border: `1px solid ${cfg.border}`,
                              }}
                            >
                              {cfg.label}
                            </span>
                            {evt.turnNumber !== undefined && (
                              <span
                                style={{
                                  fontSize: "9.5px",
                                  fontWeight: 600,
                                  color: "#4b4f56",
                                  background: "#f4ede0",
                                  padding: "1px 5px",
                                  borderRadius: "3px",
                                }}
                              >
                                Turn #{evt.turnNumber}
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: "10px",
                              color: "#686d76",
                              fontWeight: 500,
                              fontFamily: "DM Sans, sans-serif",
                            }}
                          >
                            {new Date(evt.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "12.5px",
                            color: "#1e2024",
                            fontWeight: 500,
                            lineHeight: 1.35,
                            wordBreak: "break-word",
                          }}
                        >
                          <strong style={{ color: "#1e2024", fontWeight: 700 }}>
                            {evt.playerName}:
                          </strong>{" "}
                          {evt.description}
                        </div>
                        {evt.amount !== undefined && evt.amount !== 0 && (
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: 800,
                              marginTop: "3px",
                              color: evt.amount > 0 ? "#15803d" : "#b91c1c",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span
                              style={{
                                padding: "1px 6px",
                                borderRadius: "4px",
                                background: evt.amount > 0 ? "#dcfce7" : "#fee2e2",
                                border: `1px solid ${evt.amount > 0 ? "#bbf7d0" : "#fecaca"}`,
                              }}
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
            <div
              style={{
                borderTop: "1.5px solid rgba(180, 130, 40, 0.25)",
                padding: "10px 16px",
                background: "#f4ede0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "11.5px",
                color: "#64748b",
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              <span>
                Showing {displayedEvents.length} of {deduplicatedEvents.length} events
              </span>
              <button
                onClick={handleToggle}
                style={{
                  background: "var(--gold, #b45309)",
                  border: "1px solid #92400e",
                  color: "#ffffff",
                  borderRadius: "6px",
                  padding: "4px 14px",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "11.5px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default GameplayEventLog
