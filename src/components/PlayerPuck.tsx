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
  saffron: {
    primary: "#d97706",
    highlight: "#fbbf24",
    deep: "#92400e",
    rim: "rgba(251, 191, 36, 0.65)",
    text: "#fffbeb",
  },
  teal: {
    primary: "#0d9488",
    highlight: "#2dd4bf",
    deep: "#115e59",
    rim: "rgba(45, 212, 191, 0.65)",
    text: "#f0fdfa",
  },
  plum: {
    primary: "#9333ea",
    highlight: "#c084fc",
    deep: "#581c87",
    rim: "rgba(192, 132, 252, 0.65)",
    text: "#faf5ff",
  },
  blue: {
    primary: "#2563eb",
    highlight: "#60a5fa",
    deep: "#1e40af",
    rim: "rgba(96, 165, 250, 0.65)",
    text: "#eff6ff",
  },
  gold: {
    primary: "#ca8a04",
    highlight: "#fde047",
    deep: "#854d0e",
    rim: "rgba(250, 204, 21, 0.65)",
    text: "#fefce8",
  },
  burgundy: {
    primary: "#991b1b",
    highlight: "#f87171",
    deep: "#450a0a",
    rim: "rgba(248, 113, 113, 0.65)",
    text: "#fff1f2",
  },
  emerald: {
    primary: "#059669",
    highlight: "#34d399",
    deep: "#064e3b",
    rim: "rgba(52, 211, 153, 0.65)",
    text: "#ecfdf5",
  },
  purple: {
    primary: "#7c3aed",
    highlight: "#a78bfa",
    deep: "#4c1d95",
    rim: "rgba(167, 139, 250, 0.65)",
    text: "#f5f3ff",
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
            background: `radial-gradient(circle, ${config.rim} 0%, rgba(217,119,6,0.3) 60%, transparent 100%)`,
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
              fontWeight: 600,
              fontSize: `${fontSize}px`,
              lineHeight: 1,
              letterSpacing: "-0.01em",
              color: config.text,
              textShadow: "0 1px 2px rgba(0, 0, 0, 0.75)",
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
