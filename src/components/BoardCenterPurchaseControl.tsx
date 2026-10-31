import React from "react"
import PropertyLandmarkArtwork from "./PropertyLandmarkArtwork"

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
  if (!pending || !pending.canAfford) return null

  const price = pending.purchasePrice

  return (
    <div
      className="board-center-purchase-card"
      role="region"
      aria-label={`Buy Property decision for ${pending.propertyName}`}
    >
      <div className="purchase-card-header">
        <span className="purchase-card-badge">BUY PROPERTY</span>
        <button
          type="button"
          className="purchase-card-close"
          onClick={onDecline}
          disabled={isSubmitting}
          aria-label="Close"
          title="Close"
        >
          ✕
        </button>
      </div>

      <div
        className="purchase-card-landmark"
        style={{
          maxHeight: "68px",
          overflow: "hidden",
          borderRadius: "6px",
          marginBottom: "6px",
          border: "1px solid rgba(200, 155, 69, 0.4)",
        }}
      >
        <PropertyLandmarkArtwork
          propertyId={pending.propertyId}
          propertyName={pending.propertyName}
          colorGroup={pending.colorGroup}
          showLabel={false}
          style={{ width: "100%", height: "68px" }}
        />
      </div>

      <div className="purchase-compact-row">
        <div className="purchase-info-group">
          <strong className="purchase-name">{pending.propertyName.toUpperCase()}</strong>
          <span className="purchase-price-tag">₹{price.toLocaleString()}</span>
        </div>
        <div className="purchase-action-buttons">
          <button
            type="button"
            className="btn-purchase-buy"
            onClick={onBuy}
            disabled={isSubmitting}
            title={`Buy ${pending.propertyName} for ₹${price.toLocaleString()}`}
          >
            {isSubmitting ? "BUYING..." : `BUY ₹${price.toLocaleString()}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BoardCenterPurchaseControl
