import React from "react"
import type { EnginePlayer } from "../engine/GameEngineInterface"
import { BOARD_SPACES } from "../data/businessData"

interface TurnOverviewDrawerProps {
  isOpen: boolean
  onToggle: () => void
  players: EnginePlayer[]
  activePlayerIndex: number
  localPlayerId?: number
  playerPositions: number[]
  roundNumber: number
  isHost?: boolean
  isMultiplayer?: boolean
  onKickPlayer?: (playerId: number) => void
}

export function TurnOverviewDrawer({
  isOpen,
  onToggle,
  players,
  activePlayerIndex,
  localPlayerId = 0,
  playerPositions,
  roundNumber,
  isHost = false,
  isMultiplayer = false,
  onKickPlayer,
}: TurnOverviewDrawerProps) {
  // Find next active solvent player
  const nextPlayerIndex = (() => {
    let next = (activePlayerIndex + 1) % players.length
    let attempts = 0
    while (players[next]?.isBankrupt && attempts < players.length) {
      next = (next + 1) % players.length
      attempts++
    }
    return next
  })()

  return (
    <>
      {/* Collapsible Overlay / Drawer */}
      {isOpen && (
        <div
          className="turn-overview-backdrop"
          onClick={onToggle}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "64px",
          }}
        >
          <div
            className="turn-overview-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "360px",
              maxWidth: "92vw",
              background: "var(--forest, #111d38)",
              border: "2px solid var(--gold)",
              borderRadius: "14px",
              boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
              padding: "16px",
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(200, 155, 69, 0.3)",
                paddingBottom: "8px",
                marginBottom: "12px",
              }}
            >
              <div>
                <strong
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "16px",
                    color: "var(--gold-light)",
                    display: "block",
                  }}
                >
                  TURN OVERVIEW
                </strong>
                <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.7)" }}>
                  ROUND {String(roundNumber).padStart(2, "0")} · CLOCKWISE ROTATION
                </span>
              </div>
              <button
                onClick={onToggle}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Players in Turn Order */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {players.map((p, idx) => {
                const isActive = idx === activePlayerIndex
                const isNext = idx === nextPlayerIndex && !isActive
                const isSelf = idx === localPlayerId
                const pos = playerPositions[idx] ?? p.position ?? 0
                const spaceName = BOARD_SPACES[pos]?.name ?? `Space ${pos}`

                let statusBadge = {
                  text: "ACTIVE",
                  bg: "rgba(16, 185, 129, 0.2)",
                  color: "#6ee7b7",
                  border: "1px solid #10b981",
                }

                if (p.isBankrupt) {
                  statusBadge = {
                    text: "BANKRUPT",
                    bg: "rgba(239, 68, 68, 0.2)",
                    color: "#fca5a5",
                    border: "1px solid #ef4444",
                  }
                } else if (p.inJail) {
                  statusBadge = {
                    text: `IN JAIL (${p.jailTurns || 1}/3)`,
                    bg: "rgba(217, 119, 6, 0.2)",
                    color: "#fcd34d",
                    border: "1px solid #d97706",
                  }
                } else if (p.inRestHouse) {
                  statusBadge = {
                    text: "REST HOUSE",
                    bg: "rgba(139, 92, 246, 0.2)",
                    color: "#c4b5fd",
                    border: "1px solid #8b5cf6",
                  }
                }

                return (
                  <div
                    key={p.id}
                    style={{
                      background: isActive
                        ? "rgba(200, 155, 69, 0.18)"
                        : "rgba(255, 255, 255, 0.04)",
                      border: isActive
                        ? "1.5px solid var(--gold)"
                        : isNext
                        ? "1px dashed rgba(200, 155, 69, 0.5)"
                        : "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {/* Left: Token & Name */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: `var(--${p.color}, #c89b45)`,
                          color: "#fff",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 700,
                          fontSize: "12px",
                          flexShrink: 0,
                          border: isActive ? "2px solid #fff" : "1px solid rgba(255,255,255,0.6)",
                          boxShadow: isActive ? "0 0 10px var(--gold)" : "none",
                        }}
                      >
                        {p.token || idx + 1}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <strong
                            style={{
                              fontSize: "13px",
                              color: isActive ? "var(--gold-light)" : "#fff",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "130px",
                            }}
                          >
                            {p.name}
                          </strong>
                          {isSelf && (
                            <span
                              style={{
                                fontSize: "8px",
                                background: "rgba(255,255,255,0.15)",
                                padding: "1px 4px",
                                borderRadius: "3px",
                              }}
                            >
                              YOU
                            </span>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: "10px",
                            color: "rgba(255,255,255,0.6)",
                            display: "block",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "140px",
                          }}
                        >
                          At {spaceName} · {p.ownedProperties.length} props
                        </span>
                      </div>
                    </div>

                    {/* Right: Cash & Status */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div
                        style={{
                          fontFamily: "'Oswald', sans-serif",
                          fontWeight: 700,
                          fontSize: "13px",
                          color: p.isBankrupt ? "var(--text-muted, #888)" : "var(--gold-light)",
                        }}
                      >
                        ₹{p.money.toLocaleString()}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", justifyContent: "flex-end", marginTop: "3px" }}>
                        {isActive && (
                          <span
                            style={{
                              fontSize: "8.5px",
                              fontWeight: 700,
                              background: "var(--gold)",
                              color: "#252016",
                              padding: "1px 5px",
                              borderRadius: "4px",
                              letterSpacing: "0.05em",
                            }}
                          >
                            ROLLING
                          </span>
                        )}
                        {isNext && (
                          <span
                            style={{
                              fontSize: "8px",
                              fontWeight: 700,
                              color: "var(--gold-300, #e5c982)",
                              border: "1px dotted var(--gold)",
                              padding: "1px 4px",
                              borderRadius: "3px",
                            }}
                          >
                            NEXT UP
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: "8.5px",
                            fontWeight: 700,
                            padding: "1px 5px",
                            borderRadius: "4px",
                            background: statusBadge.bg,
                            color: statusBadge.color,
                            border: statusBadge.border,
                          }}
                        >
                          {statusBadge.text}
                        </span>
                        {isHost && isMultiplayer && p.id !== localPlayerId && !p.isBankrupt && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (window.confirm(`Kick ${p.name} from the match?`)) {
                                onKickPlayer?.(p.id)
                              }
                            }}
                            title={`Host Control: Kick ${p.name} from match`}
                            style={{
                              background: "rgba(239, 68, 68, 0.2)",
                              border: "1px solid rgba(239, 68, 68, 0.6)",
                              borderRadius: "4px",
                              color: "#fca5a5",
                              fontSize: "8.5px",
                              fontWeight: 700,
                              padding: "1px 5px",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            KICK
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
