import React, { useState, useEffect } from "react"
import type {
  TransactionRecord,
  EnginePlayer,
  TradeOffer,
} from "../engine/GameEngineInterface"
import type { GameplayEventEntry } from "./GameplayEventLog"
import { TransactionLedgerContent } from "./TransactionLedgerModal"
import { TradeModal } from "./TradeModal"
import { GameplayEventLog } from "./GameplayEventLog"
import { FinancialInsightsModal } from "./FinancialInsightsModal"
import { PropertyComparisonView } from "./PropertyComparisonView"

export type GameInfoTab = "ledger" | "trade" | "events" | "insights" | "compare"

export interface GameInfoModalProps {
  isOpen: boolean
  initialTab?: GameInfoTab
  onClose: () => void
  transactionLedger?: TransactionRecord[]
  players?: EnginePlayer[]
  localPlayerId?: number
  tradeOffers?: TradeOffer[]
  onCreateOffer?: (
    receiverId: number,
    senderProps: string[],
    senderCash: number,
    receiverProps: string[],
    receiverCash: number,
  ) => Promise<boolean>
  onAcceptOffer?: (tradeId: string) => Promise<boolean>
  onRejectOffer?: (tradeId: string) => Promise<boolean>
  onCancelOffer?: (tradeId: string) => Promise<boolean>
  events?: GameplayEventEntry[]
  onClearEvents?: () => void
  isHost?: boolean
  isMultiplayer?: boolean
  onKickPlayer?: (playerId: number) => void
  onSelectPropertyHighlight?: (propertyId: string | null) => void
}

