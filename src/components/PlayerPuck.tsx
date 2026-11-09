import React from "react"
import type { EnginePlayer } from "../engine/GameEngineInterface"
import { getPlayerColorHex } from "../utils/boardCoordinates"

export type PuckSize = "xs" | "sm" | "md" | "lg" | "xl"

interface PlayerPuckProps {
  player?: EnginePlayer | { name?: string; color?: string; token?: string; id?: number }
  size?: PuckSize | number
  active?: boolean
  gliding?: boolean
  showGlow?: boolean
  badge?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  title?: string
  onClick?: (e: React.MouseEvent) => void
}

const SIZE_MAP: Record<PuckSize, number> = {
  xs: 14,
  sm: 18,
  md: 24,
  lg: 32,
  xl: 40,
}

// Harmonious color configurations for each authoritative player color
const COLOR_CONFIGS: Record<
  string,
  {
    primary: string
    highlight: string
    deep: string
    rim: string
    text: string
  }
> = {
  // 1. Ruby Red (Fiery Crimson)
  ruby: {
    primary: "#e11d48",
    highlight: "#fb7185",
    deep: "#881337",
    rim: "rgba(251, 113, 133, 0.7)",
    text: "#fff1f2",
  },
  burgundy: {
    primary: "#991b1b",
    highlight: "#f87171",
    deep: "#450a0a",
    rim: "rgba(248, 113, 113, 0.65)",
    text: "#fff1f2",
  },
  red: {
    primary: "#e11d48",
    highlight: "#fb7185",
    deep: "#881337",
    rim: "rgba(251, 113, 133, 0.7)",
    text: "#fff1f2",
  },

  // 2. Cobalt Blue (Deep Royal Sapphire)
  cobalt: {
    primary: "#2563eb",
    highlight: "#60a5fa",
    deep: "#1e3a8a",
    rim: "rgba(96, 165, 250, 0.7)",
    text: "#eff6ff",
  },
  blue: {
    primary: "#2563eb",
    highlight: "#60a5fa",
    deep: "#1e40af",
    rim: "rgba(96, 165, 250, 0.65)",
    text: "#eff6ff",
  },

  // 3. Emerald Green (Lush Jewel Green)
  emerald: {
    primary: "#059669",
    highlight: "#34d399",
    deep: "#064e3b",
    rim: "rgba(52, 211, 153, 0.7)",
    text: "#ecfdf5",
  },
  green: {
    primary: "#059669",
    highlight: "#34d399",
    deep: "#064e3b",
    rim: "rgba(52, 211, 153, 0.7)",
    text: "#ecfdf5",
  },

  // 4. Violet Purple (Imperial Amethyst)
  violet: {
    primary: "#7c3aed",
    highlight: "#a78bfa",
    deep: "#4c1d95",
    rim: "rgba(167, 139, 250, 0.7)",
    text: "#f5f3ff",
  },
  plum: {
    primary: "#9333ea",
    highlight: "#c084fc",
    deep: "#581c87",
    rim: "rgba(192, 132, 252, 0.65)",
    text: "#faf5ff",
  },
  purple: {
    primary: "#7c3aed",
    highlight: "#a78bfa",
    deep: "#4c1d95",
    rim: "rgba(167, 139, 250, 0.65)",
    text: "#f5f3ff",
  },

  // 5. Electric Cyan (Refined Cerulean Turquoise - High contrast on both Ivory Light & Pitch Dark)
  cyan: {
    primary: "#0891b2",
    highlight: "#38bdf8",
    deep: "#155e75",
    rim: "rgba(56, 189, 248, 0.75)",
    text: "#f0f9ff",
  },
  sky: {
    primary: "#0891b2",
    highlight: "#38bdf8",
    deep: "#155e75",
    rim: "rgba(56, 189, 248, 0.75)",
    text: "#f0f9ff",
  },

  // 6. Neon Lime (Electric Chartreuse)
  lime: {
    primary: "#65a30d",
    highlight: "#bef264",
    deep: "#365314",
    rim: "rgba(190, 242, 100, 0.8)",
    text: "#1a2e05",
  },
  chartreuse: {
    primary: "#65a30d",
    highlight: "#bef264",
    deep: "#365314",
    rim: "rgba(190, 242, 100, 0.8)",
    text: "#1a2e05",
  },

  // 7. Hot Coral (Fluorescent Rose Pink)
  coral: {
    primary: "#f43f5e",
    highlight: "#fda4af",
    deep: "#881337",
    rim: "rgba(253, 164, 175, 0.75)",
    text: "#fff1f2",
  },
  pink: {
    primary: "#f43f5e",
    highlight: "#fda4af",
    deep: "#881337",
    rim: "rgba(253, 164, 175, 0.75)",
    text: "#fff1f2",
  },

  // 8. Sunburst Yellow (Solar Bright Yellow)
  amber: {
    primary: "#ca8a04",
    highlight: "#fef08a",
    deep: "#713f12",
    rim: "rgba(254, 240, 138, 0.8)",
    text: "#422006",
  },
  yellow: {
    primary: "#ca8a04",
    highlight: "#fef08a",
    deep: "#713f12",
    rim: "rgba(254, 240, 138, 0.8)",
    text: "#422006",
  },

  // 9. Tangerine Orange (Vivid Warm Orange)
  tangerine: {
    primary: "#ea580c",
    highlight: "#fb923c",
    deep: "#7c2d12",
    rim: "rgba(251, 146, 60, 0.7)",
    text: "#fff7ed",
  },
  orange: {
    primary: "#ea580c",
    highlight: "#fb923c",
    deep: "#7c2d12",
    rim: "rgba(251, 146, 60, 0.7)",
    text: "#fff7ed",
  },

  // 10. Teal Cyan (Deep Oceanic Teal)
  teal: {
    primary: "#0d9488",
    highlight: "#2dd4bf",
    deep: "#115e59",
    rim: "rgba(45, 212, 191, 0.65)",
    text: "#f0fdfa",
  },

  // 11. Magenta / Fuchsia (Hot Electric Pink-Purple)
  magenta: {
    primary: "#c026d3",
    highlight: "#e879f9",
    deep: "#701a75",
    rim: "rgba(232, 121, 249, 0.7)",
    text: "#fdf4ff",
  },
  fuchsia: {
    primary: "#c026d3",
    highlight: "#e879f9",
    deep: "#701a75",
    rim: "rgba(232, 121, 249, 0.7)",
    text: "#fdf4ff",
  },

  // 12. Golden Amber (Warm 24K Gold)
  golden: {
    primary: "#d97706",
    highlight: "#fbbf24",
    deep: "#92400e",
    rim: "rgba(251, 191, 36, 0.65)",
    text: "#fffbeb",
  },
  gold: {
    primary: "#ca8a04",
    highlight: "#fde047",
    deep: "#854d0e",
    rim: "rgba(250, 204, 21, 0.65)",
    text: "#fefce8",
  },
  saffron: {
    primary: "#d97706",
    highlight: "#fbbf24",
    deep: "#92400e",
    rim: "rgba(251, 191, 36, 0.65)",
    text: "#fffbeb",
  },

  // 13. Platinum Diamond (Gleaming Sterling Silver / White)
  platinum: {
    primary: "#94a3b8",
    highlight: "#ffffff",
    deep: "#334155",
    rim: "rgba(255, 255, 255, 0.9)",
    text: "#0f172a",
  },
  white: {
    primary: "#94a3b8",
    highlight: "#ffffff",
    deep: "#334155",
    rim: "rgba(255, 255, 255, 0.9)",
    text: "#0f172a",
  },
  silver: {
    primary: "#94a3b8",
    highlight: "#ffffff",
    deep: "#334155",
    rim: "rgba(255, 255, 255, 0.9)",
    text: "#0f172a",
  },

  // 14. Midnight Obsidian (Deep Jet Onyx with Silver Rim)
  obsidian: {
    primary: "#1e293b",
    highlight: "#64748b",
    deep: "#020617",
    rim: "rgba(226, 232, 240, 0.85)",
    text: "#f8fafc",
  },
  black: {
    primary: "#1e293b",
    highlight: "#64748b",
    deep: "#020617",
    rim: "rgba(226, 232, 240, 0.85)",
    text: "#f8fafc",
  },
  onyx: {
    primary: "#1e293b",
    highlight: "#64748b",
    deep: "#020617",
    rim: "rgba(226, 232, 240, 0.85)",
    text: "#f8fafc",
  },

  // 15. Lavender Frost (Pastel Lilac)
  lavender: {
    primary: "#9333ea",
    highlight: "#e9d5ff",
    deep: "#581c87",
    rim: "rgba(233, 213, 255, 0.75)",
    text: "#faf5ff",
  },
  lilac: {
    primary: "#9333ea",
    highlight: "#e9d5ff",
    deep: "#581c87",
    rim: "rgba(233, 213, 255, 0.75)",
    text: "#faf5ff",
  },

  // 16. Copper Bronze (Burnished Metallic Rust)
  bronze: {
    primary: "#c2410c",
    highlight: "#fed7aa",
    deep: "#7c2d12",
    rim: "rgba(254, 215, 170, 0.75)",
    text: "#fff7ed",
  },
  copper: {
    primary: "#c2410c",
    highlight: "#fed7aa",
    deep: "#7c2d12",
    rim: "rgba(254, 215, 170, 0.75)",
    text: "#fff7ed",
  },
}

