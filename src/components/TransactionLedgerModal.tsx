import { useState, useMemo, useRef, useEffect } from "react"
import type {
  TransactionRecord,
  ActivityLogEntry,
  EnginePlayer,
} from "../engine/GameEngineInterface"

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

export function matchEventCategory(type: string, category: EventLogCategory): boolean {
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
        t === "skip" ||
        t === "skipped" ||
        t === "turn_timeout" ||
        t === "end_turn"
      )
    case "RENT_PAYMENTS":
      return (
        t === "rent" ||
        t === "tax" ||
        t === "fee" ||
        t === "fine" ||
        t === "capital" ||
        t === "start_bonus" ||
        t === "start_pass" ||
        t === "reward" ||
        t === "pass_start" ||
        t === "bankruptcy" ||
        t === "bankrupt"
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
        t === "demolish" ||
        t === "sell" ||
        t === "destruction" ||
        t === "destroy" ||
        t === "house" ||
        t === "hotel" ||
        t === "upgrade"
      )
    case "CHANCE_CHEST":
      return (
        t === "chance" ||
        t === "chest" ||
        t === "card" ||
        t === "card_draw" ||
        t === "community_chest"
      )
    case "MOVEMENT_LOCATIONS":
      return (
        t === "jail" ||
        t === "jail_enter" ||
        t === "jail_exit" ||
        t === "in_jail" ||
        t === "rest" ||
        t === "rest_house" ||
        t === "club" ||
        t === "start" ||
        t === "start_bonus" ||
        t === "start_pass" ||
        t === "move" ||
        t === "movement" ||
        t === "teleport" ||
        t === "visiting_jail"
      )
    case "SYSTEM_ERRORS":
      return (
        t === "session_ended" ||
        t === "game_over" ||
        t === "resign" ||
        t === "resignation" ||
        t === "error" ||
        t === "rejected" ||
        t === "reject" ||
        t === "system" ||
        t === "invalid" ||
        t === "settings" ||
        t === "rules"
      )
    default:
      return false
  }
}

