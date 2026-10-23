import { useState, useEffect, useRef } from "react"
import {
  type GamePreferences,
  DEFAULT_PREFERENCES,
  audioSystem,
  triggerHaptic,
} from "../utils/audioSystem"
import type { GameRules } from "../engine/GameEngineInterface"

interface PreferencesModalProps {
  preferences: GamePreferences
  onUpdatePreferences: (prefs: GamePreferences) => void
  rules?: GameRules
  onUpdateRules?: (rules: Partial<GameRules>) => Promise<{ success: boolean; error?: string }>
  isGameStarted?: boolean
  isHost?: boolean
  close: () => void
}

export function PreferencesModal({
  preferences,
  onUpdatePreferences,
  rules,
  onUpdateRules,
  isGameStarted = false,
  isHost = true,
  close,
}: PreferencesModalProps) {
  const [activeTab, setActiveTab] = useState<"appearance" | "gameplay" | "host">(
    !isGameStarted && isHost ? "host" : "appearance"
  )
  const [prefs, setPrefs] = useState<GamePreferences>({ ...preferences })
  const [localRules, setLocalRules] = useState<Partial<GameRules>>({
    defaultStartingMoney: rules?.defaultStartingMoney ?? 25000,
    doublesRuleEnabled: rules?.doublesRuleEnabled ?? true,
    maxPlayers: rules?.maxPlayers ?? 4,
    timerEnabled: rules?.timerEnabled ?? false,
    timerSeconds: rules?.timerSeconds ?? 60,
  })
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const lastSyncedRulesRef = useRef<string>(
    JSON.stringify({
      defaultStartingMoney: rules?.defaultStartingMoney ?? 25000,
      doublesRuleEnabled: rules?.doublesRuleEnabled ?? true,
      maxPlayers: rules?.maxPlayers ?? 4,
      timerEnabled: rules?.timerEnabled ?? false,
      timerSeconds: rules?.timerSeconds ?? 60,
    })
  )
  const isUserInteractingRef = useRef<boolean>(false)
  const saveTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!rules) return
    const incomingNormalized = {
      defaultStartingMoney: rules.defaultStartingMoney ?? 25000,
      doublesRuleEnabled: rules.doublesRuleEnabled ?? true,
      maxPlayers: rules.maxPlayers ?? 4,
      timerEnabled: rules.timerEnabled ?? false,
      timerSeconds: rules.timerSeconds ?? 60,
    }
    const incomingStr = JSON.stringify(incomingNormalized)

    // Do NOT clobber active local changes if the host is interacting or saving,
    // or if the incoming rules match what we already have.
    if (incomingStr !== lastSyncedRulesRef.current && !isSaving && !isUserInteractingRef.current) {
      lastSyncedRulesRef.current = incomingStr
      setLocalRules(incomingNormalized)
    }
  }, [rules, isSaving])

  const updateHostRule = <K extends keyof GameRules>(key: K, val: GameRules[K]) => {
    if (isGameStarted || !isHost) return
    isUserInteractingRef.current = true
    const updated = { ...localRules, [key]: val }
    setLocalRules(updated)
    setSaveStatus(null)

    // Debounced authoritative persistence & immediate sync
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = window.setTimeout(async () => {
      saveTimeoutRef.current = null
      if (onUpdateRules) {
        setIsSaving(true)
        try {
          const res = await onUpdateRules(updated)
          if (res.success) {
            lastSyncedRulesRef.current = JSON.stringify({
              defaultStartingMoney: updated.defaultStartingMoney ?? 25000,
              doublesRuleEnabled: updated.doublesRuleEnabled ?? true,
              maxPlayers: updated.maxPlayers ?? 4,
              timerEnabled: updated.timerEnabled ?? false,
              timerSeconds: updated.timerSeconds ?? 60,
            })
            setSaveStatus("Rules synchronized with all players.")
          } else {
            setSaveStatus(res.error || "Failed to update rules.")
          }
        } catch (e: any) {
          setSaveStatus(e?.message || "Failed to update rules.")
        } finally {
          setIsSaving(false)
          isUserInteractingRef.current = false
        }
      } else {
        isUserInteractingRef.current = false
      }
    }, 250)
  }

  const updatePref = <K extends keyof GamePreferences>(key: K, val: GamePreferences[K]) => {
    const updated = { ...prefs, [key]: val, theme: "light" as const }
    setPrefs(updated)
    onUpdatePreferences(updated)
  }

  const handleApplyRules = async () => {
    if (isGameStarted || !isHost || !onUpdateRules) return
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    setIsSaving(true)
    setSaveStatus(null)
    try {
      const res = await onUpdateRules(localRules)
      if (res.success) {
        lastSyncedRulesRef.current = JSON.stringify({
          defaultStartingMoney: localRules.defaultStartingMoney ?? 25000,
          doublesRuleEnabled: localRules.doublesRuleEnabled ?? true,
          maxPlayers: localRules.maxPlayers ?? 4,
          timerEnabled: localRules.timerEnabled ?? false,
          timerSeconds: localRules.timerSeconds ?? 60,
        })
        setSaveStatus("Rules synchronized with all players.")
        audioSystem.playPurchase()
      } else {
        setSaveStatus(res.error || "Failed to update rules.")
        audioSystem.playWarning()
      }
    } catch (e: any) {
      setSaveStatus(e?.message || "Failed to update rules.")
      audioSystem.playWarning()
    } finally {
      setIsSaving(false)
      isUserInteractingRef.current = false
    }
  }

  const hasHaptic = typeof window !== "undefined" && "vibrate" in navigator

  const testAudio = () => {
    if (prefs.soundEffects) {
      audioSystem.playPurchase()
    }
  }

  const testHaptic = () => {
    if (prefs.hapticFeedback && hasHaptic) {
      triggerHaptic(40)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <section
        className="modal-sheet preferences-modal"
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          maxWidth: "560px",
          width: "min(560px, 95vw)",
          maxHeight: "min(90vh, 90dvh)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div className="sheet-handle" />
        <div className="modal-header">
          <strong style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--gold-300)" }}>
            <span>⚙️</span> GAME SETTINGS &amp; CONFIGURATION
          </strong>
          <button onClick={close} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Section Navigation Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(95px, 1fr))",
            gap: "4px",
            padding: "8px 12px",
            background: "rgba(0,0,0,0.35)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <button
            onClick={() => setActiveTab("appearance")}
            style={{
              padding: "8px 6px",
              minHeight: "36px",
              borderRadius: "6px",
              border: activeTab === "appearance" ? "1px solid var(--gold)" : "1px solid transparent",
              background: activeTab === "appearance" ? "rgba(200,155,69,0.2)" : "transparent",
              color: activeTab === "appearance" ? "var(--gold-300)" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "clamp(10px, 2.5vw, 11px)",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            🎨 APPEARANCE
          </button>
          <button
            onClick={() => setActiveTab("gameplay")}
            style={{
              padding: "8px 6px",
              minHeight: "36px",
              borderRadius: "6px",
              border: activeTab === "gameplay" ? "1px solid var(--gold)" : "1px solid transparent",
              background: activeTab === "gameplay" ? "rgba(200,155,69,0.2)" : "transparent",
              color: activeTab === "gameplay" ? "var(--gold-300)" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "clamp(10px, 2.5vw, 11px)",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            🎮 GAMEPLAY
          </button>
          <button
            onClick={() => setActiveTab("host")}
            style={{
              padding: "8px 6px",
              minHeight: "36px",
              borderRadius: "6px",
              border: activeTab === "host" ? "1px solid var(--gold)" : "1px solid transparent",
              background: activeTab === "host" ? "rgba(200,155,69,0.2)" : "transparent",
              color: activeTab === "host" ? "var(--gold-300)" : "var(--text-muted)",
              fontWeight: 700,
              fontSize: "clamp(10px, 2.5vw, 11px)",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            👑 HOST SETTINGS
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {activeTab === "appearance" && (
            /* ── SECTION A: APPEARANCE ── */
            <>
              {/* Reduced Motion */}
              <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "13px", color: "#fff" }}>Reduced Motion</strong>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                      Minimizes token glide effects and tumbling animations.
                    </p>
                  </div>
                  <button
                    className={`toggle ${prefs.reducedMotion ? "on" : ""}`}
                    onClick={() => updatePref("reducedMotion", !prefs.reducedMotion)}
                    aria-label="Toggle reduced motion"
                  >
                    <span />
                  </button>
                </div>
              </div>

              {/* Layout Diagnostics */}
              <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "13px", color: "#fff" }}>Layout Diagnostics Banner</strong>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                      Shows viewport dimensions and text-fit debugging info.
                    </p>
                  </div>
                  <button
                    className={`toggle ${prefs.layoutDiagnostics ? "on" : ""}`}
                    onClick={() => updatePref("layoutDiagnostics", !prefs.layoutDiagnostics)}
                    aria-label="Toggle layout diagnostics"
                  >
                    <span />
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === "gameplay" && (
            /* ── SECTION B: GAMEPLAY SETTINGS ── */
            <>
              {/* Animation Speed */}
              <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <strong style={{ fontSize: "13px", color: "#fff" }}>Animation Speed</strong>
                  <span style={{ fontSize: "11px", color: "var(--gold-300)", fontWeight: 700, textTransform: "uppercase" }}>
                    {prefs.animationSpeed}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  {(["slow", "normal", "fast"] as const).map((speed) => (
                    <button
                      key={speed}
                      onClick={() => updatePref("animationSpeed", speed)}
                      style={{
                        padding: "8px",
                        borderRadius: "6px",
                        border: prefs.animationSpeed === speed ? "1px solid var(--gold-400)" : "1px solid var(--border-subtle)",
                        background: prefs.animationSpeed === speed ? "rgba(200, 155, 69, 0.25)" : "rgba(0,0,0,0.2)",
                        color: prefs.animationSpeed === speed ? "var(--gold-300)" : "var(--text-muted)",
                        fontWeight: 700,
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      {speed === "slow" ? "🐢 Slow" : speed === "normal" ? "⚡ Normal" : "🚀 Fast"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Effects */}
              <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div>
                    <strong style={{ fontSize: "13px", color: "#fff" }}>Sound Effects &amp; Audio</strong>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                      Audio cues for dice, property purchase, rent, and building.
                    </p>
                  </div>
                  <button
                    className={`toggle ${prefs.soundEffects ? "on" : ""}`}
                    onClick={() => {
                      updatePref("soundEffects", !prefs.soundEffects)
                      testAudio()
                    }}
                    aria-label="Toggle sound"
                  >
                    <span />
                  </button>
                </div>

                {prefs.soundEffects && (
                  <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
                    <small style={{ fontSize: "11px", color: "var(--text-muted)" }}>Volume:</small>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={prefs.masterVolume}
                      onChange={(e) => {
                        const val = Number(e.target.value)
                        updatePref("masterVolume", val)
                        audioSystem.setMasterVolume(val)
                      }}
                      style={{ flex: 1, accentColor: "var(--gold)" }}
                    />
                    <strong style={{ fontSize: "11px", color: "var(--gold-300)", width: "32px", textAlign: "right" }}>
                      {prefs.masterVolume}%
                    </strong>
                  </div>
                )}
              </div>

              {/* Haptic Feedback */}
              <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "13px", color: "#fff" }}>Haptic Vibration</strong>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                      Tactile response on mobile devices for rolls and transactions.
                    </p>
                  </div>
                  <button
                    className={`toggle ${prefs.hapticFeedback ? "on" : ""}`}
                    onClick={() => {
                      updatePref("hapticFeedback", !prefs.hapticFeedback)
                      testHaptic()
                    }}
                    aria-label="Toggle haptic feedback"
                  >
                    <span />
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === "host" && (
            /* ── SECTION C: HOST SETTINGS ── */
            <>
              {/* Host Status Banner */}
              {isGameStarted ? (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "6px",
                    background: "rgba(217, 119, 6, 0.15)",
                    border: "1.5px solid #f59e0b",
                    color: "#fbbf24",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>🔒</span>
                  <div>
                    <strong>Settings Locked — Game in Progress</strong>
                    <div style={{ fontSize: "11px", opacity: 0.9 }}>
                      Authoritative game rules were frozen at start and cannot be modified.
                    </div>
                  </div>
                </div>
              ) : !isHost ? (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "6px",
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1.5px solid #3b82f6",
                    color: "#93c5fd",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>👑</span>
                  <div>
                    <strong>Host Controlled Rules</strong>
                    <div style={{ fontSize: "11px", opacity: 0.9 }}>
                      Only Player 1 (Host) can configure table rules before the game starts.
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: "6px",
                    background: "rgba(16, 185, 129, 0.15)",
                    border: "1.5px solid #10b981",
                    color: "#34d399",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span style={{ fontSize: "16px" }}>👑</span>
                  <div>
                    <strong>Lobby Configuration Phase (Host Controls Active)</strong>
                    <div style={{ fontSize: "11px", opacity: 0.9 }}>
                      You can adjust table settings repeatedly. Rules freeze permanently once you press Start Game.
                    </div>
                  </div>
                </div>
              )}

              {/* Maximum Players */}
              <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "13px", color: "#fff" }}>Maximum Players</strong>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                      Capacity limit for this game room (2 to 6).
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      disabled={isGameStarted || !isHost || (localRules.maxPlayers ?? 4) <= 2}
                      onClick={() => updateHostRule("maxPlayers", Math.max(2, (localRules.maxPlayers ?? 4) - 1))}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-subtle)",
                        background: "rgba(0,0,0,0.3)",
                        color: "#fff",
                        fontWeight: 800,
                        cursor: isGameStarted || !isHost ? "not-allowed" : "pointer",
                        opacity: isGameStarted || !isHost ? 0.4 : 1,
                      }}
                    >
                      −
                    </button>
                    <b style={{ fontSize: "14px", color: "var(--gold-300)", minWidth: "16px", textAlign: "center" }}>
                      {localRules.maxPlayers ?? 4}
                    </b>
                    <button
                      disabled={isGameStarted || !isHost || (localRules.maxPlayers ?? 4) >= 6}
                      onClick={() => updateHostRule("maxPlayers", Math.min(6, (localRules.maxPlayers ?? 4) + 1))}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-subtle)",
                        background: "rgba(0,0,0,0.3)",
                        color: "#fff",
                        fontWeight: 800,
                        cursor: isGameStarted || !isHost ? "not-allowed" : "pointer",
                        opacity: isGameStarted || !isHost ? 0.4 : 1,
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Starting Money */}
              <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div>
                    <strong style={{ fontSize: "13px", color: "#fff" }}>Starting Capital</strong>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                      Cash awarded upon completing the first board rotation.
                    </p>
                  </div>
                  <strong style={{ color: "var(--gold-300)", fontSize: "13px" }}>
                    ₹{(localRules.defaultStartingMoney ?? 25000).toLocaleString()}
                  </strong>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(78px, 1fr))", gap: "6px" }}>
                  {[25000, 30000, 35000, 40000, 45000, 50000, 55000].map((amount) => {
                    const isSelected = (localRules.defaultStartingMoney ?? 25000) === amount
                    return (
                      <button
                        key={amount}
                        disabled={isGameStarted || !isHost}
                        onClick={() => updateHostRule("defaultStartingMoney", amount)}
                        style={{
                          padding: "7px 4px",
                          borderRadius: "6px",
                          border: isSelected
                            ? "1.5px solid var(--gold, #c89b45)"
                            : "1px solid var(--border-subtle, rgba(200, 155, 69, 0.25))",
                          background: isSelected
                            ? "linear-gradient(135deg, rgba(200, 155, 69, 0.28) 0%, rgba(200, 155, 69, 0.16) 100%)"
                            : "rgba(250, 246, 238, 0.6)",
                          color: isSelected ? "var(--gold-300, #92400e)" : "var(--text-muted, #57534e)",
                          fontWeight: 700,
                          fontFamily: '"Oswald", sans-serif',
                          fontSize: "11.5px",
                          cursor: isGameStarted || !isHost ? "not-allowed" : "pointer",
                          opacity: isGameStarted || !isHost ? 0.5 : 1,
                          transition: "all 0.15s ease",
                          boxShadow: isSelected ? "0 1px 4px rgba(200, 155, 69, 0.18)" : "none",
                        }}
                      >
                        ₹{amount.toLocaleString()}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Doubles & Extra Turns */}
              <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "13px", color: "#fff" }}>Doubles &amp; Extra Turns</strong>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                      {localRules.doublesRuleEnabled
                        ? "Classic rule: Matching dice award extra roll; 3 consecutive doubles sent to Jail."
                        : "Single roll: Matching dice do NOT award an extra turn."}
                    </p>
                  </div>
                  <button
                    disabled={isGameStarted || !isHost}
                    className={`toggle ${localRules.doublesRuleEnabled ? "on" : ""}`}
                    onClick={() =>
                      updateHostRule("doublesRuleEnabled", !localRules.doublesRuleEnabled)
                    }
                    aria-label="Toggle doubles rule"
                    style={{ opacity: isGameStarted || !isHost ? 0.4 : 1, cursor: isGameStarted || !isHost ? "not-allowed" : "pointer" }}
                  >
                    <span />
                  </button>
                </div>
              </div>

              {/* Turn Timer */}
              <div style={{ background: "rgba(0,0,0,0.25)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <div>
                    <strong style={{ fontSize: "13px", color: "#fff" }}>Turn Timer</strong>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: "2px 0 0" }}>
                      {localRules.timerEnabled
                        ? `Time limit active (${localRules.timerSeconds}s per turn)`
                        : "No time limit"}
                    </p>
                  </div>
                  <button
                    disabled={isGameStarted || !isHost}
                    className={`toggle ${localRules.timerEnabled ? "on" : ""}`}
                    onClick={() =>
                      updateHostRule("timerEnabled", !localRules.timerEnabled)
                    }
                    aria-label="Toggle turn timer"
                    style={{ opacity: isGameStarted || !isHost ? 0.4 : 1, cursor: isGameStarted || !isHost ? "not-allowed" : "pointer" }}
                  >
                    <span />
                  </button>
                </div>
                {localRules.timerEnabled && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px" }}>
                    {[30, 60, 90, 120].map((sec) => (
                      <button
                        key={sec}
                        disabled={isGameStarted || !isHost}
                        onClick={() => updateHostRule("timerSeconds", sec)}
                        style={{
                          padding: "6px",
                          borderRadius: "4px",
                          border:
                            localRules.timerSeconds === sec
                              ? "1px solid var(--gold)"
                              : "1px solid var(--border-subtle)",
                          background:
                            localRules.timerSeconds === sec
                              ? "rgba(200,155,69,0.25)"
                              : "rgba(0,0,0,0.2)",
                          color: localRules.timerSeconds === sec ? "var(--gold-300)" : "var(--text-muted)",
                          fontWeight: 700,
                          fontSize: "11px",
                          cursor: isGameStarted || !isHost ? "not-allowed" : "pointer",
                          opacity: isGameStarted || !isHost ? 0.5 : 1,
                        }}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                )}
              </div>


              {/* Host Save Action */}
              {!isGameStarted && isHost && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <button
                    onClick={handleApplyRules}
                    disabled={isSaving}
                    style={{
                      padding: "10px",
                      borderRadius: "6px",
                      background: "var(--gold)",
                      color: "var(--ink)",
                      fontFamily: "Oswald, sans-serif",
                      fontWeight: 700,
                      fontSize: "13px",
                      letterSpacing: "0.08em",
                      border: "none",
                      cursor: isSaving ? "wait" : "pointer",
                    }}
                  >
                    {isSaving ? "SYNCHRONIZING..." : "APPLY & SYNCHRONIZE HOST SETTINGS"}
                  </button>
                  {saveStatus && (
                    <small style={{ fontSize: "11px", color: saveStatus.includes("synch") ? "#10b981" : "#ef4444", textAlign: "center" }}>
                      {saveStatus}
                    </small>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

export default PreferencesModal