export const PlayerPuck: React.FC<PlayerPuckProps> = ({
  player,
  size = "md",
  active = false,
  gliding = false,
  showGlow = true,
  badge,
  className = "",
  style,
  title,
  onClick,
}) => {
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size] || 32
  const rawColor = (player?.color || "saffron").toLowerCase().trim()
  const fallbackHex = getPlayerColorHex(rawColor)

  const config =
    COLOR_CONFIGS[rawColor] || {
      primary: fallbackHex,
      highlight: "#ffffff",
      deep: "#1a1a1a",
      rim: "rgba(255, 255, 255, 0.6)",
      text: "#ffffff",
    }

  return (
    <div
      className={`crownfall-puck-container ${active ? "puck-active-turn" : ""} ${
        gliding ? "puck-is-gliding" : ""
      } ${className || ""}`}
      style={{
        width: `${pixelSize}px`,
        height: `${pixelSize}px`,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        userSelect: "none",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
      title={title || player?.name || "Player"}
      onClick={onClick}
      aria-label={`${player?.name || "Player"} Puck`}
    >
      {/* Blank, simple, and subtly raised physical game token with radial depth */}
      <div
        className="puck-disc"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          position: "relative",
          background: `radial-gradient(circle at 36% 32%, ${config.highlight} 0%, ${config.primary} 52%, ${config.deep} 100%)`,
          boxShadow: gliding
            ? `0 2.5px 0 ${config.deep}, 0 6px 12px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.45)`
            : active
            ? `0 2px 0 ${config.deep}, 0 3px 8px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.4)`
            : `0 1.5px 0 ${config.deep}, 0 2px 5px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.35)`,
          border: `1px solid rgba(255, 255, 255, ${active ? "0.6" : "0.28"})`,
          transform: gliding ? "translateY(-1px) scale(1.06)" : active ? "scale(1.04)" : "scale(1)",
          transition: "transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      />
    </div>
  )
}

export default PlayerPuck
