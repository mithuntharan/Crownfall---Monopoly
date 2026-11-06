/**
 * Board geometry calculation for 10x10 CSS Grid with 1.7fr corners and 1.0fr edges.
 * Total grid fraction units: 1.7 + 8 * 1.0 + 1.7 = 11.4 units.
 */

export interface BoardPosition {
  row: number
  col: number
}

export const BOARD_POSITIONS: Record<number, BoardPosition> = {
  0: { row: 10, col: 10 },
  1: { row: 10, col: 9 },
  2: { row: 10, col: 8 },
  3: { row: 10, col: 7 },
  4: { row: 10, col: 6 },
  5: { row: 10, col: 5 },
  6: { row: 10, col: 4 },
  7: { row: 10, col: 3 },
  8: { row: 10, col: 2 },
  9: { row: 10, col: 1 },
  10: { row: 9, col: 1 },
  11: { row: 8, col: 1 },
  12: { row: 7, col: 1 },
  13: { row: 6, col: 1 },
  14: { row: 5, col: 1 },
  15: { row: 4, col: 1 },
  16: { row: 3, col: 1 },
  17: { row: 2, col: 1 },
  18: { row: 1, col: 1 },
  19: { row: 1, col: 2 },
  20: { row: 1, col: 3 },
  21: { row: 1, col: 4 },
  22: { row: 1, col: 5 },
  23: { row: 1, col: 6 },
  24: { row: 1, col: 7 },
  25: { row: 1, col: 8 },
  26: { row: 1, col: 9 },
  27: { row: 1, col: 10 },
  28: { row: 2, col: 10 },
  29: { row: 3, col: 10 },
  30: { row: 4, col: 10 },
  31: { row: 5, col: 10 },
  32: { row: 6, col: 10 },
  33: { row: 7, col: 10 },
  34: { row: 8, col: 10 },
  35: { row: 9, col: 10 },
}

export function getAxisCenterPercent(gridIndex: number): number {
  // gridIndex is 1 to 10
  if (gridIndex <= 1) return (0.85 / 11.4) * 100 // 7.4561%
  if (gridIndex >= 10) return (10.55 / 11.4) * 100 // 92.5439%
  return ((1.7 + (gridIndex - 2) * 1.0 + 0.5) / 11.4) * 100
}

export function getTileCenterPercent(tileIndex: number, isDetained = false): { x: number; y: number } {
  const norm = ((tileIndex % 36) + 36) % 36
  const pos = BOARD_POSITIONS[norm] ?? { row: 10, col: 10 }
  const base = {
    x: getAxisCenterPercent(pos.col),
    y: getAxisCenterPercent(pos.row),
  }
  if (norm === 9) {
    // Space 9 (Bottom-Left Corner): Split into detention cell (inner top-right) and visiting corridor (outer bottom-left)
    if (isDetained) {
      return {
        x: base.x + 2.6,
        y: base.y - 2.6,
      }
    } else {
      return {
        x: base.x - 2.2,
        y: base.y + 2.2,
      }
    }
  }
  return base
}

export function getMultiTokenOffset(rank: number, totalCount: number): { dx: number; dy: number } {
  if (totalCount <= 1) return { dx: 0, dy: 0 }
  if (totalCount === 2) {
    return rank === 0 ? { dx: -7, dy: 0 } : { dx: 7, dy: 0 }
  }
  if (totalCount === 3) {
    if (rank === 0) return { dx: 0, dy: -6 }
    if (rank === 1) return { dx: -7, dy: 5 }
    return { dx: 7, dy: 5 }
  }
  // 4 or more
  const offsets = [
    { dx: -7, dy: -7 },
    { dx: 7, dy: -7 },
    { dx: -7, dy: 7 },
    { dx: 7, dy: 7 },
  ]
  return offsets[rank % offsets.length]
}

export function getPlayerColorHex(color?: string): string {
  if (!color) return "#d97706"
  const c = color.trim().toLowerCase()
  switch (c) {
    case "ruby":
    case "burgundy":
    case "red":
      return "#e11d48"
    case "cobalt":
    case "blue":
      return "#2563eb"
    case "emerald":
    case "green":
      return "#059669"
    case "violet":
    case "purple":
    case "plum":
      return "#7c3aed"
    case "tangerine":
    case "orange":
      return "#ea580c"
    case "coral":
    case "pink":
      return "#f43f5e"
    case "teal":
      return "#0d9488"
    case "cyan":
    case "sky":
      return "#06b6d4"
    case "lime":
    case "chartreuse":
      return "#84cc16"
    case "magenta":
    case "fuchsia":
      return "#c026d3"
    case "amber":
    case "yellow":
      return "#eab308"
    case "golden":
    case "gold":
    case "saffron":
      return "#d97706"
    case "platinum":
    case "silver":
    case "white":
      return "#e2e8f0"
    case "obsidian":
    case "black":
    case "onyx":
      return "#1e293b"
    case "lavender":
    case "lilac":
      return "#a855f7"
    case "bronze":
    case "copper":
      return "#b45309"
    default:
      if (c.startsWith("#") || c.startsWith("rgb")) {
        return c
      }
      return "#d97706"
  }
}

/**
 * Exponential ease-in-out curve for fluid, organic puck gliding.
 * Starts with smooth acceleration, cruises through the middle, and decelerates into landing.
 */
export function easeInOutExpo(t: number): number {
  if (t <= 0) return 0
  if (t >= 1) return 1
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2
}

/**
 * Calculates continuous coordinates along a discrete sequence of tile spaces on the board perimeter.
 * Returns exact { x, y } percentage coordinates for any fractional progress (0 to 1).
 */
export function getPathCoordinates(
  path: number[],
  fraction: number,
  isTargetDetained: boolean = false
): { x: number; y: number } {
  if (!path || path.length === 0) {
    return { x: 50, y: 50 }
  }
  if (path.length === 1) {
    return getTileCenterPercent(path[0], isTargetDetained)
  }

  const clamped = Math.max(0, Math.min(1, fraction))
  const totalSegments = path.length - 1
  const s = clamped * totalSegments
  const segmentIdx = Math.min(Math.floor(s), totalSegments - 1)
  const segmentFrac = s - segmentIdx

  const fromTile = path[segmentIdx]
  const toTile = path[segmentIdx + 1]

  const fromPt = getTileCenterPercent(fromTile, false)
  const toPt = getTileCenterPercent(
    toTile,
    segmentIdx + 1 === totalSegments ? isTargetDetained : false
  )

  return {
    x: fromPt.x + (toPt.x - fromPt.x) * segmentFrac,
    y: fromPt.y + (toPt.y - fromPt.y) * segmentFrac,
  }
}

