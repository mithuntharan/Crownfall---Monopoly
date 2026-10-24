import React, { useMemo } from "react"
import type { GameplayEventEntry } from "./GameplayEventLog"

export interface BoardCenterRecentEventsProps {
  events: GameplayEventEntry[]
  onOpenFullLog?: () => void
}

const TYPE_ICONS: Record<string, string> = {
  roll: "•",
  roll_move: "•",
  ROLL_MOVE: "•",
  buy: "•",
  BUY: "•",
  decline: "•",
  DECLINE: "•",
  rent: "•",
  RENT: "•",
  build: "•",
  BUILD: "•",
  demolish: "•",
  DEMOLISH: "•",
  destroy: "•",
  chance: "•",
  CHANCE: "•",
  chest: "•",
  CHEST: "•",
  tax: "•",
  TAX: "•",
  jail: "•",
  JAIL: "•",
  rest: "•",
  REST: "•",
  club: "•",
  CLUB: "•",
  bankruptcy: "•",
  BANKRUPTCY: "•",
  turn_change: "•",
  TURN_CHANGE: "•",
  start_pass: "•",
  START_PASS: "•",
  mortgage: "•",
  MORTGAGE: "•",
  unmortgage: "•",
  UNMORTGAGE: "•",
  resign: "•",
  RESIGN: "•",
  game_over: "•",
  GAME_OVER: "•",
  trade: "•",
  TRADE: "•",
  trade_accept: "•",
  TRADE_ACCEPT: "•",
  trade_offer: "•",
  TRADE_OFFER: "•",
}

function formatEventTime(timestamp: number): string {
  if (!timestamp) return ""
  const date = new Date(timestamp)
  const m = String(date.getMinutes()).padStart(2, "0")
  const s = String(date.getSeconds()).padStart(2, "0")
  return `${m}:${s}`
}

export const BoardCenterRecentEvents: React.FC<BoardCenterRecentEventsProps> = ({
  events,
  onOpenFullLog,
}) => {
  // Take up to 5 most recent distinct events, newest first
  const recentEvents = useMemo(() => {
    if (!events || events.length === 0) return []

    const seenIds = new Set<string | number>()
    const seenActionKeys = new Set<string>()
    const deduped: GameplayEventEntry[] = []

    // Sort all events newest first
    const sorted = [...events].sort((a, b) => {
      if (b.sequenceNumber !== undefined && a.sequenceNumber !== undefined) {
        return b.sequenceNumber - a.sequenceNumber
      }
      return b.timestamp - a.timestamp
    })

    for (const evt of sorted) {
      if (seenIds.has(evt.id)) continue

      // Canonical logical action key to deduplicate multiple representations of the same event
      const normType = (evt.type || "").toUpperCase().trim()
      const pId = evt.playerId !== undefined ? evt.playerId : "sys"
      const propKey = evt.propertyId || evt.propertyName || ""

      let actionKey: string
      if (evt.sequenceNumber !== undefined) {
        actionKey = `seq_${evt.sequenceNumber}_${pId}_${normType}`
      } else {
        // 3-second time bucket deduplicates client optimistic events and engine sync events
        const timeBucket = Math.floor((evt.timestamp || 0) / 3000)
        actionKey = `${normType}_${pId}_${propKey}_${timeBucket}`
      }

      if (seenActionKeys.has(actionKey)) continue

      seenIds.add(evt.id)
      seenActionKeys.add(actionKey)
      deduped.push(evt)
      if (deduped.length >= 5) break
    }

    return deduped
  }, [events])

  if (recentEvents.length === 0) {
    return null
  }

  return (
    <div
      className="board-center-recent-events"
      role="region"
      aria-label="Recent 5 Game Events"
    >
      <div className="board-center-recent-events-header">
        <span className="board-center-recent-events-title">
          <span className="board-center-recent-events-dot" aria-hidden="true" />
          CHRONICLE
        </span>
        {onOpenFullLog && (
          <button
            type="button"
            className="board-center-recent-events-log-link"
            onClick={onOpenFullLog}
            title="Open comprehensive event log"
          >
            LOG ↗
          </button>
        )}
      </div>

      <ul className="board-center-recent-events-list">
        {recentEvents.map((evt, idx) => {
          const icon = TYPE_ICONS[evt.type] || "•"
          const time = formatEventTime(evt.timestamp)
          return (
            <li
              key={evt.id || `${evt.timestamp}_${idx}`}
              className={`board-center-recent-event-item ${idx === 0 ? "is-newest" : ""}`}
              title={evt.description}
            >
              <span className="board-center-recent-event-icon" aria-hidden="true">
                {icon}
              </span>
              <span className="board-center-recent-event-desc">
                {evt.description}
              </span>
              {time && (
                <span className="board-center-recent-event-time">{time}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default BoardCenterRecentEvents
