import React from "react"

export interface PendingPurchaseInfo {
  propertyId: string
  propertyName: string
  purchasePrice: number
  colorGroup?: string
  buyerId: number
  buyerName: string
  buyerMoney: number
  canAfford: boolean
}

export interface BoardCenterPurchaseControlProps {
  pending: PendingPurchaseInfo | null
  onBuy: () => void
  onDecline: () => void
  isSubmitting?: boolean
}

export const BoardCenterPurchaseControl: React.FC<BoardCenterPurchaseControlProps> = ({
  pending,
  onBuy,
  onDecline,
  isSubmitting = false,
}) => {
  if (!pending) return null

  const price = pending.purchasePrice
  const buyerCash = pending.buyerMoney
  const canAfford = buyerCash >= price
  const shortfall = Math.max(0, price - buyerCash)

  return (
    <div
      className="board-center-purchase-card"
      role="region"
      aria-label={`Purchase decision for ${pending.propertyName}`}
    >
      <div className="purchase-compact-row">
        <div className="purchase-info-group">
          <strong className="purchase-name">{pending.propertyName.toUpperCase()}</strong>
          <span className="purchase-price-tag">₹{price.toLocaleString()}</span>
          {!canAfford && (
            <span className="purchase-funds-warning">
              ⚠️ Shortfall: ₹{shortfall.toLocaleString()} (Have ₹{buyerCash.toLocaleString()})
            </span>
          )}
        </div>
        <div className="purchase-action-buttons">
          <button
            type="button"
            className="btn-purchase-buy"
            onClick={onBuy}
            disabled={!canAfford || isSubmitting}
            title={!canAfford ? `Insufficient funds: need ₹${shortfall.toLocaleString()} more` : `Buy ${pending.propertyName} for ₹${price.toLocaleString()}`}
          >
            {isSubmitting ? "..." : !canAfford ? "CANNOT AFFORD" : `BUY ₹${price.toLocaleString()}`}
          </button>
          <button
            type="button"
            className="btn-purchase-decline"
            onClick={onDecline}
            disabled={isSubmitting}
            title="Decline property purchase"
          >
            DON'T BUY
          </button>
        </div>
      </div>
    </div>
  )
}

export default BoardCenterPurchaseControl

