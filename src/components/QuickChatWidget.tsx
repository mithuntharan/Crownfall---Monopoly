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

function getEmojiOnlyDetails(text: string): { isEmojiOnly: boolean; count: number } {
  const trimmed = text.trim()
  if (!trimmed) return { isEmojiOnly: false, count: 0 }

  try {
    if (typeof Intl !== "undefined" && (Intl as any).Segmenter) {
      const segmenter = new (Intl as any).Segmenter("en", { granularity: "grapheme" })
      const segments: string[] = Array.from(segmenter.segment(trimmed)).map((s: any) => s.segment)
      const emojiRegex = /^\p{Extended_Pictographic}$/u
      const nonEmoji = segments.filter((seg) => !emojiRegex.test(seg) && seg.trim() !== "")
      if (nonEmoji.length === 0 && segments.length >= 1 && segments.length <= 5) {
        return { isEmojiOnly: true, count: segments.length }
      }
      return { isEmojiOnly: false, count: segments.length }
    }
  } catch (_) {}

  const emojiClusterRegex = /^(?:\p{Extended_Pictographic}(?:\u200D\p{Extended_Pictographic}|[\uFE0E\uFE0F]|\p{Emoji_Modifier})*\s*)+$/u
  if (!emojiClusterRegex.test(trimmed)) {
    return { isEmojiOnly: false, count: 0 }
  }
  const matches = trimmed.match(/\p{Extended_Pictographic}/gu)
  const count = matches ? matches.length : 0
  if (count >= 1 && count <= 5) {
    return { isEmojiOnly: true, count }
  }
  return { isEmojiOnly: false, count }
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
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const isNearBottomRef = useRef(true)
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null)

  const scrollToBottom = (smooth = false) => {
    if (!scrollContainerRef.current) return
    const el = scrollContainerRef.current
    if (smooth) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    } else {
      el.scrollTop = el.scrollHeight
    }
  }

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

  // Scroll to bottom on open (wait for layout to settle)
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0)
      isNearBottomRef.current = true
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom(false)
        })
      })
      const timer = setTimeout(() => {
        scrollToBottom(false)
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Auto-scroll on new messages only if user is near bottom
  useEffect(() => {
    if (isOpen && isNearBottomRef.current) {
      requestAnimationFrame(() => {
        scrollToBottom(true)
      })
    }
  }, [messages.length, isOpen])

  const handleScroll = () => {
    if (!scrollContainerRef.current) return
    const el = scrollContainerRef.current
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    isNearBottomRef.current = distanceToBottom < 60
  }

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
        >
          {/* Header */}
          <div className="chat-window-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: "12px",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  color: "var(--accent-primary, #8198B0)",
                }}
              >
                Room Chat
              </span>
              <span
                style={{
                  fontSize: "10px",
                  color: "var(--chat-text-muted, #78716C)",
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
                color: "var(--chat-text-muted, #78716C)",
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
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="chat-messages-scroll custom-scrollbar"
          >
            {messages.length === 0 ? (
              <p
                style={{
                  fontSize: "11px",
                  color: "var(--chat-text-muted, #78716C)",
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
                const timeStr = new Date(m.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
                const emojiDetails = getEmojiOnlyDetails(m.text)
                return (
                  <div
                    key={m.id}
                    className="chat-message-item"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isSelf ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "2px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: m.senderColor || "var(--accent-primary, #8198B0)",
                          letterSpacing: "0.3px",
                        }}
                      >
                        {m.senderName}
                      </span>
                      <span
                        style={{
                          fontSize: "9px",
                          color: "var(--chat-text-muted, #78716C)",
                        }}
                      >
                        {timeStr}
                      </span>
                    </div>
                    {emojiDetails.isEmojiOnly ? (
                      <div
                        className="chat-emoji-only"
                        style={{
                          fontSize:
                            emojiDetails.count === 1
                              ? "38px"
                              : emojiDetails.count === 2
                              ? "32px"
                              : emojiDetails.count === 3
                              ? "28px"
                              : "24px",
                        }}
                      >
                        {m.text}
                      </div>
                    ) : (
                      <div
                        className={isSelf ? "chat-bubble-self" : "chat-bubble-peer"}
                      >
                        {m.text}
                      </div>
                    )}
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <div className="chat-composer-row">
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
                className="chat-composer-input"
              />

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={isSending || charCount === 0 || isOverLimit}
                className="chat-composer-send-btn"
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
