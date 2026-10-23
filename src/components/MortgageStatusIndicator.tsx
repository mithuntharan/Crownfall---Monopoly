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
 * Classical architectural portico symbol representing bank mortgage pledge.
 * Highly legible at small sizes without visual heaviness or dark overlays.
 */
const MortgagePorticoIcon: React.FC<{ className?: string }> = ({ className = "mortgage-symbol-icon" }) => (
  <svg
    viewBox="0 0 16 16"
    fill="currentColor"
    className={className}
    aria-hidden="true"
    width="12"
    height="12"
  >
    <path d="M8 1.5 L1.5 5.5 H14.5 Z" />
    <rect x="1.5" y="6" width="13" height="1.2" rx="0.3" />
    <rect x="2.5" y="7.8" width="1.8" height="5" rx="0.3" />
    <rect x="5.8" y="7.8" width="1.8" height="5" rx="0.3" />
    <rect x="8.4" y="7.8" width="1.8" height="5" rx="0.3" />
    <rect x="11.7" y="7.8" width="1.8" height="5" rx="0.3" />
    <rect x="1" y="13.2" width="14" height="1.6" rx="0.4" />
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
 * Designed to fit seamlessly across:
 * 1. Board tiles without overlapping property names, prices, or building markers.
 * 2. Property detail cards (PropertyVisual) in the dedicated status badges area without obscuring details.
 * 3. Modal lists and rows (TradeModal, MortgageManagerModal, TransactionLedgerModal).
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

  // Board tile variant: ultra-compact, ivory/burgundy micro-badge
  if (variant === "tile") {
    return (
      <span
        className={`crownfall-mortgage-indicator tile-variant crownfall-mortgage-indicator--tile side-${side} ${className}`}
        title={ownerName ? `Mortgaged by ${ownerName} (No Rent Due)` : "Mortgaged (No Rent Due)"}
        aria-label={ownerName ? `Mortgaged by ${ownerName}` : "Mortgaged"}
        style={style}
      >
        <MortgagePorticoIcon className="mortgage-symbol-icon" />
        <span className="mortgage-text">MORTGAGED</span>
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
          <MortgagePorticoIcon className="mortgage-symbol-icon" />
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
          <MortgagePorticoIcon className="mortgage-symbol-icon" />
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
      <MortgagePorticoIcon className="mortgage-symbol-icon" />
      <span className="badge-text">MORTGAGED</span>
    </span>
  )
}

export default MortgageStatusIndicator
