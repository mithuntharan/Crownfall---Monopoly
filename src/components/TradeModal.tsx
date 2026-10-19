import { useState, useMemo } from "react"
import type { EnginePlayer, TradeOffer } from "../engine/GameEngineInterface"
import { CITY_PROPERTIES, SPECIAL_PROPERTIES } from "../data/businessData"
import { ROYAL_COLOR_THEMES } from "../theme/colors"

interface TradeModalProps {
  players: EnginePlayer[]
  localPlayerId: number
  tradeOffers?: TradeOffer[]
  onCreateOffer: (
    receiverId: number,
    senderProps: string[],
    senderCash: number,
    receiverProps: string[],
    receiverCash: number,
  ) => Promise<boolean>
  onAcceptOffer: (tradeId: string) => Promise<boolean>
  onRejectOffer: (tradeId: string) => Promise<boolean>
  onCancelOffer: (tradeId: string) => Promise<boolean>
  close: () => void
}

export function TradeModal({
  players,
  localPlayerId,
  tradeOffers = [],
  onCreateOffer,
  onAcceptOffer,
  onRejectOffer,
  onCancelOffer,
  close,
}: TradeModalProps) {
  const localPlayer = players.find((p) => p.id === localPlayerId) || players[0]
  const otherPlayers = players.filter((p) => p.id !== localPlayer.id && !p.isBankrupt)

  const [activeTab, setActiveTab] = useState<"create" | "offers">("create")
  const [selectedPartnerId, setSelectedPartnerId] = useState<number>(
    otherPlayers[0]?.id ?? -1,
  )

  const partner = players.find((p) => p.id === selectedPartnerId)

  // Creation state
  const [offeredProps, setOfferedProps] = useState<string[]>([])
  const [offeredCash, setOfferedCash] = useState<number>(0)
  const [requestedProps, setRequestedProps] = useState<string[]>([])
  const [requestedCash, setRequestedCash] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Properties eligible for trade (must have 0 houses/hotels)
  const eligibleLocalProps = useMemo(() => {
    return localPlayer.ownedProperties.filter(
      (propId) => (localPlayer.buildings[propId] || 0) === 0,
    )
  }, [localPlayer])

  const eligiblePartnerProps = useMemo(() => {
    if (!partner) return []
    return partner.ownedProperties.filter(
      (propId) => (partner.buildings[propId] || 0) === 0,
    )
  }, [partner])

  // Split trade offers
  const incomingOffers = useMemo(() => {
    return tradeOffers.filter(
      (t) => t.receiverId === localPlayer.id && t.status === "PENDING",
    )
  }, [tradeOffers, localPlayer.id])

  const outgoingOffers = useMemo(() => {
    return tradeOffers.filter(
      (t) => t.senderId === localPlayer.id && t.status === "PENDING",
    )
  }, [tradeOffers, localPlayer.id])

  const pastOffers = useMemo(() => {
    return tradeOffers
      .filter(
        (t) =>
          (t.senderId === localPlayer.id || t.receiverId === localPlayer.id) &&
          t.status !== "PENDING",
      )
      .slice(-10)
      .reverse()
  }, [tradeOffers, localPlayer.id])

  const toggleOfferedProp = (propId: string) => {
    setOfferedProps((prev) =>
      prev.includes(propId) ? prev.filter((p) => p !== propId) : [...prev, propId],
    )
  }

  const toggleRequestedProp = (propId: string) => {
    setRequestedProps((prev) =>
      prev.includes(propId) ? prev.filter((p) => p !== propId) : [...prev, propId],
    )
  }

  const handleCreateOffer = async () => {
    if (selectedPartnerId < 0) {
      setErrorMsg("Please select a player to trade with.")
      return
    }
    if (
      offeredProps.length === 0 &&
      offeredCash === 0 &&
      requestedProps.length === 0 &&
      requestedCash === 0
    ) {
      setErrorMsg("Trade cannot be completely empty.")
      return
    }
    if (offeredCash > localPlayer.money) {
      setErrorMsg("You cannot offer more cash than you have.")
      return
    }
    if (partner && requestedCash > partner.money) {
      setErrorMsg(`${partner.name} does not have ₹${requestedCash.toLocaleString()}.`)
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)
    const success = await onCreateOffer(
      selectedPartnerId,
      offeredProps,
      offeredCash,
      requestedProps,
      requestedCash,
    )
    setIsSubmitting(false)
    if (success) {
      setOfferedProps([])
      setOfferedCash(0)
      setRequestedProps([])
      setRequestedCash(0)
      setActiveTab("offers")
    } else {
      setErrorMsg("Failed to propose trade. Please check offer requirements.")
    }
  }

  const getPropName = (id: string) => {
    if (CITY_PROPERTIES[id]) return CITY_PROPERTIES[id].name
    if (SPECIAL_PROPERTIES[id]) return SPECIAL_PROPERTIES[id].name
    return id
  }

  const getPropColor = (id: string) => {
    const city = CITY_PROPERTIES[id]
    if (city && ROYAL_COLOR_THEMES[city.colorGroup]) {
      return ROYAL_COLOR_THEMES[city.colorGroup].accent
    }
    return "#c89b45"
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        className="modal-sheet trade-modal"
        onMouseDown={(e) => e.stopPropagation()}
        style={{ maxWidth: "680px", width: "min(680px, 95vw)", maxHeight: "min(90vh, 90dvh)", display: "flex", flexDirection: "column" }}
      >
        <div className="sheet-handle" />
        <div className="modal-header">
          <strong style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--gold-300)" }}>
            <span>🤝</span> PROPERTY TRADING & NEGOTIATION
          </strong>
          <button onClick={close} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab switch */}
        <div style={{ display: "flex", gap: "8px", padding: "8px 16px", background: "rgba(0,0,0,0.2)", borderBottom: "1px solid var(--border-subtle)" }}>
          <button
            className={`tab-btn ${activeTab === "create" ? "active" : ""}`}
            onClick={() => setActiveTab("create")}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "6px",
              border: activeTab === "create" ? "1px solid var(--gold-400)" : "1px solid transparent",
              background: activeTab === "create" ? "rgba(200, 155, 69, 0.2)" : "transparent",
              color: activeTab === "create" ? "var(--gold-300)" : "var(--text-muted)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Propose New Trade
          </button>
          <button
            className={`tab-btn ${activeTab === "offers" ? "active" : ""}`}
            onClick={() => setActiveTab("offers")}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "6px",
              border: activeTab === "offers" ? "1px solid var(--gold-400)" : "1px solid transparent",
              background: activeTab === "offers" ? "rgba(200, 155, 69, 0.2)" : "transparent",
              color: activeTab === "offers" ? "var(--gold-300)" : "var(--text-muted)",
              fontWeight: 600,
              cursor: "pointer",
              position: "relative",
            }}
          >
            Active & Past Trades
            {incomingOffers.length > 0 && (
              <span style={{
                position: "absolute",
                top: "4px",
                right: "8px",
                background: "var(--crimson)",
                color: "#fff",
                borderRadius: "10px",
                padding: "1px 6px",
                fontSize: "11px",
              }}>
                {incomingOffers.length}
              </span>
            )}
          </button>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "16px" }}>
          {activeTab === "create" ? (
            <div>
              {/* Partner Selection */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--gold-400)", marginBottom: "6px", textTransform: "uppercase" }}>
                  Select Trading Partner:
                </label>
                {otherPlayers.length === 0 ? (
                  <p style={{ color: "var(--text-muted)" }}>No other active players available for trading.</p>
                ) : (
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {otherPlayers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPartnerId(p.id)
                          setRequestedProps([])
                          setRequestedCash(0)
                        }}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "8px",
                          border: selectedPartnerId === p.id ? `2px solid ${p.color}` : "1px solid var(--border-subtle)",
                          background: selectedPartnerId === p.id ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.2)",
                          color: "#fff",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "13px",
                        }}
                      >
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: p.color }} />
                        <strong>{p.name}</strong>
                        <span style={{ color: "var(--gold-300)", fontSize: "11px" }}>₹{p.money.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {partner && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px", marginBottom: "16px" }}>
                  {/* YOU OFFER (LEFT) */}
                  <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                    <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px", marginBottom: "10px" }}>
                      <strong style={{ color: "var(--gold-300)", fontSize: "13px" }}>YOU GIVE ({localPlayer.name})</strong>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Cash: ₹{localPlayer.money.toLocaleString()}</div>
                    </div>

                    <div style={{ marginBottom: "10px" }}>
                      <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Offer Cash (₹):</label>
                      <input
                        type="number"
                        min="0"
                        max={localPlayer.money}
                        step="100"
                        value={offeredCash}
                        onChange={(e) => setOfferedCash(Math.max(0, Math.min(localPlayer.money, Number(e.target.value) || 0)))}
                        style={{
                          width: "100%",
                          background: "#0c1527",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "6px",
                          padding: "6px 8px",
                          color: "var(--gold-300)",
                          fontWeight: 700,
                          fontSize: "13px",
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Select Properties:</div>
                      {eligibleLocalProps.length === 0 ? (
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>No eligible unbuilt properties.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "160px", overflowY: "auto" }}>
                          {eligibleLocalProps.map((propId) => {
                            const isSelected = offeredProps.includes(propId)
                            const color = getPropColor(propId)
                            return (
                              <button
                                key={propId}
                                onClick={() => toggleOfferedProp(propId)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  border: isSelected ? "1px solid var(--gold-400)" : "1px solid rgba(255,255,255,0.06)",
                                  background: isSelected ? "rgba(200, 155, 69, 0.25)" : "rgba(0,0,0,0.2)",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#fff" }}>
                                  <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: color }} />
                                  {getPropName(propId)}
                                </span>
                                {localPlayer.mortgages[propId] && (
                                  <span style={{ fontSize: "9px", color: "var(--crimson)", background: "rgba(200,50,50,0.2)", padding: "1px 4px", borderRadius: "3px" }}>
                                    MORTGAGED
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* YOU RECEIVE (RIGHT) */}
                  <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                    <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px", marginBottom: "10px" }}>
                      <strong style={{ color: "var(--gold-300)", fontSize: "13px" }}>YOU RECEIVE ({partner.name})</strong>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Cash: ₹{partner.money.toLocaleString()}</div>
                    </div>

                    <div style={{ marginBottom: "10px" }}>
                      <label style={{ fontSize: "11px", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Request Cash (₹):</label>
                      <input
                        type="number"
                        min="0"
                        max={partner.money}
                        step="100"
                        value={requestedCash}
                        onChange={(e) => setRequestedCash(Math.max(0, Math.min(partner.money, Number(e.target.value) || 0)))}
                        style={{
                          width: "100%",
                          background: "#0c1527",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "6px",
                          padding: "6px 8px",
                          color: "var(--gold-300)",
                          fontWeight: 700,
                          fontSize: "13px",
                        }}
                      />
                    </div>

                    <div>
                      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>Select Properties:</div>
                      {eligiblePartnerProps.length === 0 ? (
                        <p style={{ fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>No eligible unbuilt properties.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "160px", overflowY: "auto" }}>
                          {eligiblePartnerProps.map((propId) => {
                            const isSelected = requestedProps.includes(propId)
                            const color = getPropColor(propId)
                            return (
                              <button
                                key={propId}
                                onClick={() => toggleRequestedProp(propId)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "6px 8px",
                                  borderRadius: "6px",
                                  border: isSelected ? "1px solid var(--gold-400)" : "1px solid rgba(255,255,255,0.06)",
                                  background: isSelected ? "rgba(200, 155, 69, 0.25)" : "rgba(0,0,0,0.2)",
                                  cursor: "pointer",
                                  textAlign: "left",
                                }}
                              >
                                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#fff" }}>
                                  <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: color }} />
                                  {getPropName(propId)}
                                </span>
                                {partner.mortgages[propId] && (
                                  <span style={{ fontSize: "9px", color: "var(--crimson)", background: "rgba(200,50,50,0.2)", padding: "1px 4px", borderRadius: "3px" }}>
                                    MORTGAGED
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {errorMsg && (
                <div style={{ padding: "8px 12px", background: "rgba(200,50,50,0.2)", border: "1px solid var(--crimson)", borderRadius: "6px", color: "#ff8b8b", fontSize: "12px", marginBottom: "12px" }}>
                  ⚠️ {errorMsg}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  onClick={close}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    background: "transparent",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: "13px",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOffer}
                  disabled={isSubmitting || !partner}
                  style={{
                    padding: "8px 20px",
                    borderRadius: "6px",
                    background: "linear-gradient(135deg, var(--gold-400), var(--gold-500))",
                    border: "none",
                    color: "#0a101d",
                    fontWeight: 700,
                    cursor: isSubmitting || !partner ? "not-allowed" : "pointer",
                    fontSize: "13px",
                    boxShadow: "0 2px 8px rgba(200, 155, 69, 0.3)",
                  }}
                >
                  {isSubmitting ? "Proposing..." : "Send Trade Offer"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Active Incoming */}
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ color: "var(--gold-300)", fontSize: "13px", textTransform: "uppercase", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>📥</span> Incoming Trade Offers ({incomingOffers.length})
                </h4>
                {incomingOffers.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>No pending incoming trade offers.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {incomingOffers.map((offer) => (
                      <div
                        key={offer.id}
                        style={{
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid var(--gold-400)",
                          borderRadius: "8px",
                          padding: "12px",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ fontWeight: 700, color: "#fff", fontSize: "13px" }}>
                            From: <span style={{ color: "var(--gold-300)" }}>{offer.senderName}</span>
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                            {new Date(offer.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "8px", fontSize: "12px", marginBottom: "12px" }}>
                          <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px", borderRadius: "6px" }}>
                            <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>They Offer:</div>
                            <div style={{ fontWeight: 600, color: "var(--gold-300)" }}>
                              {offer.senderCash > 0 && `₹${offer.senderCash.toLocaleString()} Cash`}
                              {offer.senderPropertyIds.length > 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: offer.senderCash > 0 ? "4px" : "0" }}>
                                  {offer.senderPropertyIds.map((p) => {
                                    const senderPlayer = players.find((pl) => pl.id === offer.senderId)
                                    const isMortgaged = Boolean(senderPlayer?.mortgages?.[p])
                                    return (
                                      <div key={p} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <span>{getPropName(p)}</span>
                                        {isMortgaged && (
                                          <span style={{ fontSize: "9px", color: "var(--crimson)", background: "rgba(200,50,50,0.2)", padding: "1px 4px", borderRadius: "3px" }}>
                                            MORTGAGED
                                          </span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              {offer.senderCash === 0 && offer.senderPropertyIds.length === 0 && "Nothing"}
                            </div>
                          </div>
                          <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px", borderRadius: "6px" }}>
                            <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>In Exchange For:</div>
                            <div style={{ fontWeight: 600, color: "var(--gold-300)" }}>
                              {offer.receiverCash > 0 && `₹${offer.receiverCash.toLocaleString()} Cash`}
                              {offer.receiverPropertyIds.length > 0 && (
                                <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: offer.receiverCash > 0 ? "4px" : "0" }}>
                                  {offer.receiverPropertyIds.map((p) => {
                                    const receiverPlayer = players.find((pl) => pl.id === offer.receiverId)
                                    const isMortgaged = Boolean(receiverPlayer?.mortgages?.[p])
                                    return (
                                      <div key={p} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <span>{getPropName(p)}</span>
                                        {isMortgaged && (
                                          <span style={{ fontSize: "9px", color: "var(--crimson)", background: "rgba(200,50,50,0.2)", padding: "1px 4px", borderRadius: "3px" }}>
                                            MORTGAGED
                                          </span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                              {offer.receiverCash === 0 && offer.receiverPropertyIds.length === 0 && "Nothing"}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                          <button
                            onClick={() => onRejectOffer(offer.id)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: "6px",
                              border: "1px solid var(--crimson)",
                              background: "rgba(200, 50, 50, 0.15)",
                              color: "#ff8b8b",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => onAcceptOffer(offer.id)}
                            style={{
                              padding: "6px 18px",
                              borderRadius: "6px",
                              border: "none",
                              background: "linear-gradient(135deg, #10b981, #059669)",
                              color: "#fff",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: 700,
                            }}
                          >
                            Accept Deal
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Outgoing */}
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ color: "var(--gold-300)", fontSize: "13px", textTransform: "uppercase", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>📤</span> Outgoing Trade Offers ({outgoingOffers.length})
                </h4>
                {outgoingOffers.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>No active outgoing offers.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {outgoingOffers.map((offer) => (
                      <div
                        key={offer.id}
                        style={{
                          background: "rgba(0,0,0,0.2)",
                          border: "1px solid var(--border-subtle)",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ fontSize: "12px" }}>
                          <span style={{ color: "var(--text-muted)" }}>Sent to </span>
                          <strong style={{ color: "#fff" }}>{offer.receiverName}</strong>
                          <div style={{ color: "var(--gold-300)", marginTop: "2px" }}>
                            Giving: ₹{offer.senderCash.toLocaleString()} {offer.senderPropertyIds.map(getPropName).join(", ")} | Asking: ₹{offer.receiverCash.toLocaleString()} {offer.receiverPropertyIds.map(getPropName).join(", ")}
                          </div>
                        </div>
                        <button
                          onClick={() => onCancelOffer(offer.id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid var(--border-subtle)",
                            background: "transparent",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: "11px",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Trade History */}
              {pastOffers.length > 0 && (
                <div>
                  <h4 style={{ color: "var(--text-muted)", fontSize: "12px", textTransform: "uppercase", marginBottom: "8px" }}>
                    Recent Trade History
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {pastOffers.map((offer) => (
                      <div
                        key={offer.id}
                        style={{
                          padding: "6px 10px",
                          background: "rgba(0,0,0,0.15)",
                          borderRadius: "6px",
                          fontSize: "11px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: 700, color: "var(--gold-300)" }}>{offer.senderName}</span>
                          <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>⇄</span>
                          <span style={{ fontWeight: 700, color: "#fff" }}>{offer.receiverName}</span>
                        </div>
                        <span
                          style={{
                            fontWeight: 700,
                            color:
                              offer.status === "ACCEPTED"
                                ? "#10b981"
                                : offer.status === "REJECTED"
                                ? "#ef4444"
                                : offer.status === "INVALIDATED"
                                ? "#f59e0b"
                                : "var(--text-muted)",
                          }}
                        >
                          {offer.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
