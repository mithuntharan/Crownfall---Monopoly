import React from "react"

export interface BoardCenterNotificationItem {
  id: string
  type:
    | "CHANCE"
    | "CHEST"
    | "PURCHASE"
    | "DECLINE"
    | "RENT"
    | "RENT_INCOME"
    | "RENT_EXPENSE"
    | "JAIL"
    | "CLUB"
    | "REST"
    | "START_PASS"
    | "BUILD_HOUSE"
    | "BUILD_HOTEL"
    | "DESTROY_HOUSE"
    | "DESTROY_HOTEL"
    | "TAX"
    | "TRANSFER"
    | "PAYMENT"
    | "PAYOUT"
    | "ERROR"
    | "WARNING"
    | "INFO"
  category: string
  message: string
  propertyId?: string
  amount?: number
  timestamp: number
  icon?: string
  durationMs?: number
  dismissing?: boolean
}

interface BoardCenterNotificationProps {
  notifications?: BoardCenterNotificationItem[]
  notification?: BoardCenterNotificationItem | null
  queueCount?: number
  onDismiss: (id?: string) => void
  isDismissing?: boolean
  dismissingIds?: Set<string>
}

export const BoardCenterNotification: React.FC<BoardCenterNotificationProps> = ({
  notifications,
  notification,
  queueCount = 0,
  onDismiss,
  isDismissing = false,
  dismissingIds,
}) => {
  // Normalize items: support both list of notifications and single notification
  const items: BoardCenterNotificationItem[] = notifications && notifications.length > 0
    ? notifications.slice(0, 3)
    : notification
    ? [notification]
    : []

  if (items.length === 0) return null

  const getIcon = (_type: BoardCenterNotificationItem["type"]) => {
    return ""
  }

  const extraQueue = queueCount > 0
    ? queueCount
    : (notifications && notifications.length > 3 ? notifications.length - 3 : 0)

  return (
    <div
      className="board-center-notifications-stack"
      role="status"
      aria-live="polite"
    >
      {items.map((item, idx) => {
        const isItemDismissing = isDismissing || item.dismissing || (dismissingIds && dismissingIds.has(item.id))
        const icon = item.icon && !/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(item.icon)
          ? item.icon
          : getIcon(item.type)
        const isError = item.type === "ERROR"
        const isRentIncome = item.type === "RENT_INCOME" || (item.category && (item.category.toUpperCase().includes("COLLECT") || item.category.toUpperCase().includes("RECEIV")))
        const isRentExpense = item.type === "RENT_EXPENSE" || item.type === "RENT" || (item.category && (item.category.toUpperCase().includes("PAID") || item.category.toUpperCase().includes("PAYMENT")))
        const badgeClass = isError
          ? "badge-error"
          : isRentIncome
          ? "badge-rent_income"
          : isRentExpense
          ? "badge-rent_expense badge-rent"
          : `badge-${item.type.toLowerCase()}`
        const showQueuePill = idx === 0 && extraQueue > 0

        return (
          <div
            key={item.id}
            className={`board-center-notification-wrapper ${isItemDismissing ? "dismissing" : "entering"}`}
            onClick={() => onDismiss(item.id)}
            title="Click to dismiss notification"
          >
            <div className={`board-center-notification-card ${badgeClass}`}>
              {icon ? <span className="notification-icon">{icon}</span> : null}
              <span className="notification-message" title={item.message}>
                {item.message}
              </span>
              {showQueuePill && (
                <span className="notification-queue-pill">+{extraQueue}</span>
              )}
              <button
                type="button"
                className="notification-dismiss-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  onDismiss(item.id)
                }}
                aria-label="Dismiss notification"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default BoardCenterNotification
