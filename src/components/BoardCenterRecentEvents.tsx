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

/**
 * Strips out implementation noise, verbose calculations, and preambles to produce
 * a concise, easily scannable event summary (e.g. "Alice paid ₹500 Income Tax").
 */
export function formatConciseDescription(evt: GameplayEventEntry): string {
  const desc = evt.description || ""
  const pName = evt.playerName || "Player"
  const normType = (evt.type || "").toUpperCase().trim()

  // 1. Tax
  if (normType === "TAX" || desc.toLowerCase().includes("income tax") || desc.toLowerCase().includes("wealth tax")) {
    const isIncome = desc.toLowerCase().includes("income")
    const taxName = isIncome ? "Income Tax" : "Wealth Tax"
    const amtMatch = desc.match(/₹([\d,]+)/)
    const amtStr = amtMatch ? `₹${amtMatch[1]}` : (evt.amount ? `₹${Math.abs(evt.amount).toLocaleString()}` : "")
    if (desc.includes("owed ₹0") || desc.includes("paid ₹0")) {
      return `${pName} owed ₹0 ${taxName}`
    }
    return `${pName} paid ${amtStr} ${taxName}`
  }

  // 2. Start Pass / Bonus
  if (normType === "START_PASS" || desc.toLowerCase().includes("crossed start") || desc.toLowerCase().includes("starting capital")) {
    const amtMatch = desc.match(/₹([\d,]+)/)
    const amtStr = amtMatch ? `₹${amtMatch[1]}` : (evt.amount ? `₹${Math.abs(evt.amount).toLocaleString()}` : "")
    if (desc.toLowerCase().includes("first rotation") || desc.toLowerCase().includes("starting capital")) {
      return `${pName} collected Starting Capital (+${amtStr})`
    }
    return `${pName} passed Start (+${amtStr})`
  }

  // 3. Rent
  if (normType === "RENT" || desc.toLowerCase().includes("rent to")) {
    const rentMatch = desc.match(/paid ₹([\d,]+) rent to (.+?) for (.+?)\./i)
    if (rentMatch) {
      return `${pName} paid ₹${rentMatch[1]} rent to ${rentMatch[2].trim()} (${rentMatch[3].trim()})`
    }
    const simpleRent = desc.match(/paid ₹([\d,]+) rent to (.+?)\./i)
    if (simpleRent) {
      return `${pName} paid ₹${simpleRent[1]} rent to ${simpleRent[2].trim()}`
    }
    return desc.replace(/rent to the owner/i, "rent").trim()
  }

  // 4. Buy / Decline
  if (normType === "BUY") {
    const buyMatch = desc.match(/(?:purchased|bought) (.+?) for ₹([\d,]+)/i)
    if (buyMatch) {
      return `${pName} bought ${buyMatch[1].trim()} (₹${buyMatch[2]})`
    }
    return `${pName} bought ${evt.propertyName || "property"}`
  }
  if (normType === "DECLINE") {
    const decMatch = desc.match(/declined to purchase (.+?)\./i)
    if (decMatch) {
      return `${pName} declined ${decMatch[1].trim()}`
    }
    return `${pName} declined purchase`
  }

  // 5. Jail
  if (normType === "JAIL") {
    if (desc.toLowerCase().includes("paid ₹500") || desc.toLowerCase().includes("fine")) {
      return `${pName} paid ₹500 to leave Jail`
    }
    if (desc.toLowerCase().includes("just visiting") || desc.toLowerCase().includes("visiting")) {
      return `${pName} visiting Jail`
    }
    if (desc.toLowerCase().includes("consecutive doubles")) {
      return `${pName} sent to Jail (3 doubles)`
    }
    if (desc.toLowerCase().includes("remains in jail")) {
      const turnM = desc.match(/\(turn (\d+)\/(\d+)\)/)
      return `${pName} remains in Jail${turnM ? ` (${turnM[1]}/${turnM[2]})` : ""}`
    }
    if (desc.toLowerCase().includes("released") || desc.toLowerCase().includes("rolled doubles")) {
      return `${pName} rolled doubles and left Jail`
    }
    return `${pName} sent to Jail`
  }

  // 6. Rest House & Club
  if (normType === "REST" || desc.toLowerCase().includes("rest house")) {
    if (desc.toLowerCase().includes("collected")) {
      const colMatch = desc.match(/collected ₹([\d,]+) from (.+?) at Rest House/i)
      if (colMatch) {
        return `${pName} collected ₹${colMatch[1]} from ${colMatch[2].trim()} at Rest House`
      }
    }
    return `${pName} resting at Rest House (skips next turn)`
  }
  if (normType === "CLUB" || desc.toLowerCase().includes("club")) {
    return `${pName} visited Royal Club`
  }

  // 7. Cards: Chance & Community Chest
  if (normType === "CHANCE" || desc.toUpperCase().startsWith("CHANCE")) {
    let clean = desc
      .replace(/^CHANCE\s*[—–-]\s*/i, "")
      .replace(/^CHANCE\s*\([^)]*\):\s*/i, "")
      .replace(/^CHANCE\s*:\s*/i, "")
      .replace(new RegExp(`^${pName}\\s+(?:drew Chance:\\s*)?`, "i"), "")
      .trim()
    return `${pName} drew Chance: ${clean}`
  }
  if (normType === "CHEST" || desc.toUpperCase().startsWith("COMMUNITY CHEST")) {
    let clean = desc
      .replace(/^COMMUNITY CHEST\s*[—–-]\s*/i, "")
      .replace(/^COMMUNITY CHEST\s*\([^)]*\):\s*/i, "")
      .replace(/^COMMUNITY CHEST\s*:\s*/i, "")
      .replace(new RegExp(`^${pName}\\s+(?:drew Chest:\\s*)?`, "i"), "")
      .trim()
    return `${pName} drew Chest: ${clean}`
  }

  // 8. Construction / Demolition
  if (normType === "BUILD") {
    const buildM = desc.match(/constructed a building on (.+?)\./i)
    if (buildM) return `${pName} built on ${buildM[1].trim()}`
    return `${pName} built on ${evt.propertyName || "property"}`
  }
  if (normType === "DEMOLISH" || normType === "SELL") {
    const demM = desc.match(/demolished a building on (.+?)\./i)
    if (demM) return `${pName} sold building on ${demM[1].trim()}`
    return `${pName} sold building on ${evt.propertyName || "property"}`
  }

  // 9. Mortgage / Unmortgage
  if (normType === "MORTGAGE") {
    const mM = desc.match(/mortgaged (.+?)\./i)
    if (mM) return `${pName} mortgaged ${mM[1].trim()}`
    return `${pName} mortgaged ${evt.propertyName || "property"}`
  }
  if (normType === "UNMORTGAGE") {
    const umM = desc.match(/unmortgaged (.+?)\./i)
    if (umM) return `${pName} unmortgaged ${umM[1].trim()}`
    return `${pName} unmortgaged ${evt.propertyName || "property"}`
  }

  // 10. Bankruptcy / Resign
  if (normType === "BANKRUPTCY") {
    return `${pName} went bankrupt`
  }
  if (normType === "RESIGN") {
    return `${pName} resigned`
  }

  return desc
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
      const normCat = ((evt.category as string) || "").toUpperCase().trim()

      // Omit dice roll events and turn-ending logs from the central board log per Crownfall specification
      if (
        normType === "ROLL" ||
        normType === "ROLL_MOVE" ||
        normType === "ROLL_DICE" ||
        normType === "DICE" ||
        normType === "END_TURN" ||
        (normCat === "TURNS_DICE" && (normType.includes("ROLL") || (evt.description || "").toLowerCase().includes("rolled"))) ||
        /ended (their|his|her|the)?\s*turn/i.test(evt.description || "") ||
        /ended turn/i.test(evt.description || "") ||
        /turn ended/i.test(evt.description || "")
      ) {
        continue
      }

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

      const conciseMsg = formatConciseDescription(evt)
      const descKey = `msg_${conciseMsg}_${Math.floor((evt.timestamp || 0) / 3500)}`

      if (seenActionKeys.has(actionKey) || seenActionKeys.has(descKey)) continue

      seenIds.add(evt.id)
      seenActionKeys.add(actionKey)
      seenActionKeys.add(descKey)
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
          const displayMsg = formatConciseDescription(evt)
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
                {displayMsg}
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
