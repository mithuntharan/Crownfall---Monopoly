import { useState, useMemo } from "react"
import type { EnginePlayer, TransactionRecord } from "../engine/GameEngineInterface"
import { CITY_PROPERTIES, SPECIAL_PROPERTIES } from "../data/businessData"
import { ROYAL_COLOR_THEMES, type ColorGroupId } from "../theme/colors"
import { calculatePlayerPortfolio } from "../engine/portfolioUtils"

interface FinancialInsightsModalProps {
  players: EnginePlayer[]
  localPlayerId: number
  transactionLedger?: TransactionRecord[]
  close: () => void
}

export function FinancialInsightsModal({
  players,
  localPlayerId,
  transactionLedger = [],
  close,
}: FinancialInsightsModalProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<number>(localPlayerId)
  const [activeTab, setActiveTab] = useState<"overview" | "player_detail">("overview")

  const player = players.find((p) => p.id === selectedPlayerId) || players[0]

  // Authoritative player comparison matrix
  const playerComparisons = useMemo(() => {
    return players
      .map((p) => {
        const port = calculatePlayerPortfolio(p)
        return {
          player: p,
          portfolio: port,
          netWorth: port.netWorth,
          cash: p.money,
          propCount: p.ownedProperties ? p.ownedProperties.length : 0,
          propValue: port.realEstateValue,
          houses: port.housesCount,
          hotels: port.hotelsCount,
          mortgages: port.mortgagedCount,
          rentReceived: p.totalRentReceived || 0,
          rentPaid: p.totalRentPaid || 0,
          status: p.isBankrupt
            ? "BANKRUPT"
            : p.inJail
              ? "IN JAIL"
              : p.inRestHouse
                ? "REST HOUSE"
                : "ACTIVE",
        }
      })
      .sort((a, b) => b.netWorth - a.netWorth)
  }, [players])

  // Portfolio details for selected player
  const portfolio = useMemo(() => {
    return calculatePlayerPortfolio(player)
  }, [player])

  // Financial statistics from authoritative transaction ledger
  const financialStats = useMemo(() => {
    let rentIncome = player.totalRentReceived || 0
    let rentExpense = player.totalRentPaid || 0
    let constructionSpending = 0
    let destructionRefunds = 0
    let propertySpending = 0

    const playerTxs = transactionLedger.filter(
      (tx) => tx.primaryPlayerId === player.id || tx.counterpartyPlayerId === player.id,
    )

    for (const tx of playerTxs) {
      const type = tx.type.toUpperCase()
      if (type.includes("RENT")) {
        if (tx.counterpartyPlayerId === player.id) {
          rentIncome += tx.amount
        } else if (tx.primaryPlayerId === player.id) {
          rentExpense += tx.amount
        }
      } else if (type.includes("BUILD") && tx.primaryPlayerId === player.id) {
        constructionSpending += tx.amount
      } else if (
        (type.includes("SELL") || type.includes("DEMOLISH") || type.includes("DESTROY")) &&
        tx.primaryPlayerId === player.id
      ) {
        destructionRefunds += tx.amount
      } else if (type.includes("BUY") && tx.primaryPlayerId === player.id) {
        propertySpending += tx.amount
      }
    }

    if (constructionSpending === 0 && portfolio.constructionInvestment > 0) {
      constructionSpending = portfolio.constructionInvestment
    }

    const netRent = rentIncome - rentExpense

    return {
      rentIncome,
      rentExpense,
      netRent,
      constructionSpending,
      destructionRefunds,
      propertySpending,
      recentTxs: playerTxs.slice(-15).reverse(),
    }
  }, [player, transactionLedger, portfolio])

  // Color group distribution
  const groupStats = useMemo(() => {
    const groups: Record<
      ColorGroupId | "SPECIAL",
      { name: string; hex: string; total: number; owned: number }
    > = {
      GREEN: { name: "Green (Metro / Gateway)", hex: ROYAL_COLOR_THEMES.GREEN.accent, total: 0, owned: 0 },
      YELLOW: { name: "Yellow (Historic / Royal)", hex: ROYAL_COLOR_THEMES.YELLOW.accent, total: 0, owned: 0 },
      RED: { name: "Red (Commercial / Tech)", hex: ROYAL_COLOR_THEMES.RED.accent, total: 0, owned: 0 },
      BLUE: { name: "Blue (Tourist / Coastal)", hex: ROYAL_COLOR_THEMES.BLUE.accent, total: 0, owned: 0 },
      NONE: { name: "Other", hex: "#c89b45", total: 0, owned: 0 },
      SPECIAL: { name: "Railways & Public Utilities", hex: "#a855f7", total: 6, owned: 0 },
    }

    for (const city of Object.values(CITY_PROPERTIES)) {
      if (groups[city.colorGroup]) {
        groups[city.colorGroup].total += 1
      }
    }

    for (const propId of player.ownedProperties) {
      const city = CITY_PROPERTIES[propId]
      if (city && groups[city.colorGroup]) {
        groups[city.colorGroup].owned += 1
      } else if (SPECIAL_PROPERTIES[propId]) {
        groups.SPECIAL.owned += 1
      }
    }

    return Object.values(groups).filter((g) => g.total > 0)
  }, [player])

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        className="modal-sheet financial-insights-modal"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          maxWidth: "760px",
          width: "min(760px, 95vw)",
          maxHeight: "min(92vh, 92dvh)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="sheet-handle" />
        <div className="modal-header">
          <strong style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--gold-300)" }}>
            <span>📊</span> AUTHORITATIVE INSIGHTS &amp; FINANCIAL ANALYSIS
          </strong>
          <button onClick={close} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            gap: "6px",
            padding: "8px 16px",
            background: "rgba(0,0,0,0.35)",
            borderBottom: "1px solid var(--border-subtle)",
            overflowX: "auto",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => setActiveTab("overview")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: activeTab === "overview" ? "1px solid var(--gold)" : "1px solid transparent",
              background: activeTab === "overview" ? "rgba(200,155,69,0.2)" : "transparent",
              color: activeTab === "overview" ? "var(--gold-300)" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            🏆 PLAYER COMPARISONS
          </button>
          <button
            onClick={() => setActiveTab("player_detail")}
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              border: activeTab === "player_detail" ? "1px solid var(--gold)" : "1px solid transparent",
              background: activeTab === "player_detail" ? "rgba(200,155,69,0.2)" : "transparent",
              color: activeTab === "player_detail" ? "var(--gold-300)" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "12px",
              cursor: "pointer",
            }}
          >
            🔍 PORTFOLIO DEEP DIVE ({player.name})
          </button>
        </div>

        {/* Content Area */}
        <div
          style={{
            overflowY: "auto",
            flex: 1,
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {activeTab === "overview" ? (
            /* ── VIEW 1: PLAYER COMPARISON MATRIX ── */
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div
                style={{
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "8px",
                  overflowX: "auto",
                }}
              >
                <table style={{ width: "100%", minWidth: "620px", borderCollapse: "collapse", fontSize: "11px", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,0.4)", color: "var(--gold-300)", borderBottom: "1px solid var(--border-subtle)" }}>
                      <th style={{ padding: "10px 8px" }}>RANK</th>
                      <th style={{ padding: "10px 8px" }}>PLAYER</th>
                      <th style={{ padding: "10px 8px" }}>STATUS</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>LIQUID CASH</th>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>PROPERTIES</th>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>HOUSES/HOTELS</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>RENT (REC/PAID)</th>
                      <th style={{ padding: "10px 8px", textAlign: "right" }}>NET WORTH</th>
                      <th style={{ padding: "10px 8px", textAlign: "center" }}>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerComparisons.map((item, idx) => {
                      const isLocal = item.player.id === localPlayerId
                      const rank = idx + 1
                      return (
                        <tr
                          key={item.player.id}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.06)",
                            background: isLocal ? "rgba(200,155,69,0.08)" : "transparent",
                          }}
                        >
                          <td style={{ padding: "8px", fontWeight: 800 }}>
                            <span
                              style={{
                                display: "inline-block",
                                width: "20px",
                                height: "20px",
                                lineHeight: "20px",
                                textAlign: "center",
                                borderRadius: "4px",
                                background: rank === 1 ? "#ffd700" : rank === 2 ? "#cbd5e1" : rank === 3 ? "#cd7f32" : "rgba(255,255,255,0.1)",
                                color: rank <= 3 ? "#000" : "#fff",
                                fontSize: "11px",
                              }}
                            >
                              {rank}
                            </span>
                          </td>
                          <td style={{ padding: "8px", fontWeight: 700 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.player.color }} />
                              <span>{item.player.name}</span>
                              {isLocal && <span style={{ fontSize: "9px", color: "var(--gold-300)" }}>(You)</span>}
                            </div>
                          </td>
                          <td style={{ padding: "8px" }}>
                            <span
                              style={{
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "9px",
                                fontWeight: 700,
                                background:
                                  item.status === "ACTIVE"
                                    ? "rgba(16,185,129,0.2)"
                                    : item.status === "IN JAIL"
                                      ? "rgba(217,119,6,0.2)"
                                      : item.status === "REST HOUSE"
                                        ? "rgba(59,130,246,0.2)"
                                        : "rgba(239,68,68,0.2)",
                                color:
                                  item.status === "ACTIVE"
                                    ? "#10b981"
                                    : item.status === "IN JAIL"
                                      ? "#f59e0b"
                                      : item.status === "REST HOUSE"
                                        ? "#60a5fa"
                                        : "#ef4444",
                              }}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td style={{ padding: "8px", textAlign: "right", fontWeight: 700, color: "var(--gold-300)" }}>
                            ₹{item.cash.toLocaleString()}
                          </td>
                          <td style={{ padding: "8px", textAlign: "center" }}>
                            🏛️ {item.propCount} {item.mortgages > 0 ? `(${item.mortgages} mort)` : ""}
                          </td>
                          <td style={{ padding: "8px", textAlign: "center" }}>
                            {item.houses > 0 ? `🏠${item.houses} ` : ""}{item.hotels > 0 ? `🏨${item.hotels}` : item.houses === 0 ? "—" : ""}
                          </td>
                          <td style={{ padding: "8px", textAlign: "right" }}>
                            <span style={{ color: "#10b981" }}>+₹{item.rentReceived.toLocaleString()}</span> /{" "}
                            <span style={{ color: "#ef4444" }}>-₹{item.rentPaid.toLocaleString()}</span>
                          </td>
                          <td style={{ padding: "8px", textAlign: "right", fontWeight: 800, color: "#10b981" }}>
                            ₹{item.netWorth.toLocaleString()}
                          </td>
                          <td style={{ padding: "8px", textAlign: "center" }}>
                            <button
                              onClick={() => {
                                setSelectedPlayerId(item.player.id)
                                setActiveTab("player_detail")
                              }}
                              style={{
                                padding: "4px 8px",
                                borderRadius: "4px",
                                border: "1px solid var(--gold-400)",
                                background: "rgba(200,155,69,0.15)",
                                color: "var(--gold-300)",
                                fontSize: "10px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Quick Summary Footnote */}
              <div style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic", padding: "0 4px" }}>
                * Net Worth is computed authoritatively: Liquid Cash + Unmortgaged Property Values + 50% Mortgage Equity + Construction Investment.
              </div>
            </div>
          ) : (
            /* ── VIEW 2: INDIVIDUAL PLAYER DEEP DIVE ── */
            <>
              {/* Player Selector Bar */}
              <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                {players.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlayerId(p.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: selectedPlayerId === p.id ? `2px solid ${p.color}` : "1px solid var(--border-subtle)",
                      background: selectedPlayerId === p.id ? "rgba(255,255,255,0.08)" : "transparent",
                      color: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: p.color }} />
                    <strong>{p.name}</strong>
                    {p.id === localPlayerId && <span style={{ fontSize: "9px", color: "var(--gold-300)" }}>(You)</span>}
                  </button>
                ))}
              </div>

              {/* Top Wealth Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--gold-400)", borderRadius: "8px", padding: "12px" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase" }}>Liquid Cash Reserve</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "var(--gold-300)", marginTop: "2px" }}>
                    ₹{player.money.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Available immediately for trades &amp; purchases
                  </div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--gold-400)", borderRadius: "8px", padding: "12px" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "uppercase" }}>Total Calculated Net Worth</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#10b981", marginTop: "2px" }}>
                    ₹{portfolio.netWorth.toLocaleString()}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                    Property Equity: ₹{portfolio.realEstateValue.toLocaleString()} | Buildings: ₹{portfolio.constructionInvestment.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Rent Economics Grid */}
              <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontWeight: 700, color: "var(--gold-300)", fontSize: "12px", textTransform: "uppercase", marginBottom: "10px" }}>
                  Rent Flow Analysis
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", textAlign: "center" }}>
                  <div style={{ background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "6px", padding: "8px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Total Rent Inflow</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#10b981", marginTop: "2px" }}>
                      +₹{financialStats.rentIncome.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "6px", padding: "8px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Total Rent Outflow</div>
                    <div style={{ fontSize: "14px", fontWeight: 700, color: "#ef4444", marginTop: "2px" }}>
                      -₹{financialStats.rentExpense.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border-subtle)", borderRadius: "6px", padding: "8px" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Net Rent Yield</div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: 800,
                        color: financialStats.netRent >= 0 ? "#10b981" : "#ef4444",
                        marginTop: "2px",
                      }}
                    >
                      {financialStats.netRent >= 0 ? "+" : ""}₹{financialStats.netRent.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Construction & Real Estate Capital */}
              <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontWeight: 700, color: "var(--gold-300)", fontSize: "12px", textTransform: "uppercase", marginBottom: "10px" }}>
                  Capital Expenditure &amp; Real Estate Investment
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", textAlign: "center" }}>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "6px", padding: "8px", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Land Purchases</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff", marginTop: "2px" }}>
                      ₹{financialStats.propertySpending.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "6px", padding: "8px", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Construction Spent</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--gold-300)", marginTop: "2px" }}>
                      ₹{financialStats.constructionSpending.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.2)", borderRadius: "6px", padding: "8px", border: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Demolition Refunds</div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#60a5fa", marginTop: "2px" }}>
                      ₹{financialStats.destructionRefunds.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Monopoly Group Distribution */}
              <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontWeight: 700, color: "var(--gold-300)", fontSize: "12px", textTransform: "uppercase", marginBottom: "10px" }}>
                  Color Group &amp; Monopoly Mastery
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {groupStats.map((grp) => {
                    const pct = Math.round((grp.owned / grp.total) * 100)
                    const isMonopoly = grp.owned === grp.total && grp.total > 0

                    return (
                      <div key={grp.name}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "3px" }}>
                          <span style={{ color: "#fff", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: grp.hex }} />
                            {grp.name}
                          </span>
                          <span style={{ fontWeight: 700, color: isMonopoly ? "#10b981" : "var(--text-muted)" }}>
                            {isMonopoly ? "👑 FULL MONOPOLY (" : ""}{grp.owned} / {grp.total} ({pct}%){isMonopoly ? ")" : ""}
                          </span>
                        </div>
                        <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              background: isMonopoly ? "linear-gradient(90deg, #10b981, #34d399)" : grp.hex,
                              borderRadius: "3px",
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Properties Owned List */}
              {portfolio.properties.length > 0 && (
                <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                  <div style={{ fontWeight: 700, color: "var(--gold-300)", fontSize: "12px", textTransform: "uppercase", marginBottom: "8px" }}>
                    Properties Owned &amp; Mortgages ({portfolio.properties.length})
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "6px" }}>
                    {portfolio.properties.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          padding: "6px 8px",
                          borderRadius: "6px",
                          background: p.isMortgaged ? "rgba(239,68,68,0.1)" : "rgba(0,0,0,0.2)",
                          border: p.isMortgaged ? "1px solid rgba(239,68,68,0.4)" : "1px solid var(--border-subtle)",
                          fontSize: "11px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <strong style={{ color: p.isMortgaged ? "#ef4444" : "#fff" }}>{p.name}</strong>
                          <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                            {p.isMortgaged ? "Mortgaged" : p.rentNote}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, color: "var(--gold-300)" }}>₹{p.purchasePrice.toLocaleString()}</div>
                          {p.houses > 0 && <div style={{ fontSize: "9px" }}>🏠 {p.houses}</div>}
                          {p.isHotel && <div style={{ fontSize: "9px" }}>🏨 Hotel</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cash Flow Ledger Feed */}
              {financialStats.recentTxs.length > 0 && (
                <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                  <div style={{ fontWeight: 700, color: "var(--gold-300)", fontSize: "12px", textTransform: "uppercase", marginBottom: "8px" }}>
                    Recent Cash-Flow Transactions
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {financialStats.recentTxs.map((tx) => {
                      const isReceiver = tx.counterpartyPlayerId === player.id
                      return (
                        <div
                          key={tx.id}
                          style={{
                            padding: "6px 8px",
                            background: "rgba(0,0,0,0.2)",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                            flexWrap: "wrap",
                            fontSize: "11px",
                          }}
                        >
                          <span style={{ color: "#cbd5e1" }}>{tx.description}</span>
                          <span style={{ fontWeight: 700, color: isReceiver ? "#10b981" : "#ef4444" }}>
                            {isReceiver ? "+" : "-"}₹{tx.amount.toLocaleString()}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

export default FinancialInsightsModal
