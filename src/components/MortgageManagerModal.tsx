import { useState } from "react"
import type { EnginePlayer } from "../engine/GameEngineInterface"
import { CITY_PROPERTIES, SPECIAL_PROPERTIES } from "../data/businessData"
import { ROYAL_COLOR_THEMES } from "../theme/colors"

interface MortgageManagerModalProps {
  player: EnginePlayer
  onMortgage: (propertyId: string) => Promise<boolean>
  onUnmortgage: (propertyId: string) => Promise<boolean>
  close: () => void
}

export function MortgageManagerModal({
  player,
  onMortgage,
  onUnmortgage,
  close,
}: MortgageManagerModalProps) {
  const [filter, setFilter] = useState<"all" | "active" | "mortgaged">("all")
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const [errorNotice, setErrorNotice] = useState<string | null>(null)

  const properties = player.ownedProperties.map((propId) => {
    const city = CITY_PROPERTIES[propId]
    const sp = SPECIAL_PROPERTIES[propId]
    const name = city ? city.name : sp ? sp.name : propId
    const colorGroup = city ? city.colorGroup : "NONE"
    const hex = city && ROYAL_COLOR_THEMES[city.colorGroup] ? ROYAL_COLOR_THEMES[city.colorGroup].accent : "#c89b45"
    const purchasePrice = city ? city.purchasePrice : sp ? sp.purchasePrice : 0
    const mortgageValue = city ? city.mortgageValue : sp ? sp.mortgageValue : Math.floor(purchasePrice / 2)
    const redemptionFee = Math.ceil((mortgageValue * 0.1) / 100) * 100
    const redemptionCost = mortgageValue + redemptionFee
    const isMortgaged = !!player.mortgages[propId]
    const buildingsCount = player.buildings[propId] || 0

    return {
      propId,
      name,
      colorGroup,
      hex,
      purchasePrice,
      mortgageValue,
      redemptionFee,
      redemptionCost,
      isMortgaged,
      buildingsCount,
    }
  })

  const filtered = properties.filter((p) => {
    if (filter === "active") return !p.isMortgaged
    if (filter === "mortgaged") return p.isMortgaged
    return true
  })

  const handleMortgage = async (propId: string) => {
    setActionInProgress(propId)
    setErrorNotice(null)
    const success = await onMortgage(propId)
    setActionInProgress(null)
    if (!success) {
      setErrorNotice("Could not mortgage property. Check building status or rules.")
    }
  }

  const handleRedeem = async (propId: string, cost: number) => {
    if (player.money < cost) {
      setErrorNotice(`Insufficient funds to redeem! Need ₹${cost.toLocaleString()} but have ₹${player.money.toLocaleString()}.`)
      return
    }
    setActionInProgress(propId)
    setErrorNotice(null)
    const success = await onUnmortgage(propId)
    setActionInProgress(null)
    if (!success) {
      setErrorNotice("Could not redeem property.")
    }
  }

  const mortgagedCount = properties.filter((p) => p.isMortgaged).length
  const totalMortgageDebt = properties
    .filter((p) => p.isMortgaged)
    .reduce((sum, p) => sum + p.redemptionCost, 0)

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        className="modal-sheet mortgage-manager-modal"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ maxWidth: "640px", width: "min(640px, 95vw)", maxHeight: "min(88vh, 88dvh)", display: "flex", flexDirection: "column" }}
      >
        <div className="sheet-handle" />
        <div className="modal-header">
          <strong style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--gold-300)" }}>
            <span>🏦</span> MORTGAGE & REDEMPTION MANAGER
          </strong>
          <button onClick={close} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Player stats bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "8px",
            padding: "10px 16px",
            background: "rgba(0,0,0,0.3)",
            borderBottom: "1px solid var(--border-subtle)",
            fontSize: "12px",
          }}
        >
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>Available Cash</div>
            <strong style={{ color: "var(--gold-300)", fontSize: "14px" }}>₹{player.money.toLocaleString()}</strong>
          </div>
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>Mortgaged Titles</div>
            <strong style={{ color: mortgagedCount > 0 ? "var(--crimson)" : "var(--text-muted)", fontSize: "14px" }}>
              {mortgagedCount} / {properties.length}
            </strong>
          </div>
          <div>
            <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>Total Payoff Cost</div>
            <strong style={{ color: totalMortgageDebt > 0 ? "#f59e0b" : "var(--text-muted)", fontSize: "14px" }}>
              ₹{totalMortgageDebt.toLocaleString()}
            </strong>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "8px", padding: "8px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
          {(["all", "active", "mortgaged"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                flex: 1,
                padding: "6px",
                borderRadius: "6px",
                border: filter === t ? "1px solid var(--gold-400)" : "1px solid transparent",
                background: filter === t ? "rgba(200, 155, 69, 0.2)" : "transparent",
                color: filter === t ? "var(--gold-300)" : "var(--text-muted)",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
              }}
            >
              {t === "all" ? `All (${properties.length})` : t === "active" ? `Active (${properties.length - mortgagedCount})` : `Mortgaged (${mortgagedCount})`}
            </button>
          ))}
        </div>

        {/* Error Notice */}
        {errorNotice && (
          <div style={{ margin: "10px 16px 0", padding: "8px 12px", background: "rgba(200,50,50,0.2)", border: "1px solid var(--crimson)", borderRadius: "6px", color: "#ff8b8b", fontSize: "12px" }}>
            ⚠️ {errorNotice}
          </div>
        )}

        {/* Property List */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {filtered.length === 0 ? (
            <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", margin: "20px 0" }}>
              No properties match the selected filter.
            </p>
          ) : (
            filtered.map((prop) => {
              const hasBuildings = prop.buildingsCount > 0
              const canAffordRedeem = player.money >= prop.redemptionCost
              const isBusy = actionInProgress === prop.propId

              return (
                <div
                  key={prop.propId}
                  style={{
                    background: prop.isMortgaged ? "rgba(200, 50, 50, 0.08)" : "rgba(0,0,0,0.25)",
                    border: prop.isMortgaged ? "1px solid rgba(200, 50, 50, 0.4)" : "1px solid var(--border-subtle)",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Property Info */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "6px", height: "36px", borderRadius: "3px", background: prop.hex }} />
                    <div>
                      <div style={{ fontWeight: 700, color: "#fff", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                        {prop.name}
                        {prop.isMortgaged && (
                          <span style={{ fontSize: "8.5px", fontFamily: '"Oswald", sans-serif', fontWeight: 700, letterSpacing: "0.05em", background: "rgba(142, 35, 56, 0.4)", border: "1px solid rgba(239, 68, 68, 0.5)", color: "#fca5a5", padding: "1px 5px", borderRadius: "3px" }}>
                            MORTGAGED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                        Cost: ₹{prop.purchasePrice.toLocaleString()} | Mortgage Val: ₹{prop.mortgageValue.toLocaleString()}
                        {hasBuildings && ` | ⚠️ ${prop.buildingsCount} house(s) built`}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    {prop.isMortgaged ? (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                        <div style={{ fontSize: "10px", color: "var(--gold-300)" }}>
                          Redeem: ₹{prop.redemptionCost.toLocaleString()} (+₹{prop.redemptionFee} fee)
                        </div>
                        <button
                          onClick={() => handleRedeem(prop.propId, prop.redemptionCost)}
                          disabled={isBusy || !canAffordRedeem}
                          style={{
                            padding: "8px 14px",
                            minHeight: "36px",
                            borderRadius: "6px",
                            border: "none",
                            background: canAffordRedeem ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255,255,255,0.1)",
                            color: canAffordRedeem ? "#fff" : "var(--text-muted)",
                            cursor: canAffordRedeem && !isBusy ? "pointer" : "not-allowed",
                            fontSize: "11px",
                            fontWeight: 700,
                          }}
                        >
                          {isBusy ? "Redeeming..." : canAffordRedeem ? "Redeem (+10%)" : "Can't Afford"}
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                        <div style={{ fontSize: "10px", color: "#10b981" }}>
                          Receive: +₹{prop.mortgageValue.toLocaleString()}
                        </div>
                        <button
                          onClick={() => handleMortgage(prop.propId)}
                          disabled={isBusy || hasBuildings}
                          style={{
                            padding: "8px 14px",
                            minHeight: "36px",
                            borderRadius: "6px",
                            border: "1px solid var(--border-subtle)",
                            background: hasBuildings ? "rgba(255,255,255,0.05)" : "rgba(200, 155, 69, 0.2)",
                            color: hasBuildings ? "var(--text-muted)" : "var(--gold-300)",
                            cursor: hasBuildings || isBusy ? "not-allowed" : "pointer",
                            fontSize: "11px",
                            fontWeight: 600,
                          }}
                          title={hasBuildings ? "Sell houses on this property before mortgaging" : "Mortgage this property"}
                        >
                          {isBusy ? "Mortgaging..." : hasBuildings ? "Demolish First" : "Mortgage (50%)"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer info note */}
        <div style={{ padding: "10px 16px", background: "rgba(0,0,0,0.3)", borderTop: "1px solid var(--border-subtle)", fontSize: "11px", color: "var(--text-muted)" }}>
          ℹ️ <strong>Rule 29:</strong> Mortgaging pays 50% of purchase price immediately. Mortgaged properties earn zero rent. Unmortgaging requires paying the mortgage value plus a 10% fee rounded up to the nearest ₹100.
        </div>
      </section>
    </div>
  )
}
