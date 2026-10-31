import React, { useState, useEffect, useRef } from "react"
import type { EnginePlayer } from "../engine/GameEngineInterface"
import { audioSystem } from "../utils/audioSystem"
import { multiplayerClient } from "../engine/MultiplayerClient"

export interface ChatMessage {
  id: string
  roomCode?: string
  senderId: number
  senderName: string
  senderColor: string
  text: string
  timestamp: number
}

interface QuickChatWidgetProps {
  localPlayer: EnginePlayer
  isMultiplayer?: boolean
  soundEnabled?: boolean
}

export function QuickChatWidget({
  localPlayer,
  isMultiplayer = false,
  soundEnabled = true,
}: QuickChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)

  // Append a message while deduplicating by ID
  const appendMessage = (newMsg: ChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === newMsg.id)) return prev
      return [...prev.slice(-49), newMsg]
    })
    if (!isOpen) {
      setUnreadCount((c) => c + 1)
    }
    if (soundEnabled) {
      audioSystem.playNotification()
    }
  }

  // Sync with multiplayer room chat and snapshot history
  useEffect(() => {
    // Check initial chat history in snapshot if available
    const snap = multiplayerClient.getLatestSnapshot() as any
    if (snap?.chatHistory && Array.isArray(snap.chatHistory) && snap.chatHistory.length > 0) {
      setMessages(snap.chatHistory.slice(-50))
    }

    // Subscribe to multiplayer server broadcast messages
    const unsubChat = multiplayerClient.onChatMessage((msg: ChatMessage) => {
      if (msg && msg.text) {
        appendMessage(msg)
      }
    })

    // Subscribe to snapshot updates for chat history
    const unsubSnap = multiplayerClient.onSnapshot((s: any) => {
      if (s?.chatHistory && Array.isArray(s.chatHistory)) {
        setMessages((prev) => {
          const map = new Map<string, ChatMessage>()
          for (const m of prev) map.set(m.id, m)
          for (const m of s.chatHistory) map.set(m.id, m)
          return Array.from(map.values()).slice(-50)
        })
      }
    })

    // Local tab broadcast channel fallback
    try {
      const ch = new BroadcastChannel("crownfall_chat_local")
      broadcastChannelRef.current = ch
      ch.onmessage = (event) => {
        const msg = event.data as ChatMessage
        if (msg && msg.text) {
          appendMessage(msg)
        }
      }
    } catch (_) {}

    return () => {
      unsubChat()
      unsubSnap()
      try {
        broadcastChannelRef.current?.close()
      } catch (_) {}
    }
  }, [soundEnabled, isOpen])

  // Scroll to bottom on new message or open
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [isOpen, messages.length])

  const charCount = [...inputText].length
  const isOverLimit = charCount > 64

  const handleSendMessage = async () => {
    const trimmed = inputText.trim()
    if (!trimmed) {
      setSendError("Message cannot be empty.")
      return
    }

    const count = [...trimmed].length
    if (count > 64) {
      setSendError("Message exceeds allowed length.")
      return
    }

    setSendError(null)
    setIsSending(true)

    const hasActiveMpRoom = Boolean(isMultiplayer || multiplayerClient.getRoomCode())

    try {
      if (hasActiveMpRoom) {
        await multiplayerClient.sendChatMessage(trimmed)
      } else {
        // Local mode fallback
        const localMsg: ChatMessage = {
          id: `local_chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          senderId: localPlayer.id,
          senderName: localPlayer.name,
          senderColor: localPlayer.color,
          text: trimmed,
          timestamp: Date.now(),
        }
        appendMessage(localMsg)
        try {
          broadcastChannelRef.current?.postMessage(localMsg)
        } catch (_) {}
      }

      // Clear input only after successful acknowledgment / send
      setInputText("")
    } catch (err: any) {
      // Preserve unsent text on failure
      setSendError(err.message || "Failed to deliver message. Check connection.")
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!isSending && charCount > 0 && !isOverLimit) {
        handleSendMessage()
      }
    }
  }

  return (
    <>
      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="chat-toggle-pill"
          aria-label="Open room chat"
          style={{
            position: "fixed",
            bottom: "80px",
            right: "16px",
            background: "var(--surface-primary, #1e2430)",
            color: "var(--text-primary, #f8fafc)",
            border: "1px solid var(--border-gold, #b45309)",
            borderRadius: "20px",
            padding: "8px 16px",
            fontWeight: 700,
            fontSize: "12px",
            letterSpacing: "0.5px",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            zIndex: 9998,
          }}
        >
          <span style={{ textTransform: "uppercase" }}>Chat</span>
          {unreadCount > 0 && (
            <span
              style={{
                background: "var(--accent-red, #dc2626)",
                color: "#ffffff",
                borderRadius: "10px",
                padding: "1px 6px",
                fontSize: "10px",
                fontWeight: 800,
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div
          role="region"
          aria-label="Room Chat"
          className="chat-widget-window"
          style={{
            position: "fixed",
            bottom: "80px",
            right: "16px",
            width: "320px",
            maxWidth: "calc(100vw - 32px)",
            background: "var(--surface-primary, #141822)",
            border: "1px solid var(--border-subtle, rgba(200, 155, 69, 0.35))",
            borderRadius: "12px",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.55)",
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "inherit",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 14px",
              background: "var(--surface-secondary, rgba(255, 255, 255, 0.04))",
              borderBottom: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.1))",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: "12px",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  color: "var(--gold-400, #ca8a04)",
                }}
              >
                Room Chat
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--text-muted, #94a3b8)",
                }}
              >
                ({messages.length})
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="chat-close-btn"
              aria-label="Close chat"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-muted, #94a3b8)",
                cursor: "pointer",
                padding: "4px 8px",
                fontSize: "12px",
                fontWeight: 600,
                borderRadius: "4px",
              }}
            >
              Close
            </button>
          </div>

          {/* Messages Feed */}
          <div
            className="chat-messages-scroll custom-scrollbar"
            style={{
              flex: 1,
              padding: "10px 12px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              maxHeight: "220px",
              minHeight: "140px",
              background: "rgba(0, 0, 0, 0.2)",
            }}
          >
            {messages.length === 0 ? (
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--text-muted, #94a3b8)",
                  textAlign: "center",
                  margin: "auto",
                  padding: "16px 8px",
                }}
              >
                No messages yet. Send a message below.
              </p>
            ) : (
              messages.map((m) => {
                const isSelf = m.senderId === localPlayer.id
                return (
                  <div
                    key={m.id}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isSelf ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        color: m.senderColor || "var(--gold-300, #eab308)",
                        marginBottom: "2px",
                        letterSpacing: "0.3px",
                      }}
                    >
                      {m.senderName}
                    </div>
                    <div
                      style={{
                        background: isSelf
                          ? "rgba(200, 155, 69, 0.2)"
                          : "rgba(255, 255, 255, 0.08)",
                        border: isSelf
                          ? "1px solid var(--border-gold, #b45309)"
                          : "1px solid var(--border-subtle, rgba(255, 255, 255, 0.12))",
                        borderRadius: "8px",
                        padding: "6px 10px",
                        fontSize: "12px",
                        lineHeight: 1.35,
                        color: "var(--text-primary, #f8fafc)",
                        maxWidth: "88%",
                        wordBreak: "break-word",
                      }}
                    >
                      {m.text}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div
            style={{
              padding: "10px 12px",
              background: "var(--surface-secondary, rgba(255, 255, 255, 0.03))",
              borderTop: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {sendError && (
              <div
                role="alert"
                style={{
                  fontSize: "10px",
                  color: "var(--accent-red, #ef4444)",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  borderRadius: "4px",
                  padding: "4px 8px",
                }}
              >
                {sendError}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value)
                  if (sendError) setSendError(null)
                }}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                maxLength={64}
                disabled={isSending}
                style={{
                  flex: 1,
                  background: "rgba(0, 0, 0, 0.25)",
                  border: isOverLimit
                    ? "1px solid var(--accent-red, #ef4444)"
                    : "1px solid var(--border-subtle, rgba(255, 255, 255, 0.15))",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  color: "var(--text-primary, #f8fafc)",
                  outline: "none",
                }}
              />

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={isSending || charCount === 0 || isOverLimit}
                style={{
                  background:
                    charCount === 0 || isOverLimit || isSending
                      ? "rgba(255, 255, 255, 0.08)"
                      : "var(--gold-400, #ca8a04)",
                  color:
                    charCount === 0 || isOverLimit || isSending
                      ? "var(--text-muted, #64748b)"
                      : "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 14px",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  cursor:
                    charCount === 0 || isOverLimit || isSending
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {isSending ? "Sending" : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default QuickChatWidget
