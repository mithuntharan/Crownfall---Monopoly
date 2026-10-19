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

export function getTileCenterPercent(tileIndex: number): { x: number; y: number } {
  const norm = ((tileIndex % 36) + 36) % 36
  const pos = BOARD_POSITIONS[norm] ?? { row: 10, col: 10 }
  return {
    x: getAxisCenterPercent(pos.col),
    y: getAxisCenterPercent(pos.row),
  }
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
    case "saffron":
      return "#d97706"
    case "teal":
      return "#0d9488"
    case "plum":
      return "#9333ea"
    case "blue":
      return "#2563eb"
    case "gold":
      return "#ca8a04"
    case "burgundy":
      return "#991b1b"
    case "emerald":
      return "#059669"
    case "purple":
      return "#7c3aed"
    default:
      if (c.startsWith("#") || c.startsWith("rgb")) {
        return c
      }
      return "#d97706"
  }
}
