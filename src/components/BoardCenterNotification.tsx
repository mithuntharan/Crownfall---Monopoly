import React from "react"

export interface BoardCenterNotificationItem {
  id: string
  type:
    | "CHANCE"
    | "CHEST"
    | "PURCHASE"
    | "DECLINE"
    | "RENT"
    | "JAIL"
    | "CLUB"
    | "REST"
    | "START_PASS"
    | "BUILD_HOUSE"
    | "BUILD_HOTEL"
    | "DESTROY_HOUSE"
    | "DESTROY_HOTEL"
    | "TAX"
    | "ERROR"
    | "INFO"
  category: string
  message: string
  amount?: number
  timestamp: number
  icon?: string
  durationMs?: number
}

interface BoardCenterNotificationProps {
  notification: BoardCenterNotificationItem | null
  queueCount: number
  onDismiss: () => void
  isDismissing?: boolean
}

export const BoardCenterNotification: React.FC<BoardCenterNotificationProps> = ({
  notification,
  queueCount,
  onDismiss,
  isDismissing = false,
}) => {
  if (!notification) return null

  const getIcon = (type: BoardCenterNotificationItem["type"]) => {
    switch (type) {
      case "PURCHASE":
        return "🏛️"
      case "DECLINE":
        return "❌"
      case "CHANCE":
        return "📜"
      case "CHEST":
        return "🎁"
      case "RENT":
        return "💰"
      case "JAIL":
        return "⚖️"
      case "CLUB":
        return "👑"
      case "REST":
        return "☕"
      case "START_PASS":
        return "🚩"
      case "BUILD_HOUSE":
        return "🏠"
      case "BUILD_HOTEL":
        return "🏨"
      case "DESTROY_HOUSE":
        return "🔨"
      case "DESTROY_HOTEL":
        return "💥"
      case "TAX":
        return "💸"
      case "ERROR":
        return "⚠️"
      default:
        return "⚜️"
    }
  }

  const icon = notification.icon || getIcon(notification.type)
  const isError = notification.type === "ERROR"
  const badgeClass = isError ? "badge-error" : `badge-${notification.type.toLowerCase()}`

  return (
    <div
      className={`board-center-notification-wrapper ${isDismissing ? "dismissing" : "entering"}`}
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      title="Click to dismiss notification"
    >
      <div className={`board-center-notification-card ${badgeClass}`}>
        <span className="notification-icon">{icon}</span>
        <span className="notification-message" title={notification.message}>
          {notification.message}
        </span>
        {queueCount > 0 && (
          <span className="notification-queue-pill">+{queueCount}</span>
        )}
        <button
          type="button"
          className="notification-dismiss-btn"
          onClick={(e) => {
            e.stopPropagation()
            onDismiss()
          }}
          aria-label="Dismiss event"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default BoardCenterNotification
