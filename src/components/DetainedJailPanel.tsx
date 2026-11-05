import React from "react"
import type { EnginePlayer } from "../engine/GameEngineInterface"

export interface DetainedJailPanelProps {
  player: EnginePlayer
  canPayFine: boolean
  isPayingFine: boolean
  onPayFine: () => void
  onAttemptRollOrSkip: () => void
  isCardSkip: boolean
  isBusy: boolean
}

export const DetainedJailPanel: React.FC<DetainedJailPanelProps> = ({
  player,
  canPayFine,
  isPayingFine,
  onPayFine,
  onAttemptRollOrSkip,
  isCardSkip,
  isBusy,
}) => {
  const currentAttempts = (player.jailTurns ?? 0)
  const remainingAttempts = Math.max(0, 2 - currentAttempts)
  const playerCash = player.money ?? 0
  const canAfford = playerCash >= 500

  return (
    <div
      className="detained-jail-panel"
      role="dialog"
      aria-labelledby="detention-heading"
      style={{
        background: "linear-gradient(135deg, rgba(32, 28, 22, 0.96) 0%, rgba(20, 18, 14, 0.98) 100%)",
        border: "1.5px solid rgba(197, 168, 105, 0.55)",
        borderRadius: "14px",
        padding: "16px 18px",
        margin: "10px 0",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative Gold Accent Bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: "linear-gradient(90deg, transparent, #c5a869 30%, #e2d1a8 50%, #c5a869 70%, transparent)",
        }}
      />

      {/* Header & Status */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(197, 168, 105, 0.2)",
          paddingBottom: "10px",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              fontSize: "20px",
              lineHeight: 1,
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
            }}
            aria-hidden="true"
          >
            ⚖️
          </span>
          <div>
            <h3
              id="detention-heading"
              style={{
                fontFamily: '"Oswald", sans-serif',
                fontSize: "14px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#e2d1a8",
                margin: 0,
                textTransform: "uppercase",
              }}
            >
              Imperial Detention Quarters
            </h3>
            <div style={{ fontSize: "11px", color: "rgba(240, 237, 230, 0.7)", marginTop: "2px" }}>
              {isCardSkip
                ? "Mandatory detention order from drawn card."
                : `Attempt ${currentAttempts + 1} of 2 • ${remainingAttempts} escape attempt${remainingAttempts === 1 ? "" : "s"} remaining.`}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              padding: "3px 8px",
              borderRadius: "20px",
              background: "rgba(180, 83, 9, 0.25)",
              border: "1px solid rgba(217, 119, 6, 0.4)",
              color: "#fbbf24",
              textTransform: "uppercase",
            }}
          >
            Detained
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: canAfford ? "#86efac" : "#fca5a5",
              background: "rgba(0, 0, 0, 0.4)",
              padding: "3px 8px",
              borderRadius: "6px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            Cash: ₹{playerCash.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Choice Explanation */}
      <div
        style={{
          fontSize: "11px",
          color: "rgba(240, 237, 230, 0.8)",
          lineHeight: 1.45,
          background: "rgba(0, 0, 0, 0.25)",
          padding: "8px 10px",
          borderRadius: "6px",
          border: "1px solid rgba(255, 255, 255, 0.05)",
        }}
      >
        Choose an action to resolve your detention:
        <ul style={{ margin: "4px 0 0 16px", padding: 0 }}>
          <li>
            <strong style={{ color: "#e2d1a8" }}>Pay ₹500 Release Fine:</strong> Leave Jail immediately and roll dice during this scheduled turn.
          </li>
          <li>
            <strong style={{ color: "rgba(240, 237, 230, 0.9)" }}>
              {isCardSkip ? "Serve Detention:" : "Roll Dice Instead:"}
            </strong>{" "}
            {isCardSkip
              ? "Skip your scheduled turn without paying the release fine."
              : "Roll dice to attempt an escape on doubles freely. Failing to roll doubles consumes this turn."}
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "2px" }}>
        {/* Primary Option: Pay ₹500 */}
        <button
          type="button"
          onClick={onPayFine}
          disabled={!canPayFine || isBusy || isPayingFine}
          className="btn-jail-pay-gold"
          style={{
            width: "100%",
            minHeight: "44px",
            padding: "10px 16px",
            background: canAfford && !isPayingFine
              ? "linear-gradient(135deg, #c5a869 0%, #b3924f 100%)"
              : "rgba(255, 255, 255, 0.08)",
            border: canAfford && !isPayingFine
              ? "1px solid rgba(212, 175, 55, 0.65)"
              : "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "8px",
            color: canAfford && !isPayingFine ? "#14110b" : "rgba(255, 255, 255, 0.4)",
            fontFamily: '"Oswald", sans-serif',
            fontSize: "13px",
            fontWeight: 800,
            letterSpacing: "0.06em",
            cursor: canPayFine && !isBusy && !isPayingFine ? "pointer" : "not-allowed",
            boxShadow: canAfford && !isPayingFine
              ? "0 3px 12px rgba(180, 140, 60, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.35)"
              : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 140ms ease-out",
          }}
          title={
            !canAfford
              ? "Insufficient cash (need ₹500 to pay release fine)"
              : "Pay ₹500 fine to immediately exit Jail and roll on this turn"
          }
        >
          {isPayingFine ? (
            <>
              <span
                style={{
                  display: "inline-block",
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  border: "2px solid rgba(20, 17, 11, 0.3)",
                  borderTopColor: "#14110b",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              PROCESSING RELEASE (₹500)...
            </>
          ) : !canAfford ? (
            "INSUFFICIENT FUNDS (₹500 REQUIRED)"
          ) : (
            "PAY ₹500 TO LEAVE JAIL"
          )}
        </button>

        {/* Secondary Option: Roll Doubles or Skip */}
        <button
          type="button"
          onClick={onAttemptRollOrSkip}
          disabled={isBusy || isPayingFine}
          className="btn-jail-roll-gold"
          style={{
            width: "100%",
            minHeight: "40px",
            padding: "8px 14px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1.5px solid rgba(197, 168, 105, 0.4)",
            borderRadius: "8px",
            color: "#f0ede6",
            fontFamily: '"Oswald", sans-serif',
            fontSize: "12.5px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            cursor: isBusy || isPayingFine ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "all 140ms ease-out",
          }}
        >
          {isCardSkip ? "SERVE SENTENCE (SKIP TURN)" : "🎲 ROLL DICE INSTEAD (TRY FOR DOUBLES)"}
        </button>
      </div>
    </div>
  )
}

export default DetainedJailPanel