export function GameInfoModal({
  isOpen,
  initialTab = "ledger",
  onClose,
  transactionLedger = [],
  players = [],
  localPlayerId = 0,
  tradeOffers = [],
  onCreateOffer = async () => false,
  onAcceptOffer = async () => false,
  onRejectOffer = async () => false,
  onCancelOffer = async () => false,
  events = [],
  onClearEvents,
  isHost = false,
  isMultiplayer = false,
  onKickPlayer,
  onSelectPropertyHighlight,
}: GameInfoModalProps) {
  const [activeTab, setActiveTab] = useState<GameInfoTab>(initialTab)

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  if (!isOpen) return null

  const pendingTradesCount = tradeOffers.filter(
    (t) => t.receiverId === localPlayerId && t.status === "PENDING"
  ).length

  return (
    <div className="modal-backdrop game-info-backdrop" onMouseDown={onClose}>
      <section
        className="modal-sheet game-info-modal-sheet"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "760px",
          maxWidth: "min(760px, 96vw)",
          maxHeight: "min(92vh, 92dvh)",
          height: "min(680px, 92dvh)",
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
      >
        <div className="sheet-handle" style={{ margin: "8px auto 4px" }} />

        {/* Modal Header */}
        <div
          className="game-info-modal-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 16px 10px",
            borderBottom: "1px solid var(--border-subtle, rgba(200, 155, 69, 0.25))",
            flexShrink: 0,
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "17px",
                fontWeight: 800,
                color: "var(--ink, #1c1917)",
                letterSpacing: "0.02em",
              }}
            >
              GAME INFO &amp; RECORDS
            </span>
          </div>

          {/* Subtab Navigation Buttons */}
          <div
            className="game-info-subtabs-nav"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(0, 0, 0, 0.05)",
              padding: "3px",
              borderRadius: "8px",
              border: "1px solid rgba(200, 155, 69, 0.2)",
            }}
          >
            <button
              type="button"
              className={`game-info-subtab-btn ${activeTab === "ledger" ? "active" : ""}`}
              onClick={() => setActiveTab("ledger")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: activeTab === "ledger" ? "1px solid var(--gold)" : "1px solid transparent",
                background: activeTab === "ledger" ? "rgba(200, 155, 69, 0.22)" : "transparent",
                color: activeTab === "ledger" ? "var(--ink, #1c1917)" : "var(--ink-soft, #78716c)",
                fontWeight: 700,
                fontSize: "11.5px",
                cursor: "pointer",
                transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <span>LEDGER</span>
              {transactionLedger.length > 0 && (
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: "10px",
                    fontSize: "10px",
                    background: activeTab === "ledger" ? "rgba(200, 155, 69, 0.35)" : "rgba(0, 0, 0, 0.08)",
                  }}
                >
                  {transactionLedger.length}
                </span>
              )}
            </button>

            <button
              type="button"
              className={`game-info-subtab-btn ${activeTab === "trade" ? "active" : ""}`}
              onClick={() => setActiveTab("trade")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: activeTab === "trade" ? "1px solid var(--gold)" : "1px solid transparent",
                background: activeTab === "trade" ? "rgba(200, 155, 69, 0.22)" : "transparent",
                color: activeTab === "trade" ? "var(--ink, #1c1917)" : "var(--ink-soft, #78716c)",
                fontWeight: 700,
                fontSize: "11.5px",
                cursor: "pointer",
                transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
                position: "relative",
              }}
            >
              <span>TRADE</span>
              {pendingTradesCount > 0 && (
                <span
                  style={{
                    background: "#ef4444",
                    color: "#ffffff",
                    borderRadius: "10px",
                    padding: "1px 6px",
                    fontSize: "10px",
                    fontWeight: 800,
                  }}
                >
                  {pendingTradesCount}
                </span>
              )}
            </button>

            <button
              type="button"
              className={`game-info-subtab-btn ${activeTab === "events" ? "active" : ""}`}
              onClick={() => setActiveTab("events")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: activeTab === "events" ? "1px solid var(--gold)" : "1px solid transparent",
                background: activeTab === "events" ? "rgba(200, 155, 69, 0.22)" : "transparent",
                color: activeTab === "events" ? "var(--ink, #1c1917)" : "var(--ink-soft, #78716c)",
                fontWeight: 700,
                fontSize: "11.5px",
                cursor: "pointer",
                transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <span>EVENTS</span>
              {events.length > 0 && (
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: "10px",
                    fontSize: "10px",
                    background: activeTab === "events" ? "rgba(200, 155, 69, 0.35)" : "rgba(0, 0, 0, 0.08)",
                  }}
                >
                  {events.length}
                </span>
              )}
            </button>

            <button
              type="button"
              className={`game-info-subtab-btn ${activeTab === "insights" ? "active" : ""}`}
              onClick={() => setActiveTab("insights")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: activeTab === "insights" ? "1px solid var(--gold)" : "1px solid transparent",
                background: activeTab === "insights" ? "rgba(200, 155, 69, 0.22)" : "transparent",
                color: activeTab === "insights" ? "var(--ink, #1c1917)" : "var(--ink-soft, #78716c)",
                fontWeight: 700,
                fontSize: "11.5px",
                cursor: "pointer",
                transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <span>INSIGHTS</span>
            </button>

            <button
              type="button"
              className={`game-info-subtab-btn ${activeTab === "compare" ? "active" : ""}`}
              onClick={() => setActiveTab("compare")}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "6px",
                border: activeTab === "compare" ? "1px solid var(--gold)" : "1px solid transparent",
                background: activeTab === "compare" ? "rgba(200, 155, 69, 0.22)" : "transparent",
                color: activeTab === "compare" ? "var(--ink, #1c1917)" : "var(--ink-soft, #78716c)",
                fontWeight: 700,
                fontSize: "11.5px",
                cursor: "pointer",
                transition: "all 180ms cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <span>COMPARE</span>
            </button>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            style={{
              background: "rgba(0, 0, 0, 0.05)",
              border: "1px solid rgba(200, 155, 69, 0.35)",
              borderRadius: "50%",
              width: "28px",
              height: "28px",
              color: "var(--ink-soft, #44403c)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Panel Body: Persistent subtab views to prevent resetting state/forms/history */}
        <div
          className="game-info-subtabs-body"
          style={{
            flex: 1,
            overflowY: "auto",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Subtab 1: Ledger */}
          <div
            style={{
              display: activeTab === "ledger" ? "flex" : "none",
              flexDirection: "column",
              height: "100%",
              minHeight: 0,
              padding: "12px 16px",
            }}
          >
            <TransactionLedgerContent
              ledger={transactionLedger}
              players={players}
              isEmbedded
              onClose={onClose}
            />
          </div>

          {/* Subtab 2: Trade */}
          <div
            style={{
              display: activeTab === "trade" ? "flex" : "none",
              flexDirection: "column",
              height: "100%",
              minHeight: 0,
            }}
          >
            <TradeModal
              players={players}
              localPlayerId={localPlayerId}
              tradeOffers={tradeOffers}
              onCreateOffer={onCreateOffer}
              onAcceptOffer={onAcceptOffer}
              onRejectOffer={onRejectOffer}
              onCancelOffer={onCancelOffer}
              close={onClose}
              isEmbedded
            />
          </div>

          {/* Subtab 3: Events */}
          <div
            style={{
              display: activeTab === "events" ? "flex" : "none",
              flexDirection: "column",
              height: "100%",
              minHeight: 0,
            }}
          >
            <GameplayEventLog
              isOpen={true}
              events={events}
              onClear={onClearEvents}
              onClose={onClose}
              isEmbedded
            />
          </div>

          {/* Subtab 4: Insights */}
          <div
            style={{
              display: activeTab === "insights" ? "flex" : "none",
              flexDirection: "column",
              height: "100%",
              minHeight: 0,
            }}
          >
            <FinancialInsightsModal
              players={players}
              localPlayerId={localPlayerId}
              transactionLedger={transactionLedger}
              isHost={isHost}
              isMultiplayer={isMultiplayer}
              onKickPlayer={onKickPlayer}
              close={onClose}
              isEmbedded
            />
          </div>

          {/* Subtab 5: Compare */}
          <div
            style={{
              display: activeTab === "compare" ? "flex" : "none",
              flexDirection: "column",
              height: "100%",
              minHeight: 0,
            }}
          >
            <PropertyComparisonView
              players={players}
              onSelectPropertyHighlight={onSelectPropertyHighlight}
            />
          </div>
        </div>
      </section>
    </div>
  )
}

export default GameInfoModal
