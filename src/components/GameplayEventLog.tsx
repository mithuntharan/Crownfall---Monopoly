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
  { label: string; icon: string; bg: string; color: string }
> = {
  roll: { label: "ROLL", icon: "🎲", bg: "rgba(59, 130, 246, 0.2)", color: "#93c5fd" },
  roll_move: { label: "ROLL", icon: "🎲", bg: "rgba(59, 130, 246, 0.2)", color: "#93c5fd" },
  ROLL_MOVE: { label: "ROLL", icon: "🎲", bg: "rgba(59, 130, 246, 0.2)", color: "#93c5fd" },
  buy: { label: "BOUGHT", icon: "🏛️", bg: "rgba(16, 185, 129, 0.2)", color: "#6ee7b7" },
  BUY: { label: "BOUGHT", icon: "🏛️", bg: "rgba(16, 185, 129, 0.2)", color: "#6ee7b7" },
  decline: { label: "DECLINED", icon: "🚫", bg: "rgba(107, 114, 128, 0.2)", color: "#d1d5db" },
  DECLINE: { label: "DECLINED", icon: "🚫", bg: "rgba(107, 114, 128, 0.2)", color: "#d1d5db" },
  rent: { label: "RENT", icon: "💸", bg: "rgba(239, 68, 68, 0.2)", color: "#fca5a5" },
  RENT: { label: "RENT", icon: "💸", bg: "rgba(239, 68, 68, 0.2)", color: "#fca5a5" },
  build: { label: "BUILD", icon: "🏗️", bg: "rgba(16, 185, 129, 0.25)", color: "#a7f3d0" },
  BUILD: { label: "BUILD", icon: "🏗️", bg: "rgba(16, 185, 129, 0.25)", color: "#a7f3d0" },
  demolish: { label: "DEMOLISH", icon: "🏚️", bg: "rgba(245, 158, 11, 0.2)", color: "#fde68a" },
  DEMOLISH: { label: "DEMOLISH", icon: "🏚️", bg: "rgba(245, 158, 11, 0.2)", color: "#fde68a" },
  destroy: { label: "DESTROY", icon: "🏚️", bg: "rgba(245, 158, 11, 0.2)", color: "#fde68a" },
  chance: { label: "CHANCE", icon: "✨", bg: "rgba(168, 85, 247, 0.2)", color: "#d8b4fe" },
  CHANCE: { label: "CHANCE", icon: "✨", bg: "rgba(168, 85, 247, 0.2)", color: "#d8b4fe" },
  chest: { label: "CHEST", icon: "💎", bg: "rgba(236, 72, 153, 0.2)", color: "#fbcfe8" },
  CHEST: { label: "CHEST", icon: "💎", bg: "rgba(236, 72, 153, 0.2)", color: "#fbcfe8" },
  tax: { label: "TAX", icon: "⚖️", bg: "rgba(220, 38, 38, 0.25)", color: "#f87171" },
  TAX: { label: "TAX", icon: "⚖️", bg: "rgba(220, 38, 38, 0.25)", color: "#f87171" },
  jail: { label: "JAIL", icon: "🔒", bg: "rgba(185, 28, 28, 0.3)", color: "#fca5a5" },
  JAIL: { label: "JAIL", icon: "🔒", bg: "rgba(185, 28, 28, 0.3)", color: "#fca5a5" },
  rest: { label: "REST HOUSE", icon: "☕", bg: "rgba(217, 119, 6, 0.25)", color: "#fcd34d" },
  REST: { label: "REST HOUSE", icon: "☕", bg: "rgba(217, 119, 6, 0.25)", color: "#fcd34d" },
  club: { label: "ROYAL CLUB", icon: "👑", bg: "rgba(200, 155, 69, 0.25)", color: "var(--gold-light)" },
  CLUB: { label: "ROYAL CLUB", icon: "👑", bg: "rgba(200, 155, 69, 0.25)", color: "var(--gold-light)" },
  bankruptcy: { label: "BANKRUPT", icon: "💀", bg: "rgba(127, 29, 29, 0.4)", color: "#f87171" },
  BANKRUPTCY: { label: "BANKRUPT", icon: "💀", bg: "rgba(127, 29, 29, 0.4)", color: "#f87171" },
  turn_change: { label: "TURN", icon: "👤", bg: "rgba(200, 155, 69, 0.2)", color: "var(--gold-light)" },
  TURN_CHANGE: { label: "TURN", icon: "👤", bg: "rgba(200, 155, 69, 0.2)", color: "var(--gold-light)" },
  reward: { label: "REWARD", icon: "🌟", bg: "rgba(34, 197, 94, 0.2)", color: "#86efac" },
  start_pass: { label: "REWARD", icon: "🌟", bg: "rgba(34, 197, 94, 0.2)", color: "#86efac" },
  START_PASS: { label: "REWARD", icon: "🌟", bg: "rgba(34, 197, 94, 0.2)", color: "#86efac" },
  timeout: { label: "TIMEOUT", icon: "⌛", bg: "rgba(239, 68, 68, 0.2)", color: "#fca5a5" },
  mortgage: { label: "MORTGAGE", icon: "📜", bg: "rgba(147, 51, 234, 0.2)", color: "#d8b4fe" },
  MORTGAGE: { label: "MORTGAGE", icon: "📜", bg: "rgba(147, 51, 234, 0.2)", color: "#d8b4fe" },
  unmortgage: { label: "UNMORTGAGE", icon: "🔓", bg: "rgba(16, 185, 129, 0.2)", color: "#6ee7b7" },
  UNMORTGAGE: { label: "UNMORTGAGE", icon: "🔓", bg: "rgba(16, 185, 129, 0.2)", color: "#6ee7b7" },
  resign: { label: "RESIGNED", icon: "🏳️", bg: "rgba(156, 163, 175, 0.25)", color: "#d1d5db" },
  RESIGN: { label: "RESIGNED", icon: "🏳️", bg: "rgba(156, 163, 175, 0.25)", color: "#d1d5db" },
  resignation: { label: "RESIGNED", icon: "🏳️", bg: "rgba(156, 163, 175, 0.25)", color: "#d1d5db" },
  game_over: { label: "GAME OVER", icon: "🏆", bg: "rgba(234, 179, 8, 0.25)", color: "#fde047" },
  GAME_OVER: { label: "GAME OVER", icon: "🏆", bg: "rgba(234, 179, 8, 0.25)", color: "#fde047" },
  system: { label: "SYSTEM", icon: "⚙️", bg: "rgba(100, 116, 139, 0.25)", color: "#cbd5e1" },
  error: { label: "ERROR", icon: "⚠️", bg: "rgba(220, 38, 38, 0.3)", color: "#fca5a5" },
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
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px 12px",
          }}
        >
          <div
            className="event-log-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "560px",
              maxWidth: "min(560px, 96vw)",
              maxHeight: "calc(100dvh - 24px)",
              height: "min(640px, calc(100dvh - 24px))",
              background: "linear-gradient(180deg, #101c36 0%, #091224 100%)",
              border: "2px solid var(--gold, #c89b3d)",
              borderRadius: "14px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8), 0 0 25px rgba(200,155,69,0.2)",
              display: "flex",
              flexDirection: "column",
              color: "#fff",
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
                borderBottom: "1px solid rgba(200, 155, 69, 0.35)",
                padding: "14px 18px",
                background: "rgba(0,0,0,0.3)",
              }}
            >
              <div>
                <strong
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "17px",
                    color: "var(--gold-light, #f4e6c7)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    letterSpacing: "0.03em",
                  }}
                >
                  <span>📜</span> CROWNFALL EVENT LOG
                </strong>
                <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.65)", display: "block", marginTop: "2px" }}>
                  Authoritative chronological game events · Oldest to newest
                </span>
              </div>
              <button
                onClick={handleToggle}
                aria-label="Close event log"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(200,155,69,0.3)",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  fontSize: "14px",
                  transition: "background 0.2s",
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
                padding: "10px 14px",
                background: "rgba(8, 14, 28, 0.95)",
                borderBottom: "1px solid rgba(200, 155, 69, 0.2)",
                scrollbarWidth: "thin",
                scrollbarColor: "var(--gold, #c89b3d) transparent",
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
                      padding: "8px 12px",
                      minHeight: "36px",
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
                        ? "1px solid var(--gold, #c89b3d)"
                        : "1px solid rgba(255,255,255,0.12)",
                      background: isActive
                        ? "linear-gradient(135deg, rgba(113, 31, 49, 0.9) 0%, rgba(162, 45, 68, 0.9) 100%)"
                        : "rgba(255,255,255,0.05)",
                      color: isActive ? "#ffffff" : "rgba(255,255,255,0.72)",
                      boxShadow: isActive ? "0 2px 8px rgba(113,31,49,0.5)" : "none",
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: "10px",
                        fontSize: "9.5px",
                        fontWeight: 800,
                        background: isActive
                          ? "rgba(255,255,255,0.25)"
                          : "rgba(0,0,0,0.35)",
                        color: isActive ? "#fff" : "rgba(255,255,255,0.6)",
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
                padding: "12px 14px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                flex: 1,
              }}
            >
              {displayedEvents.length === 0 ? (
                <div
                  style={{
                    padding: "48px 16px",
                    textAlign: "center",
                    color: "rgba(255,255,255,0.5)",
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
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "17px",
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
                            marginBottom: "4px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 800,
                                letterSpacing: "0.06em",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: cfg.bg,
                                color: cfg.color,
                              }}
                            >
                              {cfg.label}
                            </span>
                            {evt.turnNumber !== undefined && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  color: "rgba(255,255,255,0.45)",
                                }}
                              >
                                Turn #{evt.turnNumber}
                              </span>
                            )}
                          </div>
                          <span
                            style={{
                              fontSize: "10px",
                              color: "rgba(255,255,255,0.45)",
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
                            color: "#f3f4f6",
                            fontWeight: 500,
                            lineHeight: 1.35,
                            wordBreak: "break-word",
                          }}
                        >
                          <strong style={{ color: evt.playerColor || "var(--gold-light, #f4e6c7)" }}>
                            {evt.playerName}:
                          </strong>{" "}
                          {evt.description}
                        </div>
                        {evt.amount !== undefined && evt.amount !== 0 && (
                          <div
                            style={{
                              fontSize: "11px",
                              fontWeight: 700,
                              marginTop: "3px",
                              color: evt.amount > 0 ? "#86efac" : "#fca5a5",
                            }}
                          >
                            {evt.amount > 0 ? `+₹${evt.amount.toLocaleString()}` : `-₹${Math.abs(evt.amount).toLocaleString()}`}
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
                borderTop: "1px solid rgba(200, 155, 69, 0.25)",
                padding: "10px 16px",
                background: "rgba(0,0,0,0.25)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "11.5px",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              <span>
                Showing {displayedEvents.length} of {deduplicatedEvents.length} events
              </span>
              <button
                onClick={handleToggle}
                style={{
                  background: "rgba(200, 155, 69, 0.15)",
                  border: "1px solid var(--gold, #c89b3d)",
                  color: "var(--gold-light, #f4e6c7)",
                  borderRadius: "6px",
                  padding: "4px 12px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "11.5px",
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
