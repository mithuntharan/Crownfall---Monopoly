import React from "react"

export interface MortgageStatusIndicatorProps {
  isMortgaged: boolean
  variant?: "tile" | "badge" | "row" | "banner"
  side?: "bottom" | "top" | "left" | "right"
  ownerName?: string
  className?: string
  style?: React.CSSProperties
}

/**
 * Hand holding a small house symbol representing bank mortgage pledge.
 * Compact white scalable SVG symbol, footprint identical to a house indicator.
 */
export const HandHoldingHouseIcon: React.FC<{
  className?: string
  size?: number
  style?: React.CSSProperties
}> = ({ className = "mortgage-hand-house-icon", size = 14, style }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    width={size}
    height={size}
    style={{
      color: "#ffffff",
      filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.85)) drop-shadow(0 0 1px rgba(0, 0, 0, 0.95))",
      display: "inline-block",
      verticalAlign: "middle",
      flexShrink: 0,
      ...style,
    }}
    aria-hidden="true"
  >
    {/* House with pitched roof sitting nestled above/in the palm */}
    <path d="M12 2.5 L6 7.8 V13.5 H18 V7.8 Z" />
    <path d="M10 13.5 V9.5 H14 V13.5 Z" fill="rgba(0,0,0,0.3)" />
    {/* Stylized hand/palm holding and presenting the house from below */}
    <path d="M2.2 15.5 C3.3 14.3 5 14.1 6.5 14.8 L9 16 C9.6 16.3 10.3 16.5 11 16.5 H16.5 C18.2 16.5 19.5 15.5 20.2 14.2 C20.7 13.3 21.8 13.2 22.3 14 C22.8 14.8 22.5 15.9 21.8 16.8 C20.5 18.5 18.8 19.5 16.5 19.5 H11.5 C10.4 19.5 9.4 19.1 8.5 18.5 L6.2 17 C5.5 16.5 4.5 16.6 3.8 17.2 L2.5 18.5 C1.8 19.2 0.7 18.8 0.5 17.8 C0.3 16.8 1 16.2 2.2 15.5 Z" />
  </svg>
)

const ActiveCheckIcon: React.FC<{ className?: string }> = ({ className = "mortgage-symbol-icon" }) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    className={className}
    aria-hidden="true"
    width="12"
    height="12"
  >
    <path d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.854-8.646a.5.5 0 0 0-.708-.708L7.5 9.293 5.354 7.146a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l3.5-3.5Z" />
  </svg>
)

/**
 * Polished, compact Mortgage Status Indicator.
 *
 * Board tile variant: compact white hand-and-house symbol in building-indicator position.
 * Mutually exclusive with ordinary house/hotel indicators on the property.
 */
export const MortgageStatusIndicator: React.FC<MortgageStatusIndicatorProps> = ({
  isMortgaged,
  variant = "badge",
  side = "bottom",
  ownerName,
  className = "",
  style,
}) => {
  if (!isMortgaged && variant !== "row") {
    return null
  }

  // Board tile variant: white hand-and-house symbol occupying the building indicator slot
  if (variant === "tile") {
    return (
      <span
        className={`crownfall-mortgage-indicator tile-variant crownfall-mortgage-indicator--tile side-${side} ${className}`}
        title={ownerName ? `Mortgaged by ${ownerName} (No Rent Due)` : "Mortgaged (No Rent Due)"}
        aria-label={ownerName ? `Mortgaged by ${ownerName}` : "Mortgaged"}
        style={style}
      >
        <HandHoldingHouseIcon size={14} />
      </span>
    )
  }

  // Row variant for tables and lists
  if (variant === "row") {
    return (
      <span
        className={`crownfall-mortgage-indicator row-variant crownfall-mortgage-indicator--row ${isMortgaged ? "is-mortgaged" : "is-active"} ${className}`}
        style={style}
      >
        {isMortgaged ? (
          <HandHoldingHouseIcon size={12} />
        ) : (
          <ActiveCheckIcon className="mortgage-symbol-icon" />
        )}
        <span>{isMortgaged ? "MORTGAGED" : "ACTIVE"}</span>
      </span>
    )
  }

  // Full banner variant for card headers / detail sheets
  if (variant === "banner") {
    return (
      <div
        className={`crownfall-mortgage-indicator banner-variant crownfall-mortgage-indicator--banner ${className}`}
        style={style}
        role="status"
      >
        <div className="banner-content" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <HandHoldingHouseIcon size={14} />
          <span className="banner-title">PROPERTY MORTGAGED</span>
          <span className="banner-subtitle" style={{ opacity: 0.85, fontSize: "10px" }}>· NO RENT DUE</span>
        </div>
      </div>
    )
  }

  // Default badge variant (e.g. inside property card status area)
  return (
    <span
      className={`crownfall-mortgage-indicator badge-variant crownfall-mortgage-indicator--badge ${className}`}
      title={ownerName ? `Mortgaged by ${ownerName}` : "Mortgaged"}
      style={style}
    >
      <HandHoldingHouseIcon size={12} />
      <span className="badge-text">MORTGAGED</span>
    </span>
  )
}

export default MortgageStatusIndicator