export function TransactionLedgerModal({
  ledger = [],
  activityLog = [],
  players = [],
  close,
}: {
  ledger: TransactionRecord[]
  activityLog?: ActivityLogEntry[]
  players?: EnginePlayer[]
  close: () => void
}) {
  const [activeTab, setActiveTab] = useState<"LEDGER" | "ACTIVITY">("LEDGER")
  const [playerFilter, setPlayerFilter] = useState<string>("ALL")
  const [typeFilter, setTypeFilter] = useState<string>("ALL")
  const [logFilter, setLogFilter] = useState<EventLogCategory>("ALL")

  // Deduplicate ledger entries by unique transaction ID
  const deduplicatedLedger = useMemo(() => {
    const map = new Map<string, TransactionRecord>()
    ledger.forEach((tx) => {
      if (tx && tx.id) {
        map.set(tx.id, tx)
      }
    })
    return Array.from(map.values())
  }, [ledger])

  // Filter ledger
  const filteredLedger = useMemo(() => {
    return deduplicatedLedger.filter((tx) => {
      // Player filter
      if (playerFilter !== "ALL") {
        const matchesPrimary = tx.primaryPlayerName === playerFilter
        const matchesCounter = tx.counterpartyPlayerName === playerFilter
        if (!matchesPrimary && !matchesCounter) return false
      }

      // Type filter
      if (typeFilter === "ALL") return true
      if (typeFilter === "PURCHASE") return tx.type === "PURCHASE"
      if (typeFilter === "RENT") return tx.type === "RENT"
      if (typeFilter === "CONSTRUCTION") return tx.type === "CONSTRUCTION"
      if (typeFilter === "DESTRUCTION") return tx.type === "DESTRUCTION_REFUND"
      if (typeFilter === "START/REWARD")
        return tx.type === "START_REWARD" || tx.type === "CAPITAL_REWARD"
      if (typeFilter === "TAX/FEE") return tx.type === "TAX" || tx.type === "FEE"
      if (typeFilter === "BANKRUPTCY") return tx.type === "BANKRUPTCY_TRANSFER"
      if (typeFilter === "MORTGAGE")
        return tx.type === "MORTGAGE" || tx.type === "UNMORTGAGE"
      return true
    })
  }, [deduplicatedLedger, playerFilter, typeFilter])

  const displayLedger = useMemo(() => [...filteredLedger].reverse(), [filteredLedger])



  // Activity Log filter
  const filteredActivityLog = useMemo(() => {
    if (logFilter === "ALL") return activityLog
    return activityLog.filter((e) => matchEventCategory(e.type, logFilter as EventLogCategory))
  }, [activityLog, logFilter])

  const categoryCounts = useMemo(() => {
    const counts: Record<EventLogCategory, number> = {
      ALL: activityLog.length,
      TURNS_DICE: 0,
      RENT_PAYMENTS: 0,
      PROPERTIES: 0,
      CONSTRUCTION: 0,
      CHANCE_CHEST: 0,
      MOVEMENT_LOCATIONS: 0,
      SYSTEM_ERRORS: 0,
    }
    for (const e of activityLog) {
      for (const cat of EVENT_LOG_CATEGORIES) {
        if (cat.id !== "ALL" && matchEventCategory(e.type, cat.id)) {
          counts[cat.id]++
        }
      }
    }
    return counts
  }, [activityLog])

  // Keep the log in chronological order, with the oldest event first and newest event last
  const displayActivityLog = useMemo(() => {
    // Deduplicate events by sequence ID or unique key
    const seen = new Set<string>()
    const deduped: ActivityLogEntry[] = []
    for (const e of filteredActivityLog) {
      const key = `${e.id}_${e.timestamp}_${e.type}`
      if (!seen.has(key)) {
        seen.add(key)
        deduped.push(e)
      }
    }
    // Sort strictly chronological: oldest event first, newest event last
    return deduped.sort((a, b) => a.id - b.id || a.timestamp - b.timestamp)
  }, [filteredActivityLog])

  // Smart auto-scroll: append to bottom and keep scrolled to bottom only if user was already at bottom
  const feedRef = useRef<HTMLDivElement | null>(null)
  const isNearBottomRef = useRef<boolean>(true)

  const handleFeedScroll = () => {
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
  }, [displayActivityLog.length, activeTab, logFilter])

  const totalVolume = useMemo(() => {
    return deduplicatedLedger.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0)
  }, [deduplicatedLedger])

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        className="modal-sheet ledger-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="modal-header">
          <strong>FINANCIAL TRANSACTION HISTORY</strong>
          <button onClick={close} aria-label="Close">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="ledger-view-tabs">
          <button
            className={`ledger-view-tab ${activeTab === "LEDGER" ? "active" : ""}`}
            onClick={() => setActiveTab("LEDGER")}
          >
            💰 FINANCIAL LEDGER ({deduplicatedLedger.length})
          </button>
          <button
            className={`ledger-view-tab ${activeTab === "ACTIVITY" ? "active" : ""}`}
            onClick={() => setActiveTab("ACTIVITY")}
          >
            📜 TURN LOG ({activityLog.length})
          </button>
        </div>

        {activeTab === "LEDGER" ? (
          <>
            <div className="ledger-stats-banner">
              <span>
                PERSISTENT RECORDS: <strong>{deduplicatedLedger.length} Events</strong>
              </span>
              <span>
                VOLUME: <strong>₹{totalVolume.toLocaleString()}</strong>
              </span>
              <span className="ready-pill" style={{ fontSize: "8px" }}>
                SYNCHRONIZED
              </span>
            </div>

            {/* Filter by Player */}
            <div className="activity-log-filter-row" style={{ marginBottom: "6px" }}>
              <button
                className={`activity-log-filter-btn ${playerFilter === "ALL" ? "active" : ""}`}
                onClick={() => setPlayerFilter("ALL")}
              >
                ALL PLAYERS
              </button>
              {players.map((p) => (
                <button
                  key={p.id}
                  className={`activity-log-filter-btn ${playerFilter === p.name ? "active" : ""}`}
                  onClick={() => setPlayerFilter(p.name)}
                >
                  {p.name}
                </button>
              ))}
            </div>

            {/* Filter by Transaction Type */}
            <div className="activity-log-filter-row" style={{ marginBottom: "8px" }}>
              {[
                { id: "ALL", label: "ALL TYPES" },
                { id: "PURCHASE", label: "PURCHASE" },
                { id: "RENT", label: "RENT" },
                { id: "CONSTRUCTION", label: "BUILD" },
                { id: "DESTRUCTION", label: "DESTROY" },
                { id: "START/REWARD", label: "REWARDS" },
                { id: "TAX/FEE", label: "TAX & FEES" },
                { id: "BANKRUPTCY", label: "BANKRUPTCY" },
                { id: "MORTGAGE", label: "MORTGAGES" },
              ].map((item) => (
                <button
                  key={item.id}
                  className={`activity-log-filter-btn ${typeFilter === item.id ? "active" : ""}`}
                  onClick={() => setTypeFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Ledger List */}
            <div className="ledger-feed">
              {displayLedger.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "32px 16px",
                    color: "var(--ink-soft)",
                    fontSize: "12px",
                  }}
                >
                  {deduplicatedLedger.length === 0
                    ? "No financial transactions recorded yet. As properties are bought, rents paid, and buildings constructed, they will appear in this authoritative ledger."
                    : "No transactions match the selected filters."}
                </div>
              ) : (
                displayLedger.map((tx) => {
                  const date = new Date(tx.timestamp)
                  const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(
                    date.getMinutes(),
                  ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`

                  const isOutflow =
                    tx.type === "PURCHASE" ||
                    tx.type === "TAX" ||
                    tx.type === "FEE" ||
                    tx.type === "CONSTRUCTION" ||
                    tx.type === "UNMORTGAGE" ||
                    tx.type === "RENT"

                  return (
                    <div key={tx.id} className="ledger-entry-card">
                      <div className="ledger-entry-top">
                        <div className="ledger-meta-left">
                          <span className="ledger-id-pill">#{tx.id}</span>
                          <span className="ledger-turn-pill">Turn #{tx.turnNumber}</span>
                          <span className="activity-log-time">{timeStr}</span>
                        </div>
                        <span className={`ledger-type-badge ${tx.type}`}>
                          {tx.type.replace("_", " ")}
                        </span>
                      </div>

                      <div className="ledger-parties-row">
                        <span className="ledger-party-chip primary">
                          <span className="party-role-tag">FROM</span>
                          <strong>{tx.primaryPlayerName}</strong>
                        </span>
                        <div className="ledger-transfer-flow">
                          <span className="ledger-transfer-line" />
                          <span className="ledger-transfer-icon">⟶</span>
                        </div>
                        <span className="ledger-party-chip counterparty">
                          <span className="party-role-tag">TO</span>
                          <strong>{tx.counterpartyPlayerName}</strong>
                        </span>
                      </div>

                      <div className="ledger-desc-row">
                        <span className="ledger-description-text">{tx.description}</span>
                        {tx.amount > 0 && (
                          <span
                            className={`ledger-amount-tag ${
                              isOutflow ? "loss" : "gain"
                            }`}
                          >
                            {isOutflow
                              ? `-₹${tx.amount.toLocaleString()}`
                              : `+₹${tx.amount.toLocaleString()}`}
                          </span>
                        )}
                      </div>

                      {tx.resultingBalances &&
                        Object.keys(tx.resultingBalances).length > 0 && (
                          <div className="ledger-balances-row">
                            <span style={{ fontWeight: 600 }}>RESULTING BALANCES:</span>
                            {Object.entries(tx.resultingBalances).map(([pidStr, bal]) => {
                              const pid = parseInt(pidStr, 10)
                              // Only show for primary and counterparty players to prevent noise
                              if (
                                pid !== tx.primaryPlayerId &&
                                pid !== tx.counterpartyPlayerId
                              ) {
                                return null
                              }
                              const p = players.find((x) => x.id === pid)
                              const pName = p ? p.name : `P${pid + 1}`
                              return (
                                <span key={pidStr} className="ledger-balance-chip">
                                  {pName}: <b>₹{bal.toLocaleString()}</b>
                                </span>
                              )
                            })}
                          </div>
                        )}
                    </div>
                  )
                })
              )}
            </div>
          </>
        ) : (
          <>
            <div className="activity-log-subhead">
              <span>AUTHORITATIVE TURN EVENT FEED</span>
              <span className="ready-pill">{activityLog.length} EVENTS</span>
            </div>
            <div className="activity-log-filter-row" style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "6px" }}>
              {EVENT_LOG_CATEGORIES.map((cat) => {
                const count = categoryCounts[cat.id] ?? 0
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`activity-log-filter-btn ${
                      logFilter === cat.id ? "active" : ""
                    }`}
                    onClick={() => setLogFilter(cat.id)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span
                      style={{
                        padding: "1px 5px",
                        borderRadius: "8px",
                        fontSize: "9px",
                        background: logFilter === cat.id ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.12)",
                      }}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
            <div
              ref={feedRef}
              onScroll={handleFeedScroll}
              className="activity-log-feed"
            >
              {displayActivityLog.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "28px",
                    color: "var(--ink-soft)",
                  }}
                >
                  {logFilter === "ALL"
                    ? "No activity events recorded yet."
                    : `No ${EVENT_LOG_CATEGORIES.find((c) => c.id === logFilter)?.label || logFilter} events recorded yet.`}
                </div>
              ) : (
                displayActivityLog.map((entry) => {
                  const date = new Date(entry.timestamp)
                  const timeStr = `${String(date.getHours()).padStart(2, "0")}:${String(
                    date.getMinutes(),
                  ).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`
                  return (
                    <div key={entry.id} className="activity-log-entry">
                      <div className="activity-log-entry-left">
                        <span className="activity-log-seq">#{entry.id}</span>
                        <span className={`activity-log-type-tag ${entry.type}`}>
                          {entry.type.replace("_", " ")}
                        </span>
                      </div>
                      <div className="activity-log-body">
                        <div className="activity-log-headline">
                          <span className="activity-log-player-chip">
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                background: `var(--${entry.playerColor || "gold"})`,
                                display: "inline-block",
                              }}
                            />
                            {entry.playerName}
                          </span>
                          <span className="activity-log-time">{timeStr}</span>
                        </div>
                        <div className="activity-log-desc">{entry.description}</div>
                        {entry.amount !== 0 && (
                          <span
                            className={`activity-log-amount-tag ${
                              entry.amount > 0 ? "gain" : "loss"
                            }`}
                          >
                            {entry.amount > 0
                              ? `+₹${entry.amount.toLocaleString()}`
                              : `-₹${Math.abs(entry.amount).toLocaleString()}`}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </>
        )}

        <button
          className="btn btn-ghost"
          onClick={close}
          style={{ marginTop: "8px", minHeight: "40px" }}
        >
          CLOSE LEDGER
        </button>
      </section>
    </div>
  )
}

export default TransactionLedgerModal

