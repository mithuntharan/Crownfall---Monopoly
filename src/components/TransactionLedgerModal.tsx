import React, { useState, useMemo } from "react"
import type {
  TransactionRecord,
  EnginePlayer,
} from "../engine/GameEngineInterface"

export interface TransactionLedgerContentProps {
  ledger?: TransactionRecord[]
  players?: EnginePlayer[]
  isEmbedded?: boolean
  onClose?: () => void
}

export function TransactionLedgerContent({
  ledger = [],
  players = [],
  isEmbedded = false,
  onClose,
}: TransactionLedgerContentProps) {
  const [playerFilter, setPlayerFilter] = useState<string>("ALL")
  const [typeFilter, setTypeFilter] = useState<string>("ALL")

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
        <div className="ledger-stat-card status-card">
          <span className="ledger-stat-label">STATUS</span>
          <span className="ready-pill">SYNCHRONIZED</span>
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
              { id: "CONSTRUCTION", label: "Build" },
              { id: "DESTRUCTION", label: "Destroy" },
              { id: "START/REWARD", label: "Rewards" },
              { id: "TAX/FEE", label: "Tax & Fees" },
              { id: "BANKRUPTCY", label: "Bankruptcy" },
              { id: "MORTGAGE", label: "Mortgages" },
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
                    <span className="ledger-turn-pill">Round #{tx.turnNumber}</span>
                    <span className="activity-log-time">{timeStr}</span>
                  </div>
                  <span className={`ledger-type-badge ${tx.type}`}>
                    {tx.type.replace("_", " ")}
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
  close: () => void
}

export function TransactionLedgerModal({
  ledger = [],
  players = [],
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
          onClose={close}
        />
      </section>
    </div>
  )
}

export default TransactionLedgerModal
