import React, { useState, useMemo, useRef } from "react"
import type {
  TransactionRecord,
  EnginePlayer,
} from "../engine/GameEngineInterface"

export interface TransactionLedgerContentProps {
  ledger?: TransactionRecord[]
  players?: EnginePlayer[]
  localPlayerId?: number
  isEmbedded?: boolean
  onClose?: () => void
}

export function TransactionLedgerContent({
  ledger = [],
  players = [],
  localPlayerId = 0,
  isEmbedded = false,
  onClose,
}: TransactionLedgerContentProps) {
  const [playerFilter, setPlayerFilter] = useState<string>("ALL")
  const [typeFilter, setTypeFilter] = useState<string>("ALL")

  const localPlayer = useMemo(() => {
    return players.find((p) => p.id === localPlayerId) || null
  }, [players, localPlayerId])

  // Deduplicate ledger entries by unique transaction ID and event signature
  const deduplicatedLedger = useMemo(() => {
    const seenIds = new Set<string>()
    const seenSignatures = new Set<string>()
    const result: TransactionRecord[] = []

    ledger.forEach((tx) => {
      if (!tx || !tx.id) return
      if (seenIds.has(tx.id)) return

      // Deduplicate identical bank or transfer events that share turn, type, parties, amount, and property
      const sig = `${tx.turnNumber}_${tx.type}_${tx.primaryPlayerId}_${tx.counterpartyPlayerId}_${tx.amount}_${tx.propertyId || ""}_${Math.floor(tx.timestamp / 5000)}`
      if (seenSignatures.has(sig)) return

      seenIds.add(tx.id)
      seenSignatures.add(sig)
      result.push(tx)
    })
    return result
  }, [ledger])

  const seenTxIdsRef = useRef<Set<string>>(new Set())
  const isInitialMountRef = useRef<boolean>(true)

  const newTxIds = useMemo(() => {
    const newSet = new Set<string>()
    if (isInitialMountRef.current) {
      deduplicatedLedger.forEach((tx) => seenTxIdsRef.current.add(tx.id))
      isInitialMountRef.current = false
      return newSet
    }
    deduplicatedLedger.forEach((tx) => {
      if (!seenTxIdsRef.current.has(tx.id)) {
        newSet.add(tx.id)
        seenTxIdsRef.current.add(tx.id)
      }
    })
    return newSet
  }, [deduplicatedLedger])

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
      if (typeFilter === "BUILD_DESTROY")
        return tx.type === "CONSTRUCTION" || tx.type === "DESTRUCTION_REFUND"
      if (typeFilter === "TAX_REWARDS")
        return (
          tx.type === "TAX" ||
          tx.type === "FEE" ||
          tx.type === "START_REWARD" ||
          tx.type === "CAPITAL_REWARD" ||
          tx.type === "REWARD" ||
          tx.type === "JAIL_FINE"
        )
      if (typeFilter === "BANKRUPTCY") return tx.type === "BANKRUPTCY_TRANSFER"
      return true
    })
  }, [deduplicatedLedger, playerFilter, typeFilter])

  const displayLedger = useMemo(() => [...filteredLedger].reverse(), [filteredLedger])

  const totalVolume = useMemo(() => {
    return deduplicatedLedger.reduce((sum, tx) => sum + Math.abs(tx.amount || 0), 0)
  }, [deduplicatedLedger])

  return (
    <div className="ledger-content-wrap">
      <div className="ledger-stats-banner">
        <div className="ledger-stat-card">
          <span className="ledger-stat-label">PERSISTENT RECORDS</span>
          <strong className="ledger-stat-value">{deduplicatedLedger.length} Events</strong>
        </div>
        <div className="ledger-stat-card">
          <span className="ledger-stat-label">VOLUME</span>
          <strong className="ledger-stat-value">₹{totalVolume.toLocaleString()}</strong>
        </div>
      </div>

      <div className="ledger-filters-wrap">
        {/* Filter by Player */}
        <div className="ledger-filter-row">
          <span className="ledger-filter-label">Filter Player:</span>
          <div className="activity-log-filter-row">
            <button
              type="button"
              className={`activity-log-filter-btn ${playerFilter === "ALL" ? "active" : ""}`}
              onClick={() => setPlayerFilter("ALL")}
            >
              All Players
            </button>
            {players.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`activity-log-filter-btn ${playerFilter === p.name ? "active" : ""}`}
                onClick={() => setPlayerFilter(p.name)}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Filter by Transaction Type */}
        <div className="ledger-filter-row">
          <span className="ledger-filter-label">Filter Category:</span>
          <div className="activity-log-filter-row">
            {[
              { id: "ALL", label: "All Types" },
              { id: "PURCHASE", label: "Purchase" },
              { id: "RENT", label: "Rent" },
              { id: "BUILD_DESTROY", label: "Build & Destroy" },
              { id: "TAX_REWARDS", label: "Tax and Rewards" },
              { id: "BANKRUPTCY", label: "Bankruptcy" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`activity-log-filter-btn ${typeFilter === item.id ? "active" : ""}`}
                onClick={() => setTypeFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
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

            const isViewerCounterparty = localPlayer
              ? tx.counterpartyPlayerName === localPlayer.name
              : false
            const isViewerPrimary = localPlayer
              ? tx.primaryPlayerName === localPlayer.name
              : false

            let amountType: "gain" | "loss" | "neutral" = "neutral"
            let sign = ""

            if (tx.type === "CONSTRUCTION") {
              amountType = "loss"
              sign = "+"
            } else if (tx.type === "DESTRUCTION_REFUND") {
              amountType = "gain"
              sign = "−"
            } else if (!tx.amount || tx.amount === 0) {
              amountType = "neutral"
              sign = ""
            } else if (playerFilter !== "ALL") {
              if (tx.counterpartyPlayerName === playerFilter) {
                amountType = "gain"
                sign = "+"
              } else if (tx.primaryPlayerName === playerFilter) {
                amountType = "loss"
                sign = "−"
              } else {
                amountType = "neutral"
                sign = ""
              }
            } else if (isViewerCounterparty && !isViewerPrimary) {
              amountType = "gain"
              sign = "+"
            } else if (isViewerPrimary && !isViewerCounterparty) {
              amountType = "loss"
              sign = "−"
            } else if (tx.primaryPlayerName === "Bank" && tx.counterpartyPlayerName !== "Bank") {
              amountType = "gain"
              sign = "+"
            } else if (tx.counterpartyPlayerName === "Bank" && tx.primaryPlayerName !== "Bank") {
              amountType = "loss"
              sign = "−"
            } else {
              amountType = "neutral"
              sign = ""
            }

            const isNew = newTxIds.has(tx.id)

            return (
              <div key={tx.id} className={`ledger-entry-card ${isNew ? "is-new-entry" : ""}`}>
                <div className="ledger-entry-top">
                  <div className="ledger-meta-left">
                    <span className="ledger-id-pill">#{tx.id}</span>
                    <span className="ledger-turn-pill">Round #{tx.turnNumber}</span>
                    <span className="activity-log-time">{timeStr}</span>
                  </div>
                  <span className={`ledger-type-badge ${tx.type}`}>
                    {tx.type === "CONSTRUCTION"
                      ? "BUILD"
                      : tx.type === "DESTRUCTION_REFUND"
                      ? "DESTROY"
                      : tx.type === "START_REWARD" || tx.type === "CAPITAL_REWARD"
                      ? "REWARD"
                      : tx.type.replace("_", " ")}
                  </span>
                </div>

                <div className="ledger-parties-row">
                  <span className={`ledger-party-chip primary ${tx.primaryPlayerName === "Bank" ? "is-bank-party" : ""}`}>
                    <span className="party-role-tag">FROM</span>
                    <strong>{tx.primaryPlayerName}</strong>
                  </span>
                  <div className="ledger-transfer-flow">
                    <span className="ledger-transfer-line" />
                    <span className="ledger-transfer-icon">⟶</span>
                  </div>
                  <span className={`ledger-party-chip counterparty ${tx.counterpartyPlayerName === "Bank" ? "is-bank-party" : ""}`}>
                    <span className="party-role-tag">TO</span>
                    <strong>{tx.counterpartyPlayerName}</strong>
                  </span>
                </div>

                <div className="ledger-desc-row">
                  <span className="ledger-description-text">{tx.description}</span>
                  {tx.amount !== undefined && tx.amount !== null && (
                    <span
                      className={`ledger-amount-tag ${amountType}`}
                    >
                      {sign}₹{(tx.amount || 0).toLocaleString()}
                    </span>
                  )}
                </div>

                {tx.resultingBalances &&
                  Object.keys(tx.resultingBalances).length > 0 && (
                    <div className="ledger-balances-row">
                      <span style={{ fontWeight: 600 }}>RESULTING BALANCES:</span>
                      {Object.entries(tx.resultingBalances).map(([pidStr, bal]) => {
                        const pid = parseInt(pidStr, 10)
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

      {!isEmbedded && onClose && (
        <button
          className="btn btn-ghost"
          onClick={onClose}
          style={{ marginTop: "8px", minHeight: "40px" }}
        >
          CLOSE LEDGER
        </button>
      )}
    </div>
  )
}

export interface TransactionLedgerModalProps {
  ledger?: TransactionRecord[]
  activityLog?: any[]
  players?: EnginePlayer[]
  localPlayerId?: number
  close: () => void
}

export function TransactionLedgerModal({
  ledger = [],
  players = [],
  localPlayerId = 0,
  close,
}: TransactionLedgerModalProps) {
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

        <TransactionLedgerContent
          ledger={ledger}
          players={players}
          localPlayerId={localPlayerId}
          onClose={close}
        />
      </section>
    </div>
  )
}

export default TransactionLedgerModal
