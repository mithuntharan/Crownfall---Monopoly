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
 * Polished, compact, accessible Mortgage Status Indicator.
 *
 * Designed to fit seamlessly across:
 * 1. Board tiles on all four edges without overlapping property names, prices, or building markers.
 * 2. Property detail cards (PropertyVisual) without replacing or obscuring the owner badge.
 * 3. Modal rows (TradeModal, MortgageManagerModal, TransactionLedgerModal).
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

  // Board tile variant: ultra-compact, high-contrast micro-pill
  if (variant === "tile") {
    return (
      <span
        className={`crownfall-mortgage-indicator tile-variant side-${side} ${className}`}
        title={ownerName ? `Mortgaged by ${ownerName}` : "Mortgaged (No Rent Due)"}
        aria-label={ownerName ? `Mortgaged by ${ownerName}` : "Mortgaged"}
        style={style}
      >
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          className="mortgage-lock-icon"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z"
            clipRule="evenodd"
          />
        </svg>
        <span className="mortgage-text">MORTGAGED</span>
      </span>
    )
  }

  // Row variant for tables and lists
  if (variant === "row") {
    return (
      <span
        className={`crownfall-mortgage-indicator row-variant ${isMortgaged ? "is-mortgaged" : "is-active"} ${className}`}
        style={style}
      >
        <svg
          viewBox="0 0 16 16"
          fill="currentColor"
          className="mortgage-lock-icon"
          aria-hidden="true"
        >
          {isMortgaged ? (
            <path
              fillRule="evenodd"
              d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z"
              clipRule="evenodd"
            />
          ) : (
            <path d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.854-8.646a.5.5 0 0 0-.708-.708L7.5 9.293 5.354 7.146a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l3.5-3.5Z" />
          )}
        </svg>
        <span>{isMortgaged ? "MORTGAGED" : "ACTIVE"}</span>
      </span>
    )
  }

  // Full banner variant for card headers
  if (variant === "banner") {
    return (
      <div
        className={`crownfall-mortgage-indicator banner-variant ${className}`}
        style={style}
        role="status"
      >
        <div className="banner-content">
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            className="mortgage-lock-icon"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z"
              clipRule="evenodd"
            />
          </svg>
          <span className="banner-title">PROPERTY MORTGAGED</span>
          <span className="banner-subtitle">NO RENT COLLECTED</span>
        </div>
      </div>
    )
  }

  // Default badge variant (e.g. inside property card header or price row)
  return (
    <span
      className={`crownfall-mortgage-indicator badge-variant ${className}`}
      title={ownerName ? `Mortgaged by ${ownerName}` : "Mortgaged"}
      style={style}
    >
      <svg
        viewBox="0 0 16 16"
        fill="currentColor"
        className="mortgage-lock-icon"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5V4.5a2 2 0 1 0-4 0V6h4Z"
          clipRule="evenodd"
        />
      </svg>
      <span className="badge-text">MORTGAGED</span>
    </span>
  )
}

export default MortgageStatusIndicator
