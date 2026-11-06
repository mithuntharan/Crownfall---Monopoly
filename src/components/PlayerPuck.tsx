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

  // 5. Electric Cyan (Ultra-Bright Neon Turquoise)
  cyan: {
    primary: "#0891b2",
    highlight: "#67e8f9",
    deep: "#164e63",
    rim: "rgba(103, 232, 249, 0.8)",
    text: "#082f49",
  },
  sky: {
    primary: "#0284c7",
    highlight: "#7dd3fc",
    deep: "#0c4a6e",
    rim: "rgba(125, 211, 252, 0.75)",
    text: "#082f49",
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

  // Display initial or token identifier
  const initial =
    player?.token && player.token.length > 0 && player.token !== "•"
      ? player.token
      : player?.name
      ? player.name.trim().charAt(0).toUpperCase()
      : typeof player?.id === "number"
      ? String(player.id + 1)
      : "•"

  const fontSize = Math.max(9, Math.round(pixelSize * 0.42))
  const bevelWidth = Math.max(1.5, Math.round(pixelSize * 0.08))

  return (
    <div
      className={`crownfall-puck-container ${active ? "puck-active-turn" : ""} ${
        gliding ? "puck-is-gliding" : ""
      } ${className}`}
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
      {/* Active turn ambient pulse halo */}
      {active && showGlow && (
        <div
          className="puck-turn-halo"
          style={{
            position: "absolute",
            inset: `-${Math.max(3, Math.round(pixelSize * 0.16))}px`,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${config.rim} 0%, ${config.primary}40 60%, transparent 100%)`,
            animation: "puckAuraPulse 2s infinite ease-in-out",
            pointerEvents: "none",
            zIndex: 1,
          }}
        />
      )}

      {/* Main 3D Dimensional Puck Body */}
      <div
        className="puck-body"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          position: "relative",
          zIndex: 2,
          // Metallic outer bevel ring + deep drop shadow
          background: `linear-gradient(145deg, rgba(255, 255, 255, 0.85) 0%, ${config.rim} 35%, #18181b 95%)`,
          padding: `${bevelWidth}px`,
          boxShadow: gliding
            ? `0 5px 12px rgba(0,0,0,0.45), 0 0 0 1.5px ${config.highlight}`
            : active
            ? `0 2px 6px rgba(0,0,0,0.5), 0 0 0 1.5px ${config.highlight}`
            : "0 1.5px 4px rgba(0,0,0,0.35)",
          transition: "transform 180ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 180ms cubic-bezier(0.16, 1, 0.3, 1)",
          transform: gliding ? "translateY(-2.5px) scale(1.08)" : active ? "scale(1.05)" : "scale(1)",
        }}
      >
        {/* Core Jewel Lacquer Face */}
        <div
          className="puck-face"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `radial-gradient(circle at 38% 30%, ${config.highlight} 0%, ${config.primary} 48%, ${config.deep} 100%)`,
            boxShadow: "inset 0 1.5px 2px rgba(255,255,255,0.45), inset 0 -2px 3px rgba(0,0,0,0.6)",
          }}
        >
          {/* Top Specular Arc Reflection */}
          <div
            style={{
              position: "absolute",
              top: "4%",
              left: "15%",
              right: "15%",
              height: "42%",
              borderRadius: "50% 50% 40% 40%",
              background:
                "linear-gradient(180deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0.08) 75%, transparent 100%)",
              pointerEvents: "none",
            }}
          />

          {/* Player Identifier Monogram */}
          <span
            style={{
              position: "relative",
              zIndex: 3,
              fontFamily: '"DM Sans", -apple-system, sans-serif',
              fontWeight: 700,
              fontSize: `${fontSize}px`,
              lineHeight: 1,
              letterSpacing: "-0.01em",
              color: config.text,
              textShadow:
                config.text.toLowerCase().startsWith("#f")
                  ? "0 1px 2px rgba(0, 0, 0, 0.75)"
                  : "0 1px 1px rgba(255, 255, 255, 0.4)",
            }}
          >
            {initial}
          </span>
        </div>
      </div>

      {/* Optional Badge (e.g. Host Crown, Rank, Status) */}
      {badge && (
        <div
          style={{
            position: "absolute",
            top: "-3px",
            right: "-3px",
            zIndex: 4,
          }}
        >
          {badge}
        </div>
      )}
    </div>
  )
}

export default PlayerPuck
