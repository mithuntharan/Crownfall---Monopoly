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
  turnState?: string
}

export const DetainedJailPanel: React.FC<DetainedJailPanelProps> = ({
  player,
  canPayFine,
  isPayingFine,
  onPayFine,
  onAttemptRollOrSkip,
  isCardSkip,
  isBusy,
  turnState,
}) => {
  const currentAttempt = (player.jailTurns ?? 0) + 1
  const playerCash = player.money ?? 0
  const canAfford = playerCash >= 500
  const canRoll = (turnState === undefined || turnState === "WAITING_FOR_ROLL") && !isBusy

  return (
    <div className="detained-jail-action-dock">
      <button
        type="button"
        className="btn btn-jail-pay-gold adaptive-action-btn"
        onClick={onPayFine}
        disabled={!canPayFine || isBusy || isPayingFine}
        title={
          !canAfford
            ? "Insufficient cash: need ₹500 to pay release fine"
            : "Pay ₹500 fine to leave Jail immediately and roll on this turn"
        }
      >
        <span className="btn-jail-icon" aria-hidden="true">₹</span>
        <span>{isPayingFine ? "PAYING ₹500..." : "PAY ₹500 TO LEAVE JAIL"}</span>
      </button>

      <button
        type="button"
        className="btn roll-button btn-jail-roll-gold adaptive-action-btn"
        onClick={onAttemptRollOrSkip}
        disabled={!canRoll}
        title="Attempt to roll doubles to leave Jail without paying"
      >
        <span>ROLL FOR DOUBLES</span>
      </button>

      <span className="detained-jail-status-pill">
        In Jail • Attempt {Math.min(currentAttempt, 2)} of 2
      </span>
    </div>
  )
}

export default DetainedJailPanel
