import React from "react"

export interface DiceRollRecord {
  id: string
  rollIndex?: number
  roundNumber?: number
  playerId: number
  playerName: string
  playerColor?: string
  dice1?: number
  dice2?: number
  d1?: number
  d2?: number
  total: number
  isDouble: boolean
  destinationSpace?: string
  spaceName?: string
  timestamp: number
}

export interface DiceRollHistoryProps {
  isOpen: boolean
  onToggle?: () => void
  onClose?: () => void
  history?: DiceRollRecord[]
  records?: DiceRollRecord[]
  onClear?: () => void
}

// Mini die face component (1 to 6 dots)
function MiniDie({ value }: { value: number }) {
  const dots: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  }
  const activeDots = new Set(dots[value] || [4])

  return (
    <div
      style={{
        width: "24px",
        height: "24px",
        background: "#fffdf8",
        border: "1.5px solid var(--gold)",
        borderRadius: "5px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(3, 1fr)",
        gap: "1.5px",
        padding: "3px",
      }}
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <span
          key={i}
          style={{
            width: "3px",
            height: "3px",
            borderRadius: "50%",
            background: activeDots.has(i) ? "var(--burgundy, #711f31)" : "transparent",
            placeSelf: "center",
          }}
        />
      ))}
    </div>
  )
}

export function DiceRollHistory({
  isOpen,
  onToggle,
  onClose,
  history,
  records,
  onClear: _onClear,
}: DiceRollHistoryProps) {
  const list = records || history || []
  const handleToggle = onClose || onToggle || (() => {})
  const totalDoubles = list.filter((r) => r.isDouble).length
  const doublesRate =
    list.length > 0 ? Math.round((totalDoubles / list.length) * 100) : 0

  return (
    <>
      {/* Collapsible Modal Drawer */}
      {isOpen && (
        <div
          className="modal-backdrop"
          onClick={handleToggle}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(3px)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            paddingTop: "60px",
          }}
        >
          <div
            className="dice-history-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "400px",
              maxWidth: "94vw",
              maxHeight: "calc(100vh - 100px)",
              background: "var(--forest, #111d38)",
              border: "2px solid var(--gold)",
              borderRadius: "14px",
              boxShadow: "0 16px 40px rgba(0,0,0,0.65)",
              display: "flex",
              flexDirection: "column",
              color: "#fff",
              fontFamily: "'DM Sans', sans-serif",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(200, 155, 69, 0.3)",
                padding: "14px 16px",
                background: "rgba(0,0,0,0.2)",
              }}
            >
              <div>
                <strong
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "16px",
                    color: "var(--gold-light)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  DICE ROLL HISTORY
                </strong>
                <span style={{ fontSize: "10.5px", color: "rgba(255,255,255,0.7)" }}>
                  Authoritative recorded rolls · Human & Bots
                </span>
              </div>
              <button
                onClick={onToggle}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Quick Stats Bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "8px",
                padding: "10px 16px",
                background: "rgba(0,0,0,0.25)",
                borderBottom: "1px solid rgba(255,255,255,0.06)",
                textAlign: "center",
              }}
            >
              <div>
                <small style={{ fontSize: "9px", color: "var(--text-muted)", display: "block" }}>
                  TOTAL ROLLS
                </small>
                <strong style={{ fontSize: "14px", color: "#fff" }}>{list.length}</strong>
              </div>
              <div>
                <small style={{ fontSize: "9px", color: "var(--text-muted)", display: "block" }}>
                  DOUBLES
                </small>
                <strong style={{ fontSize: "14px", color: "var(--gold-light)" }}>
                  {totalDoubles}
                </strong>
              </div>
              <div>
                <small style={{ fontSize: "9px", color: "var(--text-muted)", display: "block" }}>
                  DOUBLES RATE
                </small>
                <strong style={{ fontSize: "14px", color: "#86efac" }}>{doublesRate}%</strong>
              </div>
            </div>

            {/* Roll Records (Newest First) */}
            <div
              style={{
                padding: "12px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                flex: 1,
              }}
            >
              {list.length === 0 ? (
                <div
                  style={{
                    padding: "32px 16px",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: "12px",
                  }}
                >
                  No dice rolls recorded yet. Roll the dice to begin!
                </div>
              ) : (
                list.map((r, idx) => {
                  const val1 = r.d1 ?? r.dice1 ?? 1
                  const val2 = r.d2 ?? r.dice2 ?? 1
                  const dest = r.destinationSpace || r.spaceName
                  const rollNo = r.rollIndex ?? (list.length - idx)
                  const roundNo = r.roundNumber ?? 1

                  return (
                    <div
                      key={r.id}
                      style={{
                        background:
                          idx === 0
                            ? "rgba(200, 155, 69, 0.15)"
                            : "rgba(0,0,0,0.25)",
                        border:
                          idx === 0
                            ? "1.5px solid var(--gold)"
                            : "1px solid rgba(255,255,255,0.07)",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                      }}
                    >
                      {/* Left: Player & Roll Index */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 700,
                              color: "var(--text-muted)",
                            }}
                          >
                            #{rollNo}
                          </span>
                          <strong
                            style={{
                              fontSize: "12px",
                              color: idx === 0 ? "var(--gold-light)" : "#fff",
                            }}
                          >
                            {r.playerName}
                          </strong>
                          {idx === 0 && (
                            <span
                              style={{
                                fontSize: "9px",
                                padding: "1px 5px",
                                borderRadius: "4px",
                                background: "rgba(200, 155, 69, 0.3)",
                                color: "var(--gold-light)",
                                fontWeight: 700,
                              }}
                            >
                              LATEST
                            </span>
                          )}
                        </div>
                        <small style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px", display: "block" }}>
                          Round {String(roundNo).padStart(2, "0")} ·{" "}
                          {dest ? `Landed on ${dest}` : "Moved"}
                        </small>
                      </div>

                      {/* Right: Dice Faces, Total & Doubles chip */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <MiniDie value={val1} />
                          <MiniDie value={val2} />
                        </div>
                        <div style={{ textAlign: "right", minWidth: "46px" }}>
                        <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--gold-light)" }}>
                          {r.total}
                        </div>
                        {r.isDouble && (
                          <span
                            style={{
                              fontSize: "8.5px",
                              fontWeight: 800,
                              background: "rgba(142, 35, 56, 0.5)",
                              border: "1px solid var(--crimson, #ff6b6b)",
                              color: "#fca5a5",
                              padding: "1px 4px",
                              borderRadius: "3px",
                              display: "inline-block",
                            }}
                          >
                            DOUBLE!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                borderTop: "1px solid rgba(200, 155, 69, 0.2)",
                padding: "8px 16px",
                background: "rgba(0,0,0,0.15)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "11px",
                color: "var(--text-muted)",
              }}
            >
              <span>{list.length} rolls recorded</span>
              <button
                onClick={handleToggle}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--gold)",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "11px",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
