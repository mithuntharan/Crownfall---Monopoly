import { useState, useEffect, useRef } from "react"
import type { EnginePlayer } from "../engine/GameEngineInterface"
import { audioSystem } from "../utils/audioSystem"

export interface ChatMessage {
  id: string
  senderId: number
  senderName: string
  senderColor: string
  text: string
  isEmoji?: boolean
  timestamp: number
}

const PRESET_EMOJIS = ["👑", "🎲", "💰", "💸", "🏰", "🔥", "😭", "👏"]

const PRESET_MESSAGES = [
  "Good luck everyone!",
  "Nice roll!",
  "Ouch, that rent hurts!",
  "Care to trade?",
  "Watch out for Jail!",
  "Building my empire!",
  "Well played!",
  "GG!",
]

interface QuickChatWidgetProps {
  localPlayer: EnginePlayer
  soundEnabled?: boolean
}

export function QuickChatWidget({ localPlayer, soundEnabled = true }: QuickChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [floatingReactions, setFloatingReactions] = useState<ChatMessage[]>([])
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)

  const channelRef = useRef<BroadcastChannel | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    try {
      const ch = new BroadcastChannel("crownfall_quick_chat")
      channelRef.current = ch

      ch.onmessage = (event) => {
        const msg = event.data as ChatMessage
        if (msg && msg.text) {
          setMessages((prev) => [...prev.slice(-30), msg])
          if (!isMuted && soundEnabled) {
            audioSystem.playNotification()
          }
          if (msg.isEmoji) {
            setFloatingReactions((prev) => [...prev, msg])
            setTimeout(() => {
              setFloatingReactions((prev) => prev.filter((r) => r.id !== msg.id))
            }, 2500)
          }
          if (!isOpen) {
            setUnreadCount((c) => c + 1)
          }
        }
      }

      return () => {
        ch.close()
      }
    } catch (_) {}
  }, [isMuted, soundEnabled, isOpen])

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [isOpen, messages])

  // Cooldown timer
  useEffect(() => {
    if (cooldownRemaining <= 0) return
    const timer = setTimeout(() => {
      setCooldownRemaining((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearTimeout(timer)
  }, [cooldownRemaining])

  const sendMessage = (text: string, isEmoji = false) => {
    if (cooldownRemaining > 0) return

    const newMsg: ChatMessage = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: localPlayer.id,
      senderName: localPlayer.name,
      senderColor: localPlayer.color,
      text,
      isEmoji,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev.slice(-30), newMsg])
    if (isEmoji) {
      setFloatingReactions((prev) => [...prev, newMsg])
      setTimeout(() => {
        setFloatingReactions((prev) => prev.filter((r) => r.id !== newMsg.id))
      }, 2500)
    }

    try {
      channelRef.current?.postMessage(newMsg)
    } catch (_) {}

    // Rate limiting: 1s
    setCooldownRemaining(1)
  }

  return (
    <>
      {/* Floating Reactions on Screen */}
      <div
        style={{
          position: "fixed",
          bottom: "120px",
          right: "24px",
          pointerEvents: "none",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          alignItems: "flex-end",
        }}
      >
        {floatingReactions.map((r) => (
          <div
            key={r.id}
            style={{
              background: "rgba(17, 29, 56, 0.9)",
              border: `1px solid ${r.senderColor}`,
              borderRadius: "20px",
              padding: "4px 12px",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
              animation: "floatUp 2.5s ease-out forwards",
            }}
          >
            <span style={{ fontSize: "11px", color: r.senderColor, fontWeight: 700 }}>
              {r.senderName}:
            </span>
            <span style={{ fontSize: "20px" }}>{r.text}</span>
          </div>
        ))}
      </div>

      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: "80px",
            right: "16px",
            background: "linear-gradient(135deg, #1e293b, #0f172a)",
            border: "1px solid var(--gold-400)",
            color: "var(--gold-300)",
            borderRadius: "50%",
            width: "46px",
            height: "46px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(0,0,0,0.6)",
            cursor: "pointer",
            zIndex: 100,
          }}
          title="Quick Chat & Reactions"
        >
          <span style={{ fontSize: "20px" }}>💬</span>
          {unreadCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-4px",
                right: "-4px",
                background: "var(--crimson)",
                color: "#fff",
                borderRadius: "10px",
                padding: "1px 6px",
                fontSize: "11px",
                fontWeight: 700,
                border: "1px solid #fff",
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Drawer / Modal */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "75px",
            right: "16px",
            width: "320px",
            maxHeight: "440px",
            background: "#111d38",
            border: "1px solid var(--gold-400)",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.7)",
            display: "flex",
            flexDirection: "column",
            zIndex: 1000,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(0,0,0,0.3)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "16px" }}>💬</span>
              <strong style={{ fontSize: "12px", color: "var(--gold-300)", textTransform: "uppercase" }}>
                Quick Chat
              </strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                onClick={() => setIsMuted(!isMuted)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: isMuted ? "#ef4444" : "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: "2px",
                }}
                title={isMuted ? "Unmute Chat Sounds" : "Mute Chat Sounds"}
              >
                {isMuted ? "🔇" : "🔊"}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "14px",
                  padding: "2px",
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div
            style={{
              flex: 1,
              padding: "10px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              maxHeight: "180px",
              minHeight: "120px",
              background: "rgba(0,0,0,0.2)",
            }}
          >
            {messages.length === 0 ? (
              <p style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", margin: "auto" }}>
                Send a quick reaction or message!
              </p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: m.senderId === localPlayer.id ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      color: m.senderColor,
                      marginBottom: "1px",
                      fontWeight: 600,
                    }}
                  >
                    {m.senderName}
                  </div>
                  <div
                    style={{
                      background: m.senderId === localPlayer.id ? "rgba(200, 155, 69, 0.25)" : "rgba(255,255,255,0.08)",
                      border: m.senderId === localPlayer.id ? "1px solid var(--gold-400)" : "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      padding: m.isEmoji ? "2px 8px" : "4px 8px",
                      fontSize: m.isEmoji ? "18px" : "12px",
                      color: "#fff",
                      maxWidth: "85%",
                      wordBreak: "break-word",
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Emoji Reactions Row */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              padding: "6px 8px",
              background: "rgba(0,0,0,0.3)",
              borderTop: "1px solid var(--border-subtle)",
              overflowX: "auto",
            }}
          >
            {PRESET_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                disabled={cooldownRemaining > 0}
                onClick={() => sendMessage(emoji, true)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "18px",
                  cursor: cooldownRemaining > 0 ? "not-allowed" : "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  opacity: cooldownRemaining > 0 ? 0.4 : 1,
                }}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Preset Text Messages */}
          <div
            style={{
              padding: "8px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "4px",
              background: "rgba(0,0,0,0.4)",
              maxHeight: "120px",
              overflowY: "auto",
            }}
          >
            {PRESET_MESSAGES.map((text) => (
              <button
                key={text}
                disabled={cooldownRemaining > 0}
                onClick={() => sendMessage(text, false)}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "6px",
                  padding: "5px 6px",
                  fontSize: "10px",
                  color: "#cbd5e1",
                  textAlign: "left",
                  cursor: cooldownRemaining > 0 ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  opacity: cooldownRemaining > 0 ? 0.4 : 1,
                }}
              >
                {text}
              </button>
            ))}
          </div>

          {/* Cooldown indicator */}
          {cooldownRemaining > 0 && (
            <div
              style={{
                fontSize: "10px",
                color: "var(--gold-300)",
                textAlign: "center",
                padding: "2px",
                background: "rgba(200, 155, 69, 0.1)",
              }}
            >
              Wait 1s before next message...
            </div>
          )}
        </div>
      )}
    </>
  )
}
