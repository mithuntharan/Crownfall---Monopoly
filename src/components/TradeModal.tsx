import { useState, useMemo, useEffect, useRef } from "react"
import type { EnginePlayer, TradeOffer } from "../engine/GameEngineInterface"
import { CITY_PROPERTIES, SPECIAL_PROPERTIES } from "../data/businessData"
import { ROYAL_COLOR_THEMES } from "../theme/colors"
import { getPlayerColorHex } from "../utils/boardCoordinates"
import MortgageStatusIndicator from "./MortgageStatusIndicator"

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
  isEmbedded?: boolean
  initialSubTab?: "create" | "offers"
  highlightTradeId?: string | null
}


interface TradeAmountSliderProps {
  label: string
  amount: number
  max: number
  disabled?: boolean
  disabledReason?: string
  onChange: (val: number) => void
}

function TradeAmountSlider({
  label,
  amount,
  max,
  disabled = false,
  disabledReason,
  onChange,
}: TradeAmountSliderProps) {
  const [textVal, setTextVal] = useState<string>(String(amount))

  useEffect(() => {
    setTextVal(String(amount))
  }, [amount])

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "")
    setTextVal(raw)
    const num = Number(raw) || 0
    const clamped = Math.max(0, Math.min(max, num))
    onChange(clamped)
  }

  const handleBlur = () => {
    const num = Number(textVal) || 0
    const clamped = Math.max(0, Math.min(max, num))
    setTextVal(String(clamped))
    onChange(clamped)
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const num = Number(e.target.value) || 0
    const clamped = Math.max(0, Math.min(max, num))
    setTextVal(String(clamped))
    onChange(clamped)
  }

  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted, #94a3af)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {label}
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--gold-bright, #ffd57e)" }}>₹</span>
          <input
            type="text"
            value={textVal}
            disabled={disabled || max <= 0}
            onChange={handleTextChange}
            onBlur={handleBlur}
            style={{
              width: "90px",
              height: "28px",
              textAlign: "right",
              background: disabled || max <= 0 ? "rgba(255,255,255,0.05)" : "var(--input-bg, #ffffff)",
              border: "1.5px solid var(--gold, #d97706)",
              borderRadius: "6px",
              padding: "0 6px",
              color: disabled || max <= 0 ? "var(--text-muted)" : "var(--input-color, #0f172a)",
              fontWeight: 800,
              fontSize: "13px",
            }}
          />
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={Math.max(0, max)}
        step={100}
        value={Math.min(amount, max)}
        disabled={disabled || max <= 0}
        onChange={handleSliderChange}
        style={{
          width: "100%",
          accentColor: "var(--gold-bright, #ffd57e)",
          cursor: disabled || max <= 0 ? "not-allowed" : "pointer",
          height: "6px",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>
        <span>₹0</span>
        <span>Max: ₹{Math.max(0, max).toLocaleString()}</span>
      </div>
      {disabledReason && (
        <div style={{ fontSize: "10px", color: "#fca5a5", marginTop: "4px" }}>
          {disabledReason}
        </div>
      )}
    </div>
  )
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
  isEmbedded = false,
  initialSubTab,
  highlightTradeId,
}: TradeModalProps) {
  const localPlayer = players.find((p) => p.id === localPlayerId) || players[0]
  const otherPlayers = players.filter((p) => p.id !== localPlayer.id && !p.isBankrupt)

  const [activeTab, setActiveTab] = useState<"create" | "offers">(initialSubTab || (highlightTradeId ? "offers" : "create"))

  useEffect(() => {
    if (initialSubTab) setActiveTab(initialSubTab)
    else if (highlightTradeId) setActiveTab("offers")
  }, [initialSubTab, highlightTradeId])

  const highlightedCardRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (activeTab === "offers" && highlightTradeId && highlightedCardRef.current) {
      highlightedCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
    }
  }, [activeTab, highlightTradeId])
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
  const [acceptingTradeId, setAcceptingTradeId] = useState<string | null>(null)
  const [acceptedTradeId, setAcceptedTradeId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleAcceptOffer = async (tradeId: string) => {
    if (acceptingTradeId) return
    setAcceptingTradeId(tradeId)
    setErrorMsg(null)
    try {
      const success = await onAcceptOffer(tradeId)
      if (success) {
        setAcceptedTradeId(tradeId)
        await new Promise((resolve) => setTimeout(resolve, 520))
      } else {
        setErrorMsg("Failed to complete trade acceptance.")
      }
    } finally {
      setAcceptingTradeId(null)
      setAcceptedTradeId(null)
    }
  }

  // Properties eligible for trade (must have 0 houses/hotels)
  const [now, setNow] = useState<number>(Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const isOfferExpired = (offer: TradeOffer) => {
    if (offer.status === "EXPIRED") return true
    const expiresAt = offer.expiresAt || (offer.createdAt ? offer.createdAt + 60000 : (offer.timestamp ? offer.timestamp + 60000 : 0))
    return expiresAt > 0 && now >= expiresAt
  }

  const getRemainingSeconds = (offer: TradeOffer) => {
    const expiresAt = offer.expiresAt || (offer.createdAt ? offer.createdAt + 60000 : (offer.timestamp ? offer.timestamp + 60000 : 0))
    if (!expiresAt) return 0
    return Math.max(0, Math.ceil((expiresAt - now) / 1000))
  }

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
      (t) => t.receiverId === localPlayer.id && t.status === "PENDING" && !isOfferExpired(t),
    )
  }, [tradeOffers, localPlayer.id, now])

  const outgoingOffers = useMemo(() => {
    return tradeOffers.filter(
      (t) => t.senderId === localPlayer.id && t.status === "PENDING" && !isOfferExpired(t),
    )
  }, [tradeOffers, localPlayer.id, now])

  const pastOffers = useMemo(() => {
    return tradeOffers
      .filter(
        (t) =>
          (t.senderId === localPlayer.id || t.receiverId === localPlayer.id) &&
          (t.status !== "PENDING" || isOfferExpired(t)),
      )
      .slice(-10)
      .reverse()
  }, [tradeOffers, localPlayer.id, now])

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
    if (offeredCash > 0 && offeredCash > localPlayer.money) {
      setErrorMsg("You cannot offer more cash than you have.")
      return
    }
    if (partner && requestedCash > 0 && requestedCash > partner.money) {
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

  const tradeBody = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Tab switch */}
      <div style={{ display: "flex", gap: "8px", padding: "8px 16px", background: "var(--glass-light, rgba(0,0,0,0.2))", borderBottom: "1px solid var(--border-subtle)" }}>
        <button
          className={`tab-btn ${activeTab === "create" ? "active" : ""}`}
          onClick={() => setActiveTab("create")}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "6px",
              border: activeTab === "create" ? "1.5px solid var(--gold-bright, #ffd57e)" : "1px solid var(--glass-border, rgba(255,255,255,0.08))",
              background: activeTab === "create" ? "rgba(129, 152, 176, 0.22)" : "rgba(255, 255, 255, 0.04)",
              color: activeTab === "create" ? "var(--gold-bright, #ffd57e)" : "var(--text-secondary, #cbd5e1)",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
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
              border: activeTab === "offers" ? "1.5px solid var(--gold-bright, #ffd57e)" : "1px solid var(--glass-border, rgba(255,255,255,0.08))",
              background: activeTab === "offers" ? "rgba(129, 152, 176, 0.22)" : "rgba(255, 255, 255, 0.04)",
              color: activeTab === "offers" ? "var(--gold-bright, #ffd57e)" : "var(--text-secondary, #cbd5e1)",
              fontWeight: 700,
              cursor: "pointer",
              position: "relative",
              transition: "all 0.15s ease",
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
                          border: selectedPartnerId === p.id ? `2px solid ${getPlayerColorHex(p.color)}` : "1px solid var(--border-subtle)",
                          background: selectedPartnerId === p.id ? "rgba(129, 152, 176, 0.2)" : "rgba(255, 255, 255, 0.04)",
                          color: "var(--text-primary, #f3f4f6)",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "13px",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: getPlayerColorHex(p.color) }} />
                        <strong>{p.name}</strong>
                        <span style={{ color: p.money < 0 ? "var(--financial-loss, #f87171)" : "var(--gold-bright, #ffd57e)", fontSize: "11px" }}>
                          ₹{p.money.toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {partner && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "14px", marginBottom: "16px" }}>
                  {/* YOU OFFER (LEFT) */}
                  <div style={{ background: "var(--bg-surface, rgba(20, 24, 32, 0.90))", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                    <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px", marginBottom: "10px" }}>
                      <strong style={{ color: "var(--gold-bright, #ffd57e)", fontSize: "13px" }}>YOU GIVE ({localPlayer.name})</strong>
                      <div style={{ fontSize: "11px", color: localPlayer.money < 0 ? "#fca5a5" : "var(--text-muted)" }}>
                        Cash: {localPlayer.money < 0 ? `-₹${Math.abs(localPlayer.money).toLocaleString()} (In Debt)` : `₹${localPlayer.money.toLocaleString()}`}
                      </div>
                    </div>

                    <TradeAmountSlider
                      label="Offer Cash"
                      amount={offeredCash}
                      max={Math.max(0, localPlayer.money)}
                      disabled={localPlayer.money <= 0}
                      disabledReason={localPlayer.money < 0 ? `Account balance is negative (₹${localPlayer.money.toLocaleString()}). Cash offers disabled; you may offer properties or request cash.` : undefined}
                      onChange={setOfferedCash}
                    />

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
                                  padding: "7px 10px",
                                  borderRadius: "6px",
                                  border: isSelected ? "1.5px solid var(--gold-bright, #ffd57e)" : "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                                  background: isSelected ? "rgba(129, 152, 176, 0.25)" : "rgba(255, 255, 255, 0.04)",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: isSelected ? "var(--gold-bright, #ffd57e)" : "var(--text-primary, #f3f4f6)" }}>
                                  <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: color }} />
                                  {getPropName(propId)}
                                </span>
                                {localPlayer.mortgages[propId] && (
                                  <MortgageStatusIndicator isMortgaged={true} variant="badge" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* YOU RECEIVE (RIGHT) */}
                  <div style={{ background: "var(--bg-surface, rgba(20, 24, 32, 0.90))", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                    <div style={{ borderBottom: "1px solid var(--border-subtle)", paddingBottom: "6px", marginBottom: "10px" }}>
                      <strong style={{ color: "var(--gold-bright, #ffd57e)", fontSize: "13px" }}>YOU RECEIVE ({partner.name})</strong>
                      <div style={{ fontSize: "11px", color: partner.money < 0 ? "#fca5a5" : "var(--text-muted)" }}>
                        Cash: {partner.money < 0 ? `-₹${Math.abs(partner.money).toLocaleString()} (In Debt)` : `₹${partner.money.toLocaleString()}`}
                      </div>
                    </div>

                    <TradeAmountSlider
                      label="Request Cash"
                      amount={requestedCash}
                      max={Math.max(0, partner.money)}
                      disabled={partner.money <= 0}
                      disabledReason={partner.money < 0 ? `${partner.name} has a negative balance (₹${partner.money.toLocaleString()}) and cannot provide cash. You may send money to assist them.` : undefined}
                      onChange={setRequestedCash}
                    />

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
                                  padding: "7px 10px",
                                  borderRadius: "6px",
                                  border: isSelected ? "1.5px solid var(--gold-bright, #ffd57e)" : "1px solid var(--glass-border, rgba(255,255,255,0.08))",
                                  background: isSelected ? "rgba(129, 152, 176, 0.25)" : "rgba(255, 255, 255, 0.04)",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: isSelected ? "var(--gold-bright, #ffd57e)" : "var(--text-primary, #f3f4f6)" }}>
                                  <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: color }} />
                                  {getPropName(propId)}
                                </span>
                                {partner.mortgages[propId] && (
                                  <MortgageStatusIndicator isMortgaged={true} variant="badge" />
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
                  {errorMsg}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  onClick={close}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.04)",
                    border: "1px solid var(--border-subtle)",
                    color: "var(--text-secondary, #cbd5e1)",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: 600,
                    transition: "all 0.15s ease",
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
                    background: isSubmitting || !partner
                      ? "rgba(255, 255, 255, 0.05)"
                      : "linear-gradient(135deg, #526B85 0%, #455A70 100%)",
                    border: isSubmitting || !partner
                      ? "1px solid rgba(255, 255, 255, 0.08)"
                      : "1px solid rgba(82, 107, 133, 0.65)",
                    color: isSubmitting || !partner ? "var(--text-muted, #94a3af)" : "#ffffff",
                    fontWeight: 700,
                    cursor: isSubmitting || !partner ? "not-allowed" : "pointer",
                    fontSize: "13px",
                    boxShadow: isSubmitting || !partner ? "none" : "0 2px 10px rgba(82, 107, 133, 0.3)",
                    transition: "all 0.15s ease",
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
                  Incoming Trade Offers ({incomingOffers.length})
                </h4>
                {incomingOffers.length === 0 ? (
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", fontStyle: "italic" }}>No pending incoming trade offers.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {incomingOffers.map((offer) => {
                      const isHighlighted = highlightTradeId === offer.id
                      const isAccepted = acceptedTradeId === offer.id
                      return (
                      <div
                        key={offer.id}
                        ref={isHighlighted ? highlightedCardRef : undefined}
                        className={`trade-offer-card ${isAccepted ? "is-accepted" : ""}`}
                        style={{
                          background: isHighlighted ? "rgba(217, 119, 6, 0.12)" : "rgba(0,0,0,0.3)",
                          border: isHighlighted ? "2px solid var(--gold-bright, #ffd57e)" : "1px solid var(--gold-400)",
                          borderRadius: "8px",
                          padding: "12px",
                          boxShadow: isHighlighted ? "0 0 16px rgba(245, 158, 11, 0.4)" : "none",
                          transition: "all 0.3s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span style={{ fontWeight: 700, color: "var(--text-primary, #f8fafc)", fontSize: "13px" }}>
                            From: <span style={{ color: "var(--gold-300)" }}>{offer.senderName}</span>
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "10px",
                                background: getRemainingSeconds(offer) <= 10 ? "rgba(239, 68, 68, 0.2)" : "rgba(200, 155, 69, 0.2)",
                                color: getRemainingSeconds(offer) <= 10 ? "#fca5a5" : "var(--gold-300)",
                                border: getRemainingSeconds(offer) <= 10 ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(200, 155, 69, 0.3)",
                              }}
                            >
                              ⏱ {getRemainingSeconds(offer)}s
                            </span>
                            <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                              {new Date(offer.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
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
                                      <div key={p} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span>{getPropName(p)}</span>
                                        {isMortgaged && (
                                          <MortgageStatusIndicator isMortgaged={true} variant="badge" />
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
                                      <div key={p} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <span>{getPropName(p)}</span>
                                        {isMortgaged && (
                                          <MortgageStatusIndicator isMortgaged={true} variant="badge" />
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
                              border: "1px solid rgba(239, 68, 68, 0.5)",
                              background: "rgba(239, 68, 68, 0.18)",
                              color: "#fca5a5",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontWeight: 600,
                              transition: "all 0.15s ease",
                            }}
                          >
                            Reject
                          </button>
                          {offer.receiverCash > 0 && offer.receiverCash > localPlayer.money && (
                            <span style={{ fontSize: "11px", color: "#fca5a5", alignSelf: "center", fontWeight: 600 }}>
                              Need ₹{(offer.receiverCash - localPlayer.money).toLocaleString()} more
                            </span>
                          )}
                          <button
                            onClick={() => handleAcceptOffer(offer.id)}
                            disabled={acceptingTradeId === offer.id || (offer.receiverCash > 0 && offer.receiverCash > localPlayer.money)}
                            title={offer.receiverCash > 0 && offer.receiverCash > localPlayer.money ? `Cannot afford: requires ₹${offer.receiverCash.toLocaleString()} but have ₹${localPlayer.money.toLocaleString()}` : "Accept trade deal"}
                            style={{
                              padding: "6px 18px",
                              borderRadius: "6px",
                              border: offer.receiverCash > 0 && offer.receiverCash > localPlayer.money ? "1px solid rgba(239, 68, 68, 0.6)" : "none",
                              background: offer.receiverCash > 0 && offer.receiverCash > localPlayer.money ? "rgba(239, 68, 68, 0.2)" : "linear-gradient(135deg, #10b981, #059669)",
                              color: offer.receiverCash > 0 && offer.receiverCash > localPlayer.money ? "#fca5a5" : "#fff",
                              cursor: acceptingTradeId === offer.id || (offer.receiverCash > 0 && offer.receiverCash > localPlayer.money) ? "not-allowed" : "pointer",
                              fontSize: "12px",
                              fontWeight: 700,
                            }}
                          >
                            {acceptingTradeId === offer.id ? "Accepting..." : offer.receiverCash > 0 && offer.receiverCash > localPlayer.money ? "Cannot Afford" : "Accept Deal"}
                          </button>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Active Outgoing */}
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ color: "var(--gold-300)", fontSize: "13px", textTransform: "uppercase", marginBottom: "10px", display: "flex", alignItems: "center", gap: "6px" }}>
                  Outgoing Trade Offers ({outgoingOffers.length})
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
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ color: "var(--text-muted)" }}>Sent to </span>
                            <strong style={{ color: "var(--text-primary, #f8fafc)" }}>{offer.receiverName}</strong>
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: "8px",
                                background: getRemainingSeconds(offer) <= 10 ? "rgba(239, 68, 68, 0.2)" : "rgba(200, 155, 69, 0.2)",
                                color: getRemainingSeconds(offer) <= 10 ? "#fca5a5" : "var(--gold-300)",
                                border: getRemainingSeconds(offer) <= 10 ? "1px solid rgba(239, 68, 68, 0.4)" : "1px solid rgba(200, 155, 69, 0.3)",
                              }}
                            >
                              ⏱ {getRemainingSeconds(offer)}s
                            </span>
                          </div>
                          <div style={{ color: "var(--gold-300)", marginTop: "2px" }}>
                            Giving: ₹{offer.senderCash.toLocaleString()} {offer.senderPropertyIds.map(getPropName).join(", ")} | Asking: ₹{offer.receiverCash.toLocaleString()} {offer.receiverPropertyIds.map(getPropName).join(", ")}
                          </div>
                        </div>
                        <button
                          onClick={() => onCancelOffer(offer.id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "1px solid rgba(239, 68, 68, 0.4)",
                            background: "rgba(239, 68, 68, 0.12)",
                            color: "#fca5a5",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: 600,
                            transition: "all 0.15s ease",
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
                          <span style={{ fontSize: "10px", color: "var(--text-muted, #94a3af)" }}>⇄</span>
                          <span style={{ fontWeight: 700, color: "var(--text-primary, #f8fafc)" }}>{offer.receiverName}</span>
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
                                : offer.status === "EXPIRED" || isOfferExpired(offer)
                                ? "#94a3b8"
                                : "var(--text-muted)",
                          }}
                        >
                          {offer.status === "PENDING" && isOfferExpired(offer) ? "EXPIRED" : offer.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
    </div>
  )

  if (isEmbedded) {
    return tradeBody
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
            PROPERTY TRADING &amp; NEGOTIATION
          </strong>
          <button onClick={close} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {tradeBody}
      </section>
    </div>
  )
}

