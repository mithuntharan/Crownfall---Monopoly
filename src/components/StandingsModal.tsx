import { useMemo } from "react"
import type { EnginePlayer } from "../engine/GameEngineInterface"
import { calculatePlayerPortfolio } from "../engine/portfolioUtils"

export function StandingsModal({
  players = [],
  activePlayerIndex = 0,
  localPlayerId = 0,
  roundNumber = 1,
  isHost = false,
  isMultiplayer = false,
  onKickPlayer,
  onInspectPortfolio,
  close,
}: {
  players: EnginePlayer[]
  activePlayerIndex: number
  localPlayerId?: number
  roundNumber?: number
  isHost?: boolean
  isMultiplayer?: boolean
  onKickPlayer?: (playerId: number) => void
  onInspectPortfolio?: (playerIdx: number) => void
  close: () => void
}) {
  // Compute portfolio metrics for each player and sort by Net Worth descending
  const standings = useMemo(() => {
    const list = players.map((p) => {
      const portfolio = calculatePlayerPortfolio(p)
      return {
        player: p,
        portfolio,
      }
    })

    // Sort: active players first by net worth, then cash; bankrupt players at the bottom
    list.sort((a, b) => {
      if (a.player.isBankrupt && !b.player.isBankrupt) return 1
      if (!a.player.isBankrupt && b.player.isBankrupt) return -1
      if (b.portfolio.netWorth !== a.portfolio.netWorth) {
        return b.portfolio.netWorth - a.portfolio.netWorth
      }
      return b.player.money - a.player.money
    })

    return list
  }, [players])

  const totalGameWealth = useMemo(() => {
    return standings.reduce((sum, item) => sum + item.portfolio.netWorth, 0)
  }, [standings])

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        className="modal-sheet standings-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <div className="modal-header">
          <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span>🏆</span> LIVE STANDINGS & LEADERBOARD
          </strong>
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

        <div className="standings-subhead">
          <span>AUTHORITATIVE LEADERBOARD · ROUND #{roundNumber}</span>
          <span className="ready-pill" style={{ fontSize: "8px" }}>
            TOTAL WEALTH ₹{totalGameWealth.toLocaleString()}
          </span>
        </div>

        <div className="standings-list">
          {standings.map((item, idx) => {
            const { player, portfolio } = item
            const rank = idx + 1
            const isLocal = player.id === localPlayerId
            const isActive = player.id === activePlayerIndex

            let statusClass = "active"
            let statusLabel = "ACTIVE"
            if (player.isBankrupt) {
              statusClass = "bankrupt"
              statusLabel = "BANKRUPT"
            } else if (player.inJail) {
              statusClass = "jail"
              statusLabel = `IN JAIL (${player.jailTurns || 0}/3)`
            } else if (player.inRestHouse) {
              statusClass = "rest"
              statusLabel = "REST HOUSE"
            }

            return (
              <div
                key={player.id}
                className={`standings-card rank-${Math.min(rank, 4)} ${
                  player.isBankrupt ? "bankrupt" : ""
                }`}
              >
                <div className="standings-card-top">
                  <div className="standings-rank-col">
                    <span
                      className={`standings-rank-pill rank-${Math.min(rank, 4)}`}
                    >
                      {rank === 1 ? "👑" : `#${rank}`}
                    </span>
                    <div className="standings-player-info">
                      <div className="standings-name-row">
                        <span
                          style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            background: `var(--${player.color || "gold"})`,
                            display: "inline-block",
                          }}
                        />
                        <strong className="standings-player-name">
                          {player.name}
                        </strong>
                        {isLocal && (
                          <span className="standings-you-badge">YOU</span>
                        )}
                        {isActive && (
                          <span className="standings-turn-badge">TURN</span>
                        )}
                      </div>
                      <span style={{ fontSize: "9.5px", color: "var(--ink-soft)" }}>
                        Token: {player.token} ·{" "}
                        {portfolio.totalPropertiesCount} Property Holdings
                      </span>
                    </div>
                  </div>

                  <span className={`standings-status-badge ${statusClass}`}>
                    {statusLabel}
                  </span>
                </div>

                {/* Net Worth & Cash Spotlight */}
                <div className="standings-spotlight-row">
                  <div className="standings-spotlight-item networth">
                    <small>CALCULATED NET WORTH</small>
                    <strong>₹{portfolio.netWorth.toLocaleString()}</strong>
                  </div>
                  <div className="standings-spotlight-item" style={{ textAlign: "right" }}>
                    <small>CASH BALANCE</small>
                    <strong style={{ color: "var(--ink)" }}>
                      ₹{player.money.toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* 4-Metric Grid */}
                <div className="standings-stats-grid">
                  <div className="standings-stat-tile">
                    <small>REAL ESTATE ASSETS</small>
                    <strong>
                      {portfolio.totalPropertiesCount} Properties (
                      {portfolio.cityCount} City, {portfolio.specialCount} Special)
                    </strong>
                  </div>
                  <div className="standings-stat-tile">
                    <small>HOUSES & HOTELS</small>
                    <strong>
                      {portfolio.housesCount} Houses · {portfolio.hotelsCount} Hotels
                    </strong>
                  </div>
                  <div className="standings-stat-tile">
                    <small>TOTAL RENT FLOW</small>
                    <strong>
                      +₹{(player.totalRentReceived || 0).toLocaleString()} / -₹
                      {(player.totalRentPaid || 0).toLocaleString()}
                    </strong>
                  </div>
                  <div className="standings-stat-tile">
                    <small>CONSTRUCTION RECORD</small>
                    <strong>
                      {player.constructionCount || 0} Built ·{" "}
                      {player.destructionCount || 0} Destroyed
                    </strong>
                  </div>
                </div>

                {/* Actions Row */}
                <div className="standings-card-actions" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {onInspectPortfolio && (
                    <button
                      className="standings-inspect-btn"
                      onClick={() => onInspectPortfolio(player.id)}
                    >
                      💼 INSPECT PORTFOLIO
                    </button>
                  )}
                  {isHost && isMultiplayer && player.id !== localPlayerId && !player.isBankrupt && (
                    <button
                      type="button"
                      className="standings-kick-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (window.confirm(`Kick ${player.name} from the match?`)) {
                          onKickPlayer?.(player.id)
                        }
                      }}
                      title={`Host Control: Kick ${player.name} from match`}
                      style={{
                        padding: "6px 12px",
                        background: "rgba(239, 68, 68, 0.2)",
                        border: "1px solid rgba(239, 68, 68, 0.6)",
                        borderRadius: "6px",
                        color: "#fca5a5",
                        fontFamily: "'Oswald', sans-serif",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      🥾 KICK PLAYER
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="standings-footer-note">
          Valuation Formula: Net Worth = Cash + Property Acquisition Value + Construction Investment − Mortgage Redemption Liabilities.
          Rankings are informational; authoritative game engine governs bankruptcy and elimination.
        </div>

        <button
          className="btn btn-ghost"
          onClick={close}
          style={{ marginTop: "10px", minHeight: "40px" }}
        >
          CLOSE STANDINGS
        </button>
      </section>
    </div>
  )
}

export default StandingsModal

